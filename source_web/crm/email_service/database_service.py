"""
Email Database Service for storing and retrieving email data.
Migrated and enhanced from backend_lead.
"""

import logging
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime

from data.connection import execute_query, get_connection
from .models import (
    EmailHistory, EmailReply, EmailStatus, EmailSentiment,
    EmailHistoryListResponse, EmailRepliesListResponse
)

logger = logging.getLogger(__name__)

class EmailDatabaseService:
    """Service for email database operations."""

    def __init__(self):
        """Initialize the email database service."""
        # For now, we'll use a simplified approach that works with the existing connection pattern
        pass


    def save_email(self, email_data: Dict) -> str:
        """Save email to database."""
        try:
            from data.connection import execute_query

            email_id = email_data.get('email_id') or str(uuid.uuid4())

            execute_query("""
                INSERT INTO lead_emails (
                    email_id, lead_id, from_email, to_email, subject, body,
                    direction, employee_id, email_timestamp, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                email_id,
                email_data.get('lead_id'),
                email_data.get('from_email'),
                email_data.get('to_email'),
                email_data.get('subject'),
                email_data.get('body'),
                email_data.get('direction', 'sent'),
                email_data.get('employee_id'),
                email_data.get('email_timestamp') or datetime.utcnow(),
                datetime.utcnow()
            ))
            logger.info(f"Email {email_id} saved to database")
            return email_id

        except Exception as e:
            logger.error(f"Error saving email: {e}")
            raise

    def get_lead_emails(
        self,
        lead_id: str,
        limit: int = 20,
        offset: int = 0
    ):
        """Get email history for a lead."""
        try:
            from data.connection import execute_query

            # Get total count
            count_result = execute_query(
                "SELECT COUNT(*) as count FROM lead_emails WHERE lead_id = %s",
                (lead_id,),
                fetch_one=True
            )
            total = count_result['count'] if count_result else 0
            logger.info(f"Found {total} total emails for lead {lead_id}")

            # Debug: check what lead_ids exist in the table
            if total == 0:
                all_lead_ids = execute_query("SELECT DISTINCT lead_id FROM lead_emails LIMIT 10", fetch_all=True)
                logger.info(f"Available lead_ids in database: {[row['lead_id'] for row in all_lead_ids] if all_lead_ids else 'None'}")
                logger.info(f"Looking for lead_id: '{lead_id}' (type: {type(lead_id)})")

            # Get emails
            rows = execute_query("""
                SELECT * FROM lead_emails
                WHERE lead_id = %s
                ORDER BY email_timestamp DESC
                LIMIT %s OFFSET %s
            """, (lead_id, limit, offset), fetch_all=True)

            logger.info(f"Retrieved {len(rows) if rows else 0} email rows for lead {lead_id}")

            # Format to match backend_lead format - just return simple dictionaries
            emails = []
            for row in rows:
                email_dict = dict(row)
                # Format like backend_lead does
                formatted_email = {
                    'interaction_id': email_dict.get('email_id'),
                    'type': f"email_{email_dict.get('direction', 'sent')}",
                    'content': f"Subject: {email_dict.get('subject', '')}\n\n{email_dict.get('body', '')}" if email_dict.get('subject') else email_dict.get('body', ''),
                    'created_at': email_dict.get('created_at'),
                    'employee_name': email_dict.get('employee_name'),
                    'employee_role': email_dict.get('employee_role'),
                    'direction': email_dict.get('direction'),
                    'subject': email_dict.get('subject'),
                    'from_email': email_dict.get('from_email'),
                    'to_email': email_dict.get('to_email'),
                    'sentiment': email_dict.get('sentiment'),
                    'confidence': email_dict.get('confidence')
                }
                emails.append(formatted_email)

            # Just return the simple list like backend_lead does
            return emails

        except Exception as e:
            logger.error(f"Error getting lead emails for lead_id {lead_id}: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []

    def save_email_reply(self, reply_data: Dict) -> str:
        """Save email reply to database."""
        try:
            from data.connection import execute_query

            reply_id = reply_data.get('reply_id') or str(uuid.uuid4())

            execute_query("""
                INSERT INTO lead_emails (
                    email_id, lead_id, from_email, to_email, subject, body,
                    direction, employee_id, sentiment, confidence,
                    email_timestamp, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                reply_id,
                reply_data.get('lead_id'),
                reply_data.get('from_email'),
                reply_data.get('to_email'),
                reply_data.get('subject'),
                reply_data.get('body'),
                'received',
                reply_data.get('employee_id'),
                reply_data.get('sentiment'),
                reply_data.get('confidence'),
                reply_data.get('received_at') or datetime.utcnow(),
                datetime.utcnow()
            ))

            logger.info(f"Email reply {reply_id} saved to database")
            return reply_id

        except Exception as e:
            logger.error(f"Error saving email reply: {e}")
            raise

    def get_lead_replies(
        self,
        lead_id: str,
        limit: int = 20
    ) -> EmailRepliesListResponse:
        """Get email replies for a lead."""
        try:
            from data.connection import execute_query

            # Get replies from lead_emails table where direction = 'received'
            rows = execute_query("""
                SELECT * FROM lead_emails
                WHERE lead_id = %s AND direction = 'received'
                ORDER BY email_timestamp DESC
                LIMIT %s
            """, (lead_id, limit), fetch_all=True)

            replies = []
            positive_replies = 0
            negative_replies = 0
            neutral_replies = 0

            for row in rows:
                reply_dict = dict(row)
                # Convert to EmailReply format if needed
                replies.append(EmailReply(**reply_dict))

                # Count sentiments
                sentiment = reply_dict.get('sentiment')
                if sentiment in ['positive', 'interested']:
                    positive_replies += 1
                elif sentiment in ['negative', 'not_interested']:
                    negative_replies += 1
                else:
                    neutral_replies += 1

            return EmailRepliesListResponse(
                replies=replies,
                total=len(replies),
                positive_replies=positive_replies,
                negative_replies=negative_replies,
                neutral_replies=neutral_replies
            )

        except Exception as e:
            logger.error(f"Error getting lead replies: {e}")
            return EmailRepliesListResponse(
                replies=[], total=0, positive_replies=0,
                negative_replies=0, neutral_replies=0
            )

    def update_email_sentiment(
        self,
        email_id: str,
        sentiment: str,
        confidence: float
    ) -> bool:
        """Update email sentiment analysis."""
        try:
            from data.connection import execute_query

            execute_query("""
                UPDATE lead_emails
                SET sentiment = %s, confidence = %s
                WHERE email_id = %s
            """, (sentiment, confidence, email_id))
            return True

        except Exception as e:
            logger.error(f"Error updating email sentiment: {e}")
            return False

    def find_email_by_message_id(self, message_id: str) -> Optional[Dict]:
        """Find email by provider message ID."""
        try:
            from data.connection import execute_query

            result = execute_query(
                "SELECT * FROM lead_emails WHERE email_id = %s",
                (message_id,), fetch_one=True
            )

            return dict(result) if result else None

        except Exception as e:
            logger.error(f"Error finding email by message ID: {e}")
            return None

    def update_analytics(
        self,
        lead_id: Optional[str] = None,
        **metrics
    ):
        """Update email analytics - simplified stub."""
        try:
            # Simple stub - just log that analytics would be updated
            logger.info(f"Analytics update for lead {lead_id}: {metrics}")
        except Exception as e:
            logger.error(f"Error updating analytics: {e}")

    def get_analytics(
        self,
        lead_id: Optional[str] = None,
        days_back: int = 30
    ) -> Dict:
        """Get email analytics - simplified stub."""
        try:
            from data.connection import execute_query

            # Get basic email counts
            total_sent = execute_query(
                "SELECT COUNT(*) as count FROM lead_emails WHERE lead_id = %s AND direction = 'sent'",
                (lead_id,), fetch_one=True
            )['count'] if lead_id else 0

            total_received = execute_query(
                "SELECT COUNT(*) as count FROM lead_emails WHERE lead_id = %s AND direction = 'received'",
                (lead_id,), fetch_one=True
            )['count'] if lead_id else 0

            return {
                "total_sent": total_sent,
                "total_delivered": total_sent,
                "total_opened": 0,
                "total_clicked": 0,
                "total_replied": total_received,
                "total_bounced": 0,
                "delivery_rate": 100.0 if total_sent > 0 else 0.0,
                "open_rate": 0.0,
                "click_rate": 0.0,
                "reply_rate": (total_received / total_sent * 100) if total_sent > 0 else 0.0,
                "bounce_rate": 0.0,
                "positive_reply_rate": 0.0
            }

        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            return {}

    async def get_employee_id_by_email(self, email: str) -> Optional[int]:
        """Get employee ID by email address."""
        try:
            from data.connection import execute_query

            result = execute_query(
                "SELECT employee_id FROM employee_info WHERE email = %s",
                (email,), fetch_one=True
            )

            return result['employee_id'] if result else None

        except Exception as e:
            logger.error(f"Error getting employee ID for email {email}: {e}")
            return None


# Service factory function
_email_db_service_instance = None

async def get_email_database_service() -> EmailDatabaseService:
    """Get or create email database service instance."""
    global _email_db_service_instance
    if _email_db_service_instance is None:
        _email_db_service_instance = EmailDatabaseService()
        # Tables already exist - no need to create them
    return _email_db_service_instance