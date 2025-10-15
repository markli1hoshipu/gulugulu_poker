import os
import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import json
from psycopg2.extras import RealDictCursor

# Import auth from the local auth module
from auth.providers import verify_auth_token

# Import shared database functions
from routers.crm_data_router import (
    get_db_connection,
    get_customer_by_id as get_customer_crm,
    get_employee_id_by_email,
    get_employee_info_by_email,
    get_recent_customer_interactions,
    get_interaction_summary_options
)

# Direct imports of agent classes
from agents.IcebreakerIntroAgent import IcebreakerIntroAgent
from agents.NextActionInsightAgent import NextActionInsightAgent
from agents.RestartMomentumInsightAgent import RestartMomentumInsightAgent
from agents.deal_retrospective_agent import DealRetrospectiveAgent

# Import centralized database queries
from data.insights_sql_query import (
    analyze_customer_activity,
    get_comprehensive_customer_data,
    get_customer_basic_info,
    get_recent_interactions_summary
)

# Import cached summary service
from services.cached_summary_service import cached_summary_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Simple agent registry with direct imports
AGENT_REGISTRY = {
    "IcebreakerIntroAgent": IcebreakerIntroAgent,
    "NextActionInsightAgent": NextActionInsightAgent,
    "RestartMomentumInsightAgent": RestartMomentumInsightAgent,
    "DealRetrospectiveAgent": DealRetrospectiveAgent
}

logger.info(f"Initialized agent registry with {len(AGENT_REGISTRY)} agents: {list(AGENT_REGISTRY.keys())}")


def select_agent_for_customer(customer_analysis: Dict[str, Any]) -> str:
    """
    Select the appropriate agent based on customer analysis.

    Args:
        customer_analysis: Customer activity analysis results

    Returns:
        str: Selected agent class name
    """

    # PRIORITY 1: New customers with no interactions AND no deals
    if customer_analysis.get("is_new_customer", False):
        return "IcebreakerIntroAgent"

    # PRIORITY 2: Customers with interactions but NO active deals - retrospective analysis
    elif customer_analysis.get("has_interactions", False) and not customer_analysis.get("has_active_deals", False):
        return "DealRetrospectiveAgent"

    # PRIORITY 3: NextActionInsightAgent for customers with interactions in last 14 days AND active deals
    elif customer_analysis.get("needs_next_action_insights", False):
        return "NextActionInsightAgent"

    # PRIORITY 4: RestartMomentumInsightAgent for customers with no interactions in 14 days AND active deals
    elif customer_analysis.get("needs_restart_momentum", False):
        return "RestartMomentumInsightAgent"

    # Default fallback to IcebreakerIntroAgent (should rarely be reached)
    else:
        logger.warning("No specific agent criteria met, using IcebreakerIntroAgent as fallback")
        logger.warning(f"Customer analysis: {customer_analysis}")
        return "IcebreakerIntroAgent"

# Pydantic models
class InteractionSummaryRequest(BaseModel):
    days_back: Optional[int] = 30  # Default to last 30 days

class InteractionSummaryResponse(BaseModel):
    status: str
    summary_data: Dict
    customer_id: int
    customer_name: str
    interactions_analyzed: int
    period_analyzed: str
    generated_at: str
    # Enhanced tracking fields for agent and model information
    agent_used: Optional[str] = None
    ai_model_used: Optional[str] = None
    # Churn risk assessment field
    churn_risk: Optional[str] = None  # "low", "medium", or "high"

# DEBUG TEST ENDPOINT WITHOUT AUTH
@router.post("/debug/generate-interaction-summary/{customer_id}")
async def debug_generate_interaction_summary(
    customer_id: str,
    request: InteractionSummaryRequest = InteractionSummaryRequest()
) -> InteractionSummaryResponse:
    """Debug version of generate_interaction_summary without authentication"""
    logger.info(f"🔍 DEBUG: Starting debug interaction summary for customer {customer_id}")

    # Use fake authenticated user for testing
    authenticated_user = {
        'email': 'debug@test.com',
        'name': 'Debug User',
        'role': 'admin'
    }

    # Call the main logic
    return await _generate_interaction_summary_logic(customer_id, request, authenticated_user)

@router.get("/cached-summaries/batch")
async def get_cached_summaries_batch(
    authenticated_user: dict = Depends(verify_auth_token)
):
    """
    Get all cached summaries in a single batch query for CRM initialization.

    Returns:
        List of cached summary objects with customer_id mapping
    """
    try:
        from routers.crm_data_router import get_db_connection
        from psycopg2.extras import RealDictCursor
        import json

        conn = get_db_connection(authenticated_user)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get all successful cached summaries, prioritizing recent automated ones
        query = """
        SELECT DISTINCT ON (customer_id)
            customer_id,
            summary_data,
            generated_at,
            generation_type,
            period_analyzed_days,
            interactions_analyzed,
            agent_used,
            ai_model_used,
            processing_time_ms
        FROM interaction_summaries
        WHERE status = 'success'
        ORDER BY
            customer_id,
            CASE
                WHEN generation_type = 'automated' AND DATE(generated_at) = CURRENT_DATE THEN 1
                WHEN generation_type = 'automated' THEN 2
                WHEN generation_type = 'manual' THEN 3
                ELSE 4
            END,
            generated_at DESC
        """

        cursor.execute(query)
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        # Convert to list of summary objects
        summaries = []
        for row in results:
            summary_data = row['summary_data']
            if isinstance(summary_data, str):
                summary_data = json.loads(summary_data)

            summaries.append({
                'customer_id': row['customer_id'],
                'summary_data': summary_data,
                'generated_at': row['generated_at'].isoformat() if hasattr(row['generated_at'], 'isoformat') else str(row['generated_at']),
                'generation_type': row['generation_type'],
                'period_analyzed_days': row['period_analyzed_days'],
                'interactions_analyzed': row['interactions_analyzed'],
                'agent_used': row['agent_used'],
                'ai_model_used': row['ai_model_used'],
                'processing_time_ms': row['processing_time_ms']
            })

        logger.info(f"Batch loaded {len(summaries)} cached summaries")
        return summaries

    except Exception as e:
        logger.error(f"Error loading cached summaries batch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load cached summaries: {str(e)}")

@router.get("/interaction-summary/{customer_id}")
async def get_interaction_summary(
    customer_id: str,
    days_back: int = 30,
    force_refresh: bool = False,
    authenticated_user: dict = Depends(verify_auth_token)
) -> InteractionSummaryResponse:
    """
    Get interaction summary for a customer (uses cached summaries when available).

    Args:
        customer_id: Customer ID
        days_back: Number of days to analyze (default: 30)
        force_refresh: Force real-time generation instead of using cache (default: False)
        authenticated_user: Authenticated user info

    Returns:
        InteractionSummaryResponse: Summary data (cached or real-time)
    """
    try:
        customer_id_int = int(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")

    return await cached_summary_service.get_summary(
        customer_id_int,
        authenticated_user,
        days_back,
        force_refresh
    )

@router.post("/generate-interaction-summary/{customer_id}")
async def generate_interaction_summary(
    customer_id: str,
    request: InteractionSummaryRequest = InteractionSummaryRequest(),
    authenticated_user: dict = Depends(verify_auth_token)
) -> InteractionSummaryResponse:
    """
    Generate interaction summary for a customer (always real-time, bypasses cache).
    This endpoint is kept for backward compatibility and manual generation.
    """
    return await _generate_interaction_summary_logic(customer_id, request, authenticated_user)

async def _generate_interaction_summary_logic(
    customer_id: str,
    request: InteractionSummaryRequest,
    authenticated_user: dict
) -> InteractionSummaryResponse:
    """Generate a comprehensive interaction summary for a customer using Gemini AI."""
    
    try:
        logger.info(f"Generating interaction summary for customer {customer_id} (last {request.days_back} days)")
        
        # Convert customer_id to int for CRM service
        try:
            customer_id_int = int(customer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid customer ID format")
        
        # Get customer data using comprehensive CRM service function
        try:
            customer = await get_customer_crm(customer_id_int, authenticated_user)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")
            raise e
        
        # Extract user information and get employee_id
        user_name = authenticated_user.get('name', 'Customer Success Manager')
        user_email = authenticated_user.get('email', '')
        user_role = 'Customer Success Manager'  # Default role
        
        # Get employee information by email
        employee_id = None
        if user_email:
            try:
                employee_id = get_employee_id_by_email(user_email)
                # Get employee details for proper signature
                employee_info = get_employee_info_by_email(user_email)
                user_name = employee_info.get('name', user_name)
                user_role = employee_info.get('role', user_role)
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"Employee not found for email {user_email}, using all interactions")
                else:
                    raise e
        
        # Get recent interactions from database - now returns ALL interactions for the customer
        days_back = request.days_back or 30  # Handle None case
        interactions = get_recent_customer_interactions(customer_id, days_back)
        
        # NOTE: Don't return early for no interactions - agents can still provide valuable insights!
        # Especially IcebreakerIntroAgent which is designed for customers with little recent activity
        logger.info(f"🔍 DEBUG: Found {len(interactions)} interactions for customer {customer_id_int}")

        if not interactions:
            logger.info(f"🔍 DEBUG: No recent interactions found, but proceeding with agent-based approach for icebreaker insights")
        
        # DYNAMIC AGENT SELECTION SYSTEM
        # Analyze customer activity patterns
        logger.info(f"🔍 DEBUG: Starting customer analysis for customer {customer_id_int}")
        customer_analysis = await analyze_customer_activity(customer_id_int, authenticated_user)
        logger.info(f"🔍 DEBUG: Customer recent statistics: {customer_analysis}")

        # Select appropriate agent based on customer patterns
        selected_agent_name = select_agent_for_customer(customer_analysis)
        logger.info(f"🔍 DEBUG: Selected agent: {selected_agent_name}")

        # Try agent-based approach first
        summary_data = None
        actual_agent_used = None
        actual_model_used = None

        if selected_agent_name and selected_agent_name in AGENT_REGISTRY:
            try:

                # Initialize the selected agent (agents handle their own initialization)
                agent_class = AGENT_REGISTRY[selected_agent_name]
                logger.info(f"Initializing agent {selected_agent_name}")
                agent = agent_class()
                logger.info(f"Agent {selected_agent_name} initialized successfully")

                # Capture actual agent and model information
                actual_agent_used = selected_agent_name
                try:
                    # Get model information from the agent's model factory
                    model_info = agent.model_factory.get_model_info()
                    actual_model_used = f"{model_info.provider}-{model_info.model_name}"
                    logger.info(f"🔍 DEBUG: Captured model info - Provider: {model_info.provider}, Model: {model_info.model_name}")
                except Exception as model_error:
                    logger.warning(f"⚠️ Could not capture model info from agent: {model_error}")
                    actual_model_used = "unknown"

                # Get comprehensive customer data from all relevant tables
                logger.info(f"Getting comprehensive customer data")
                comprehensive_data = await get_comprehensive_customer_data(customer_id_int, authenticated_user)
                logger.info(f"Comprehensive data retrieved: {comprehensive_data is not None}")

                if comprehensive_data:
                    # Use comprehensive data structure for agent
                    client_history = comprehensive_data
                    logger.info(f"Using comprehensive data: {len(client_history.get('interaction_details', []))} interactions, "
                               f"{len(client_history.get('deals', []))} deals, "
                               f"{len(client_history.get('customer_feedback', []))} feedback entries")
                else:
                    # Fallback to basic data structure if comprehensive data fails
                    logger.warning("Comprehensive data gathering failed, using basic data structure")
                    client_history = {
                        "client_info": {
                            "name": customer.company,
                            "status": customer.status,
                            "primary_contact": customer.primaryContact,
                            "email": customer.email,
                            "industry": customer.industry
                        },
                        "client_details": {
                            "satisfaction_score": customer.satisfactionScore or 8.0,
                            "health_score": customer.healthScore or 75,
                            "last_interaction": customer.lastInteraction,
                            "renewal_date": customer.renewalDate,
                            "expansion_potential": customer.expansionPotential
                        },
                        "interaction_details": interactions,
                        "deals": [],
                        "customer_feedback": [],
                        "summary_metrics": {
                            "total_interactions": len(interactions),
                            "total_interaction_time_minutes": sum(
                                interaction.get('duration_minutes', 30) for interaction in interactions
                            )
                        }
                    }

                # Generate insights using the selected agent
                logger.info(f" Client history keys: {list(client_history.keys()) if client_history else 'None'}")
                agent_response = agent.generate_quick_insights(client_history)
                logger.info(f"Agent response received, type: {type(agent_response)}, length: {len(str(agent_response)) if agent_response else 0}")

                # Parse agent response (should be JSON)
                if isinstance(agent_response, str):
                    logger.info(f"Agent response is string, attempting to parse JSON")
                    try:
                        # Strip markdown code blocks if present (fix for IcebreakerIntroAgent)
                        cleaned_response = agent_response.strip()
                        if cleaned_response.startswith('```json'):
                            cleaned_response = cleaned_response.replace('```json', '').replace('```', '')
                        elif cleaned_response.startswith('```'):
                            cleaned_response = cleaned_response.replace('```', '')
                        cleaned_response = cleaned_response.strip()

                        # Fix JSON control character issues - replace literal newlines in string values
                        import re
                        # Simple approach: replace problematic newlines that break JSON parsing
                        # Look for patterns like: "text\nmore text" and convert to "text\\nmore text"
                        cleaned_response = re.sub(r'([^\\])\n([^}\]",\s])', r'\1\\n\2', cleaned_response)
                        # Also handle newlines at the start of continuation lines
                        cleaned_response = re.sub(r'\n(Reasoning:)', r'\\n\1', cleaned_response)
                        agent_data = json.loads(cleaned_response)

                        # Convert agent format to expected API format
                        # Special handling for IcebreakerIntroAgent (new customer scenarios)
                        if selected_agent_name == "IcebreakerIntroAgent":
                            # Format next steps with reasoning on separate lines
                            formatted_next_steps = []
                            for step in agent_data.get('Next Move', [])[:2]:
                                if isinstance(step, str) and "Reasoning:" in step:
                                    # Split action and reasoning
                                    parts = step.split("Reasoning:", 1)
                                    if len(parts) == 2:
                                        action = parts[0].replace("Action:", "").strip()
                                        reasoning = parts[1].strip()
                                        formatted_next_steps.append(f"{action}\n    → {reasoning}")
                                    else:
                                        formatted_next_steps.append(step)
                                else:
                                    formatted_next_steps.append(step)

                            # Process insights - preserve original order from agent
                            insights = agent_data.get('Insights', [])

                            # Take all insights in the order provided by the agent (up to 3)
                            # Expected order: Experience, Context, Icebreaker
                            final_insights = insights[:3]

                            logger.info(f"🤖 ICEBREAKER: Processing {len(insights)} insights from agent")
                            logger.info(f"🤖 ICEBREAKER: Final insights in order: {[insight[:50] + '...' for insight in final_insights]}")

                            summary_data = {
                                "summary": "AI Agent Analysis: new customer",
                                "interaction_count": len(interactions),  # Use actual interaction count
                                "recent_activities": final_insights,  # Prioritized AI Insights with icebreakers first
                                "engagement_level": "new",  # Set to "new" for IcebreakerIntroAgent
                                "next_steps": formatted_next_steps,
                                "churn_risk": agent_data.get('churn_risk', 'low')  # New customers typically have low churn risk
                            }

                            logger.info(f"🤖 ICEBREAKER: Formatted response for new customer with {len(formatted_next_steps)} next steps")
                            logger.info(f"🤖 ICEBREAKER: Churn risk for new customer: {agent_data.get('churn_risk', 'low')}")
                        else:
                            # Standard format for other agents
                            # Special handling for NextActionInsightAgent - should always be "active"
                            if selected_agent_name == "NextActionInsightAgent":
                                engagement_level = "active"  # NextActionInsightAgent is only used for active customers
                            else:
                                engagement_level = agent_data.get('Activities', 'medium').lower()

                            summary_data = {
                                "summary": f"AI Agent Analysis: {agent_data.get('Activities', 'active')} customer status",
                                "interaction_count": len(interactions),
                                "recent_activities": agent_data.get('Insights', [])[:3],  # Take first 3 insights
                                "engagement_level": engagement_level,
                                "next_steps": agent_data.get('Next Move', [])[:2],  # Take first 2 recommendations
                                "churn_risk": agent_data.get('churn_risk')  # Extract churn risk from agent output
                            }

                            # Log churn risk extraction
                            if agent_data.get('churn_risk'):
                                logger.info(f"🤖 AGENT: Extracted churn_risk='{agent_data.get('churn_risk')}' from {selected_agent_name}")
                            else:
                                logger.warning(f"⚠️ AGENT: No churn_risk field in {selected_agent_name} output")

                        logger.info(f"🤖 AGENT: Successfully generated agent-based summary for customer {customer_id}")

                    except json.JSONDecodeError as e:
                        logger.error(f"🔍 DEBUG: JSON parsing failed: {e}")
                        logger.error(f"🔍 DEBUG: Raw agent response: {agent_response}")
                        logger.warning(f"🤖 AGENT: Agent response not valid JSON, falling back to legacy system: {e}")
                        logger.warning(f"🤖 AGENT: Raw response preview: {agent_response[:200]}...")
                        summary_data = None
                else:
                    logger.error(f"🔍 DEBUG: Agent response is not a string: {type(agent_response)}")
                    summary_data = None

            except Exception as e:
                logger.error(f"❌ Exception in agent-based analysis: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                logger.error(f"Agent {selected_agent_name} failed for customer {customer_id_int}")
                summary_data = None
        else:
            logger.warning(f"🔍 DEBUG: Agent not selected or not in registry. Selected: {selected_agent_name}, In registry: {selected_agent_name in AGENT_REGISTRY if selected_agent_name else False}")

        # If agent-based approach failed, raise clear error
        if summary_data is None:
            error_msg = f"Agent-based summary generation failed for customer {customer_id}"
            if selected_agent_name:
                error_msg += f" using {selected_agent_name}"

            logger.error(f"❌ {error_msg}. No fallback system available.")
            logger.error(f"Customer: {customer.company} (ID: {customer_id_int})")
            logger.error(f"Interactions found: {len(interactions)}")

            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate interaction summary. Agent: {selected_agent_name or 'None'}. Please check server logs for details."
            )

        logger.info(f"Successfully generated interaction summary for customer {customer_id}")

        # Extract churn_risk from agent's summary_data and update database
        # NOTE: Churn risk is now assessed by the CRM agents (NextActionInsightAgent, RestartMomentumInsightAgent)
        # They combine history patterns + emails + notes + deals for comprehensive risk assessment
        churn_risk_from_agent = None
        customer_status = None

        try:
            logger.info(f"🔍 CHURN: Extracting churn risk from agent summary for customer {customer_id_int}")

            # Extract churn_risk from agent's output
            if summary_data and isinstance(summary_data, dict):
                churn_risk_from_agent = summary_data.get('churn_risk')

                if churn_risk_from_agent:
                    logger.info(f"✅ CHURN: Customer {customer_id_int} - Churn Risk: {churn_risk_from_agent} (from agent assessment)")
                else:
                    logger.warning(f"⚠️ CHURN: No churn_risk found in agent summary for customer {customer_id_int}")

            # Determine customer status based on which agent was selected
            try:
                logger.info(f"🎯 STATUS: Determining customer status for customer {customer_id_int}")

                # SIMPLIFIED LOGIC: Map agent directly to status
                # - NextActionInsightAgent -> active (recent interactions + active deals)
                # - RestartMomentumInsightAgent -> inactive (no recent interactions but has active deals)
                # - IcebreakerIntroAgent -> active (new customer, treat as active opportunity)
                # - DealRetrospectiveAgent -> completed (has interactions but no active deals - completed engagement cycle)

                if actual_agent_used == 'NextActionInsightAgent':
                    customer_status = 'active'
                elif actual_agent_used == 'RestartMomentumInsightAgent':
                    customer_status = 'inactive'
                elif actual_agent_used == 'IcebreakerIntroAgent':
                    customer_status = 'active'  # New customers are active opportunities
                elif actual_agent_used == 'DealRetrospectiveAgent':
                    customer_status = 'completed'  # Has interactions but no active deals - completed engagement cycle
                else:
                    # Fallback for legacy system or unknown agents
                    engagement_level = summary_data.get('engagement_level', '') if summary_data else ''
                    if engagement_level in ['churned', 'lost']:
                        customer_status = 'lost'
                    elif engagement_level in ['inactive', 'low']:
                        customer_status = 'inactive'
                    else:
                        customer_status = 'active'

                logger.info(f"🎯 STATUS: Customer {customer_id_int} - Status: '{customer_status}' (Agent: '{actual_agent_used}', churn_risk: '{churn_risk_from_agent}')")

            except Exception as stage_error:
                logger.error(f"❌ STATUS: Customer status calculation failed: {stage_error}")
                customer_status = 'active'  # Default fallback to active

            # Update database with churn risk and customer status
            if churn_risk_from_agent or customer_status:
                try:
                    from routers.crm_data_router import get_db_connection, clear_cache

                    conn = get_db_connection(user_email)
                    cursor = conn.cursor()

                    logger.info(f"💾 UPDATE: Updating customer {customer_id_int} - churn_risk='{churn_risk_from_agent}', status='{customer_status}'")

                    # Update clients_details table with churn risk and customer status
                    update_query = """
                        UPDATE clients_details
                        SET churn_risk = %s, status = %s, updated_at = %s
                        WHERE client_id = %s
                    """
                    cursor.execute(update_query, (churn_risk_from_agent, customer_status, datetime.now(), customer_id_int))

                    # Log the number of rows affected
                    rows_updated = cursor.rowcount
                    logger.info(f"💾 UPDATE: Database UPDATE executed - {rows_updated} row(s) affected for customer {customer_id_int}")

                    # Commit the update
                    conn.commit()
                    cursor.close()
                    conn.close()

                    logger.info(f"✅ UPDATE: Successfully committed updates for customer {customer_id_int} - churn_risk='{churn_risk_from_agent}', status='{customer_status}'")

                    # Clear cache for this customer
                    clear_cache("get_all_customers")
                    clear_cache("get_dashboard_stats")
                    clear_cache(f"get_customer_by_id:{customer_id_int}")

                except Exception as db_error:
                    logger.error(f"❌ UPDATE: Failed to update database: {db_error}")
                    # Don't fail the entire request if DB update fails

        except Exception as churn_error:
            logger.error(f"❌ CHURN: Churn risk extraction/update failed: {churn_error}")
            # Don't fail the entire request if churn risk extraction fails

        # Extract churn_risk from summary_data if available
        churn_risk = None
        if summary_data and isinstance(summary_data, dict):
            churn_risk = summary_data.get("churn_risk")
            if churn_risk:
                logger.info(f"✅ Extracted churn_risk from agent response: {churn_risk}")
            else:
                logger.warning("⚠️ No churn_risk found in agent response")

        return InteractionSummaryResponse(
            status="success",
            summary_data=summary_data,
            customer_id=customer_id_int,
            customer_name=customer.company,
            interactions_analyzed=len(interactions),
            period_analyzed=f"{days_back} days",
            generated_at=datetime.now().isoformat(),
            agent_used=actual_agent_used,
            ai_model_used=actual_model_used,
            churn_risk=churn_risk
        )

    except Exception as e:
        logger.error(f"Error generating interaction summary for customer {customer_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate interaction summary: {str(e)}"
        )

# Administrative endpoints for automated summary system
@router.get("/admin/summary-cache/stats")
async def get_summary_cache_stats(
    authenticated_user: dict = Depends(verify_auth_token)
):
    """Get cache statistics for monitoring (admin only)."""

    # Basic admin check (you may want to implement proper role-based access)
    user_email = authenticated_user.get('email', '')
    if not user_email.endswith('@preludeos.com'):
        raise HTTPException(status_code=403, detail="Admin access required")

    stats = cached_summary_service.get_cache_stats()
    return {"status": "success", "cache_stats": stats}

@router.post("/admin/summary-batch/run")
async def trigger_batch_summary_generation(
    test_mode: bool = False,
    max_customers: Optional[int] = None,
    authenticated_user: dict = Depends(verify_auth_token)
):
    """Manually trigger batch summary generation (admin only)."""

    # Basic admin check
    user_email = authenticated_user.get('email', '')
    if not user_email.endswith('@preludeos.com'):
        raise HTTPException(status_code=403, detail="Admin access required")

    from services.interaction_summary_scheduler import summary_scheduler

    result = summary_scheduler.force_run_now(test_mode, max_customers)
    return result

@router.delete("/admin/summary-cache/clear")
async def clear_summary_cache(
    customer_id: Optional[int] = None,
    older_than_days: Optional[int] = None,
    authenticated_user: dict = Depends(verify_auth_token)
):
    """Clear cached summaries (admin only)."""

    # Basic admin check
    user_email = authenticated_user.get('email', '')
    if not user_email.endswith('@preludeos.com'):
        raise HTTPException(status_code=403, detail="Admin access required")

    deleted_count = cached_summary_service.clear_cache(customer_id, older_than_days)
    return {"status": "success", "deleted_count": deleted_count}

@router.get("/admin/summary-batch/status")
async def get_batch_status(
    authenticated_user: dict = Depends(verify_auth_token)
):
    """Get batch job status and monitoring information (admin only)."""

    # Basic admin check
    user_email = authenticated_user.get('email', '')
    if not user_email.endswith('@preludeos.com'):
        raise HTTPException(status_code=403, detail="Admin access required")

    from services.interaction_summary_scheduler import summary_scheduler

    batch_status = summary_scheduler.get_batch_status()
    return {"status": "success", "batch_status": batch_status}

@router.post("/admin/generate-customer-summary/{customer_id}")
async def generate_customer_summary_with_cleanup(
    customer_id: str,
    request: InteractionSummaryRequest = InteractionSummaryRequest(),
    clear_old: bool = True,
    authenticated_user: dict = Depends(verify_auth_token)
):
    """Generate summary for a specific customer with selective cleanup (admin only)."""

    # Basic admin check
    user_email = authenticated_user.get('email', '')
    if not user_email.endswith('@preludeos.com'):
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        customer_id_int = int(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")

    from services.interaction_summary_scheduler import summary_scheduler

    result = await summary_scheduler.generate_single_customer_summary(
        customer_id_int,
        authenticated_user,
        request.days_back,
        clear_old=clear_old
    )

    if result["status"] == "success":
        return result["summary_response"]
    else:
        raise HTTPException(status_code=500, detail=result["message"])

@router.get("/interaction-summary-options/{customer_id}")
async def get_interaction_summary_options_endpoint(
    customer_id: str,
    authenticated_user: dict = Depends(verify_auth_token)
):
    """Get available options for interaction summary generation"""

    try:
        customer_id_int = int(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")

    # Extract user information and get employee_id
    user_email = authenticated_user.get('email', '')

    # Get employee information by email
    employee_id = None
    if user_email:
        try:
            employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                logger.warning(f"Employee not found for email {user_email}, using all interactions")
            else:
                raise e

    # Get interaction summary options - filtered by employee if available
    if employee_id is not None:
        return get_interaction_summary_options(customer_id, employee_id)
    else:
        return get_interaction_summary_options(customer_id)