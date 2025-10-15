"""
Email models for lead generation email functionality.
Migrated and enhanced from backend_lead to support all email features.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# Email Types
class EmailType(str, Enum):
    """Email type enumeration."""
    COLD_OUTREACH = "cold_outreach"
    WARM_INTRODUCTION = "warm_introduction"
    FOLLOW_UP = "follow_up"
    MEETING_REQUEST = "meeting_request"
    THANK_YOU = "thank_you"
    PROPOSAL = "proposal"
    NURTURE = "nurture"
    PROMOTIONAL = "promotional"
    TRANSACTIONAL = "transactional"
    NEWSLETTER = "newsletter"

# Email Providers
class EmailProvider(str, Enum):
    """Email provider enumeration."""
    GMAIL = "gmail"
    OUTLOOK = "outlook"
    SMTP = "smtp"

# Email Status
class EmailStatus(str, Enum):
    """Email status enumeration."""
    DRAFT = "draft"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"
    FAILED = "failed"

# Email Reply Sentiment
class EmailSentiment(str, Enum):
    """Email reply sentiment enumeration."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    INTERESTED = "interested"
    NOT_INTERESTED = "not_interested"

# Request Models
class EmailGenerationRequest(BaseModel):
    """Request model for generating emails."""
    lead_id: str = Field(..., description="Lead ID to generate email for")
    email_type: EmailType = Field(default=EmailType.COLD_OUTREACH, description="Type of email to generate")
    custom_message: Optional[str] = Field(default="", description="Custom message to include")
    recipient_email: Optional[EmailStr] = Field(None, description="Recipient email address")
    recipient_name: Optional[str] = Field(None, description="Recipient name")
    custom_prompt: Optional[str] = Field(default="", description="Custom prompt for AI generation")

class EmailSendRequest(BaseModel):
    """Request model for sending emails."""
    to_email: EmailStr = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body")
    lead_id: Optional[str] = Field(None, description="Associated lead ID")
    provider: Optional[EmailProvider] = Field(None, description="Email provider to use")
    access_token: Optional[str] = Field(None, description="OAuth2 access token")

class EmailReplyWebhookRequest(BaseModel):
    """Request model for processing email reply webhooks."""
    from_email: EmailStr = Field(..., description="Sender email address")
    to_email: EmailStr = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body")
    message_id: Optional[str] = Field(None, description="Email message ID")
    in_reply_to: Optional[str] = Field(None, description="ID of message being replied to")
    timestamp: Optional[str] = Field(None, description="Email timestamp")
    lead_id: Optional[str] = Field(None, description="Associated lead ID")

# Response Models
class EmailGenerationResponse(BaseModel):
    """Response model for email generation."""
    email_data: Dict[str, Any] = Field(..., description="Generated email data")
    success: bool = Field(default=True, description="Whether generation was successful")
    subject: Optional[str] = Field(None, description="Generated email subject")
    body: Optional[str] = Field(None, description="Generated email body")
    template_used: Optional[str] = Field(None, description="Template used for generation")

class EmailSendResponse(BaseModel):
    """Response model for email sending."""
    sent_to: str = Field(..., description="Email address sent to")
    success: bool = Field(default=True, description="Whether send was successful")
    message: str = Field(default="Email sent successfully", description="Response message")
    message_id: Optional[str] = Field(None, description="Provider message ID")
    provider: Optional[EmailProvider] = Field(None, description="Email provider used")
    status_changed: bool = Field(default=False, description="Whether lead status was updated")
    new_status: Optional[str] = Field(None, description="New lead status if changed")

class EmailReplyProcessResponse(BaseModel):
    """Response model for email reply processing."""
    success: bool = Field(..., description="Whether processing was successful")
    lead_id: Optional[str] = Field(None, description="Associated lead ID")
    sentiment: Optional[EmailSentiment] = Field(None, description="Detected sentiment")
    confidence: Optional[float] = Field(None, description="Confidence score (0-1)")
    status_changed: bool = Field(default=False, description="Whether lead status was updated")
    new_status: Optional[str] = Field(None, description="New lead status if changed")
    analysis_summary: Optional[str] = Field(None, description="AI analysis summary")

# Data Models
class EmailTemplate(BaseModel):
    """Email template model."""
    template_id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    subject: str = Field(..., description="Template subject")
    body: str = Field(..., description="Template body")
    email_type: EmailType = Field(..., description="Template type")
    variables: List[str] = Field(default_factory=list, description="Available variables")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

class EmailHistory(BaseModel):
    """Email history model."""
    email_id: str = Field(..., description="Email ID")
    lead_id: str = Field(..., description="Associated lead ID")
    to_email: EmailStr = Field(..., description="Recipient email")
    from_email: EmailStr = Field(..., description="Sender email")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body")
    email_type: EmailType = Field(..., description="Email type")
    status: EmailStatus = Field(..., description="Email status")
    provider: Optional[EmailProvider] = Field(None, description="Email provider")
    message_id: Optional[str] = Field(None, description="Provider message ID")
    thread_id: Optional[str] = Field(None, description="Email thread ID")
    in_reply_to: Optional[str] = Field(None, description="Reply to message ID")
    sent_at: Optional[datetime] = Field(None, description="Send timestamp")
    delivered_at: Optional[datetime] = Field(None, description="Delivery timestamp")
    opened_at: Optional[datetime] = Field(None, description="Open timestamp")
    replied_at: Optional[datetime] = Field(None, description="Reply timestamp")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")

class EmailReply(BaseModel):
    """Email reply model."""
    reply_id: str = Field(..., description="Reply ID")
    original_email_id: str = Field(..., description="Original email ID")
    lead_id: str = Field(..., description="Associated lead ID")
    from_email: EmailStr = Field(..., description="Reply sender email")
    to_email: EmailStr = Field(..., description="Reply recipient email")
    subject: str = Field(..., description="Reply subject")
    body: str = Field(..., description="Reply body")
    message_id: Optional[str] = Field(None, description="Provider message ID")
    sentiment: Optional[EmailSentiment] = Field(None, description="Detected sentiment")
    confidence: Optional[float] = Field(None, description="Confidence score")
    is_positive: Optional[bool] = Field(None, description="Whether reply is positive")
    analysis_summary: Optional[str] = Field(None, description="AI analysis summary")
    processed_at: Optional[datetime] = Field(None, description="Processing timestamp")
    received_at: Optional[datetime] = Field(None, description="Receive timestamp")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

class EmailConfiguration(BaseModel):
    """Email configuration model."""
    provider: EmailProvider = Field(..., description="Email provider")
    smtp_host: Optional[str] = Field(None, description="SMTP host")
    smtp_port: Optional[int] = Field(None, description="SMTP port")
    smtp_username: Optional[str] = Field(None, description="SMTP username")
    smtp_password: Optional[str] = Field(None, description="SMTP password")
    use_tls: bool = Field(default=True, description="Use TLS encryption")
    oauth_client_id: Optional[str] = Field(None, description="OAuth client ID")
    oauth_client_secret: Optional[str] = Field(None, description="OAuth client secret")
    oauth_redirect_uri: Optional[str] = Field(None, description="OAuth redirect URI")
    max_daily_sends: int = Field(default=500, description="Maximum daily send limit")
    rate_limit_per_minute: int = Field(default=30, description="Rate limit per minute")

# List Response Models
class EmailHistoryListResponse(BaseModel):
    """Response model for email history list."""
    emails: List[EmailHistory] = Field(..., description="Email history list")
    total: int = Field(..., description="Total email count")
    page: int = Field(default=1, description="Current page")
    per_page: int = Field(default=20, description="Items per page")

class EmailTemplateListResponse(BaseModel):
    """Response model for email template list."""
    templates: List[EmailTemplate] = Field(..., description="Email template list")
    total: int = Field(..., description="Total template count")

class EmailRepliesListResponse(BaseModel):
    """Response model for email replies list."""
    replies: List[EmailReply] = Field(..., description="Email replies list")
    total: int = Field(..., description="Total replies count")
    positive_replies: int = Field(default=0, description="Count of positive replies")
    negative_replies: int = Field(default=0, description="Count of negative replies")
    neutral_replies: int = Field(default=0, description="Count of neutral replies")

# Analytics Models
class EmailAnalytics(BaseModel):
    """Email analytics model."""
    total_sent: int = Field(default=0, description="Total emails sent")
    total_delivered: int = Field(default=0, description="Total emails delivered")
    total_opened: int = Field(default=0, description="Total emails opened")
    total_clicked: int = Field(default=0, description="Total emails clicked")
    total_replied: int = Field(default=0, description="Total emails replied")
    total_bounced: int = Field(default=0, description="Total emails bounced")
    delivery_rate: float = Field(default=0.0, description="Delivery rate percentage")
    open_rate: float = Field(default=0.0, description="Open rate percentage")
    click_rate: float = Field(default=0.0, description="Click rate percentage")
    reply_rate: float = Field(default=0.0, description="Reply rate percentage")
    bounce_rate: float = Field(default=0.0, description="Bounce rate percentage")
    positive_reply_rate: float = Field(default=0.0, description="Positive reply rate percentage")

# Utility Functions
def get_email_type_display_name(email_type: EmailType) -> str:
    """Get display name for email type."""
    display_names = {
        EmailType.COLD_OUTREACH: "Cold Outreach",
        EmailType.WARM_INTRODUCTION: "Warm Introduction",
        EmailType.FOLLOW_UP: "Follow Up",
        EmailType.MEETING_REQUEST: "Meeting Request",
        EmailType.THANK_YOU: "Thank You",
        EmailType.PROPOSAL: "Proposal",
        EmailType.NURTURE: "Nurture",
        EmailType.PROMOTIONAL: "Promotional",
        EmailType.TRANSACTIONAL: "Transactional",
        EmailType.NEWSLETTER: "Newsletter"
    }
    return display_names.get(email_type, email_type.value)

def get_sentiment_display_name(sentiment: EmailSentiment) -> str:
    """Get display name for email sentiment."""
    display_names = {
        EmailSentiment.POSITIVE: "Positive",
        EmailSentiment.NEGATIVE: "Negative",
        EmailSentiment.NEUTRAL: "Neutral",
        EmailSentiment.INTERESTED: "Interested",
        EmailSentiment.NOT_INTERESTED: "Not Interested"
    }
    return display_names.get(sentiment, sentiment.value)