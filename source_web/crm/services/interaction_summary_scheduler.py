"""
Automated Interaction Summary Batch Service.

Generates interaction summaries for all customers via Google Cloud Scheduler.
Includes enhanced cleanup logic to prevent stale summary accumulation.

Enhanced Cleanup System:
- After ANY successful summary generation (automated, recovery, or manual), all previous summaries
  for that specific customer are automatically deleted
- This ensures each customer has only their most recent summary at all times
- Midnight cleanup continues as a safety net for system-wide cleanup
- Cleanup failures are logged but don't prevent summary generation from completing

Key Features:
1. Batch processing with configurable batch sizes (triggered by Cloud Scheduler)
2. Concurrent processing with rate limiting
3. Comprehensive error handling and logging
4. Performance tracking and statistics
5. Manual trigger capabilities for testing and recovery
6. Post-generation cleanup to maintain data consistency
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from psycopg2.extras import RealDictCursor

# Import CRM dependencies
from routers.crm_data_router import get_db_connection

logger = logging.getLogger(__name__)

class InteractionSummaryScheduler:
    """Service to generate interaction summaries for all customers (triggered by Cloud Scheduler)."""

    def __init__(self):
        self.batch_size = 10  # Process customers in batches to avoid overwhelming the system
        self.max_concurrent = 3  # Maximum concurrent summary generations
    
    async def _async_batch_generate_summaries(self, test_mode: bool = False, max_customers: Optional[int] = None):
        """Async batch processing with cleanup of old summaries."""

        start_time = datetime.now()
        logger.info(f" Starting batch summary generation at {start_time}")

        try:
            # Clear old summaries before generating new ones (unless in test mode)
            if not test_mode:
                cleared_count = self._clear_old_automated_summaries()
                logger.info(f"🗑️ Cleanup: Cleared {cleared_count} old summaries from previous days")

            # Get ALL customers for complete cache refresh
            customers_to_process = self._get_customers_needing_updates(test_mode, max_customers)

            if not customers_to_process:
                logger.info("✅ No customers found for processing")
                return

            logger.info(f"📋 Processing {len(customers_to_process)} customers for complete cache refresh")
            
            # Process customers in batches with concurrency control
            total_processed = 0
            total_successful = 0
            total_errors = 0

            # Create semaphore to limit concurrent processing
            semaphore = asyncio.Semaphore(self.max_concurrent)
            total_skipped = 0

            # Process in batches
            for i in range(0, len(customers_to_process), self.batch_size):
                batch = customers_to_process[i:i + self.batch_size]
                logger.info(f"📦 Processing batch {i//self.batch_size + 1}: customers {i+1}-{min(i+self.batch_size, len(customers_to_process))}")

                # Create tasks for this batch
                tasks = []
                for customer in batch:
                    # Skip customers who already have today's summaries
                    if customer.get('update_reason') == 'has_todays_summary':
                        logger.info(f"⏭️ Skipping {customer.get('name', 'Unknown')} (ID: {customer['client_id']}) - already has today's automated summary")
                        total_skipped += 1
                        continue

                    task = asyncio.create_task(
                        self._process_single_customer_with_semaphore(semaphore, customer)
                    )
                    tasks.append(task)

                # Wait for all tasks in this batch to complete
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Count results
                for result in results:
                    total_processed += 1
                    if isinstance(result, Exception):
                        total_errors += 1
                        logger.error(f"❌ Batch processing error: {result}")
                    elif result:
                        total_successful += 1
                
                # Small delay between batches to avoid overwhelming the system
                if i + self.batch_size < len(customers_to_process):
                    await asyncio.sleep(2)


            # Log final results
            end_time = datetime.now()
            duration = end_time - start_time

            logger.info(f"🎉 Batch summary generation completed!")
            logger.info(f"📊 Results: {total_successful} successful, {total_errors} errors, {total_processed} processed")
            if total_skipped > 0:
                logger.info(f"⏭️ Skipped: {total_skipped} customers (already had today's summaries)")
                logger.info(f"🚀 Total coverage: {total_successful + total_skipped}/{len(customers_to_process)} customers have summaries ({(total_successful + total_skipped)/len(customers_to_process)*100:.1f}%)")
            else:
                logger.info(f"🚀 Cache coverage: {total_successful}/{len(customers_to_process)} customers ({total_successful/len(customers_to_process)*100:.1f}%)")
            logger.info(f"⏱️ Duration: {duration.total_seconds():.1f} seconds")

            # Store batch job statistics
            self._store_batch_job_stats(start_time, end_time, total_processed, total_successful, total_errors, 'interaction_summary_batch')

            # Log cache readiness
            total_with_summaries = total_successful + total_skipped
            if total_with_summaries == len(customers_to_process):
                logger.info("✅ Complete cache refresh successful - all customer summaries are now pre-generated!")
            else:
                logger.warning(f"⚠️ Partial cache refresh - {total_errors} customers failed summary generation")
            
        except Exception as e:
            logger.error(f"❌ Critical error in batch summary generation: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    
    async def _process_single_customer_with_semaphore(self, semaphore: asyncio.Semaphore, customer: Dict) -> bool:
        """Process a single customer with concurrency control."""
        async with semaphore:
            return await self._process_single_customer(customer)
    
    async def _process_single_customer(self, customer: Dict) -> bool:
        """Process interaction summary for a single customer."""
        
        customer_id = customer['client_id']
        customer_name = customer.get('name', 'Unknown')
        
        try:
            logger.info(f"🔄 Processing customer {customer_id}: {customer_name}")
            
            # Create system user for automated processing
            system_user = {
                'email': 'automated-batch@system.local',
                'name': 'Automated Summary System',
                'role': 'system'
            }
            
            # Import here to avoid circular import
            from routers.interaction_router import _generate_interaction_summary_logic, InteractionSummaryRequest

            # Generate summary using existing logic
            request = InteractionSummaryRequest(days_back=30)  # Default 30 days
            
            start_time = datetime.now()
            summary_response = await _generate_interaction_summary_logic(
                str(customer_id), 
                request, 
                system_user
            )
            end_time = datetime.now()
            
            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Store the generated summary in database
            success = self._store_generated_summary(
                customer_id=customer_id,
                summary_response=summary_response,
                processing_time_ms=processing_time_ms,
                generation_type='automated'
            )
            
            if success:
                logger.info(f"✅ Successfully processed customer {customer_id}: {customer_name}")
                return True
            else:
                logger.error(f"❌ Failed to store summary for customer {customer_id}: {customer_name}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error processing customer {customer_id} ({customer_name}): {e}")
            
            # Store error record
            self._store_error_summary(customer_id, str(e))
            return False

    def _clear_old_automated_summaries(self) -> int:
        """Clear ALL existing summaries for complete daily refresh (both manual and automated)."""

        try:
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor()

            # Delete ALL summaries older than today (both manual and automated)
            # This ensures complete daily refresh of the summary cache
            delete_query = """
            DELETE FROM interaction_summaries
            WHERE DATE(generated_at) < CURRENT_DATE
            """

            cursor.execute(delete_query)
            deleted_count = cursor.rowcount

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"🗑️ Complete daily cleanup: Cleared {deleted_count} summaries (both manual and automated) from previous days")
            return deleted_count

        except Exception as e:
            logger.error(f"❌ Error clearing old summaries during daily cleanup: {e}")
            return 0

    def _clear_customer_old_summaries(self, customer_id: int) -> int:
        """Clear old summaries for a specific customer only (used for manual generation)."""

        try:
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor()

            # Delete old summaries for this specific customer only
            delete_query = """
            DELETE FROM interaction_summaries
            WHERE customer_id = %s
              AND DATE(generated_at) < CURRENT_DATE
            """

            cursor.execute(delete_query, (customer_id,))
            deleted_count = cursor.rowcount

            conn.commit()
            cursor.close()
            conn.close()

            if deleted_count > 0:
                logger.info(f"🗑️ Customer-specific cleanup: Cleared {deleted_count} old summaries for customer {customer_id}")

            return deleted_count

        except Exception as e:
            logger.error(f"❌ Error clearing old summaries for customer {customer_id}: {e}")
            return 0

    def _clear_customer_all_previous_summaries(self, customer_id: int) -> int:
        """
        Clear ALL previous summaries for a specific customer (post-generation cleanup).

        This method is called after successful summary generation to ensure each customer
        has only their most recent summary, regardless of generation trigger type.

        Args:
            customer_id: Customer ID to clean up summaries for

        Returns:
            int: Number of summaries deleted
        """
        try:
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor()

            # First, get the most recent summary ID for this customer
            cursor.execute("""
                SELECT summary_id
                FROM interaction_summaries
                WHERE customer_id = %s
                ORDER BY generated_at DESC
                LIMIT 1
            """, (customer_id,))

            latest_summary = cursor.fetchone()

            if not latest_summary:
                # No summaries exist for this customer
                cursor.close()
                conn.close()
                return 0

            latest_summary_id = latest_summary[0]

            # Delete all summaries for this customer EXCEPT the most recent one
            delete_query = """
            DELETE FROM interaction_summaries
            WHERE customer_id = %s
              AND summary_id != %s
            """

            cursor.execute(delete_query, (customer_id, latest_summary_id))
            deleted_count = cursor.rowcount

            conn.commit()
            cursor.close()
            conn.close()

            if deleted_count > 0:
                logger.info(f"🗑️ Post-generation cleanup: Removed {deleted_count} previous summaries for customer {customer_id}, keeping latest summary {latest_summary_id}")
            else:
                logger.debug(f"🗑️ Post-generation cleanup: No previous summaries to remove for customer {customer_id}")

            return deleted_count

        except Exception as e:
            logger.error(f"❌ Error in post-generation cleanup for customer {customer_id}: {e}")
            # Don't raise the exception - cleanup failures shouldn't prevent summary generation
            return 0


    def _get_customers_needing_updates(self, test_mode: bool = False, max_customers: Optional[int] = None) -> List[Dict]:
        """Get list of ALL customers for complete cache refresh (expanded coverage for all customers)."""

        try:
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # EXPANDED COVERAGE: Get ALL customers regardless of status for complete cache refresh
            # This ensures every customer has a fresh summary available in cache
            query = """
            WITH customer_summary_info AS (
                SELECT
                    ci.client_id,
                    ci.name,
                    ci.status,
                    ci.created_at as customer_created_at,
                    MAX(ints.generated_at) as last_summary_date,
                    MAX(id.created_at) as last_interaction_date,
                    COUNT(id.interaction_id) as total_interactions,
                    COUNT(CASE WHEN id.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_interactions
                FROM clients_info ci
                LEFT JOIN interaction_summaries ints ON ci.client_id = ints.customer_id
                    AND ints.status = 'success'
                    AND ints.generation_type = 'automated'
                    AND ints.generated_at >= CURRENT_DATE  -- Only today's automated summaries
                LEFT JOIN interaction_details id ON ci.client_id = id.customer_id
                -- REMOVED: WHERE ci.status IN (...) to include ALL customers regardless of status
                GROUP BY ci.client_id, ci.name, ci.status, ci.created_at
            )
            SELECT
                client_id,
                name,
                status,
                customer_created_at,
                last_summary_date,
                last_interaction_date,
                total_interactions,
                recent_interactions,
                CASE
                    WHEN last_summary_date IS NULL THEN 'needs_daily_refresh'
                    ELSE 'has_todays_summary'
                END as update_reason
            FROM customer_summary_info
            ORDER BY
                -- Prioritize customers without today's automated summary
                CASE WHEN last_summary_date IS NULL THEN 1 ELSE 2 END,
                -- Then by recent activity (most active first)
                recent_interactions DESC,
                -- Then by total interactions
                total_interactions DESC,
                -- Finally by customer creation date (newest first)
                customer_created_at DESC
            """

            if test_mode:
                query += " LIMIT 5"
            elif max_customers:
                query += f" LIMIT {max_customers}"

            cursor.execute(query)
            customers = cursor.fetchall()

            cursor.close()
            conn.close()

            # Convert to list of dicts
            result = [dict(customer) for customer in customers]

            # Log processing statistics
            total_customers = len(result)
            needs_refresh = sum(1 for c in result if c['update_reason'] == 'needs_daily_refresh')
            has_summary = total_customers - needs_refresh

            logger.info(f"📊 Daily cache refresh: {total_customers} total customers")
            logger.info(f"   - {needs_refresh} need fresh summaries")
            logger.info(f"   - {has_summary} already have today's automated summary")

            # Additional statistics
            if result:
                total_interactions = sum(c['total_interactions'] or 0 for c in result)
                recent_interactions = sum(c['recent_interactions'] or 0 for c in result)
                logger.info(f"   - {total_interactions} total interactions across all customers")
                logger.info(f"   - {recent_interactions} interactions in last 30 days")

            return result

        except Exception as e:
            logger.error(f"❌ Error getting customers for daily refresh: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []

    def _store_generated_summary(self, customer_id: int, summary_response, processing_time_ms: int, generation_type: str) -> bool:
        """Store generated summary in the database."""

        try:
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Extract data from summary response
            summary_data = summary_response.summary_data
            interactions_analyzed = summary_response.interactions_analyzed
            period_analyzed = summary_response.period_analyzed

            # ENHANCED AGENT AND MODEL TRACKING
            # Use actual agent and model information from the summary response instead of text parsing
            agent_used = getattr(summary_response, 'agent_used', None)
            ai_model_used = getattr(summary_response, 'ai_model_used', None)

            # Fallback to text parsing only if the enhanced tracking is not available
            if not agent_used:
                logger.warning(f"⚠️ Agent information not available in response, falling back to text parsing for customer {customer_id}")
                if 'summary' in summary_data and 'AI Agent Analysis' in summary_data['summary']:
                    if 'new customer' in summary_data['summary']:
                        agent_used = 'IcebreakerIntroAgent'
                    elif 'active customer' in summary_data['summary']:
                        agent_used = 'NextActionInsightAgent'
                    elif 'inactive' in summary_data['summary'] or 'restart momentum' in summary_data['summary'].lower():
                        agent_used = 'RestartMomentumInsightAgent'
                    elif 'deal retrospective' in summary_data['summary'].lower():
                        agent_used = 'DealRetrospectiveAgent'
                    # Enhanced text parsing for all agent types
                else:
                    agent_used = 'UnknownAgent'

            # Fallback for model information
            if not ai_model_used:
                logger.warning(f"⚠️ Model information not available in response, using fallback for customer {customer_id}")
                ai_model_used = 'gemini-2.5-flash'  # Default fallback model

            logger.info(f"🔍 TRACKING: Customer {customer_id} - Agent: {agent_used}, Model: {ai_model_used}")

            # Get the latest interaction date for this customer
            cursor.execute("""
                SELECT MAX(created_at) as last_interaction_date
                FROM interaction_details
                WHERE customer_id = %s
            """, (customer_id,))

            result = cursor.fetchone()
            last_interaction_date = result['last_interaction_date'] if result else None

            # Insert summary record
            insert_sql = """
            INSERT INTO interaction_summaries (
                customer_id,
                summary_data,
                generated_by,
                generation_type,
                period_analyzed_days,
                interactions_analyzed,
                agent_used,
                ai_model_used,
                processing_time_ms,
                status,
                last_interaction_date,
                data_cutoff_date
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """

            # Extract days from period_analyzed (e.g., "30 days" -> 30)
            try:
                period_days = int(period_analyzed.split()[0])
            except:
                period_days = 30  # Default

            cursor.execute(insert_sql, (
                customer_id,
                json.dumps(summary_data),  # Store as JSON
                'automated_batch_job',
                generation_type,
                period_days,
                interactions_analyzed,
                agent_used,
                ai_model_used,
                processing_time_ms,
                'success',
                last_interaction_date,
                datetime.now()  # data_cutoff_date
            ))

            conn.commit()
            cursor.close()
            conn.close()

            # ENHANCED CLEANUP: After successful summary generation, clean up all previous summaries for this customer
            # This ensures each customer has only their most recent summary, regardless of generation trigger type
            try:
                cleanup_count = self._clear_customer_all_previous_summaries(customer_id)
                logger.debug(f"✅ Post-generation cleanup completed for customer {customer_id}: {cleanup_count} old summaries removed")
            except Exception as cleanup_error:
                # Log cleanup errors but don't fail the entire operation
                logger.warning(f"⚠️ Post-generation cleanup failed for customer {customer_id}: {cleanup_error}")

            return True

        except Exception as e:
            logger.error(f"❌ Error storing summary for customer {customer_id}: {e}")
            return False

    def _store_error_summary(self, customer_id: int, error_message: str):
        """Store error record for failed summary generation."""

        try:
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor()

            cursor.execute("""
            INSERT INTO interaction_summaries (
                customer_id,
                summary_data,
                generated_by,
                generation_type,
                status,
                error_message,
                data_cutoff_date
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s
            )
            """, (
                customer_id,
                json.dumps({"error": "Summary generation failed"}),
                'automated_batch_job',
                'automated',
                'error',
                error_message[:1000],  # Truncate long error messages
                datetime.now()
            ))

            conn.commit()
            cursor.close()
            conn.close()

        except Exception as e:
            logger.error(f"❌ Error storing error summary for customer {customer_id}: {e}")

    def _store_batch_job_stats(self, start_time: datetime, end_time: datetime,
                              total_processed: int, total_successful: int, total_errors: int,
                              job_type: str = 'interaction_summary_batch'):
        """Store batch job statistics for monitoring."""

        try:
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor()

            # Create batch_job_stats table if it doesn't exist
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS batch_job_stats (
                job_id SERIAL PRIMARY KEY,
                job_type VARCHAR(50) NOT NULL,
                start_time TIMESTAMP WITH TIME ZONE NOT NULL,
                end_time TIMESTAMP WITH TIME ZONE NOT NULL,
                duration_seconds INTEGER,
                total_processed INTEGER,
                total_successful INTEGER,
                total_errors INTEGER,
                success_rate DECIMAL(5,2),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            """)

            duration_seconds = int((end_time - start_time).total_seconds())
            success_rate = (total_successful / total_processed * 100) if total_processed > 0 else 0

            cursor.execute("""
            INSERT INTO batch_job_stats (
                job_type, start_time, end_time, duration_seconds,
                total_processed, total_successful, total_errors, success_rate
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                job_type,
                start_time,
                end_time,
                duration_seconds,
                total_processed,
                total_successful,
                total_errors,
                success_rate
            ))

            conn.commit()
            cursor.close()
            conn.close()

        except Exception as e:
            logger.error(f"❌ Error storing batch job stats: {e}")

    def force_run_now(self, test_mode: bool = False, max_customers: Optional[int] = None) -> Dict[str, Any]:
        """Manually trigger batch summary generation immediately."""

        logger.info("🔧 Manual batch summary generation triggered")

        try:
            # Run the async batch job
            result = asyncio.run(self._async_batch_generate_summaries(test_mode, max_customers))
            return {"status": "success", "message": "Batch job completed successfully"}
        except Exception as e:
            logger.error(f"❌ Error in manual batch job: {e}")
            return {"status": "error", "message": str(e)}

    async def generate_single_customer_summary(self, customer_id: int, authenticated_user: dict,
                                             days_back: int = 30, clear_old: bool = True) -> Dict[str, Any]:
        """
        Generate summary for a single customer with enhanced cleanup.

        This method now uses the same post-generation cleanup logic as automated batch processing
        to ensure consistent behavior regardless of generation trigger type.
        """

        try:
            logger.info(f"🔄 Manual summary generation for customer {customer_id}")

            # Optional pre-generation cleanup (legacy behavior for compatibility)
            if clear_old:
                cleared_count = self._clear_customer_old_summaries(customer_id)
                if cleared_count > 0:
                    logger.info(f"🗑️ Pre-generation cleanup: Cleared {cleared_count} old summaries for customer {customer_id}")

            # Import here to avoid circular import
            from routers.interaction_router import _generate_interaction_summary_logic, InteractionSummaryRequest

            # Generate summary using existing logic
            request = InteractionSummaryRequest(days_back=days_back)

            start_time = datetime.now()
            summary_response = await _generate_interaction_summary_logic(
                str(customer_id),
                request,
                authenticated_user
            )
            end_time = datetime.now()

            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)

            # Store the generated summary (this will automatically trigger post-generation cleanup)
            success = self._store_generated_summary(
                customer_id,
                summary_response,
                processing_time_ms,
                generation_type='manual'
            )

            if success:
                logger.info(f"✅ Successfully generated manual summary for customer {customer_id}")
                return {
                    "status": "success",
                    "message": "Summary generated successfully",
                    "summary_response": summary_response,
                    "processing_time_ms": processing_time_ms
                }
            else:
                return {"status": "error", "message": "Failed to store generated summary"}

        except Exception as e:
            logger.error(f"❌ Error generating manual summary for customer {customer_id}: {e}")
            return {"status": "error", "message": str(e)}

    def get_batch_status(self) -> Dict[str, Any]:
        """Get batch job status information for monitoring."""

        try:
            # Get latest batch job stats
            conn = get_db_connection()  # Use anonymous connection for system operations
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            cursor.execute("""
            SELECT
                job_type,
                start_time,
                end_time,
                total_processed,
                total_successful,
                total_errors,
                success_rate
            FROM batch_job_stats
            WHERE DATE(start_time) = CURRENT_DATE
            ORDER BY start_time DESC
            LIMIT 5
            """)

            recent_jobs = [dict(job) for job in cursor.fetchall()]

            cursor.close()
            conn.close()

            return {
                "recent_batch_jobs_today": recent_jobs,
                "manual_trigger_available": True
            }

        except Exception as e:
            logger.error(f"❌ Error getting batch status: {e}")
            return {
                "recent_batch_jobs_today": [],
                "manual_trigger_available": False,
                "error": str(e)
            }

# Global scheduler instance
summary_scheduler = InteractionSummaryScheduler()
