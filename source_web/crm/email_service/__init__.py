"""
Email Service Package for Lead Generation.
Provides comprehensive email functionality including generation, sending, tracking, and analysis.
"""

from .models import (
    EmailType, EmailProvider, EmailStatus, EmailSentiment,
    EmailGenerationRequest, EmailSendRequest, EmailGenerationResponse,
    EmailSendResponse, EmailReplyProcessResponse, EmailTemplate,
    EmailHistory, EmailReply, EmailConfiguration, EmailAnalytics
)

from .email_service import LeadEmailService, get_lead_email_service
from .gmail_service import GmailService, get_gmail_service
# Database service not needed in CRM - we log directly to customer_interactions table
# from .database_service import EmailDatabaseService, get_email_database_service

__all__ = [
    # Models
    'EmailType', 'EmailProvider', 'EmailStatus', 'EmailSentiment',
    'EmailGenerationRequest', 'EmailSendRequest', 'EmailGenerationResponse',
    'EmailSendResponse', 'EmailReplyProcessResponse', 'EmailTemplate',
    'EmailHistory', 'EmailReply', 'EmailConfiguration', 'EmailAnalytics',

    # Services
    'LeadEmailService', 'get_lead_email_service',
    'GmailService', 'get_gmail_service',
    # 'EmailDatabaseService', 'get_email_database_service'
]