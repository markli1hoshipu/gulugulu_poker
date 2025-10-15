"""
Database queries for deal stage progression system.
Leverages existing infrastructure from crm_data_router.py and insights_sql_query.py
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor

from routers.crm_data_router import get_db_connection, clear_cache
from data.insights_sql_query import get_comprehensive_customer_data

logger = logging.getLogger(__name__)


def get_active_deals_for_stage_analysis(user_email: str = None) -> List[Dict[str, Any]]:
    """
    Fetch all active deals (excluding Closed-Won and Closed-Lost).
    
    Args:
        user_email: User email for database routing (optional)
        
    Returns:
        List of deal dictionaries with client and employee information
    """
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                d.deal_id,
                d.deal_name,
                d.description,
                d.stage,
                d.value_usd,
                d.employee_id,
                d.client_id,
                d.expected_close_date,
                d.last_contact_date,
                d.created_at,
                d.updated_at,
                c.name as client_name,
                c.email as client_email,
                e.name as employee_name,
                e.email as employee_email
            FROM deals d
            LEFT JOIN clients_info c ON d.client_id = c.client_id
            LEFT JOIN employee_info e ON d.employee_id = e.employee_id
            WHERE d.stage NOT IN ('Closed-Won', 'Closed-Lost')
            ORDER BY d.updated_at DESC
        """
        
        cursor.execute(query)
        deals = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        logger.info(f"Found {len(deals)} active deals for stage analysis")
        return [dict(deal) for deal in deals]
        
    except Exception as e:
        logger.error(f"Error fetching active deals: {e}")
        raise


async def get_deal_communications_comprehensive(
    client_id: int,
    authenticated_user: dict,
    days_lookback: int = 30
) -> Dict[str, Any]:
    """
    Fetch comprehensive customer data including emails and notes.
    Leverages existing get_comprehensive_customer_data function.
    
    Args:
        client_id: Client ID to fetch data for
        authenticated_user: Authenticated user context
        days_lookback: Number of days to look back (for filtering)
        
    Returns:
        Dictionary with filtered emails and notes
    """
    try:
        # Use existing comprehensive data function
        comprehensive_data = await get_comprehensive_customer_data(client_id, authenticated_user)
        
        if not comprehensive_data:
            logger.warning(f"No comprehensive data found for client {client_id}")
            return {"emails": [], "notes": []}
        
        # Extract and filter interactions (emails)
        all_interactions = comprehensive_data.get('interaction_details', [])
        cutoff_date = datetime.now() - timedelta(days=days_lookback)
        
        # Filter for emails within lookback period
        emails = []
        for interaction in all_interactions:
            interaction_type = interaction.get('type', '').lower()
            if interaction_type not in ['email', 'follow-up email', 'email follow-up']:
                continue
            
            created_at = interaction.get('created_at')
            if not created_at:
                continue
            
            # Handle both datetime objects and strings
            try:
                if isinstance(created_at, datetime):
                    interaction_date = created_at
                elif isinstance(created_at, str):
                    interaction_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    continue
                
                if interaction_date >= cutoff_date:
                    emails.append(interaction)
            except Exception as e:
                logger.warning(f"Error parsing date for interaction: {e}")
                continue
        
        # Extract and filter notes
        all_notes = comprehensive_data.get('employee_client_notes', [])
        
        # Filter notes within lookback period
        notes = []
        for note in all_notes:
            created_at = note.get('created_at')
            if not created_at:
                continue
            
            # Handle both datetime objects and strings
            try:
                if isinstance(created_at, datetime):
                    note_date = created_at
                elif isinstance(created_at, str):
                    note_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    continue
                
                if note_date >= cutoff_date:
                    notes.append(note)
            except Exception as e:
                logger.warning(f"Error parsing date for note: {e}")
                continue
        
        logger.info(f"Filtered communications for client {client_id}: {len(emails)} emails, {len(notes)} notes (last {days_lookback} days)")
        
        return {
            "emails": emails,
            "notes": notes,
            "all_data": comprehensive_data  # Include full data for context
        }
        
    except Exception as e:
        logger.error(f"Error fetching deal communications for client {client_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"emails": [], "notes": []}


def update_deal_stage(
    deal_id: int,
    new_stage: str,
    reasoning: str,
    user_email: str = None,
    updated_by: str = "automated_stage_progression"
) -> bool:
    """
    Update deal stage.

    Args:
        deal_id: Deal ID to update
        new_stage: New stage value
        reasoning: Explanation for the change (logged only)
        user_email: User email for database routing
        updated_by: Who/what triggered the update (logged only)

    Returns:
        True if successful, False otherwise
    """
    try:
        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get current stage for logging
        cursor.execute("SELECT stage FROM deals WHERE deal_id = %s", (deal_id,))
        result = cursor.fetchone()

        if not result:
            logger.error(f"Deal {deal_id} not found")
            cursor.close()
            conn.close()
            return False

        old_stage = result['stage']

        # Update deal stage
        update_query = """
            UPDATE deals
            SET stage = %s,
                updated_at = CURRENT_TIMESTAMP,
                last_contact_date = CURRENT_TIMESTAMP
            WHERE deal_id = %s
        """
        cursor.execute(update_query, (new_stage, deal_id))

        # Commit transaction
        conn.commit()

        cursor.close()
        conn.close()

        # Clear relevant caches
        clear_cache("get_all_deals")
        clear_cache(f"get_deal_by_id:{deal_id}")

        logger.info(f"✅ Updated deal {deal_id} stage: {old_stage} → {new_stage} | Reason: {reasoning[:100]}... | By: {updated_by}")
        return True

    except Exception as e:
        logger.error(f"Error updating deal {deal_id} stage: {e}")
        import traceback
        logger.error(traceback.format_exc())
        try:
            conn.rollback()
        except:
            pass
        return False




