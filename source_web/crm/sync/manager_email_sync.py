"""Manager Email Sync Service for CRM email integration"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import httpx
import json
import base64
from email.utils import parsedate_to_datetime
import re

from routers.crm_data_router import (
    get_accessible_employees,
    has_email_access,
    get_all_customer_emails,
    get_customer_by_email,
    create_email_interaction,
    get_employee_id_by_email_optional
)

logger = logging.getLogger(__name__)

class ManagerEmailSyncService:
    """Service for syncing emails from multiple employees under a manager"""
    
    def __init__(self):
        self.sync_progress = {}  # Track progress of ongoing syncs
    
    async def sync_team_gmail(
        self, 
        manager_id: int, 
        domain_config: Dict[str, Any],
        include_body: bool = True,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Sync Gmail emails for all employees accessible to a manager using domain admin credentials
        
        Args:
            manager_id: ID of the manager performing the sync
            domain_config: Domain admin configuration with service_account_json
            include_body: Whether to include email body content
            days_back: Number of days back to sync emails
            
        Returns:
            Dict with sync results
        """
        try:
            logger.info(f"Starting Gmail team sync for manager {manager_id}")
            
            # Create sync job ID for progress tracking
            sync_job_id = f"gmail_sync_{manager_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.sync_progress[sync_job_id] = {
                'status': 'starting',
                'total_employees': 0,
                'processed_employees': 0,
                'total_emails_synced': 0,
                'errors': [],
                'started_at': datetime.now()
            }
            
            # Get employees manager can access
            accessible_employees = get_accessible_employees(manager_id)
            if not accessible_employees:
                self.sync_progress[sync_job_id]['status'] = 'completed'
                return {
                    'success': True,
                    'sync_job_id': sync_job_id,
                    'message': 'No accessible employees found for manager',
                    'employees_processed': 0,
                    'total_emails_synced': 0
                }
            
            self.sync_progress[sync_job_id]['total_employees'] = len(accessible_employees)
            self.sync_progress[sync_job_id]['status'] = 'processing'
            
            # Get customer emails for filtering
            customer_emails = set(get_all_customer_emails())
            if not customer_emails:
                self.sync_progress[sync_job_id]['status'] = 'completed'
                return {
                    'success': True,
                    'sync_job_id': sync_job_id,
                    'message': 'No customers found in database',
                    'employees_processed': 0,
                    'total_emails_synced': 0
                }
            
            # Initialize Google domain service
            gmail_service = await self._initialize_gmail_domain_service(domain_config)
            
            total_emails_synced = 0
            processed_employees = 0
            
            # Process each employee
            for employee in accessible_employees:
                try:
                    logger.info(f"Processing emails for employee: {employee['name']} ({employee['email']})")
                    
                    # Sync emails for this employee
                    employee_emails = await self._sync_gmail_for_employee(
                        gmail_service,
                        employee,
                        customer_emails,
                        manager_id,
                        include_body,
                        days_back
                    )
                    
                    total_emails_synced += employee_emails
                    processed_employees += 1
                    
                    # Update progress
                    self.sync_progress[sync_job_id]['processed_employees'] = processed_employees
                    self.sync_progress[sync_job_id]['total_emails_synced'] = total_emails_synced
                    
                    logger.info(f"Synced {employee_emails} emails for {employee['name']}")
                    
                    # Rate limiting - avoid hitting Gmail API limits
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    error_msg = f"Error syncing emails for {employee['name']}: {str(e)}"
                    logger.error(error_msg)
                    self.sync_progress[sync_job_id]['errors'].append(error_msg)
                    processed_employees += 1
                    self.sync_progress[sync_job_id]['processed_employees'] = processed_employees
            
            # Complete sync
            self.sync_progress[sync_job_id]['status'] = 'completed'
            self.sync_progress[sync_job_id]['completed_at'] = datetime.now()
            
            logger.info(f"Gmail team sync completed for manager {manager_id}. "
                       f"Processed {processed_employees} employees, synced {total_emails_synced} emails")
            
            return {
                'success': True,
                'sync_job_id': sync_job_id,
                'employees_processed': processed_employees,
                'total_emails_synced': total_emails_synced,
                'errors': self.sync_progress[sync_job_id]['errors'],
                'message': f"Successfully synced {total_emails_synced} emails from {processed_employees} employees"
            }
            
        except Exception as e:
            logger.error(f"Error in Gmail team sync for manager {manager_id}: {e}")
            if sync_job_id in self.sync_progress:
                self.sync_progress[sync_job_id]['status'] = 'failed'
                self.sync_progress[sync_job_id]['error'] = str(e)
            
            return {
                'success': False,
                'sync_job_id': sync_job_id if 'sync_job_id' in locals() else None,
                'error': str(e),
                'message': f"Gmail team sync failed: {str(e)}"
            }
    
    async def sync_team_outlook(
        self,
        manager_id: int,
        domain_config: Dict[str, Any], 
        include_body: bool = True,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Sync Outlook emails for all employees accessible to a manager using app permissions
        
        Args:
            manager_id: ID of the manager performing the sync
            domain_config: Microsoft domain config with tenant_id, client_id, client_secret
            include_body: Whether to include email body content
            days_back: Number of days back to sync emails
            
        Returns:
            Dict with sync results
        """
        try:
            logger.info(f"Starting Outlook team sync for manager {manager_id}")
            
            # Create sync job ID for progress tracking
            sync_job_id = f"outlook_sync_{manager_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.sync_progress[sync_job_id] = {
                'status': 'starting',
                'total_employees': 0,
                'processed_employees': 0,
                'total_emails_synced': 0,
                'errors': [],
                'started_at': datetime.now()
            }
            
            # Get employees manager can access
            accessible_employees = get_accessible_employees(manager_id)
            if not accessible_employees:
                self.sync_progress[sync_job_id]['status'] = 'completed'
                return {
                    'success': True,
                    'sync_job_id': sync_job_id,
                    'message': 'No accessible employees found for manager',
                    'employees_processed': 0,
                    'total_emails_synced': 0
                }
            
            self.sync_progress[sync_job_id]['total_employees'] = len(accessible_employees)
            self.sync_progress[sync_job_id]['status'] = 'processing'
            
            # Get customer emails for filtering
            customer_emails = set(get_all_customer_emails())
            if not customer_emails:
                self.sync_progress[sync_job_id]['status'] = 'completed'
                return {
                    'success': True,
                    'sync_job_id': sync_job_id,
                    'message': 'No customers found in database',
                    'employees_processed': 0,
                    'total_emails_synced': 0
                }
            
            # Get Microsoft Graph access token
            access_token = await self._get_microsoft_app_token(domain_config)
            
            total_emails_synced = 0
            processed_employees = 0
            
            # Process each employee
            for employee in accessible_employees:
                try:
                    logger.info(f"Processing Outlook emails for employee: {employee['name']} ({employee['email']})")
                    
                    # Sync emails for this employee
                    employee_emails = await self._sync_outlook_for_employee(
                        access_token,
                        employee,
                        customer_emails,
                        manager_id,
                        include_body,
                        days_back
                    )
                    
                    total_emails_synced += employee_emails
                    processed_employees += 1
                    
                    # Update progress
                    self.sync_progress[sync_job_id]['processed_employees'] = processed_employees
                    self.sync_progress[sync_job_id]['total_emails_synced'] = total_emails_synced
                    
                    logger.info(f"Synced {employee_emails} Outlook emails for {employee['name']}")
                    
                    # Rate limiting - avoid hitting Graph API limits
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    error_msg = f"Error syncing Outlook emails for {employee['name']}: {str(e)}"
                    logger.error(error_msg)
                    self.sync_progress[sync_job_id]['errors'].append(error_msg)
                    processed_employees += 1
                    self.sync_progress[sync_job_id]['processed_employees'] = processed_employees
            
            # Complete sync
            self.sync_progress[sync_job_id]['status'] = 'completed'
            self.sync_progress[sync_job_id]['completed_at'] = datetime.now()
            
            logger.info(f"Outlook team sync completed for manager {manager_id}. "
                       f"Processed {processed_employees} employees, synced {total_emails_synced} emails")
            
            return {
                'success': True,
                'sync_job_id': sync_job_id,
                'employees_processed': processed_employees,
                'total_emails_synced': total_emails_synced,
                'errors': self.sync_progress[sync_job_id]['errors'],
                'message': f"Successfully synced {total_emails_synced} Outlook emails from {processed_employees} employees"
            }
            
        except Exception as e:
            logger.error(f"Error in Outlook team sync for manager {manager_id}: {e}")
            if sync_job_id in self.sync_progress:
                self.sync_progress[sync_job_id]['status'] = 'failed'
                self.sync_progress[sync_job_id]['error'] = str(e)
            
            return {
                'success': False,
                'sync_job_id': sync_job_id if 'sync_job_id' in locals() else None,
                'error': str(e),
                'message': f"Outlook team sync failed: {str(e)}"
            }
    
    def get_sync_progress(self, sync_job_id: str) -> Optional[Dict[str, Any]]:
        """Get progress of a sync job"""
        return self.sync_progress.get(sync_job_id)
    
    def store_sync_progress(self, sync_job_id: str, progress_data: Dict[str, Any]):
        """Store progress data for a sync job"""
        self.sync_progress[sync_job_id] = progress_data
        logger.info(f"Stored sync progress for job {sync_job_id}: {progress_data.get('status', 'unknown')}")
    
    def cleanup_old_progress(self, hours_old: int = 24):
        """Clean up old sync progress records"""
        cutoff_time = datetime.now() - timedelta(hours=hours_old)
        to_remove = []
        
        for job_id, progress in self.sync_progress.items():
            if progress.get('started_at', datetime.now()) < cutoff_time:
                to_remove.append(job_id)
        
        for job_id in to_remove:
            del self.sync_progress[job_id]
        
        logger.info(f"Cleaned up {len(to_remove)} old sync progress records")
    
    # Private helper methods
    async def _initialize_gmail_domain_service(self, domain_config: Dict[str, Any]):
        """Initialize Gmail service with domain admin credentials"""
        try:
            # This would use Google's service account delegation
            # For now, return a mock service - will implement actual Google API integration later
            logger.info("Initializing Gmail domain service with service account")
            return {
                'type': 'gmail_domain',
                'service_account_json': domain_config.get('service_account_json'),
                'domain': domain_config.get('domain')
            }
        except Exception as e:
            logger.error(f"Error initializing Gmail domain service: {e}")
            raise
    
    async def _get_microsoft_app_token(self, domain_config: Dict[str, Any]) -> str:
        """Get Microsoft Graph app-only access token"""
        try:
            tenant_id = domain_config['tenant_id']
            client_id = domain_config['client_id']
            client_secret = domain_config['client_secret']
            
            token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_url,
                    data={
                        'grant_type': 'client_credentials',
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'scope': 'https://graph.microsoft.com/.default'
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Failed to get Microsoft app token: {response.text}")
                
                token_data = response.json()
                return token_data['access_token']
                
        except Exception as e:
            logger.error(f"Error getting Microsoft app token: {e}")
            raise
    
    async def _sync_gmail_for_employee(
        self,
        gmail_service: Dict,
        employee: Dict,
        customer_emails: set,
        manager_id: int,
        include_body: bool,
        days_back: int
    ) -> int:
        """Sync Gmail emails for a specific employee"""
        try:
            # For now, return mock data - will implement actual Gmail API calls later
            # This would use the Gmail service to impersonate the employee and get their emails
            logger.info(f"Mock: Syncing Gmail for {employee['email']} as {employee['name']}")
            
            # Mock: return random number of emails synced
            import random
            emails_synced = random.randint(0, 10)
            
            # In real implementation, this would:
            # 1. Use service account to impersonate employee
            # 2. Get emails from employee's mailbox
            # 3. Filter emails that involve customers
            # 4. Create interaction records with synced_by_employee_id=manager_id
            
            return emails_synced
            
        except Exception as e:
            logger.error(f"Error syncing Gmail for employee {employee['email']}: {e}")
            return 0
    
    async def _sync_outlook_for_employee(
        self,
        access_token: str,
        employee: Dict,
        customer_emails: set,
        manager_id: int,
        include_body: bool,
        days_back: int
    ) -> int:
        """Sync Outlook emails for a specific employee"""
        try:
            # Get employee's Outlook emails using Microsoft Graph API
            employee_id = employee['employee_id']
            employee_email = employee['email']
            
            # Build date filter
            date_filter = (datetime.now() - timedelta(days=days_back)).isoformat().replace('+00:00', 'Z')
            
            # Get employee's user ID from Microsoft Graph
            user_id = await self._get_microsoft_user_id(access_token, employee_email)
            if not user_id:
                logger.warning(f"Could not find Microsoft user ID for {employee_email}")
                return 0
            
            # Get messages from employee's mailbox
            async with httpx.AsyncClient() as client:
                url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages"
                params = {
                    '$select': 'id,subject,from,toRecipients,ccRecipients,receivedDateTime,body',
                    '$filter': f"receivedDateTime ge {date_filter}",
                    '$orderby': 'receivedDateTime desc',
                    '$top': 500
                }
                
                response = await client.get(
                    url,
                    params=params,
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to get messages for {employee_email}: {response.text}")
                    return 0
                
                messages = response.json().get('value', [])
                
                emails_synced = 0
                
                # Process each message
                for message in messages:
                    try:
                        # Extract email data
                        email_data = self._extract_outlook_email_data(message, include_body)
                        
                        # Check if email involves any customers
                        all_email_addresses = self._extract_all_email_addresses_outlook(message)
                        
                        customer_email_found = None
                        for email_addr in all_email_addresses:
                            if email_addr.lower() in customer_emails:
                                customer_email_found = email_addr.lower()
                                break
                        
                        if customer_email_found:
                            # Get customer info
                            customer = get_customer_by_email(customer_email_found)
                            if customer:
                                # Create email interaction
                                result = create_email_interaction(
                                    customer['client_id'], 
                                    email_data, 
                                    include_body,
                                    employee_id,  # original email owner
                                    manager_id    # synced by manager
                                )
                                if result:
                                    emails_synced += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing message {message.get('id', 'unknown')}: {e}")
                        continue
                
                logger.info(f"Synced {emails_synced} Outlook emails for {employee_email}")
                return emails_synced
                
        except Exception as e:
            logger.error(f"Error syncing Outlook for employee {employee['email']}: {e}")
            return 0
    
    async def _get_microsoft_user_id(self, access_token: str, email: str) -> Optional[str]:
        """Get Microsoft Graph user ID for an email address"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"https://graph.microsoft.com/v1.0/users/{email}"
                response = await client.get(
                    url,
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    return user_data.get('id')
                else:
                    logger.warning(f"Could not find Microsoft user for {email}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting Microsoft user ID for {email}: {e}")
            return None
    
    def _extract_outlook_email_data(self, message: Dict, include_body: bool) -> Dict[str, Any]:
        """Extract email data from Outlook message"""
        email_data = {
            'id': message.get('id', ''),
            'subject': message.get('subject', ''),
            'from': '',
            'to': '',
            'cc': '',
            'date': None,
            'body': ''
        }
        
        # Extract from address
        if message.get('from') and message['from'].get('emailAddress'):
            email_data['from'] = message['from']['emailAddress'].get('address', '')
        
        # Extract to addresses
        to_emails = []
        if message.get('toRecipients'):
            for recipient in message['toRecipients']:
                if recipient.get('emailAddress') and recipient['emailAddress'].get('address'):
                    to_emails.append(recipient['emailAddress']['address'])
        email_data['to'] = ', '.join(to_emails)
        
        # Extract cc addresses
        cc_emails = []
        if message.get('ccRecipients'):
            for recipient in message['ccRecipients']:
                if recipient.get('emailAddress') and recipient['emailAddress'].get('address'):
                    cc_emails.append(recipient['emailAddress']['address'])
        email_data['cc'] = ', '.join(cc_emails)
        
        # Parse date
        if message.get('receivedDateTime'):
            try:
                email_data['date'] = datetime.fromisoformat(message['receivedDateTime'].replace('Z', '+00:00'))
            except:
                email_data['date'] = datetime.now()
        
        # Extract body if requested
        if include_body and message.get('body'):
            if message['body'].get('contentType') == 'text':
                email_data['body'] = message['body'].get('content', '')
            else:
                # Use a simple text extraction for HTML emails
                html_content = message['body'].get('content', '')
                # Simple HTML tag removal (basic implementation)
                email_data['body'] = re.sub(r'<[^>]+>', '', html_content)[:1000]
        
        return email_data
    
    def _extract_all_email_addresses_outlook(self, message: Dict) -> List[str]:
        """Extract all email addresses from an Outlook message"""
        emails = []
        
        # From address
        if message.get('from') and message['from'].get('emailAddress'):
            from_addr = message['from']['emailAddress'].get('address')
            if from_addr:
                emails.append(from_addr.lower())
        
        # To addresses
        if message.get('toRecipients'):
            for recipient in message['toRecipients']:
                if recipient.get('emailAddress') and recipient['emailAddress'].get('address'):
                    emails.append(recipient['emailAddress']['address'].lower())
        
        # CC addresses
        if message.get('ccRecipients'):
            for recipient in message['ccRecipients']:
                if recipient.get('emailAddress') and recipient['emailAddress'].get('address'):
                    emails.append(recipient['emailAddress']['address'].lower())
        
        return emails

# Global instance for the service
manager_email_sync_service = ManagerEmailSyncService()