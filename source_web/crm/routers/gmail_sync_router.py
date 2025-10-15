"""Gmail sync functionality for CRM email integration"""

import base64
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from email.utils import parsedate_to_datetime
import re
import httpx
import json
import time
import random

from auth.providers import verify_auth_token
from routers.crm_data_router import (
    get_email_sync_state,
    update_email_sync_state,
    get_all_customer_emails,
    get_all_employee_emails,
    get_customer_by_email,
    create_email_interaction,
    batch_create_email_interactions,
    get_employee_id_by_email,
    get_accessible_employees,
    has_email_access,
    can_user_sync_emails
)
from sync.manager_email_sync import manager_email_sync_service
from auth.google_workspace_auth import GoogleWorkspaceAuth
from config.google_workspace_config import GoogleWorkspaceConfig

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class GmailSyncRequest(BaseModel):
    access_token: str
    include_body: bool = False
    include_sent: bool = True
    include_received: bool = True

class GmailSyncResponse(BaseModel):
    success: bool
    emails_synced: int
    last_sync_timestamp: str
    total_emails_synced: int
    message: str

class GmailStatusResponse(BaseModel):
    last_sync_timestamp: Optional[str] = None
    total_emails_synced: int = 0

# Helper functions

def extract_email_data(message, include_body: bool = False) -> Optional[Dict[str, Any]]:
    """
    Extract email data from Gmail API message response.
    
    Args:
        message: Gmail API message object
        include_body: Whether to include email body content
        
    Returns:
        Dictionary with email data or None if extraction fails
    """
    try:
        payload = message.get('payload', {})
        headers = payload.get('headers', [])
        
        # Initialize email data structure with Gmail message ID
        email_data = {
            'id': message.get('id', ''),  # Gmail message ID
            'subject': '',
            'from': '',
            'to': '',
            'cc': '',
            'date': None,
            'body': ''
        }
        
        # Extract headers
        for header in headers:
            name = header['name'].lower()
            value = header['value']
            
            if name == 'subject':
                email_data['subject'] = value
            elif name == 'from':
                email_data['from'] = value
            elif name == 'to':
                email_data['to'] = value
            elif name == 'cc':
                email_data['cc'] = value
            elif name == 'date':
                try:
                    email_data['date'] = parsedate_to_datetime(value)
                except:
                    email_data['date'] = datetime.now()
        
        # Extract body if requested
        if include_body:
            email_data['body'] = extract_email_body(payload)
        
        # Ensure we have minimum required fields
        if not email_data['from'] or not email_data['subject']:
            logger.warning(f"Email missing required fields: from={email_data['from']}, subject={email_data['subject']}")
            return None
        
        return email_data
        
    except Exception as e:
        logger.error(f"Error extracting email data: {e}")
        return None
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

def decode_base64(data: str) -> str:
    """Decode base64 encoded data"""
    try:
        # Gmail API uses URL-safe base64
        padding = 4 - (len(data) % 4)
        if padding != 4:
            data += '=' * padding
        return base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
    except Exception as e:
        logger.error(f"Error decoding base64: {e}")
        return ""

async def get_gmail_messages(access_token: str, query: str, max_results: int = 500) -> List[Dict]:
    """Get Gmail messages using REST API"""
    messages = []
    page_token = None
    
    async with httpx.AsyncClient() as client:
        while True:
            # Build request URL
            url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages"
            params = {
                'q': query,
                'maxResults': min(max_results - len(messages), 100)
            }
            if page_token:
                params['pageToken'] = page_token
            
            # Make request
            response = await client.get(
                url,
                params=params,
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if response.status_code != 200:
                logger.error(f"Gmail API error: {response.status_code} - {response.text}")
                if response.status_code == 401:
                    raise HTTPException(status_code=401, detail="Gmail access token expired")
                break
            
            data = response.json()
            messages.extend(data.get('messages', []))
            
            page_token = data.get('nextPageToken')
            if not page_token or len(messages) >= max_results:
                break
                
            # Log progress for large syncs
            if len(messages) % 500 == 0:
                logger.info(f"Fetched {len(messages)} message IDs so far...")
    
    return messages

async def get_gmail_message_details(access_token: str, message_id: str, include_body: bool = False) -> Dict:
    """Get Gmail message details using REST API"""
    async with httpx.AsyncClient() as client:
        # Request format - metadata is lighter than full
        format_param = 'full' if include_body else 'metadata'
        
        response = await client.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}",
            params={'format': format_param},
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get message {message_id}: {response.status_code}")
            return None
        
        return response.json()

def extract_email_body(payload: Dict) -> str:
    """Extract email body from Gmail message payload"""
    body = ""
    
    if 'parts' in payload:
        for part in payload['parts']:
            if part['mimeType'] == 'text/plain' and 'data' in part.get('body', {}):
                body = decode_base64(part['body']['data'])
                break
    elif 'body' in payload and 'data' in payload['body']:
        body = decode_base64(payload['body']['data'])
    
    return body

def batch_get_gmail_messages(gmail_service, message_ids: List[str], include_body: bool = False) -> List[Dict]:
    """
    Batch retrieve Gmail messages using the batch API with rate limiting and fallback.
    
    Args:
        gmail_service: Gmail API service object
        message_ids: List of message IDs to retrieve
        include_body: Whether to include email body content
        
    Returns:
        List of Gmail message objects
    """
    if not message_ids:
        return []
    
    logger.info(f"📦 Batch retrieving {len(message_ids)} emails using Gmail batch API")
    
    # Use smaller batch sizes to avoid rate limits
    BATCH_SIZE = 25  # Further reduced to minimize rate limiting
    all_messages = []
    failed_message_ids = []
    
    format_param = 'full' if include_body else 'metadata'
    
    for i in range(0, len(message_ids), BATCH_SIZE):
        batch_ids = message_ids[i:i + BATCH_SIZE]
        logger.info(f"📦 Processing batch {i//BATCH_SIZE + 1}: {len(batch_ids)} messages")
        
        # Add delay between batches to avoid rate limiting
        if i > 0:
            delay = 1.0 + random.uniform(0, 1.0)  # 1.0-2.0 second delay
            logger.info(f"⏱️ Waiting {delay:.2f}s to avoid rate limits...")
            time.sleep(delay)
        
        try:
            # Create batch request
            batch_request = gmail_service.new_batch_http_request()
            batch_results = {}
            batch_errors = {}
            
            def add_message_to_results(request_id, response, exception):
                """Callback function to handle batch response"""
                if exception is not None:
                    batch_errors[request_id] = exception
                    # Only log rate limit errors as warnings, not errors
                    if "rateLimitExceeded" in str(exception) or "Too many concurrent requests" in str(exception):
                        logger.warning(f"Rate limit hit for batch request {request_id}")
                    else:
                        logger.error(f"Error in batch request {request_id}: {exception}")
                else:
                    batch_results[request_id] = response
            
            # Add all message requests to the batch
            for j, msg_id in enumerate(batch_ids):
                request_id = str(j)  # Use index as request ID
                batch_request.add(
                    gmail_service.users().messages().get(
                        userId='me',
                        id=msg_id,
                        format=format_param
                    ),
                    callback=add_message_to_results,
                    request_id=request_id
                )
            
            # Execute the batch request
            batch_request.execute()
            
            # Collect successful results and track failed ones
            for j in range(len(batch_ids)):
                request_id = str(j)
                if request_id in batch_results:
                    all_messages.append(batch_results[request_id])
                elif request_id in batch_errors:
                    # Add to failed list for individual retry
                    failed_message_ids.append(batch_ids[j])
                else:
                    logger.warning(f"No result or error for message {batch_ids[j]}")
                    failed_message_ids.append(batch_ids[j])
            
            successful_count = len(batch_results)
            failed_count = len(batch_errors)
            logger.info(f"✅ Batch {i//BATCH_SIZE + 1} completed: {successful_count} success, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"Batch request failed entirely for messages {i}-{i+len(batch_ids)}: {e}")
            # Add all messages in this batch to failed list
            failed_message_ids.extend(batch_ids)
    
    # Retry failed messages individually with exponential backoff
    if failed_message_ids:
        logger.info(f"🔄 Retrying {len(failed_message_ids)} failed messages individually...")
        retry_delay = 1.0  # Start with 1 second delay
        
        for msg_id in failed_message_ids:
            try:
                time.sleep(retry_delay)  # Delay before each individual request
                message = gmail_service.users().messages().get(
                    userId='me',
                    id=msg_id,
                    format=format_param
                ).execute()
                all_messages.append(message)
                
                # Reset delay on success
                retry_delay = max(0.5, retry_delay * 0.9)  # Gradually reduce delay
                
            except Exception as individual_error:
                if "rateLimitExceeded" in str(individual_error) or "quotaExceeded" in str(individual_error):
                    logger.warning(f"Rate limit during individual retry for {msg_id}, increasing delay")
                    retry_delay = min(10.0, retry_delay * 2)  # Exponential backoff, max 10s
                    time.sleep(retry_delay)
                else:
                    logger.error(f"Individual retry failed for message {msg_id}: {individual_error}")
                continue
    
    success_rate = len(all_messages) / len(message_ids) * 100 if message_ids else 0
    logger.info(f"📦 Batch retrieval complete: {len(all_messages)} messages retrieved from {len(message_ids)} requested ({success_rate:.1f}% success)")
    
    if len(all_messages) < len(message_ids):
        missed = len(message_ids) - len(all_messages)
        logger.warning(f"⚠️ {missed} messages could not be retrieved due to rate limits or errors")
    
    return all_messages

# API Endpoints
@router.get("/gmail/test")
async def test_gmail_endpoint():
    """Test endpoint to verify Gmail sync is loaded"""
    return {"status": "Gmail sync endpoints are loaded and working"}

@router.get("/gmail/debug-emails")
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
            "authorization_message": "Authorized for Gmail sync - Manager" if can_sync else "Not authorized - Individual email sync restricted to managers only",
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

@router.post("/gmail/test-query")
async def test_gmail_query(request: GmailSyncRequest):
    """Test Gmail query construction and basic API call"""
    try:
        logger.info("Testing Gmail query construction...")
        
        # Get customer and employee emails
        customer_emails = get_all_customer_emails()
        employee_emails = get_all_employee_emails()
        
        logger.info(f"Customer emails: {customer_emails}")
        logger.info(f"Employee emails: {employee_emails}")
        
        # Combine for search
        all_tracked_emails = set(customer_emails) | set(employee_emails)
        
        # Build a simple test query
        if len(all_tracked_emails) > 0:
            email_queries = []
            for email in list(all_tracked_emails)[:5]:  # Just first 5 for testing
                email_queries.append(f"from:{email}")
                email_queries.append(f"to:{email}")
            email_filter = " OR ".join(email_queries)
            query = f"({email_filter})"
            
            # Add a recent date filter
            date_7_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y/%m/%d')
            query = f"({email_filter}) AND after:{date_7_days_ago}"
            
            logger.info(f"Test query: {query}")
            
            # Try to get messages
            messages = await get_gmail_messages(request.access_token, query, max_results=10)
            logger.info(f"Found {len(messages)} messages with test query")
            
            return {
                "status": "success",
                "query": query,
                "messages_found": len(messages),
                "customer_emails": customer_emails,
                "employee_emails": employee_emails,
                "all_tracked_emails": list(all_tracked_emails)
            }
        else:
            return {
                "status": "error",
                "message": "No customer emails found in database"
            }
            
    except Exception as e:
        logger.error(f"Error in test query: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/gmail/test-service-account")
async def test_service_account_setup(authenticated_user: dict = Depends(verify_auth_token)):
    """Test Google Workspace service account configuration"""
    try:
        # Test configuration loading
        config = GoogleWorkspaceConfig.from_environment()
        
        # Test service account file
        workspace_auth = GoogleWorkspaceAuth(
            service_account_path=config.get_service_account_path(),
            workspace_domain=config.workspace_domain
        )
        
        # Test with authenticated user's email
        user_email = authenticated_user.get('email', '')
        if user_email:
            # Try to create Gmail service (this will test domain-wide delegation)
            try:
                gmail_service = workspace_auth.create_gmail_service(user_email)
                # Try a simple API call
                profile = gmail_service.users().getProfile(userId='me').execute()
                
                return {
                    "status": "success",
                    "message": "Service account setup is working correctly",
                    "config": {
                        "workspace_domain": config.workspace_domain,
                        "service_account_exists": config.service_account_path is not None,
                        "test_user": user_email
                    },
                    "gmail_profile": {
                        "email": profile.get('emailAddress'),
                        "messages_total": profile.get('messagesTotal', 0),
                        "threads_total": profile.get('threadsTotal', 0)
                    }
                }
            except Exception as gmail_error:
                return {
                    "status": "error",
                    "message": f"Gmail API access failed: {str(gmail_error)}",
                    "error_type": type(gmail_error).__name__,
                    "config": {
                        "workspace_domain": config.workspace_domain,
                        "service_account_exists": config.service_account_path is not None,
                        "test_user": user_email
                    }
                }
        else:
            return {
                "status": "error", 
                "message": "No authenticated user email found"
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Service account test failed: {str(e)}",
            "error_type": type(e).__name__
        }

@router.get("/gmail/status")
async def get_gmail_status(authenticated_user: dict = Depends(verify_auth_token)) -> GmailStatusResponse:
    """Get Gmail sync status"""
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
        
        sync_state = get_email_sync_state(employee_id)
        
        if not sync_state:
            return GmailStatusResponse(
                last_sync_timestamp=None,
                total_emails_synced=0
            )
        
        return GmailStatusResponse(
            last_sync_timestamp=sync_state['last_sync_timestamp'].isoformat() if sync_state['last_sync_timestamp'] else None,
            total_emails_synced=sync_state['emails_synced_count']
        )
        
    except Exception as e:
        logger.error(f"Error getting Gmail status: {e}")
        return GmailStatusResponse(total_emails_synced=0)

@router.post("/gmail/sync")
async def sync_gmail_emails(
    request: GmailSyncRequest,
    authenticated_user: dict = Depends(verify_auth_token)
) -> GmailSyncResponse:
    """Sync emails from Gmail - Individual Mode"""
    try:
        logger.info(f"Gmail sync requested by user: {authenticated_user.get('email', 'unknown')}")
        
        # Get user's employee ID
        user_email = authenticated_user.get('email', '')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in authentication")
        
        try:
            employee_id = get_employee_id_by_email(user_email)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=403, detail="User is not registered as an employee")
            raise

        logger.info(f"Gmail sync started by user: {user_email} (employee_id: {employee_id})")
        
        # Get sync state for this employee
        sync_state = get_email_sync_state(employee_id)
        
        # Get customer and employee emails
        customer_emails = get_all_customer_emails()
        employee_emails = get_all_employee_emails()
        
        logger.info(f"Found {len(customer_emails)} customer email addresses in database")
        logger.info(f"Found {len(employee_emails)} employee email addresses in database")
        
        if not customer_emails:
            return GmailSyncResponse(
                success=True,
                emails_synced=0,
                last_sync_timestamp=datetime.now().isoformat(),
                total_emails_synced=0,
                message="No customers found in database"
            )
        
        # Combine customer and employee emails for search
        all_tracked_emails = set(customer_emails) | set(employee_emails)
        logger.info(f"Total tracked emails (customers + employees): {len(all_tracked_emails)}")
        
        # Build search query - look for emails from/to customer OR employee addresses
        # Create email filter for all tracked emails
        if len(all_tracked_emails) > 0:
            # Log which emails we're tracking
            logger.info(f"Sample tracked emails: {list(all_tracked_emails)[:10]}")
            
            # Check if our target emails are in the set
            if 'bohan.wu@preludeos.com' in all_tracked_emails:
                logger.info("Found bohan.wu@preludeos.com in tracked emails")
            if 'bolin.wu@preludeos.com' in all_tracked_emails:
                logger.info("Found bolin.wu@preludeos.com in tracked emails")
            
            # Build OR query for tracked emails - filter out empty emails
            # Convert to sorted list to ensure consistent ordering
            tracked_emails_list = sorted(list(all_tracked_emails))
            
            # Build query with all valid emails (Gmail can handle long queries)
            email_queries = []
            included_emails = []
            for email in tracked_emails_list:
                if email and email.strip() and '@' in email:  # Validate email
                    email_queries.append(f"from:{email}")
                    email_queries.append(f"to:{email}")
                    included_emails.append(email)
            
            logger.info(f"Building query with {len(included_emails)} emails")
            if 'bohan.wu@preludeos.com' in included_emails:
                logger.info("✓ bohan.wu@preludeos.com is included in query")
            else:
                logger.warning("✗ bohan.wu@preludeos.com is NOT included in query")
            
            if 'bolin.wu@preludeos.com' in included_emails:
                logger.info("✓ bolin.wu@preludeos.com is included in query")
            else:
                logger.warning("✗ bolin.wu@preludeos.com is NOT included in query")
            
            if not email_queries:
                logger.error("No valid email addresses found to search for")
                return GmailSyncResponse(
                    success=False,
                    emails_synced=0,
                    last_sync_timestamp=datetime.now().isoformat(),
                    total_emails_synced=0,
                    message="No valid email addresses found in database"
                )
            
            email_filter = " OR ".join(email_queries)
            
            # Add date filter for incremental sync
            if sync_state and sync_state.get('last_sync_timestamp'):
                # Get emails newer than last sync
                # Gmail's after: filter is date-based, not time-based
                # This means it will fetch all emails from that date, even if synced before
                # The ON CONFLICT DO NOTHING in the database handles duplicates
                last_sync = sync_state['last_sync_timestamp']
                date_filter = last_sync.strftime('%Y/%m/%d')
                query = f"({email_filter}) AND after:{date_filter}"
                logger.info(f"Using incremental sync from {date_filter} (last sync was {last_sync})")
            else:
                # Initial sync - get last 30 days
                date_30_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y/%m/%d')
                query = f"({email_filter}) AND after:{date_30_days_ago}"
        else:
            # Fallback to date-only query
            if sync_state and sync_state.get('last_sync_timestamp'):
                last_sync = sync_state['last_sync_timestamp']
                date_filter = last_sync.strftime('%Y/%m/%d')
                query = f"after:{date_filter}"
            else:
                # No date filter for initial sync
                query = ""
        
        # Get messages
        logger.info(f"Fetching emails with query (truncated): {query[:200]}...")
        messages = await get_gmail_messages(request.access_token, query, max_results=500)  # Limit for initial testing
        
        # Process emails
        emails_synced = 0
        total_messages = len(messages)
        logger.info(f"Found {total_messages} messages matching query")
        
        
        for idx, msg in enumerate(messages):
            try:
                # Get message details
                message_data = await get_gmail_message_details(
                    request.access_token, 
                    msg['id'], 
                    request.include_body
                )
                
                if not message_data:
                    continue
                
                # Extract headers
                headers = message_data.get('payload', {}).get('headers', [])
                email_data = {
                    'id': message_data['id'],
                    'subject': '',
                    'from': '',
                    'to': '',
                    'cc': '',
                    'date': None,
                    'body': ''
                }
                
                for header in headers:
                    name = header['name'].lower()
                    value = header['value']
                    
                    if name == 'subject':
                        email_data['subject'] = value
                    elif name == 'from':
                        email_data['from'] = value
                    elif name == 'to':
                        email_data['to'] = value
                    elif name == 'cc':
                        email_data['cc'] = value
                    elif name == 'date':
                        try:
                            email_data['date'] = parsedate_to_datetime(value)
                        except:
                            email_data['date'] = datetime.now()
                
                # Extract body if requested
                if request.include_body:
                    email_data['body'] = extract_email_body(message_data.get('payload', {}))
                
                # Extract all email addresses from the email
                all_emails = []
                all_emails.extend(extract_email_addresses(email_data['from']))
                all_emails.extend(extract_email_addresses(email_data['to']))
                all_emails.extend(extract_email_addresses(email_data['cc']))
                
                # Log email addresses found
                if idx < 5:  # Log first 5 emails for debugging
                    logger.info(f"Email {idx+1}: From={email_data['from']}, To={email_data['to']}, Subject={email_data['subject'][:50]}")
                
                # Find matching customer - check if ANY email in the conversation is a customer
                customer_matched = False
                customer_email_found = None
                already_exists = False
                
                # Check all email addresses in the email
                for email_addr in all_emails:
                    if email_addr in customer_emails:
                        customer_email_found = email_addr
                        break
                
                if customer_email_found:
                    customer = get_customer_by_email(customer_email_found)
                    if customer:
                        logger.info(f"Matched email to customer: {customer['client_name']} ({customer_email_found})")
                        result = create_email_interaction(customer['client_id'], email_data, request.include_body)
                        if result:
                            emails_synced += 1
                            customer_matched = True
                            logger.info(f"Successfully synced email: {email_data['subject'][:50]}...")
                        else:
                            already_exists = True
                            logger.info(f"Email already exists in database (skipping): {email_data['subject'][:50]}...")
                elif idx < 5:
                    logger.info(f"No customer match for email addresses: {all_emails}")
                    logger.debug(f"Known customer emails: {list(customer_emails)[:5]}...")
                
                # Log progress every 100 emails
                if (idx + 1) % 100 == 0:
                    logger.info(f"Processed {idx + 1}/{total_messages} emails, synced {emails_synced} so far")
                
            except Exception as e:
                logger.error(f"Error processing email {msg['id']}: {e}")
                continue
        
        logger.info(f"Finished processing all {total_messages} emails, synced {emails_synced} total")
        
        # Update sync state for this employee
        try:
            update_email_sync_state(f"sync_{datetime.now().isoformat()}", emails_synced, employee_id)
        except Exception as e:
            logger.error(f"Failed to update sync state: {e}")
            # Don't fail the whole sync if state update fails
        
        # Get updated totals for this employee
        try:
            updated_state = get_email_sync_state(employee_id)
            total_synced = updated_state['emails_synced_count'] if updated_state else emails_synced
        except Exception as e:
            logger.error(f"Failed to get sync state: {e}")
            total_synced = emails_synced
        
        
        return GmailSyncResponse(
            success=True,
            emails_synced=emails_synced,
            last_sync_timestamp=datetime.now().isoformat(),
            total_emails_synced=total_synced,
            message=f"Successfully synced {emails_synced} new customer emails"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing Gmail emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# MANAGER TEAM SYNC ENDPOINTS

class GmailTeamSyncRequest(BaseModel):
    """Request model for manager team Gmail sync using user access token"""
    access_token: str  # Manager's OAuth access token
    include_body: bool = True
    include_sent: bool = True
    include_received: bool = True
    days_back: int = 30

class GmailDomainSyncRequest(BaseModel):
    """Request model for domain admin Gmail sync"""
    service_account_json: str  # Google service account JSON string
    domain: str  # Domain to sync (e.g., 'preludeos.com')
    include_body: bool = True
    days_back: int = 30

class GmailTeamSyncResponse(BaseModel):
    """Response model for manager team sync"""
    success: bool
    sync_job_id: Optional[str] = None
    employees_processed: int = 0
    total_emails_synced: int = 0
    errors: List[str] = []
    message: str

class GmailSyncProgressResponse(BaseModel):
    """Response model for sync progress"""
    sync_job_id: str
    status: str  # 'starting', 'processing', 'completed', 'failed'
    total_employees: int = 0
    processed_employees: int = 0
    total_emails_synced: int = 0
    errors: List[str] = []
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

@router.post("/gmail/sync-team")
async def sync_team_gmail_emails(
    request: GmailTeamSyncRequest,
    authenticated_user: dict = Depends(verify_auth_token)
) -> GmailTeamSyncResponse:
    """Sync Gmail emails for all employees accessible to a manager using domain admin credentials"""
    try:
        logger.info(f"Team Gmail sync requested by user: {authenticated_user.get('email', 'unknown')}")
        
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
            return GmailTeamSyncResponse(
                success=True,
                message="No employees accessible to this manager. Please contact admin to grant email access permissions.",
                employees_processed=0,
                total_emails_synced=0
            )
        
        logger.info(f"Manager {manager_employee_id} has access to {len(accessible_employees)} employees")
        
        # REAL TEAM SYNC with service account domain-wide delegation
        try:
            # Initialize Google Workspace authentication
            try:
                config = GoogleWorkspaceConfig.from_environment()
                logger.info(f"Loaded config - Domain: {config.workspace_domain}, Service account path: {config.service_account_path}")
                workspace_auth = GoogleWorkspaceAuth(
                    service_account_path=config.get_service_account_path(),
                    workspace_domain=config.workspace_domain
                )
            except Exception as config_error:
                logger.error(f"Failed to initialize Google Workspace config: {config_error}")
                raise HTTPException(status_code=500, detail=f"Configuration error: {str(config_error)}")
            
            # Generate sync job ID
            sync_job_id = f"team_sync_{manager_employee_id}_{int(datetime.now().timestamp())}"
            logger.info(f"Starting REAL team sync with job ID: {sync_job_id}")
            
            total_emails_synced = 0
            employees_processed = 0
            sync_errors = []
            employee_email_counts = {}  # Track emails synced per employee
            
            # Sync emails for each accessible employee using service account impersonation
            for employee in accessible_employees:
                try:
                    employee_email = employee['email']
                    employee_id = employee['employee_id']  # Fix: Use correct field name
                    
                    logger.info(f"🔄 Starting email sync for employee {employee_id}: {employee_email}")
                    
                    # Create Gmail service impersonating this employee
                    gmail_service = workspace_auth.create_gmail_service(employee_email)
                    
                    # Get customer and employee emails for filtering
                    customer_emails = get_all_customer_emails()
                    employee_emails = get_all_employee_emails()
                    all_tracked_emails = set(customer_emails) | set(employee_emails)
                    
                    if not all_tracked_emails:
                        logger.warning(f"No tracked emails found for filtering {employee_email}")
                        continue
                    
                    # Build Gmail query for this employee's interactions
                    email_queries = []
                    for tracked_email in all_tracked_emails:
                        if request.include_sent:
                            email_queries.append(f"to:{tracked_email}")
                        if request.include_received:
                            email_queries.append(f"from:{tracked_email}")
                    
                    if not email_queries:
                        continue
                    
                    email_filter = " OR ".join(email_queries)
                    
                    # CRITICAL FIX: Use THIS employee's individual sync state for incremental sync
                    employee_sync_state = get_email_sync_state(employee_id)
                    
                    if employee_sync_state and employee_sync_state.get('last_sync_timestamp'):
                        # Incremental sync: get emails newer than this employee's last sync
                        last_sync = employee_sync_state['last_sync_timestamp']
                        date_filter = last_sync.strftime('%Y/%m/%d')
                        query = f"({email_filter}) AND after:{date_filter}"
                        logger.info(f"📅 Incremental sync for employee {employee_id}: emails after {date_filter} (last sync: {last_sync})")
                    else:
                        # Initial sync for this employee: get last 30 days
                        date_30_days_ago = (datetime.now() - timedelta(days=request.days_back)).strftime('%Y/%m/%d')
                        query = f"({email_filter}) AND after:{date_30_days_ago}"
                        logger.info(f"📅 Initial sync for employee {employee_id}: emails from last {request.days_back} days ({date_30_days_ago})")
                    
                    # Get message IDs using service account
                    messages = gmail_service.users().messages().list(
                        userId='me',
                        q=query,
                        maxResults=100
                    ).execute()
                    
                    message_list = messages.get('messages', [])
                    if not message_list:
                        logger.info(f"No messages found for employee {employee_email}")
                        continue
                    
                    # Extract just the message IDs for batch processing
                    message_ids = [msg['id'] for msg in message_list]
                    logger.info(f"Found {len(message_ids)} messages for employee {employee_email}, retrieving in batches...")
                    
                    # Use batch API to get all message details efficiently
                    batch_messages = batch_get_gmail_messages(gmail_service, message_ids, request.include_body)
                    
                    # Collect all emails for this employee in a batch for database processing
                    employee_email_batch = []
                    customer_emails = get_all_customer_emails()  # Get once for efficiency
                    
                    # Process each message and collect for batch database insert
                    for message in batch_messages:
                        try:
                            # Extract email details
                            email_data = extract_email_data(message, request.include_body)
                            
                            if email_data:
                                customer_email_found = None
                                
                                # Check if any email in the conversation matches a customer
                                for field in ['from', 'to', 'cc']:
                                    field_value = email_data.get(field, '')
                                    if field_value:
                                        for customer_email in customer_emails:
                                            if customer_email.lower() in field_value.lower():
                                                customer_email_found = customer_email
                                                break
                                        if customer_email_found:
                                            break
                                
                                if customer_email_found:
                                    customer = get_customer_by_email(customer_email_found)
                                    if customer:
                                        # Add to batch instead of individual insert
                                        email_record = {
                                            'customer_id': customer['client_id'],
                                            'email_data': email_data,
                                            'employee_id': employee_id
                                        }
                                        employee_email_batch.append(email_record)
                                
                        except Exception as msg_error:
                            logger.error(f"Error processing message {message.get('id', 'unknown')} for {employee_email}: {msg_error}")
                            continue
                    
                    # Batch insert all emails for this employee
                    if employee_email_batch:
                        logger.info(f"📦 Batch inserting {len(employee_email_batch)} emails for employee {employee_id}")
                        employee_emails_synced = batch_create_email_interactions(
                            employee_email_batch,
                            include_body=request.include_body,
                            synced_by_employee_id=manager_employee_id
                        )
                        logger.info(f"✅ Successfully batch inserted {employee_emails_synced} emails for employee {employee_id}")
                    else:
                        employee_emails_synced = 0
                    
                    total_emails_synced += employee_emails_synced
                    employees_processed += 1
                    employee_email_counts[employee_id] = employee_emails_synced  # Track per employee
                    
                    logger.info(f"✅ Completed sync for employee {employee_id}: {employee_email} - {employee_emails_synced} emails synced")
                    
                except Exception as emp_error:
                    error_msg = f"Failed to sync emails for {employee['email']}: {str(emp_error)}"
                    logger.error(error_msg)
                    logger.error(f"Full error details for {employee['email']}: {repr(emp_error)}")
                    sync_errors.append(error_msg)
                    continue
            
            # Update sync state for manager and each employee
            manager_sync_id = f"team_sync_{sync_job_id}"
            update_email_sync_state(manager_sync_id, total_emails_synced, manager_employee_id)
            
            # Update sync state for each employee that had emails synced
            for employee_id, email_count in employee_email_counts.items():
                if email_count > 0:
                    employee_sync_id = f"employee_sync_{sync_job_id}_{employee_id}"
                    update_email_sync_state(employee_sync_id, email_count, employee_id)
                    logger.info(f"📊 Updated sync state for employee {employee_id}: {email_count} emails")
            
            success_message = f"REAL team sync completed! Processed {employees_processed} employees, synced {total_emails_synced} emails"
            if sync_errors:
                success_message += f". {len(sync_errors)} errors occurred."
            
            logger.info(success_message)
            
            # FAIL HARD if no employees were processed or if there were errors
            if employees_processed == 0:
                error_details = "; ".join(sync_errors[:3])  # Show first 3 errors
                raise HTTPException(
                    status_code=500, 
                    detail=f"Team sync failed - no employees processed. Errors: {error_details}"
                )
            
            if len(sync_errors) >= len(accessible_employees):  # All employees failed
                error_details = "; ".join(sync_errors[:3])
                raise HTTPException(
                    status_code=500,
                    detail=f"Team sync failed - all employees failed to sync. Errors: {error_details}"
                )
            
            # Store completed sync job for status endpoint
            manager_email_sync_service.store_sync_progress(sync_job_id, {
                'status': 'completed' if len(sync_errors) == 0 else 'partial',
                'total_employees': len(accessible_employees),
                'processed_employees': employees_processed,
                'total_emails_synced': total_emails_synced,
                'started_at': datetime.now().isoformat(),
                'completed_at': datetime.now().isoformat(),
                'errors': sync_errors
            })
            
            return GmailTeamSyncResponse(
                success=True,
                sync_job_id=sync_job_id,
                employees_processed=employees_processed,
                total_emails_synced=total_emails_synced,
                employee_count=len(accessible_employees),
                message=success_message
            )
            
        except Exception as service_error:
            logger.error(f"Service account authentication failed: {service_error}")
            if "unauthorized_client" in str(service_error) or "domain-wide delegation" in str(service_error):
                raise HTTPException(
                    status_code=500,
                    detail="Domain-wide delegation not configured. Please ensure service account is authorized in Google Workspace Admin Console."
                )
            raise HTTPException(status_code=500, detail=f"Service account error: {str(service_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in team Gmail sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gmail/team-status/{sync_job_id}")
async def get_gmail_team_sync_status(
    sync_job_id: str,
    authenticated_user: dict = Depends(verify_auth_token)
) -> GmailSyncProgressResponse:
    """Get status of a Gmail team sync job"""
    try:
        progress = manager_email_sync_service.get_sync_progress(sync_job_id)
        
        if not progress:
            raise HTTPException(status_code=404, detail="Sync job not found")
        
        return GmailSyncProgressResponse(
            sync_job_id=sync_job_id,
            status=progress.get('status', 'unknown'),
            total_employees=progress.get('total_employees', 0),
            processed_employees=progress.get('processed_employees', 0),
            total_emails_synced=progress.get('total_emails_synced', 0),
            errors=progress.get('errors', []),
            started_at=progress.get('started_at') if progress.get('started_at') else None,
            completed_at=progress.get('completed_at') if progress.get('completed_at') else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Gmail sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gmail/sync-authorization")
async def check_gmail_sync_authorization(
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Check if current user is authorized to sync Gmail emails"""
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
            "message": "User is authorized to sync Gmail emails" if authorized else "User is not authorized to sync emails - managers only",
            "reason": None if authorized else "Individual email sync is restricted to managers only"
        }
        
    except Exception as e:
        logger.error(f"Error checking Gmail sync authorization: {e}")
        return {
            "authorized": False, 
            "reason": f"Error checking authorization: {str(e)}",
            "employee_id": None,
            "accessible_employees_count": 0
        }

@router.get("/gmail/accessible-employees")
async def get_accessible_employees_for_gmail(
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict[str, Any]:
    """Get list of employees accessible to the current manager for Gmail sync"""
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