"""
Notes Router - Handles all note-related endpoints
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from datetime import datetime
from psycopg2.extras import RealDictCursor

from auth.providers import verify_auth_token
from routers.crm_data_router import get_db_connection, get_employee_id_by_email, cached, clear_cache

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class NoteCreate(BaseModel):
    title: Optional[str] = ""
    body: str
    star: Optional[str] = None
    interaction_id: Optional[int] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    star: Optional[str] = None

class NoteResponse(BaseModel):
    note_id: int
    employee_id: int
    client_id: int
    title: Optional[str]
    body: str
    created_at: datetime
    updated_at: datetime
    star: Optional[str]
    interaction_id: Optional[int]

# ============================================================================
# NOTES ENDPOINTS
# ============================================================================

@router.get("/customers/{customer_id}/notes", response_model=List[NoteResponse])
@cached(timeout=180)  # Cache for 3 minutes
async def get_customer_notes(
    customer_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> List[NoteResponse]:
    """Get all notes for a specific customer."""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📝 Getting notes for customer {customer_id} by user {user_email}")

        with get_db_connection(user_email) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id for the authenticated user
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Get all notes for this customer created by this employee
                cursor.execute("""
                    SELECT note_id, employee_id, client_id, title, body,
                           created_at, updated_at, star, interaction_id
                    FROM employee_client_notes
                    WHERE client_id = %s AND employee_id = %s
                    ORDER BY created_at DESC
                """, (customer_id, employee_id))

                notes = cursor.fetchall()

                return [
                    NoteResponse(
                        note_id=note['note_id'],
                        employee_id=note['employee_id'],
                        client_id=note['client_id'],
                        title=note['title'],
                        body=note['body'],
                        created_at=note['created_at'],
                        updated_at=note['updated_at'],
                        star=note['star'],
                        interaction_id=note['interaction_id']
                    )
                    for note in notes
                ]

    except Exception as e:
        logger.error(f"Error getting customer notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customers/{customer_id}/notes", response_model=NoteResponse)
async def create_customer_note(
    customer_id: int,
    note_data: NoteCreate,
    authenticated_user: dict = Depends(verify_auth_token)
) -> NoteResponse:
    """Create a new note for a customer."""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📝 Creating note for customer {customer_id} by user {user_email}")

        with get_db_connection(user_email) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id for the authenticated user
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Verify customer exists
                cursor.execute("SELECT client_id FROM clients_info WHERE client_id = %s", (customer_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Customer not found")

                # Verify interaction exists if interaction_id is provided
                if note_data.interaction_id:
                    cursor.execute("""
                        SELECT interaction_id
                        FROM interaction_details
                        WHERE interaction_id = %s AND customer_id = %s
                    """, (note_data.interaction_id, customer_id))

                    if not cursor.fetchone():
                        raise HTTPException(
                            status_code=404,
                            detail="Interaction not found or doesn't belong to this customer"
                        )

                # Insert new note
                logger.info(f"🔍 Creating note with interaction_id: {note_data.interaction_id}")
                cursor.execute("""
                    INSERT INTO employee_client_notes (employee_id, client_id, title, body, star, interaction_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING note_id, employee_id, client_id, title, body,
                              created_at, updated_at, star, interaction_id
                """, (employee_id, customer_id, note_data.title, note_data.body, note_data.star, note_data.interaction_id))

                new_note = cursor.fetchone()
                logger.info(f"🔍 Note created: note_id={new_note['note_id']}, interaction_id={new_note['interaction_id']}")
                conn.commit()

                # Clear notes cache for this customer
                clear_cache(f"customer_id={customer_id}")

                return NoteResponse(
                    note_id=new_note['note_id'],
                    employee_id=new_note['employee_id'],
                    client_id=new_note['client_id'],
                    title=new_note['title'],
                    body=new_note['body'],
                    created_at=new_note['created_at'],
                    updated_at=new_note['updated_at'],
                    star=new_note['star'],
                    interaction_id=new_note['interaction_id']
                )

    except Exception as e:
        logger.error(f"Error creating customer note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    request: Request,
    authenticated_user: dict = Depends(verify_auth_token)
) -> NoteResponse:
    """Update an existing note."""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📝 Updating note {note_id} by user {user_email}")

        # Get the raw request body to check which fields were explicitly provided
        request_body = await request.json()

        with get_db_connection(user_email) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id for the authenticated user
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Check if note exists and belongs to this employee
                cursor.execute("""
                    SELECT note_id, client_id FROM employee_client_notes
                    WHERE note_id = %s AND employee_id = %s
                """, (note_id, employee_id))

                note_record = cursor.fetchone()
                if not note_record:
                    raise HTTPException(status_code=404, detail="Note not found or access denied")

                client_id = note_record['client_id']

                # Build update query dynamically based on provided fields
                update_fields = []
                update_values = []

                if 'title' in request_body:
                    update_fields.append("title = %s")
                    update_values.append(note_data.title)

                if 'body' in request_body:
                    update_fields.append("body = %s")
                    update_values.append(note_data.body)

                # Handle star field - allow explicit null values
                if 'star' in request_body:
                    update_fields.append("star = %s")
                    update_values.append(note_data.star)

                if not update_fields:
                    raise HTTPException(status_code=400, detail="No fields to update")

                update_values.append(note_id)

                # Update the note
                cursor.execute(f"""
                    UPDATE employee_client_notes
                    SET {', '.join(update_fields)}
                    WHERE note_id = %s
                    RETURNING note_id, employee_id, client_id, title, body,
                              created_at, updated_at, star, interaction_id
                """, update_values)

                updated_note = cursor.fetchone()
                conn.commit()

                # Clear notes cache for this customer
                clear_cache(f"customer_id={client_id}")

                return NoteResponse(
                    note_id=updated_note['note_id'],
                    employee_id=updated_note['employee_id'],
                    client_id=updated_note['client_id'],
                    title=updated_note['title'],
                    body=updated_note['body'],
                    created_at=updated_note['created_at'],
                    updated_at=updated_note['updated_at'],
                    star=updated_note['star'],
                    interaction_id=updated_note.get('interaction_id')
                )

    except Exception as e:
        logger.error(f"Error updating note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Delete a note."""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📝 Deleting note {note_id} by user {user_email}")

        with get_db_connection(user_email) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id for the authenticated user
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Check if note exists and belongs to this employee
                cursor.execute("""
                    SELECT note_id, client_id FROM employee_client_notes
                    WHERE note_id = %s AND employee_id = %s
                """, (note_id, employee_id))

                note_record = cursor.fetchone()
                if not note_record:
                    raise HTTPException(status_code=404, detail="Note not found or access denied")

                client_id = note_record['client_id']

                # Delete the note
                cursor.execute("DELETE FROM employee_client_notes WHERE note_id = %s", (note_id,))
                conn.commit()

                # Clear notes cache for this customer
                clear_cache(f"customer_id={client_id}")

                return {"success": True, "message": "Note deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting note: {e}")
        raise HTTPException(status_code=500, detail=str(e))
