"""Outlook sync functionality for CRM email integration using Microsoft Graph API"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
import json
from email.utils import parsedate_to_datetime
import re

from auth.providers import verify_auth_token
from routers.crm_data_router import (
    get_email_sync_state,
    update_email_sync_state,
    get_all_customer_emails,
    get_all_employee_emails,
    get_customer_by_email,
    create_email_interaction,
    get_employee_id_by_email,
    get_employee_id_by_email_optional,
    get_accessible_employees,
    has_email_access,
    can_user_sync_emails
)
from sync.manager_email_sync import manager_email_sync_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Microsoft Graph API endpoints
GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
OUTLOOK_MESSAGES_ENDPOINT = f"{GRAPH_API_BASE}/me/messages"
OUTLOOK_USER_ENDPOINT = f"{GRAPH_API_BASE}/me"

# Pydantic models
class OutlookSyncRequest(BaseModel):
    access_token: str
    include_body: bool = True
    include_sent: bool = True
    include_received: bool = True

class OutlookSyncResponse(BaseModel):
    success: bool
    emails_synced: int
    last_sync_timestamp: str
    total_emails_synced: int
    message: str

class OutlookStatusResponse(BaseModel):
    last_sync_timestamp: Optional[str] = None
    total_emails_synced: int = 0

# Helper functions
def extract_email_addresses(text: str) -> List[str]:
    """Extract email addresses from a string"""
    if not text:
        return []
    
    # Pattern to match email addresses
    email_pattern = r'<([^>]+@[^>]+)>|([^\s,;<]+@[^\s,;<]+)'
    matches = re.findall(email_pattern, text)
    
    # Extract the non-empty group from each match
    emails = []
    for match in matches:
        email = match[0] or match[1]
        if email:
            emails.append(email.lower().strip())
    
    return emails

def parse_outlook_email_addresses(email_field: Dict) -> List[str]:
    """Parse Outlook email address format from toRecipients, ccRecipients, etc."""
    emails = []
    if not email_field:
        return emails
        
    for recipient in email_field:
        if 'emailAddress' in recipient and 'address' in recipient['emailAddress']:
            emails.append(recipient['emailAddress']['address'].lower().strip())
    
    return emails

async def get_outlook_messages(access_token: str, query_params: Dict) -> List[Dict]:
    """Get Outlook messages using Microsoft Graph API"""
    messages = []
    url = OUTLOOK_MESSAGES_ENDPOINT
    
    async with httpx.AsyncClient() as client:
        while url:
            response = await client.get(
                url,
                params=query_params if not messages else None,  # Only use params on first request
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if response.status_code != 200:
                logger.error(f"Microsoft Graph API error: {response.status_code} - {response.text}")
                if response.status_code == 401:
                    raise HTTPException(status_code=401, detail="Outlook access token expired")
                break
            
            data = response.json()
            messages.extend(data.get('value', []))
            
            # Handle pagination
            url = data.get('@odata.nextLink')
            if not url or len(messages) >= query_params.get('$top', 500):
                break
                
            # Log progress for large syncs
            if len(messages) % 500 == 0:
                logger.info(f"Fetched {len(messages)} messages so far...")
    
    return messages

async def get_outlook_user_info(access_token: str) -> Dict:
    """Get user information from Microsoft Graph API"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            OUTLOOK_USER_ENDPOINT,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get user info: {response.status_code} - {response.text}")
            return None
        
        return response.json()

# API Endpoints
@router.get("/outlook/test")
async def test_outlook_endpoint():
    """Test endpoint to verify Outlook sync is loaded"""
    return {"status": "Outlook sync endpoints are loaded and working"}

@router.get("/outlook/debug-emails")
async def debug_emails(authenticated_user: dict = Depends(verify_auth_token)):
    """Debug endpoint - now shows authorization status and email access"""
    try:
        customer_emails = get_all_customer_emails()
        employee_emails = get_all_employee_emails()
        
        # Try to get employee_id for the authenticated user
        user_email = authenticated_user.get('email', '')
        employee_id = None
        employee_exists = False
        can_sync = False
        accessible_employees = []
        manager_permissions = []
        
        if user_email:
            try:
                employee_id = get_employee_id_by_email(user_email)
                employee_exists = True
                can_sync = can_user_sync_emails(employee_id)
                
                if can_sync:
                    accessible_employees = get_accessible_employees(employee_id)
                    manager_permissions = get_manager_permissions(employee_id)
                    
            except:
                employee_exists = False
        
        return {
            "authenticated_user_email": user_email,
            "employee_exists": employee_exists,
            "employee_id": employee_id,
            
            # Authorization status
            "can_sync_emails": can_sync,
            "authorization_message": "Authorized for Outlook sync - Manager" if can_sync else "Not authorized - Individual email sync restricted to managers only",
            "is_manager": can_sync,
            
            # Manager-specific data
            "accessible_employees_count": len(accessible_employees) if accessible_employees else 0,
            "accessible_employees": accessible_employees[:5] if accessible_employees else [],  # Show first 5
            "manager_permissions_count": len(manager_permissions) if manager_permissions else 0,
            "active_permissions": [p for p in manager_permissions if p.get('is_active')] if manager_permissions else [],
            
            # Database stats
            "customer_emails_count": len(customer_emails),
            "employee_emails_count": len(employee_emails),
            "sample_customer_emails": customer_emails[:3] if customer_emails else [],
            "sample_employee_emails": employee_emails[:3] if employee_emails else []
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/outlook/test-connection")
async def test_outlook_connection(request: OutlookSyncRequest, authenticated_user: dict = Depends(verify_auth_token)):
    """Test Outlook connection and get user info"""
    try:
        logger.info("Testing Outlook connection...")
        
        # Get user info
        user_info = await get_outlook_user_info(request.access_token)
        
        if not user_info:
            return {
                "status": "error",
                "message": "Failed to get user information from Outlook"
            }
        
        # Try to get a few messages to test the connection
        query_params = {
            '$top': 5,
            '$select': 'subject,from,receivedDateTime',
            '$orderby': 'receivedDateTime desc'
        }
        
        messages = await get_outlook_messages(request.access_token, query_params)
        
        # Check if this Outlook email maps to an employee
        outlook_email = user_info.get('mail') or user_info.get('userPrincipalName', '')
        employee_id = get_employee_id_by_email_optional(outlook_email) if outlook_email else None
        
        return {
            "status": "success",
            "user_email": outlook_email,
            "user_name": user_info.get('displayName'),
            "messages_found": len(messages),
            "employee_found": employee_id is not None,
            "employee_id": employee_id,
            "authenticated_as": authenticated_user.get('email', ''),
            "message": "Successfully connected to Outlook"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing Outlook connection: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/outlook/status")
async def get_outlook_status(authenticated_user: dict = Depends(verify_auth_token)) -> OutlookStatusResponse:
    """Get Outlook sync status"""
    try:
        # Get employee_id from authenticated user
        user_email = authenticated_user.get('email', '')
        employee_id = None
        if user_email:
            try:
                employee_id = get_employee_id_by_email(user_email)
            except HTTPException:
                # Employee not found, use default sync state
                pass
        
        # Get sync state for this employee
        sync_state = get_email_sync_state(employee_id)
        
        if not sync_state:
            return OutlookStatusResponse(
                last_sync_timestamp=None,
                total_emails_synced=0
            )
        
        return OutlookStatusResponse(
            last_sync_timestamp=sync_state['last_sync_timestamp'].isoformat() if sync_state['last_sync_timestamp'] else None,
            total_emails_synced=sync_state['emails_synced_count']
        )
        
    except Exception as e:
        logger.error(f"Error getting Outlook status: {e}")
        return OutlookStatusResponse(total_emails_synced=0)

@router.post("/outlook/sync")
async def sync_outlook_emails(
    request: OutlookSyncRequest,
    authenticated_user: dict = Depends(verify_auth_token)
) -> OutlookSyncResponse:
    """Sync emails from Outlook - MANAGERS ONLY"""
    try:
        logger.info(f"Outlook sync requested by user: {authenticated_user.get('email', 'unknown')}")
        
        # Get user's employee ID from authenticated session
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # CHECK: Only managers can sync emails
        if not can_user_sync_emails(employee_id):
            raise HTTPException(
                status_code=403, 
                detail="Individual email sync is restricted to managers only. Please contact your manager for email access."
            )
        
        logger.info(f"Outlook sync started by authorized manager: {user_email} (employee_id: {employee_id})")
        
        # Try to get the Outlook user's email from the access token for verification
        outlook_user_info = await get_outlook_user_info(request.access_token)
        outlook_email = None
        if outlook_user_info:
            outlook_email = outlook_user_info.get('mail') or outlook_user_info.get('userPrincipalName', '')
            logger.info(f"Connected Outlook account email from profile: {outlook_email}")
        else:
            logger.warning("Could not get Outlook user info from profile API")
        
        # Get sync state for this employee
        sync_state = get_email_sync_state(employee_id)
        
        # Get customer and employee emails
        customer_emails = get_all_customer_emails()
        employee_emails = get_all_employee_emails()
        
        logger.info(f"Found {len(customer_emails)} customer email addresses in database")
        logger.info(f"Found {len(employee_emails)} employee email addresses in database")
        
        # Log sample emails for debugging
        if customer_emails:
            logger.info(f"Sample customer emails: {list(customer_emails)[:3]}")
        if employee_emails:
            logger.info(f"Sample employee emails: {list(employee_emails)[:3]}")
        
        if not customer_emails:
            logger.warning("No customers found in database - emails will not be synced")
            return OutlookSyncResponse(
                success=True,
                emails_synced=0,
                last_sync_timestamp=datetime.now().isoformat(),
                total_emails_synced=0,
                message="No customers found in database - please add customers first"
            )
        
        # Convert to lowercase sets for case-insensitive matching
        customer_emails = set(email.lower() for email in customer_emails)
        employee_emails = set(email.lower() for email in employee_emails)
        all_tracked_emails = customer_emails | employee_emails
        logger.info(f"Total tracked emails (customers + employees): {len(all_tracked_emails)}")
        
        # Build query parameters for Microsoft Graph API
        query_params = {
            '$top': 500,  # Max results per request
            '$select': 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,bodyPreview',
            '$orderby': 'receivedDateTime desc'
        }
        
        # Add date filter for incremental sync
        if sync_state and sync_state.get('last_sync_timestamp'):
            last_sync = sync_state['last_sync_timestamp']
            # Microsoft Graph uses ISO 8601 format with Z suffix for UTC
            if hasattr(last_sync, 'isoformat'):
                date_filter = last_sync.isoformat().replace('+00:00', 'Z')
            else:
                date_filter = str(last_sync).replace('+00:00', 'Z')
            query_params['$filter'] = f"receivedDateTime ge {date_filter}"
            logger.info(f"Using incremental sync from {date_filter}")
        else:
            # Initial sync - get last 30 days
            date_30_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat().replace('+00:00', 'Z')
            query_params['$filter'] = f"receivedDateTime ge {date_30_days_ago}"
            logger.info(f"Initial sync - getting emails from last 30 days")
        
        # Get messages
        logger.info("Fetching emails from Outlook...")
        messages = await get_outlook_messages(request.access_token, query_params)
        
        # Process emails
        emails_synced = 0
        total_messages = len(messages)
        logger.info(f"Found {total_messages} messages to process")
        
        for idx, msg in enumerate(messages):
            try:
                # Extract email data
                email_data = {
                    'id': msg['id'],
                    'subject': msg.get('subject', ''),
                    'from': '',
                    'to': '',
                    'cc': '',
                    'date': None,
                    'body': ''
                }
                
                # Extract from address
                if msg.get('from') and msg['from'].get('emailAddress'):
                    email_data['from'] = msg['from']['emailAddress'].get('address', '')
                
                # Extract to addresses
                to_emails = []
                if msg.get('toRecipients'):
                    to_emails = parse_outlook_email_addresses(msg['toRecipients'])
                email_data['to'] = ', '.join(to_emails)
                
                # Extract cc addresses
                cc_emails = []
                if msg.get('ccRecipients'):
                    cc_emails = parse_outlook_email_addresses(msg['ccRecipients'])
                email_data['cc'] = ', '.join(cc_emails)
                
                # Parse date
                if msg.get('receivedDateTime'):
                    try:
                        email_data['date'] = datetime.fromisoformat(msg['receivedDateTime'].replace('Z', '+00:00'))
                    except:
                        email_data['date'] = datetime.now()
                
                # Extract body if requested
                if request.include_body and msg.get('body'):
                    if msg['body'].get('contentType') == 'text':
                        email_data['body'] = msg['body'].get('content', '')
                    else:
                        # Use bodyPreview for HTML emails
                        email_data['body'] = msg.get('bodyPreview', '')
                
                # Extract all email addresses from the email
                all_emails = []
                if email_data['from']:
                    all_emails.append(email_data['from'].lower())
                all_emails.extend([e.lower() for e in to_emails])
                all_emails.extend([e.lower() for e in cc_emails])
                
                # Log email addresses found
                if idx < 5:  # Log first 5 emails for debugging
                    logger.info(f"Email {idx+1}: From={email_data['from']}, To={email_data['to']}, Subject={email_data['subject'][:50]}")
                
                # Find matching customer
                customer_email_found = None
                
                # Check all email addresses in the email
                for email_addr in all_emails:
                    if email_addr in customer_emails:
                        customer_email_found = email_addr
                        break
                
                if customer_email_found:
                    customer = get_customer_by_email(customer_email_found)
                    if customer:
                        logger.info(f"Matched email to customer: {customer['client_name']} ({customer_email_found})")
                        # Pass the employee_id we got from the Outlook user
                        result = create_email_interaction(customer['client_id'], email_data, request.include_body, employee_id)
                        if result:
                            emails_synced += 1
                            logger.info(f"Successfully synced email: {email_data['subject'][:50]}...")
                        else:
                            logger.debug(f"Email already exists in database (skipping): {email_data['subject'][:50]}...")
                    else:
                        logger.warning(f"Customer found in email list but not in database: {customer_email_found}")
                elif idx < 10:  # Log first 10 non-matching emails for debugging
                    logger.debug(f"No customer match for email {idx+1}:")
                    logger.debug(f"  From: {email_data['from']}")
                    logger.debug(f"  To: {email_data['to']}")
                    logger.debug(f"  Subject: {email_data['subject'][:50]}")
                    logger.debug(f"  All emails in message: {all_emails}")
                    logger.debug(f"  Looking for matches in {len(customer_emails)} customer emails")
                
                # Log progress every 100 emails
                if (idx + 1) % 100 == 0:
                    logger.info(f"Processed {idx + 1}/{total_messages} emails, synced {emails_synced} so far")
                
            except Exception as e:
                logger.error(f"Error processing email {msg.get('id', 'unknown')}: {e}")
                continue
        
        logger.info(f"Finished processing all {total_messages} emails, synced {emails_synced} total")
        
        # Update sync state for this employee
        try:
            logger.info(f"Updating email sync state: employee_id={employee_id}, emails_synced={emails_synced}, outlook_email={outlook_email}")
            update_email_sync_state(f"outlook_sync_{datetime.now().isoformat()}", emails_synced, employee_id)
            logger.info(f"Successfully updated sync state for employee_id={employee_id}")
        except Exception as e:
            logger.error(f"Failed to update sync state: {e}")
        
        # Get updated totals for this employee
        try:
            logger.info(f"Getting updated sync state for employee_id: {employee_id}")
            updated_state = get_email_sync_state(employee_id)
            if updated_state:
                total_synced = updated_state['emails_synced_count']
                logger.info(f"Retrieved sync state: total_synced={total_synced}, last_sync={updated_state.get('last_sync_timestamp')}")
            else:
                total_synced = emails_synced
                logger.warning(f"No sync state found for employee_id {employee_id}, using current sync count: {emails_synced}")
        except Exception as e:
            logger.error(f"Failed to get sync state: {e}")
            total_synced = emails_synced
        
        return OutlookSyncResponse(
            success=True,
            emails_synced=emails_synced,
            last_sync_timestamp=datetime.now().isoformat(),
            total_emails_synced=total_synced,
            message=f"Successfully synced {emails_synced} new customer emails from Outlook"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing Outlook emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# MANAGER TEAM SYNC ENDPOINTS

class OutlookTeamSyncRequest(BaseModel):
    """Request model for manager team Outlook sync using user access token"""
    access_token: str  # Manager's OAuth access token
    include_body: bool = True
    include_sent: bool = True
    include_received: bool = True
    days_back: int = 30

class OutlookDomainSyncRequest(BaseModel):
    """Request model for domain admin Outlook sync"""
    tenant_id: str  # Microsoft tenant ID
    client_id: str  # Application (client) ID
    client_secret: str  # Client secret
    include_body: bool = True
    days_back: int = 30

class OutlookTeamSyncResponse(BaseModel):
    """Response model for manager team sync"""
    success: bool
    sync_job_id: Optional[str] = None
    employees_processed: int = 0
    total_emails_synced: int = 0
    errors: List[str] = []
    message: str

class OutlookSyncProgressResponse(BaseModel):
    """Response model for sync progress"""
    sync_job_id: str
    status: str  # 'starting', 'processing', 'completed', 'failed'
    total_employees: int = 0
    processed_employees: int = 0
    total_emails_synced: int = 0
    errors: List[str] = []
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

@router.post("/outlook/sync-team")
async def sync_team_outlook_emails(
    request: OutlookTeamSyncRequest,
    authenticated_user: dict = Depends(verify_auth_token)
) -> OutlookTeamSyncResponse:
    """Sync Outlook emails for all employees accessible to a manager using Microsoft Graph app permissions"""
    try:
        logger.info(f"Team Outlook sync requested by user: {authenticated_user.get('email', 'unknown')}")
        
        # Get manager's employee ID
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            manager_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        # Check if user has any accessible employees
        accessible_employees = get_accessible_employees(manager_employee_id)
        if not accessible_employees:
            return OutlookTeamSyncResponse(
                success=True,
                message="No employees accessible to this manager. Please contact admin to grant email access permissions.",
                employees_processed=0,
                total_emails_synced=0
            )
        
        logger.info(f"Manager {manager_employee_id} has access to {len(accessible_employees)} employees")
        
        # Prepare domain configuration
        domain_config = {
            'tenant_id': request.tenant_id,
            'client_id': request.client_id,
            'client_secret': request.client_secret
        }
        
        # Start team sync
        sync_result = await manager_email_sync_service.sync_team_outlook(
            manager_id=manager_employee_id,
            domain_config=domain_config,
            include_body=request.include_body,
            days_back=request.days_back
        )
        
        return OutlookTeamSyncResponse(
            success=sync_result['success'],
            sync_job_id=sync_result.get('sync_job_id'),
            employees_processed=sync_result.get('employees_processed', 0),
            total_emails_synced=sync_result.get('total_emails_synced', 0),
            errors=sync_result.get('errors', []),
            message=sync_result.get('message', 'Team Outlook sync completed')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in team Outlook sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/outlook/team-status/{sync_job_id}")
async def get_outlook_team_sync_status(
    sync_job_id: str,
    authenticated_user: dict = Depends(verify_auth_token)
) -> OutlookSyncProgressResponse:
    """Get status of an Outlook team sync job"""
    try:
        progress = manager_email_sync_service.get_sync_progress(sync_job_id)
        
        if not progress:
            raise HTTPException(status_code=404, detail="Sync job not found")
        
        return OutlookSyncProgressResponse(
            sync_job_id=sync_job_id,
            status=progress.get('status', 'unknown'),
            total_employees=progress.get('total_employees', 0),
            processed_employees=progress.get('processed_employees', 0),
            total_emails_synced=progress.get('total_emails_synced', 0),
            errors=progress.get('errors', []),
            started_at=progress.get('started_at').isoformat() if progress.get('started_at') else None,
            completed_at=progress.get('completed_at').isoformat() if progress.get('completed_at') else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Outlook sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/outlook/sync-authorization")
async def check_outlook_sync_authorization(
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Check if current user is authorized to sync Outlook emails"""
    try:
        user_email = authenticated_user.get('email', '')
        if not user_email:
            return {
                "authorized": False, 
                "reason": "User email not found in authentication",
                "employee_id": None,
                "accessible_employees_count": 0
            }
        
        try:
            employee_id = get_employee_id_by_email(user_email)
        except HTTPException:
            return {
                "authorized": False, 
                "reason": "User is not registered as an employee",
                "employee_id": None,
                "accessible_employees_count": 0
            }
        
        # Check if user can sync emails
        authorized = can_user_sync_emails(employee_id)
        accessible_employees = get_accessible_employees(employee_id) if authorized else []
        
        return {
            "authorized": authorized,
            "employee_id": employee_id,
            "user_email": user_email,
            "accessible_employees_count": len(accessible_employees),
            "message": "User is authorized to sync Outlook emails" if authorized else "User is not authorized to sync emails - managers only",
            "reason": None if authorized else "Individual email sync is restricted to managers only"
        }
        
    except Exception as e:
        logger.error(f"Error checking Outlook sync authorization: {e}")
        return {
            "authorized": False, 
            "reason": f"Error checking authorization: {str(e)}",
            "employee_id": None,
            "accessible_employees_count": 0
        }

@router.get("/outlook/accessible-employees")
async def get_accessible_employees_for_outlook(
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Get list of employees accessible to the current manager for Outlook sync"""
    try:
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            manager_employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise
        
        accessible_employees = get_accessible_employees(manager_employee_id)
        
        return {
            "manager_id": manager_employee_id,
            "manager_email": user_email,
            "accessible_employees": accessible_employees,
            "total_accessible": len(accessible_employees),
            "message": f"Found {len(accessible_employees)} accessible employees"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting accessible employees: {e}")
        raise HTTPException(status_code=500, detail=str(e))