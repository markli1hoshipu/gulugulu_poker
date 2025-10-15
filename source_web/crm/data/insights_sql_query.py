"""
Centralized SQL queries for CRM insights generation system.

This module contains all database query logic for customer activity analysis,
agent input data preparation, and insight generation support.
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor
from routers.crm_data_router import get_db_connection

logger = logging.getLogger(__name__)


async def analyze_customer_activity(customer_id: int, authenticated_user: dict) -> Dict[str, Any]:
    """
    Analyze customer activity patterns to determine customer classification.

    Args:
        customer_id: Customer ID to analyze
        authenticated_user: Authenticated user context

    Returns:
        Dict containing customer analysis results
    """
    try:
        conn = get_db_connection(authenticated_user)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Query interaction_details table for customer interactions (14-day window for business rule)
        interaction_query = """
        SELECT COUNT(*) as interaction_count,
               MAX(created_at) as last_interaction_date,
               MIN(created_at) as first_interaction_date,
               COUNT(CASE WHEN created_at >= %s THEN 1 END) as interactions_last_14_days
        FROM interaction_details
        WHERE customer_id = %s
        """

        # Calculate 14-day cutoff for business rule
        fourteen_days_ago = datetime.now() - timedelta(days=14)
        cursor.execute(interaction_query, (fourteen_days_ago, customer_id))
        interaction_data = cursor.fetchone()

        # Check if deals table exists and query it with status filtering
        deals_data = {"deal_count": 0, "active_deal_count": 0, "last_deal_date": None, "first_deal_date": None}
        try:
            # Query for all deals and active deals (excluding Closed-Lost and Closed-Won)
            deals_query = """
            SELECT COUNT(*) as deal_count,
                   COUNT(CASE WHEN stage NOT IN ('Closed-Lost', 'Closed-Won') THEN 1 END) as active_deal_count,
                   MAX(created_at) as last_deal_date,
                   MIN(created_at) as first_deal_date
            FROM deals
            WHERE client_id = %s
            """
            cursor.execute(deals_query, (customer_id,))
            deals_result = cursor.fetchone()
            if deals_result:
                deals_data = dict(deals_result)
        except Exception as e:
            logger.debug(f"Deals table not accessible for customer {customer_id}: {e}")
            # Deals table doesn't exist, use default values

        cursor.close()
        conn.close()

        # Analyze activity patterns
        interaction_count = interaction_data.get('interaction_count', 0) if interaction_data else 0
        interactions_last_14_days = interaction_data.get('interactions_last_14_days', 0) if interaction_data else 0
        deal_count = deals_data.get('deal_count', 0)
        active_deal_count = deals_data.get('active_deal_count', 0)
        last_interaction = interaction_data.get('last_interaction_date') if interaction_data else None

        # Calculate days since last interaction
        days_since_interaction = None
        if last_interaction:
            if isinstance(last_interaction, str):
                last_interaction = datetime.fromisoformat(last_interaction.replace('Z', '+00:00'))
            days_since_interaction = (datetime.now(last_interaction.tzinfo) - last_interaction).days

        # Business rule: RestartMomentumInsightAgent for customers with no interactions in 14 days AND active deals
        needs_restart_momentum = (interactions_last_14_days == 0 and active_deal_count > 0)

        # Business rule: NextActionInsightAgent for customers with interactions in last 14 days AND active deals
        needs_next_action_insights = (interactions_last_14_days > 0 and active_deal_count > 0)

        analysis = {
            "interaction_count": interaction_count,
            "interactions_last_14_days": interactions_last_14_days,
            "deal_count": deal_count,
            "active_deal_count": active_deal_count,
            "last_interaction_date": last_interaction,
            "days_since_interaction": days_since_interaction,
            "has_interactions": interaction_count > 0,
            "has_deals": deal_count > 0,
            "has_active_deals": active_deal_count > 0,
            "needs_restart_momentum": needs_restart_momentum,
            "needs_next_action_insights": needs_next_action_insights,
            "is_new_customer": interaction_count == 0 and deal_count == 0,
            "is_active": days_since_interaction is not None and days_since_interaction <= 14,
            "is_inactive": days_since_interaction is not None and days_since_interaction > 14
        }

        logger.info(f"Customer {customer_id} analysis: {analysis}")
        return analysis

    except Exception as e:
        logger.error(f"Failed to analyze customer activity for {customer_id}: {e}")
        return {
            "interaction_count": 0,
            "interactions_last_14_days": 0,
            "deal_count": 0,
            "active_deal_count": 0,
            "last_interaction_date": None,
            "days_since_interaction": None,
            "has_interactions": False,
            "has_deals": False,
            "has_active_deals": False,
            "needs_restart_momentum": False,
            "needs_next_action_insights": False,
            "is_new_customer": True,
            "is_active": False,
            "is_inactive": False
        }


async def get_comprehensive_customer_data(customer_id: int, authenticated_user: dict) -> Dict[str, Any]:
    """
    Gather comprehensive customer data from all relevant tables for agent input.
    
    Args:
        customer_id: Customer ID to gather data for
        authenticated_user: Authenticated user context
        
    Returns:
        Dict containing comprehensive customer data structure
    """
    try:
        logger.info(f"🔍 DB Query [Customer {customer_id}]: Starting comprehensive data retrieval")
        start_time = datetime.now()

        conn = get_db_connection(authenticated_user)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        logger.info(f"✅ DB Query [Customer {customer_id}]: Database connection established")
        
        # Get customer basic information from clients_info table
        client_info_query = """
        SELECT client_id, name, primary_contact, email, phone, industry,
               location, preferred_language, source, status, notes,
               created_at, updated_at
        FROM clients_info
        WHERE client_id = %s
        """
        
        cursor.execute(client_info_query, (customer_id,))
        client_info = cursor.fetchone()
        
        if not client_info:
            logger.warning(f"No client info found for customer {customer_id}")
            cursor.close()
            conn.close()
            return {}
        
        # Get customer details from clients_details table
        client_details_query = """
        SELECT lifetime_value as contract_value, monthly_recurring_revenue as monthly_value,
               renewal_date, health_score, churn_risk, satisfaction_score,
               upsell_potential as expansion_potential, product_usage,
               tags, recent_activities, last_interaction, total_interactions,
               support_tickets, onboarding_complete, negotiation_steps,
               progress, contact_birthday
        FROM clients_details
        WHERE client_id = %s
        """
        
        cursor.execute(client_details_query, (customer_id,))
        client_details = cursor.fetchone()
        
        # Get all interaction history from interaction_details table
        logger.info(f"🔍 DB Query [Customer {customer_id}]: Querying interaction_details table")
        interactions_query = """
        SELECT interaction_id, customer_id, employee_id, type, content, created_at, updated_at,
               gmail_message_id, synced_by_employee_id
        FROM interaction_details
        WHERE customer_id = %s
        ORDER BY updated_at DESC
        """

        cursor.execute(interactions_query, (customer_id,))
        interactions = cursor.fetchall()

        logger.info(f"📊 DB Query [Customer {customer_id}]: Found {len(interactions)} interactions")

        # Enhanced logging for customer 102
        if customer_id == 102:
            logger.info(f"🎯 DB Query [Customer 102]: DETAILED INTERACTION LOGGING ENABLED")
            if interactions:
                logger.info(f"📝 DB Query [Customer 102]: First interaction: {dict(interactions[0])}")
                interaction_types = [i.get('type') for i in interactions]
                logger.info(f"📊 DB Query [Customer 102]: Interaction types: {set(interaction_types)}")
            else:
                logger.warning(f"⚠️ DB Query [Customer 102]: NO INTERACTIONS FOUND in database")
        
        # Get deal information from deals table (if exists)
        deals = []
        try:
            deals_query = """
            SELECT deal_id, deal_name, client_id, value_usd, stage,
                   description, employee_id, created_at, updated_at,
                   completion_time, last_contact_date, expected_close_date
            FROM deals
            WHERE client_id = %s
            ORDER BY created_at DESC
            """
            cursor.execute(deals_query, (customer_id,))
            deals_result = cursor.fetchall()
            if deals_result:
                deals = [dict(deal) for deal in deals_result]
        except Exception as e:
            logger.warning(f"❌ DB Query [Customer {customer_id}]: Deals query failed: {e}")
            # Rollback the transaction to clear the error state
            conn.rollback()
            logger.info(f"🔄 DB Query [Customer {customer_id}]: Transaction rolled back after deals query error")
        
        # Get customer feedback (if table exists)
        customer_feedback = []
        try:
            feedback_query = """
            SELECT feedback_id, customer_id, feedback_text, rating,
                   feedback_date, category, created_at
            FROM customer_feedback
            WHERE customer_id = %s
            ORDER BY feedback_date DESC
            """
            cursor.execute(feedback_query, (customer_id,))
            feedback_result = cursor.fetchall()
            if feedback_result:
                customer_feedback = [dict(feedback) for feedback in feedback_result]
        except Exception as e:
            logger.warning(f"❌ DB Query [Customer {customer_id}]: Customer feedback query failed: {e}")
            # Rollback the transaction to clear the error state
            conn.rollback()
            logger.info(f"🔄 DB Query [Customer {customer_id}]: Transaction rolled back after feedback query error")

        # Get employee client notes from employee_client_notes table
        employee_client_notes = []
        try:
            logger.info(f"🔍 DB Query [Customer {customer_id}]: Querying employee_client_notes table")

            # First check if the table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'employee_client_notes'
                ) as table_exists
            """)
            table_exists_result = cursor.fetchone()
            table_exists = table_exists_result['table_exists'] if table_exists_result else False
            logger.info(f"🔍 DB Query [Customer {customer_id}]: employee_client_notes table exists: {table_exists}")

            if table_exists:
                notes_query = """
                SELECT note_id, employee_id, client_id, title, body,
                       created_at, updated_at, star
                FROM employee_client_notes
                WHERE client_id = %s
                ORDER BY created_at DESC
                """
                logger.info(f"🔍 DB Query [Customer {customer_id}]: Executing notes query with client_id={customer_id}")
                cursor.execute(notes_query, (customer_id,))
                notes_result = cursor.fetchall()
                logger.info(f"🔍 DB Query [Customer {customer_id}]: Query returned {len(notes_result)} raw results")

                if notes_result:
                    employee_client_notes = [dict(note) for note in notes_result]
                    logger.info(f"📝 DB Query [Customer {customer_id}]: First note: {employee_client_notes[0]}")
                else:
                    logger.warning(f"⚠️ DB Query [Customer {customer_id}]: Query returned no results")

                    # Debug: Check if any notes exist for this customer with different query
                    cursor.execute("SELECT COUNT(*) as note_count FROM employee_client_notes WHERE client_id = %s", (customer_id,))
                    count_result = cursor.fetchone()
                    count_value = count_result['note_count'] if count_result else 0
                    logger.info(f"🔍 DB Query [Customer {customer_id}]: Debug count query result: {count_value}")

                    # Debug: Check what client_ids exist in the table
                    cursor.execute("SELECT DISTINCT client_id FROM employee_client_notes ORDER BY client_id")
                    all_client_ids_result = cursor.fetchall()
                    all_client_ids = [row['client_id'] for row in all_client_ids_result]
                    logger.info(f"🔍 DB Query [Customer {customer_id}]: All client_ids in table: {all_client_ids[:10]}...")
            else:
                logger.warning(f"⚠️ DB Query [Customer {customer_id}]: employee_client_notes table DOES NOT EXIST")

            logger.info(f"📊 DB Query [Customer {customer_id}]: Found {len(employee_client_notes)} employee client notes")

            # Enhanced logging for customer 102 and 113
            if customer_id in [102, 113]:
                logger.info(f"🎯 DB Query [Customer {customer_id}]: DETAILED NOTES LOGGING ENABLED")
                if employee_client_notes:
                    logger.info(f"📝 DB Query [Customer {customer_id}]: First note: {employee_client_notes[0]}")
                else:
                    logger.warning(f"⚠️ DB Query [Customer {customer_id}]: NO NOTES FOUND in employee_client_notes table")

        except Exception as e:
            logger.error(f"❌ DB Query [Customer {customer_id}]: Employee client notes query failed: {e}")
            import traceback
            logger.error(f"🔍 DB Query [Customer {customer_id}]: Traceback: {traceback.format_exc()}")

        cursor.close()
        conn.close()
        
        # Calculate summary metrics
        total_interactions = len(interactions)

        # Prepare comprehensive data structure
        comprehensive_data = {
            "client_info": dict(client_info) if client_info else {},
            "client_details": dict(client_details) if client_details else {},
            "interaction_details": [dict(interaction) for interaction in interactions],
            "deals": deals,
            "customer_feedback": customer_feedback,
            "employee_client_notes": employee_client_notes,  # Added missing notes data
            "summary_metrics": {
                "total_interactions": total_interactions,
                "deal_count": len(deals),
                "feedback_count": len(customer_feedback),
                "notes_count": len(employee_client_notes)
            }
        }
        
        total_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"✅ DB Query [Customer {customer_id}]: Comprehensive data gathered in {total_time:.2f}s: "
                   f"{total_interactions} interactions, {len(deals)} deals, "
                   f"{len(customer_feedback)} feedback entries, {len(employee_client_notes)} notes")
        
        return comprehensive_data
        
    except Exception as e:
        logger.error(f"Failed to gather comprehensive customer data for {customer_id}: {e}")
        return {}


async def get_customer_basic_info(customer_id: int, authenticated_user: dict) -> Optional[Dict[str, Any]]:
    """
    Get basic customer information for quick lookups.
    
    Args:
        customer_id: Customer ID to look up
        authenticated_user: Authenticated user context
        
    Returns:
        Dict containing basic customer info or None if not found
    """
    try:
        conn = get_db_connection(authenticated_user)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT ci.client_id, ci.name, ci.primary_contact, ci.email, ci.status,
               cd.satisfaction_score, cd.health_score, cd.last_interaction
        FROM clients_info ci
        LEFT JOIN clients_details cd ON ci.client_id = cd.client_id
        WHERE ci.client_id = %s
        """
        
        cursor.execute(query, (customer_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Failed to get basic customer info for {customer_id}: {e}")
        return None


async def get_recent_interactions_summary(customer_id: int, days_back: int, 
                                        authenticated_user: dict) -> Dict[str, Any]:
    """
    Get summary of recent interactions for a customer.
    
    Args:
        customer_id: Customer ID
        days_back: Number of days to look back
        authenticated_user: Authenticated user context
        
    Returns:
        Dict containing interaction summary
    """
    try:
        conn = get_db_connection(authenticated_user)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        query = """
        SELECT COUNT(*) as interaction_count,
               COUNT(DISTINCT type) as unique_types,
               MAX(created_at) as last_interaction,
               array_agg(DISTINCT type) as interaction_types
        FROM interaction_details
        WHERE customer_id = %s AND created_at >= %s
        """
        
        cursor.execute(query, (customer_id, cutoff_date))
        summary = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return dict(summary) if summary else {}
        
    except Exception as e:
        logger.error(f"Failed to get interaction summary for customer {customer_id}: {e}")
        return {}
