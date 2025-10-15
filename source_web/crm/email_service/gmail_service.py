"""
Gmail API Service for OAuth-based email sending and reading.
Migrated and enhanced from backend_lead.
"""

import os
import base64
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Google API imports
try:
    from googleapiclient.discovery import build
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    logging.warning("Google API client not available. Gmail features will be disabled.")

from .models import (
    EmailProvider, EmailStatus, EmailSendResponse,
    EmailHistory, EmailReply
)

logger = logging.getLogger(__name__)

class GmailService:
    """Gmail API service for OAuth-based email operations."""

    def __init__(self):
        """Initialize Gmail service."""
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify'
        ]

    def _build_service(self, access_token: str):
        """Build Gmail service with access token."""
        if not GOOGLE_API_AVAILABLE:
            raise ValueError("Google API client not available")

        credentials = Credentials(
            token=access_token,
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.scopes
        )

        return build('gmail', 'v1', credentials=credentials)

    def _create_message(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_email: str,
        from_name: str = None
    ) -> Dict:
        """Create email message."""
        message = MIMEMultipart()

        if from_name:
            message['From'] = f"{from_name} <{from_email}>"
        else:
            message['From'] = from_email

        message['To'] = to_email
        message['Subject'] = subject

        # Add body
        message.attach(MIMEText(body, 'plain'))

        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

        return {'raw': raw_message}

    async def send_email(
        self,
        access_token: str,
        to_email: str,
        subject: str,
        body: str,
        from_email: str,
        from_name: str = None
    ) -> EmailSendResponse:
        """Send email via Gmail API."""
        try:
            service = self._build_service(access_token)

            # Create message
            message = self._create_message(to_email, subject, body, from_email, from_name)

            # Send message
            result = service.users().messages().send(
                userId='me',
                body=message
            ).execute()

            message_id = result.get('id')

            return EmailSendResponse(
                sent_to=to_email,
                success=True,
                message="Email sent successfully via Gmail",
                message_id=message_id,
                provider=EmailProvider.GMAIL
            )

        except Exception as e:
            logger.error(f"Error sending email via Gmail: {e}")
            return EmailSendResponse(
                sent_to=to_email,
                success=False,
                message=f"Failed to send email via Gmail: {str(e)}",
                provider=EmailProvider.GMAIL
            )

    async def get_user_profile(self, access_token: str) -> Dict:
        """Get user profile from Gmail."""
        try:
            service = self._build_service(access_token)

            profile = service.users().getProfile(userId='me').execute()

            return {
                "email": profile.get('emailAddress'),
                "messages_total": profile.get('messagesTotal', 0),
                "threads_total": profile.get('threadsTotal', 0)
            }

        except Exception as e:
            logger.error(f"Error getting Gmail profile: {e}")
            return {}

    async def search_emails(
        self,
        access_token: str,
        query: str,
        max_results: int = 50
    ) -> List[Dict]:
        """Search emails in Gmail."""
        try:
            service = self._build_service(access_token)

            # Search for messages
            results = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()

            messages = results.get('messages', [])
            email_list = []

            for message in messages:
                # Get full message details
                msg = service.users().messages().get(
                    userId='me',
                    id=message['id']
                ).execute()

                # Parse message
                headers = msg['payload'].get('headers', [])

                subject = ""
                from_email = ""
                to_email = ""
                date = ""

                for header in headers:
                    name = header.get('name', '').lower()
                    value = header.get('value', '')

                    if name == 'subject':
                        subject = value
                    elif name == 'from':
                        from_email = value
                    elif name == 'to':
                        to_email = value
                    elif name == 'date':
                        date = value

                # Get body
                body = self._extract_message_body(msg['payload'])

                email_data = {
                    "message_id": message['id'],
                    "thread_id": msg.get('threadId'),
                    "subject": subject,
                    "from_email": from_email,
                    "to_email": to_email,
                    "body": body,
                    "date": date,
                    "labels": msg.get('labelIds', [])
                }

                email_list.append(email_data)

            return email_list

        except Exception as e:
            logger.error(f"Error searching Gmail emails: {e}")
            return []

    def _extract_message_body(self, payload: Dict) -> str:
        """Extract email body from message payload."""
        body = ""

        if 'body' in payload and 'data' in payload['body']:
            # Simple text email
            body_data = payload['body']['data']
            body = base64.urlsafe_b64decode(body_data).decode('utf-8')
        elif 'parts' in payload:
            # Multipart email
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    if 'data' in part['body']:
                        body_data = part['body']['data']
                        body = base64.urlsafe_b64decode(body_data).decode('utf-8')
                        break
                elif part['mimeType'] == 'multipart/alternative':
                    # Nested multipart
                    body = self._extract_message_body(part)
                    if body:
                        break

        return body.strip()

    async def get_emails_with_lead(
        self,
        access_token: str,
        lead_email: str,
        days_back: int = 30
    ) -> List[Dict]:
        """Get emails exchanged with a specific lead."""
        # Build query to find emails to/from the lead
        query = f"(from:{lead_email} OR to:{lead_email})"

        # Add date filter
        if days_back > 0:
            date_filter = (datetime.now() - timedelta(days=days_back)).strftime('%Y/%m/%d')
            query += f" after:{date_filter}"

        return await self.search_emails(access_token, query, max_results=100)

    async def get_recent_replies(
        self,
        access_token: str,
        lead_email: str,
        original_message_id: str = None,
        days_back: int = 7
    ) -> List[Dict]:
        """Get recent replies from a lead."""
        query = f"from:{lead_email}"

        # Add date filter for recent emails
        if days_back > 0:
            date_filter = (datetime.now() - timedelta(days=days_back)).strftime('%Y/%m/%d')
            query += f" after:{date_filter}"

        # Add thread filter if we have original message ID
        if original_message_id:
            query += f" in:thread:{original_message_id}"

        return await self.search_emails(access_token, query, max_results=20)

    async def mark_as_read(self, access_token: str, message_id: str) -> bool:
        """Mark email as read."""
        try:
            service = self._build_service(access_token)

            service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()

            return True

        except Exception as e:
            logger.error(f"Error marking email as read: {e}")
            return False

    async def add_label(
        self,
        access_token: str,
        message_id: str,
        label_name: str
    ) -> bool:
        """Add label to email."""
        try:
            service = self._build_service(access_token)

            # Get or create label
            labels = service.users().labels().list(userId='me').execute()
            label_id = None

            for label in labels.get('labels', []):
                if label['name'] == label_name:
                    label_id = label['id']
                    break

            if not label_id:
                # Create new label
                label_object = {
                    'name': label_name,
                    'labelListVisibility': 'labelShow',
                    'messageListVisibility': 'show'
                }
                created_label = service.users().labels().create(
                    userId='me',
                    body=label_object
                ).execute()
                label_id = created_label['id']

            # Add label to message
            service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'addLabelIds': [label_id]}
            ).execute()

            return True

        except Exception as e:
            logger.error(f"Error adding label to email: {e}")
            return False

    def is_available(self) -> bool:
        """Check if Gmail service is available."""
        return GOOGLE_API_AVAILABLE and self.client_id and self.client_secret


# Service factory function
_gmail_service_instance = None

async def get_gmail_service() -> GmailService:
    """Get or create Gmail service instance."""
    global _gmail_service_instance
    if _gmail_service_instance is None:
        _gmail_service_instance = GmailService()
    return _gmail_service_instance