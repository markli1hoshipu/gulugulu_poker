"""
Call Summary Router - Handles all call summary related endpoints
Stores call summaries in interaction_details table with type='call'
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
from psycopg2.extras import RealDictCursor

from auth.providers import verify_auth_token
from routers.crm_data_router import get_db_connection, get_employee_id_by_email, clear_cache, cached

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class CallSummaryCreate(BaseModel):
    """Model for creating a new call summary"""
    content: str = Field(..., min_length=1, max_length=5000, description="Call summary content")
    theme: Optional[str] = Field(None, max_length=50, description="Call topic/theme")
    source: Optional[str] = Field(None, max_length=50, description="Source identifier")
    duration_minutes: Optional[int] = Field(None, ge=0, description="Call duration in minutes")

class CallSummaryUpdate(BaseModel):
    """Model for updating a call summary"""
    content: Optional[str] = Field(None, min_length=1, max_length=5000, description="Call summary content")
    theme: Optional[str] = Field(None, max_length=50, description="Call topic/theme")

class CallSummaryResponse(BaseModel):
    """Model for call summary response"""
    interaction_id: int
    customer_id: int
    employee_id: int
    type: str
    content: str
    theme: Optional[str]
    source: Optional[str]
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    employee_role: Optional[str] = None

# ============================================================================
# CALL SUMMARY ENDPOINTS
# ============================================================================

@router.post("/customers/{customer_id}/call-summaries", response_model=CallSummaryResponse)
async def create_call_summary(
    customer_id: int,
    call_data: CallSummaryCreate,
    authenticated_user: dict = Depends(verify_auth_token)
) -> CallSummaryResponse:
    """
    Create a new call summary for a customer.
    Stores the call summary in interaction_details table with type='call'.
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📞 Creating call summary for customer {customer_id} by user {user_email}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            # Start transaction
            cursor.execute("BEGIN")

            # Get employee_id for the authenticated user
            employee_id = get_employee_id_by_email(user_email)
            if not employee_id:
                raise HTTPException(status_code=404, detail="Employee not found")

            # Verify customer exists
            cursor.execute("SELECT client_id FROM clients_info WHERE client_id = %s", (customer_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Customer not found")

            # Validate content
            if not call_data.content or not call_data.content.strip():
                raise HTTPException(status_code=400, detail="Call summary content cannot be empty")

            # Generate next interaction_id
            cursor.execute("SELECT COALESCE(MAX(interaction_id), 0) + 1 as next_id FROM interaction_details")
            result = cursor.fetchone()
            interaction_id = result['next_id']

            logger.info(f"📝 Generated interaction_id: {interaction_id}")

            # Prepare current timestamp
            now = datetime.now()

            # Insert call summary into interaction_details
            insert_query = """
                INSERT INTO interaction_details (
                    interaction_id, customer_id, employee_id, type, content, theme,
                    source, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING interaction_id, customer_id, employee_id, type, content,
                          theme, source, created_at, updated_at
            """

            cursor.execute(insert_query, (
                interaction_id,
                customer_id,
                employee_id,
                'call',  # Fixed type as 'call'
                call_data.content.strip(),
                call_data.theme,
                call_data.source,
                now,
                now
            ))

            new_call_summary = cursor.fetchone()

            # Get employee information for response
            cursor.execute("""
                SELECT name, role
                FROM employee_info
                WHERE employee_id = %s
            """, (employee_id,))
            employee_info = cursor.fetchone()

            # Commit transaction
            cursor.execute("COMMIT")
            logger.info(f"✅ Call summary created successfully: interaction_id={interaction_id}")

            # Clear relevant caches - use correct pattern to match cache keys
            clear_cache(f"customer_id={customer_id}")  # Matches: get_customer_interactions:...:customer_id=X
            clear_cache("get_recent_interactions")

            cursor.close()
            conn.close()

            return CallSummaryResponse(
                interaction_id=new_call_summary['interaction_id'],
                customer_id=new_call_summary['customer_id'],
                employee_id=new_call_summary['employee_id'],
                type=new_call_summary['type'],
                content=new_call_summary['content'],
                theme=new_call_summary['theme'],
                source=new_call_summary['source'],
                created_at=new_call_summary['created_at'],
                updated_at=new_call_summary['updated_at'],
                employee_name=employee_info['name'] if employee_info else None,
                employee_role=employee_info['role'] if employee_info else None
            )

        except HTTPException:
            # Re-raise HTTP exceptions
            cursor.execute("ROLLBACK")
            cursor.close()
            conn.close()
            raise
        except Exception as e:
            # Rollback on error
            cursor.execute("ROLLBACK")
            cursor.close()
            conn.close()
            logger.error(f"❌ Error creating call summary: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create call summary: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error creating call summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers/{customer_id}/call-summaries", response_model=List[CallSummaryResponse])
@cached(timeout=180)  # Cache for 3 minutes
async def get_call_summaries(
    customer_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> List[CallSummaryResponse]:
    """
    Get all call summaries for a specific customer.
    Retrieves from interaction_details table where type='call'.
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📞 Getting call summaries for customer {customer_id} by user {user_email}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get employee_id for the authenticated user
        employee_id = get_employee_id_by_email(user_email)
        if not employee_id:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Get all call summaries for this customer created by this employee
        query = """
            SELECT
                i.interaction_id,
                i.customer_id,
                i.employee_id,
                i.type,
                i.content,
                i.theme,
                i.source,
                i.created_at,
                i.updated_at,
                e.name as employee_name,
                e.role as employee_role
            FROM interaction_details i
            LEFT JOIN employee_info e ON i.employee_id = e.employee_id
            WHERE i.customer_id = %s
              AND i.type = 'call'
              AND i.employee_id = %s
            ORDER BY i.created_at DESC
        """

        cursor.execute(query, (customer_id, employee_id))
        call_summaries = cursor.fetchall()

        cursor.close()
        conn.close()

        logger.info(f"📞 Found {len(call_summaries)} call summaries for customer {customer_id}")

        return [
            CallSummaryResponse(
                interaction_id=call['interaction_id'],
                customer_id=call['customer_id'],
                employee_id=call['employee_id'],
                type=call['type'],
                content=call['content'],
                theme=call['theme'],
                source=call['source'],
                created_at=call['created_at'],
                updated_at=call['updated_at'],
                employee_name=call['employee_name'],
                employee_role=call['employee_role']
            )
            for call in call_summaries
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting call summaries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers/{customer_id}/call-summaries/{interaction_id}", response_model=CallSummaryResponse)
async def get_call_summary_by_id(
    customer_id: int,
    interaction_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> CallSummaryResponse:
    """Get a specific call summary by interaction_id."""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📞 Getting call summary {interaction_id} for customer {customer_id}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get employee_id for the authenticated user
        employee_id = get_employee_id_by_email(user_email)
        if not employee_id:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Get specific call summary
        query = """
            SELECT
                i.interaction_id,
                i.customer_id,
                i.employee_id,
                i.type,
                i.content,
                i.theme,
                i.source,
                i.created_at,
                i.updated_at,
                e.name as employee_name,
                e.role as employee_role
            FROM interaction_details i
            LEFT JOIN employee_info e ON i.employee_id = e.employee_id
            WHERE i.interaction_id = %s
              AND i.customer_id = %s
              AND i.type = 'call'
              AND i.employee_id = %s
        """

        cursor.execute(query, (interaction_id, customer_id, employee_id))
        call_summary = cursor.fetchone()

        cursor.close()
        conn.close()

        if not call_summary:
            raise HTTPException(status_code=404, detail="Call summary not found or access denied")

        return CallSummaryResponse(
            interaction_id=call_summary['interaction_id'],
            customer_id=call_summary['customer_id'],
            employee_id=call_summary['employee_id'],
            type=call_summary['type'],
            content=call_summary['content'],
            theme=call_summary['theme'],
            source=call_summary['source'],
            created_at=call_summary['created_at'],
            updated_at=call_summary['updated_at'],
            employee_name=call_summary['employee_name'],
            employee_role=call_summary['employee_role']
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting call summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/customers/{customer_id}/call-summaries/{interaction_id}", response_model=CallSummaryResponse)
async def update_call_summary(
    customer_id: int,
    interaction_id: int,
    call_data: CallSummaryUpdate,
    authenticated_user: dict = Depends(verify_auth_token)
) -> CallSummaryResponse:
    """Update an existing call summary."""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📞 Updating call summary {interaction_id} for customer {customer_id}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            # Get employee_id for the authenticated user
            employee_id = get_employee_id_by_email(user_email)
            if not employee_id:
                raise HTTPException(status_code=404, detail="Employee not found")

            # Verify call summary exists and belongs to this employee and customer
            cursor.execute("""
                SELECT interaction_id FROM interaction_details
                WHERE interaction_id = %s
                  AND customer_id = %s
                  AND type = 'call'
                  AND employee_id = %s
            """, (interaction_id, customer_id, employee_id))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Call summary not found or access denied")

            # Build dynamic update query
            update_fields = []
            update_values = []

            if call_data.content is not None:
                if not call_data.content.strip():
                    raise HTTPException(status_code=400, detail="Call summary content cannot be empty")
                update_fields.append("content = %s")
                update_values.append(call_data.content.strip())

            if call_data.theme is not None:
                update_fields.append("theme = %s")
                update_values.append(call_data.theme.strip() if call_data.theme else None)

            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")

            # Add updated_at timestamp
            update_fields.append("updated_at = %s")
            update_values.append(datetime.now())

            # Add WHERE clause parameters
            update_values.extend([interaction_id, customer_id, employee_id])

            # Update the call summary
            query = f"""
                UPDATE interaction_details
                SET {', '.join(update_fields)}
                WHERE interaction_id = %s AND customer_id = %s AND employee_id = %s AND type = 'call'
                RETURNING interaction_id, customer_id, employee_id, type, content,
                          theme, source, created_at, updated_at
            """

            cursor.execute(query, update_values)
            updated_summary = cursor.fetchone()

            if not updated_summary:
                raise HTTPException(status_code=404, detail="Failed to update call summary")

            # Get employee information for response
            cursor.execute("""
                SELECT name, role
                FROM employee_info
                WHERE employee_id = %s
            """, (employee_id,))
            employee_info = cursor.fetchone()

            # Commit transaction
            conn.commit()
            logger.info(f"✅ Call summary updated successfully: interaction_id={interaction_id}")

            # Clear relevant caches - use correct pattern to match cache keys
            clear_cache(f"customer_id={customer_id}")
            clear_cache("get_recent_interactions")

            cursor.close()
            conn.close()

            return CallSummaryResponse(
                interaction_id=updated_summary['interaction_id'],
                customer_id=updated_summary['customer_id'],
                employee_id=updated_summary['employee_id'],
                type=updated_summary['type'],
                content=updated_summary['content'],
                theme=updated_summary['theme'],
                source=updated_summary['source'],
                created_at=updated_summary['created_at'],
                updated_at=updated_summary['updated_at'],
                employee_name=employee_info['name'] if employee_info else None,
                employee_role=employee_info['role'] if employee_info else None
            )

        except HTTPException:
            conn.rollback()
            cursor.close()
            conn.close()
            raise
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            logger.error(f"❌ Error updating call summary: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update call summary: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error updating call summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/customers/{customer_id}/call-summaries/{interaction_id}")
async def delete_call_summary(
    customer_id: int,
    interaction_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Delete a call summary."""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📞 Deleting call summary {interaction_id} for customer {customer_id}")

        conn = get_db_connection(user_email)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            # Get employee_id for the authenticated user
            employee_id = get_employee_id_by_email(user_email)
            if not employee_id:
                raise HTTPException(status_code=404, detail="Employee not found")

            # Verify call summary exists and belongs to this employee and customer
            cursor.execute("""
                SELECT interaction_id FROM interaction_details
                WHERE interaction_id = %s
                  AND customer_id = %s
                  AND type = 'call'
                  AND employee_id = %s
            """, (interaction_id, customer_id, employee_id))

            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Call summary not found or access denied")

            # Delete the call summary
            cursor.execute("""
                DELETE FROM interaction_details
                WHERE interaction_id = %s
                  AND customer_id = %s
                  AND employee_id = %s
                  AND type = 'call'
            """, (interaction_id, customer_id, employee_id))

            # Commit transaction
            conn.commit()
            logger.info(f"✅ Call summary deleted successfully: interaction_id={interaction_id}")

            # Clear relevant caches - use correct pattern to match cache keys
            clear_cache(f"customer_id={customer_id}")
            clear_cache("get_recent_interactions")

            cursor.close()
            conn.close()

            return {"success": True, "message": "Call summary deleted successfully"}

        except HTTPException:
            conn.rollback()
            cursor.close()
            conn.close()
            raise
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            logger.error(f"❌ Error deleting call summary: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete call summary: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error deleting call summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))