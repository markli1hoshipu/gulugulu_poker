"""
Meetings Router - Handles all meeting and Google Calendar sync endpoints
"""

import logging
import json
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
from psycopg2.extras import RealDictCursor

from auth.providers import verify_auth_token
from routers.crm_data_router import get_db_connection, get_employee_id_by_email, clear_cache

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: str  # ISO 8601 format
    end_time: str    # ISO 8601 format
    attendees: List[str] = []  # Email addresses
    location: Optional[str] = None
    timezone: str = "UTC"  # Browser timezone from frontend

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    attendees: Optional[List[str]] = None
    location: Optional[str] = None
    timezone: Optional[str] = None

class MeetingResponse(BaseModel):
    interaction_id: int
    customer_id: int
    employee_id: int
    title: str
    description: Optional[str]
    start_time: str
    end_time: str
    attendees: List[str]
    location: Optional[str]
    meeting_link: Optional[str]
    google_event_id: Optional[str]
    timezone: str
    created_at: datetime
    updated_at: datetime

class GoogleCalendarSyncRequest(BaseModel):
    time_min: Optional[str] = None  # ISO format, default to 30 days ago
    time_max: Optional[str] = None  # ISO format, default to 90 days future

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def detect_calendar_provider(user_email: str, db_connection) -> str:
    """
    Detect which calendar provider the user has connected (Google or Microsoft).

    Args:
        user_email: User's email address
        db_connection: Database connection

    Returns:
        'google', 'microsoft', or None if no provider connected
    """
    try:
        cursor = db_connection.cursor(cursor_factory=RealDictCursor)

        # Check for Google tokens
        cursor.execute("""
            SELECT provider FROM oauth_tokens
            WHERE user_email = %s AND provider IN ('google', 'microsoft')
            ORDER BY updated_at DESC
            LIMIT 1
        """, (user_email,))

        result = cursor.fetchone()
        cursor.close()

        if result:
            return result['provider']

        return None

    except Exception as e:
        logger.error(f"Error detecting calendar provider: {e}")
        return None

def format_meeting_content(meeting_data: MeetingCreate) -> str:
    """Convert meeting data to JSON string for storage in content field"""
    content = {
        "title": meeting_data.title,
        "description": meeting_data.description,
        "start_time": meeting_data.start_time,
        "end_time": meeting_data.end_time,
        "attendees": meeting_data.attendees,
        "location": meeting_data.location,
        "timezone": meeting_data.timezone
    }
    return json.dumps(content)

def parse_meeting_content(content: str) -> dict:
    """Parse JSON meeting content from interaction_details"""
    if not content:
        return {}
    try:
        data = json.loads(content)
        return data
    except json.JSONDecodeError:
        # Handle legacy plain text meeting content
        logger.warning(f"Failed to parse meeting content as JSON, treating as legacy text")
        return {
            "title": "Legacy Meeting",
            "description": content,
            "start_time": "",  # Return empty string instead of None
            "end_time": "",    # Return empty string instead of None
            "attendees": [],
            "location": None,
            "timezone": "UTC"
        }

# ============================================================================
# MEETING ENDPOINTS
# ============================================================================

@router.post("/customers/{customer_id}/meetings", response_model=MeetingResponse)
async def create_customer_meeting(
    customer_id: int,
    meeting_data: MeetingCreate,
    google_access_token: str = None,  # Optional - will use stored token if not provided
    authenticated_user: dict = Depends(verify_auth_token)
) -> MeetingResponse:
    """
    Create a new meeting for a customer in both Calendar (Google/Outlook) and CRM with auto-refresh tokens.
    Two-way sync: CRM → Calendar (Google or Microsoft)

    NEW: Now automatically detects whether user has Google or Microsoft calendar connected.
    - If google_access_token is provided: Uses the old method (for backward compatibility)
    - If not provided: Auto-detects provider and uses stored tokens from database with auto-refresh

    Steps:
    1. Validate customer exists
    2. Get employee_id from authenticated user
    3. Detect calendar provider (Google or Microsoft)
    4. Create event in Calendar FIRST (auto-refreshes token if expired)
    5. Store meeting in interaction_details with type='meet'
    6. Return meeting response with meeting link (Google Meet or Teams)
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📅 Creating meeting for customer {customer_id} by user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id for the authenticated user
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Verify customer exists
                cursor.execute("SELECT client_id, email FROM clients_info WHERE client_id = %s", (customer_id,))
                customer = cursor.fetchone()
                if not customer:
                    raise HTTPException(status_code=404, detail="Customer not found")

                # Step 1: Detect calendar provider and create appropriate service
                calendar_event_id = None
                meeting_link = None
                provider = None

                if google_access_token:
                    # Legacy method: use provided token (may expire after 1 hour)
                    from services.google_calendar_service import GoogleCalendarService
                    logger.info("Using legacy GoogleCalendarService with provided token")
                    calendar_service = GoogleCalendarService(google_access_token)
                    provider = 'google'
                else:
                    # New method: auto-detect provider and use stored token with auto-refresh
                    provider = await detect_calendar_provider(user_email, conn)

                    if not provider:
                        raise HTTPException(
                            status_code=400,
                            detail="No calendar provider connected. Please connect Google Calendar or Outlook Calendar first."
                        )

                    logger.info(f"Detected calendar provider: {provider}")

                    if provider == 'google':
                        from services.google_calendar_service_v2 import GoogleCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using GoogleCalendarServiceV2 with auto-refresh")
                        calendar_service = GoogleCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    elif provider == 'microsoft':
                        from services.outlook_calendar_service_v2 import OutlookCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using OutlookCalendarServiceV2 with auto-refresh")
                        calendar_service = OutlookCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Unsupported calendar provider: {provider}"
                        )

                # Create event in calendar
                calendar_event = await calendar_service.create_event(
                    summary=meeting_data.title,
                    description=meeting_data.description or "",
                    start_datetime=meeting_data.start_time,
                    end_datetime=meeting_data.end_time,
                    attendees=meeting_data.attendees,
                    timezone=meeting_data.timezone,
                    location=meeting_data.location
                )

                calendar_event_id = calendar_event['event_id']
                meeting_link = calendar_event.get('meeting_link')

                logger.info(f"✅ Event created in {provider.capitalize()} Calendar: {calendar_event_id}")

                # Step 2: Store in CRM database with calendar_event_id
                meeting_content = format_meeting_content(meeting_data)

                # Add meeting_link and provider to content
                content_dict = json.loads(meeting_content)
                content_dict['meeting_link'] = meeting_link
                content_dict['calendar_provider'] = provider
                meeting_content = json.dumps(content_dict)

                # Get next interaction_id
                cursor.execute("SELECT COALESCE(MAX(interaction_id), 0) + 1 as next_id FROM interaction_details")
                result = cursor.fetchone()
                next_interaction_id = result['next_id']

                # Determine source based on provider
                source = 'google_calendar' if provider == 'google' else 'outlook_calendar'

                cursor.execute("""
                    INSERT INTO interaction_details
                    (interaction_id, customer_id, employee_id, type, content, google_calendar_event_id, source, theme, created_at, updated_at)
                    VALUES (%s, %s, %s, 'meet', %s, %s, %s, %s, NOW(), NOW())
                    RETURNING interaction_id, created_at, updated_at
                """, (next_interaction_id, customer_id, employee_id, meeting_content, calendar_event_id, source, meeting_data.title))

                new_meeting = cursor.fetchone()
                conn.commit()

                logger.info(f"✅ Meeting stored in CRM: interaction_id={new_meeting['interaction_id']}")

                # Clear interactions cache for this customer
                clear_cache(f"customer_id={customer_id}")
                clear_cache("get_recent_interactions")

                # Step 3: Return meeting response
                return MeetingResponse(
                    interaction_id=new_meeting['interaction_id'],
                    customer_id=customer_id,
                    employee_id=employee_id,
                    title=meeting_data.title,
                    description=meeting_data.description,
                    start_time=meeting_data.start_time,
                    end_time=meeting_data.end_time,
                    attendees=meeting_data.attendees,
                    location=meeting_data.location,
                    meeting_link=meeting_link,
                    google_event_id=calendar_event_id,
                    timezone=meeting_data.timezone,
                    created_at=new_meeting['created_at'],
                    updated_at=new_meeting['updated_at']
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer meeting: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/meetings", response_model=List[MeetingResponse])
async def get_all_meetings(
    authenticated_user: dict = Depends(verify_auth_token)
) -> List[MeetingResponse]:
    """
    Get all meetings for the authenticated employee across all customers.
    Query interaction_details WHERE type='meet' AND employee_id=X
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📅 Getting all meetings for user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Get all meetings for this employee
                cursor.execute("""
                    SELECT interaction_id, customer_id, employee_id, content,
                           google_calendar_event_id, created_at, updated_at
                    FROM interaction_details
                    WHERE employee_id = %s AND type = 'meet'
                    ORDER BY created_at DESC
                """, (employee_id,))

                meetings = cursor.fetchall()

                # Parse and return meetings
                result = []
                for meeting in meetings:
                    content = parse_meeting_content(meeting['content'])

                    result.append(MeetingResponse(
                        interaction_id=meeting['interaction_id'],
                        customer_id=meeting['customer_id'],
                        employee_id=meeting['employee_id'],
                        title=content.get('title', 'Untitled Meeting'),
                        description=content.get('description'),
                        start_time=content.get('start_time', ''),
                        end_time=content.get('end_time', ''),
                        attendees=content.get('attendees', []),
                        location=content.get('location'),
                        meeting_link=content.get('meeting_link'),
                        google_event_id=meeting['google_calendar_event_id'],
                        timezone=content.get('timezone', 'UTC'),
                        created_at=meeting['created_at'],
                        updated_at=meeting['updated_at']
                    ))

                return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers/{customer_id}/meetings", response_model=List[MeetingResponse])
async def get_customer_meetings(
    customer_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> List[MeetingResponse]:
    """
    Get all meetings for a specific customer.
    Query interaction_details WHERE type='meet' AND customer_id=X
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📅 Getting meetings for customer {customer_id} by user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get all meetings for this customer
                cursor.execute("""
                    SELECT interaction_id, customer_id, employee_id, content,
                           google_calendar_event_id, created_at, updated_at
                    FROM interaction_details
                    WHERE customer_id = %s AND type = 'meet'
                    ORDER BY created_at DESC
                """, (customer_id,))

                meetings = cursor.fetchall()

                # Parse and return meetings
                result = []
                for meeting in meetings:
                    content = parse_meeting_content(meeting['content'])

                    result.append(MeetingResponse(
                        interaction_id=meeting['interaction_id'],
                        customer_id=meeting['customer_id'],
                        employee_id=meeting['employee_id'],
                        title=content.get('title', 'Untitled Meeting'),
                        description=content.get('description'),
                        start_time=content.get('start_time', ''),
                        end_time=content.get('end_time', ''),
                        attendees=content.get('attendees', []),
                        location=content.get('location'),
                        meeting_link=content.get('meeting_link'),
                        google_event_id=meeting['google_calendar_event_id'],
                        timezone=content.get('timezone', 'UTC'),
                        created_at=meeting['created_at'],
                        updated_at=meeting['updated_at']
                    ))

                return result

    except Exception as e:
        logger.error(f"Error getting customer meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/meetings/{interaction_id}", response_model=MeetingResponse)
async def get_meeting_by_id(
    interaction_id: int,
    authenticated_user: dict = Depends(verify_auth_token)
) -> MeetingResponse:
    """Get single meeting by interaction_id"""
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📅 Getting meeting {interaction_id} by user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT interaction_id, customer_id, employee_id, content,
                           google_calendar_event_id, created_at, updated_at
                    FROM interaction_details
                    WHERE interaction_id = %s AND type = 'meet'
                """, (interaction_id,))

                meeting = cursor.fetchone()
                if not meeting:
                    raise HTTPException(status_code=404, detail="Meeting not found")

                content = parse_meeting_content(meeting['content'])

                return MeetingResponse(
                    interaction_id=meeting['interaction_id'],
                    customer_id=meeting['customer_id'],
                    employee_id=meeting['employee_id'],
                    title=content.get('title', 'Untitled Meeting'),
                    description=content.get('description'),
                    start_time=content.get('start_time', ''),
                    end_time=content.get('end_time', ''),
                    attendees=content.get('attendees', []),
                    location=content.get('location'),
                    meeting_link=content.get('meeting_link'),
                    google_event_id=meeting['google_calendar_event_id'],
                    timezone=content.get('timezone', 'UTC'),
                    created_at=meeting['created_at'],
                    updated_at=meeting['updated_at']
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/meetings/{interaction_id}", response_model=MeetingResponse)
async def update_meeting(
    interaction_id: int,
    meeting_data: MeetingUpdate,
    google_access_token: str = None,  # Optional - will use stored token if not provided
    authenticated_user: dict = Depends(verify_auth_token)
) -> MeetingResponse:
    """
    Update meeting in both Calendar (Google/Outlook) and CRM with auto-refresh tokens.
    Two-way sync: CRM → Calendar (Google or Microsoft)

    NEW: Now automatically detects calendar provider from stored meeting data.
    - If google_access_token is provided: Uses the old method (for backward compatibility)
    - If not provided: Auto-detects provider from meeting content and uses stored tokens with auto-refresh

    Steps:
    1. Get meeting from interaction_details
    2. Verify employee owns this meeting
    3. Detect calendar provider from meeting content
    4. Update in Calendar using event_id (auto-refreshes token if expired)
    5. Update interaction_details record
    6. Return updated meeting
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"📝 Updating meeting {interaction_id} by user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Get existing meeting
                cursor.execute("""
                    SELECT interaction_id, customer_id, employee_id, content,
                           google_calendar_event_id, created_at
                    FROM interaction_details
                    WHERE interaction_id = %s AND type = 'meet'
                """, (interaction_id,))

                existing_meeting = cursor.fetchone()
                if not existing_meeting:
                    raise HTTPException(status_code=404, detail="Meeting not found")

                # Verify ownership
                if existing_meeting['employee_id'] != employee_id:
                    raise HTTPException(status_code=403, detail="Access denied")

                calendar_event_id = existing_meeting['google_calendar_event_id']
                existing_content = parse_meeting_content(existing_meeting['content'])

                # Detect provider from existing content or user's current setup
                provider = existing_content.get('calendar_provider')
                if not provider:
                    # Fallback: detect from current user setup
                    provider = await detect_calendar_provider(user_email, conn)
                    if not provider:
                        provider = 'google'  # Default to Google for backward compatibility

                logger.info(f"Using calendar provider: {provider}")

                # Step 1: Create appropriate calendar service and update event
                if google_access_token:
                    # Legacy method: use provided token (may expire after 1 hour)
                    from services.google_calendar_service import GoogleCalendarService
                    logger.info("Using legacy GoogleCalendarService with provided token")
                    calendar_service = GoogleCalendarService(google_access_token)
                else:
                    # New method: use stored token with auto-refresh
                    if provider == 'google':
                        from services.google_calendar_service_v2 import GoogleCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using GoogleCalendarServiceV2 with auto-refresh")
                        calendar_service = GoogleCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    elif provider == 'microsoft':
                        from services.outlook_calendar_service_v2 import OutlookCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using OutlookCalendarServiceV2 with auto-refresh")
                        calendar_service = OutlookCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Unsupported calendar provider: {provider}"
                        )

                # Only pass fields that were provided
                update_kwargs = {}
                if meeting_data.title is not None:
                    update_kwargs['summary'] = meeting_data.title
                if meeting_data.description is not None:
                    update_kwargs['description'] = meeting_data.description
                if meeting_data.start_time is not None and meeting_data.timezone is not None:
                    update_kwargs['start_datetime'] = meeting_data.start_time
                    update_kwargs['timezone'] = meeting_data.timezone
                if meeting_data.end_time is not None and meeting_data.timezone is not None:
                    update_kwargs['end_datetime'] = meeting_data.end_time
                if meeting_data.attendees is not None:
                    update_kwargs['attendees'] = meeting_data.attendees
                if meeting_data.location is not None:
                    update_kwargs['location'] = meeting_data.location

                google_event = await calendar_service.update_event(
                    event_id=calendar_event_id,
                    **update_kwargs
                )

                logger.info(f"✅ Event updated in {provider.capitalize()} Calendar: {calendar_event_id}")

                # Step 2: Update in CRM database
                # Merge updated fields with existing content
                updated_content = existing_content.copy()
                if meeting_data.title is not None:
                    updated_content['title'] = meeting_data.title
                if meeting_data.description is not None:
                    updated_content['description'] = meeting_data.description
                if meeting_data.start_time is not None:
                    updated_content['start_time'] = meeting_data.start_time
                if meeting_data.end_time is not None:
                    updated_content['end_time'] = meeting_data.end_time
                if meeting_data.attendees is not None:
                    updated_content['attendees'] = meeting_data.attendees
                if meeting_data.location is not None:
                    updated_content['location'] = meeting_data.location
                if meeting_data.timezone is not None:
                    updated_content['timezone'] = meeting_data.timezone

                # Update meeting link if returned from Google
                if google_event.get('meeting_link'):
                    updated_content['meeting_link'] = google_event['meeting_link']

                cursor.execute("""
                    UPDATE interaction_details
                    SET content = %s, updated_at = NOW()
                    WHERE interaction_id = %s
                    RETURNING updated_at
                """, (json.dumps(updated_content), interaction_id))

                result = cursor.fetchone()
                conn.commit()

                logger.info(f"✅ Meeting updated in CRM: {interaction_id}")

                # Clear interactions cache for this customer
                clear_cache(f"customer_id={existing_meeting['customer_id']}")
                clear_cache("get_recent_interactions")

                return MeetingResponse(
                    interaction_id=interaction_id,
                    customer_id=existing_meeting['customer_id'],
                    employee_id=existing_meeting['employee_id'],
                    title=updated_content.get('title', ''),
                    description=updated_content.get('description'),
                    start_time=updated_content.get('start_time', ''),
                    end_time=updated_content.get('end_time', ''),
                    attendees=updated_content.get('attendees', []),
                    location=updated_content.get('location'),
                    meeting_link=updated_content.get('meeting_link'),
                    google_event_id=google_event_id,
                    timezone=updated_content.get('timezone', 'UTC'),
                    created_at=existing_meeting['created_at'],
                    updated_at=result['updated_at']
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating meeting: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/meetings/{interaction_id}")
async def delete_meeting(
    interaction_id: int,
    google_access_token: str = None,  # Optional - will use stored token if not provided
    authenticated_user: dict = Depends(verify_auth_token)
):
    """
    Hard delete meeting from both Google Calendar and CRM with auto-refresh tokens.
    Two-way sync: CRM → Google Calendar

    NEW: Now uses stored OAuth tokens with auto-refresh.
    - If google_access_token is provided: Uses the old method (for backward compatibility)
    - If not provided: Uses stored tokens from database with auto-refresh

    Steps:
    1. Get meeting from interaction_details
    2. Verify employee owns this meeting
    3. Delete from Google Calendar using google_event_id (auto-refreshes token if expired)
    4. Hard delete from interaction_details
    5. Return success status
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"🗑️ Deleting meeting {interaction_id} by user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Get meeting
                cursor.execute("""
                    SELECT google_calendar_event_id, employee_id, content
                    FROM interaction_details
                    WHERE interaction_id = %s AND type = 'meet'
                """, (interaction_id,))

                meeting = cursor.fetchone()
                if not meeting:
                    raise HTTPException(status_code=404, detail="Meeting not found")

                # Verify ownership
                if meeting['employee_id'] != employee_id:
                    raise HTTPException(status_code=403, detail="Access denied")

                calendar_event_id = meeting['google_calendar_event_id']
                meeting_content = parse_meeting_content(meeting['content'])

                # Detect provider from meeting content or user's current setup
                provider = meeting_content.get('calendar_provider')
                if not provider:
                    provider = await detect_calendar_provider(user_email, conn)
                    if not provider:
                        provider = 'google'  # Default to Google for backward compatibility

                logger.info(f"Using calendar provider: {provider}")

                # Step 1: Delete from Calendar FIRST
                # Use V2 service with auto-refresh if no token provided, otherwise use legacy method
                if google_access_token:
                    # Legacy method: use provided token (may expire after 1 hour)
                    from services.google_calendar_service import GoogleCalendarService
                    logger.info("Using legacy GoogleCalendarService with provided token")
                    calendar_service = GoogleCalendarService(google_access_token)
                else:
                    # New method: use stored token with auto-refresh
                    if provider == 'google':
                        from services.google_calendar_service_v2 import GoogleCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using GoogleCalendarServiceV2 with auto-refresh")
                        calendar_service = GoogleCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    elif provider == 'microsoft':
                        from services.outlook_calendar_service_v2 import OutlookCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using OutlookCalendarServiceV2 with auto-refresh")
                        calendar_service = OutlookCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Unsupported calendar provider: {provider}"
                        )

                await calendar_service.delete_event(calendar_event_id)

                logger.info(f"✅ Event deleted from {provider.capitalize()} Calendar: {calendar_event_id}")

                # Step 2: Hard delete from CRM database
                cursor.execute("""
                    DELETE FROM interaction_details
                    WHERE interaction_id = %s
                """, (interaction_id,))

                conn.commit()

                logger.info(f"✅ Meeting deleted from CRM: {interaction_id}")

                # Clear interactions cache for this customer
                clear_cache(f"customer_id={existing_meeting['customer_id']}")
                clear_cache("get_recent_interactions")

                return {
                    "success": True,
                    "message": f"Meeting deleted from both {provider.capitalize()} Calendar and CRM"
                }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting meeting: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# GOOGLE CALENDAR SYNC ENDPOINTS
# ============================================================================

@router.post("/customers/{customer_id}/sync-google-calendar")
async def sync_google_calendar_to_crm(
    customer_id: int,
    google_access_token: str,
    sync_request: GoogleCalendarSyncRequest = GoogleCalendarSyncRequest(),
    authenticated_user: dict = Depends(verify_auth_token)
):
    """
    Sync ALL meetings FROM Google Calendar TO CRM for a specific customer.
    One-way sync: Google Calendar → CRM

    NO FILTERING - syncs all calendar events regardless of attendees.

    Steps:
    1. Get employee_id from authenticated user
    2. Fetch ALL events from Google Calendar within time range
    3. For each event:
       - Check if google_event_id already exists in interaction_details
       - If not exists: create new meeting record linked to this customer
    4. Return sync summary
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"🔄 Syncing ALL Google Calendar events for customer {customer_id} by user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Verify customer exists
                cursor.execute("SELECT client_id FROM clients_info WHERE client_id = %s", (customer_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Customer not found")

                # Step 1: Fetch ALL events from Google Calendar
                from services.google_calendar_service import GoogleCalendarService

                calendar_service = GoogleCalendarService(google_access_token)

                # Default time range: 30 days ago to 90 days future
                time_min = sync_request.time_min or (datetime.now() - timedelta(days=30)).isoformat() + 'Z'
                time_max = sync_request.time_max or (datetime.now() + timedelta(days=90)).isoformat() + 'Z'

                events = await calendar_service.list_events(
                    time_min=time_min,
                    time_max=time_max,
                    max_results=100
                )

                logger.info(f"📅 Fetched {len(events)} events from Google Calendar - syncing ALL events without filtering")

                synced_count = 0
                new_count = 0
                skipped_count = 0

                # Step 2: Process ALL events (no filtering)
                for event in events:
                    google_event_id = event['event_id']
                    event_title = event.get('summary', 'Untitled Meeting')

                    logger.info(f"🔍 Processing event: '{event_title}' (ID: {google_event_id})")

                    # Check if event already exists in CRM
                    cursor.execute("""
                        SELECT interaction_id FROM interaction_details
                        WHERE google_calendar_event_id = %s
                    """, (google_event_id,))

                    existing = cursor.fetchone()

                    if existing:
                        logger.info(f"⏭️  Event '{event_title}' already synced (interaction_id: {existing['interaction_id']})")
                        synced_count += 1
                        continue

                    # Create new meeting in CRM
                    start_dt = event['start'].get('dateTime')
                    end_dt = event['end'].get('dateTime')

                    if start_dt and end_dt:
                        meeting_content = json.dumps({
                            "title": event_title,
                            "description": event.get('description', ''),
                            "start_time": start_dt,
                            "end_time": end_dt,
                            "attendees": event.get('attendees', []),
                            "location": event.get('location', ''),
                            "meeting_link": event.get('meeting_link', ''),
                            "timezone": event['start'].get('timeZone', 'UTC')
                        })

                        # Get next interaction_id
                        cursor.execute("SELECT COALESCE(MAX(interaction_id), 0) + 1 as next_id FROM interaction_details")
                        result = cursor.fetchone()
                        next_interaction_id = result['next_id']

                        cursor.execute("""
                            INSERT INTO interaction_details
                            (interaction_id, customer_id, employee_id, type, content, google_calendar_event_id, source, theme, created_at, updated_at)
                            VALUES (%s, %s, %s, 'meet', %s, %s, 'google_calendar_sync', %s, NOW(), NOW())
                        """, (next_interaction_id, customer_id, employee_id, meeting_content, google_event_id, event_title))

                        new_count += 1
                        synced_count += 1
                        logger.info(f"✅ Created new meeting: '{event_title}' → customer {customer_id}, interaction_id {next_interaction_id}")
                    else:
                        logger.warning(f"⚠️  Event '{event_title}' missing start/end time, skipping")
                        skipped_count += 1

                conn.commit()

                logger.info(f"✅ Sync complete: {len(events)} total events, {new_count} new meetings created, {skipped_count} skipped")

                return {
                    "status": "success",
                    "total_events": len(events),
                    "total_synced": synced_count,
                    "new_meetings": new_count,
                    "skipped": skipped_count,
                    "message": f"Synced {new_count} new meetings from {provider.capitalize()} Calendar"
                }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing Calendar: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-all-google-calendar")
async def sync_all_google_calendar_to_crm(
    google_access_token: str = None,  # Optional - will use stored token if not provided
    sync_request: GoogleCalendarSyncRequest = GoogleCalendarSyncRequest(),
    authenticated_user: dict = Depends(verify_auth_token)
):
    """
    Sync ALL meetings FROM Calendar (Google/Outlook) TO CRM with auto-refresh tokens.
    One-way sync: Calendar (Google or Microsoft) → CRM

    NO FILTERING - syncs all calendar events and intelligently matches them to customers
    based on attendee email addresses. Events without matching customers are skipped.

    NEW: Now automatically detects calendar provider (Google or Microsoft).
    - If google_access_token is provided: Uses the old method (for backward compatibility)
    - If not provided: Auto-detects provider and uses stored tokens from database with auto-refresh

    Steps:
    1. Get employee_id from authenticated user
    2. Detect calendar provider (Google or Microsoft)
    3. Fetch ALL events from Calendar within time range (auto-refreshes token if expired)
    4. For each event:
       - Try to match attendees to customers in database
       - If customer found: link event to that customer
       - If no customer found: skip the event
    5. Return sync summary
    """
    try:
        user_email = authenticated_user.get('email', '')
        logger.info(f"🔄 Syncing ALL Calendar events by user {user_email}")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get employee_id
                employee_id = get_employee_id_by_email(user_email)
                if not employee_id:
                    raise HTTPException(status_code=404, detail="Employee not found")

                # Step 1: Detect calendar provider and create appropriate service
                provider = None
                if google_access_token:
                    # Legacy method: use provided token (may expire after 1 hour)
                    from services.google_calendar_service import GoogleCalendarService
                    logger.info("Using legacy GoogleCalendarService with provided token")
                    calendar_service = GoogleCalendarService(google_access_token)
                    provider = 'google'
                else:
                    # New method: auto-detect provider and use stored token with auto-refresh
                    provider = await detect_calendar_provider(user_email, conn)

                    if not provider:
                        raise HTTPException(
                            status_code=400,
                            detail="No calendar provider connected. Please connect Google Calendar or Outlook Calendar first."
                        )

                    logger.info(f"Detected calendar provider: {provider}")

                    if provider == 'google':
                        from services.google_calendar_service_v2 import GoogleCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using GoogleCalendarServiceV2 with auto-refresh")
                        calendar_service = GoogleCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    elif provider == 'microsoft':
                        from services.outlook_calendar_service_v2 import OutlookCalendarServiceV2
                        from auth.providers import auth_provider
                        logger.info("Using OutlookCalendarServiceV2 with auto-refresh")
                        calendar_service = OutlookCalendarServiceV2(
                            user_email=user_email,
                            db_connection=conn,
                            auth_provider=auth_provider
                        )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Unsupported calendar provider: {provider}"
                        )

                # Default time range: 30 days ago to 90 days future
                time_min = sync_request.time_min or (datetime.now() - timedelta(days=30)).isoformat() + 'Z'
                time_max = sync_request.time_max or (datetime.now() + timedelta(days=90)).isoformat() + 'Z'

                events = await calendar_service.list_events(
                    time_min=time_min,
                    time_max=time_max,
                    max_results=100
                )

                logger.info(f"📅 Fetched {len(events)} events from {provider.capitalize()} Calendar - processing all events")

                # Step 2: Get all customer emails for matching
                cursor.execute("SELECT client_id, LOWER(email) as email FROM clients_info WHERE email IS NOT NULL")
                customer_email_map = {row['email']: row['client_id'] for row in cursor.fetchall()}
                logger.info(f"📧 Loaded {len(customer_email_map)} customer emails for matching")

                synced_count = 0
                new_count = 0
                skipped_count = 0

                # Step 3: Process each event
                for event in events:
                    google_event_id = event['event_id']
                    event_title = event.get('summary', 'Untitled Meeting')
                    attendees = event.get('attendees', [])

                    logger.info(f"🔍 Processing event: '{event_title}' (ID: {google_event_id}, {len(attendees)} attendees)")

                    # Check if event already exists in CRM
                    cursor.execute("""
                        SELECT interaction_id FROM interaction_details
                        WHERE google_calendar_event_id = %s
                    """, (google_event_id,))

                    existing = cursor.fetchone()

                    if existing:
                        logger.info(f"⏭️  Event '{event_title}' already synced (interaction_id: {existing['interaction_id']})")
                        synced_count += 1
                        continue

                    # Try to match attendees to customers
                    matched_customer_id = None
                    for attendee_email in attendees:
                        attendee_lower = attendee_email.lower()
                        if attendee_lower in customer_email_map:
                            matched_customer_id = customer_email_map[attendee_lower]
                            logger.info(f"✅ Matched attendee {attendee_email} to customer_id {matched_customer_id}")
                            break

                    if not matched_customer_id:
                        logger.info(f"⏭️  No customer match found for event '{event_title}', skipping")
                        skipped_count += 1
                        continue

                    # Create new meeting in CRM
                    start_dt = event['start'].get('dateTime')
                    end_dt = event['end'].get('dateTime')

                    if start_dt and end_dt:
                        meeting_content = json.dumps({
                            "title": event_title,
                            "description": event.get('description', ''),
                            "start_time": start_dt,
                            "end_time": end_dt,
                            "attendees": event.get('attendees', []),
                            "location": event.get('location', ''),
                            "meeting_link": event.get('meeting_link', ''),
                            "timezone": event['start'].get('timeZone', 'UTC'),
                            "calendar_provider": provider
                        })

                        # Get next interaction_id
                        cursor.execute("SELECT COALESCE(MAX(interaction_id), 0) + 1 as next_id FROM interaction_details")
                        result = cursor.fetchone()
                        next_interaction_id = result['next_id']

                        # Determine source based on provider
                        source = 'google_calendar_sync' if provider == 'google' else 'outlook_calendar_sync'

                        cursor.execute("""
                            INSERT INTO interaction_details
                            (interaction_id, customer_id, employee_id, type, content, google_calendar_event_id, source, theme, created_at, updated_at)
                            VALUES (%s, %s, %s, 'meet', %s, %s, %s, %s, NOW(), NOW())
                        """, (next_interaction_id, matched_customer_id, employee_id, meeting_content, google_event_id, source, event_title))

                        new_count += 1
                        synced_count += 1
                        logger.info(f"✅ Created new meeting: '{event_title}' → customer {matched_customer_id}, interaction_id {next_interaction_id}")
                    else:
                        logger.warning(f"⚠️  Event '{event_title}' missing start/end time, skipping")
                        skipped_count += 1

                conn.commit()

                logger.info(f"✅ Sync complete: {len(events)} total events, {new_count} new meetings created, {skipped_count} skipped")

                return {
                    "status": "success",
                    "total_events": len(events),
                    "total_synced": synced_count,
                    "new_meetings": new_count,
                    "skipped": skipped_count,
                    "message": f"Synced {new_count} new meetings from {provider.capitalize()} Calendar"
                }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing Calendar: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
