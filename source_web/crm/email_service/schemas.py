from pydantic import BaseModel, Field, validator, EmailStr
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timezone
from enum import Enum

class EmailType(str, Enum):
    """Types of emails"""
    OUTREACH = "outreach"
    FOLLOW_UP = "follow_up"
    NURTURE = "nurture"
    PROMOTIONAL = "promotional"
    TRANSACTIONAL = "transactional"
    NEWSLETTER = "newsletter"
    COLD_OUTREACH = "cold_outreach"
    WARM_INTRODUCTION = "warm_introduction"
    MEETING_REQUEST = "meeting_request"
    THANK_YOU = "thank_you"
    PROPOSAL = "proposal"

class EmailPriority(str, Enum):
    """Email priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class EmailStatus(str, Enum):
    """Email processing status"""
    DRAFT = "draft"
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"
    FAILED = "failed"
    SPAM = "spam"
    UNSUBSCRIBED = "unsubscribed"

class DeliveryStatus(str, Enum):
    """Email delivery status"""
    QUEUED = "queued"
    SENDING = "sending"
    DELIVERED = "delivered"
    DEFERRED = "deferred"
    BOUNCED = "bounced"
    DROPPED = "dropped"
    BLOCKED = "blocked"
    FAILED = "failed"

class EmailAttachment(BaseModel):
    """Email attachment"""
    filename: str = Field(..., description="Attachment filename")
    content_type: str = Field(default="application/octet-stream", description="MIME content type")
    content: bytes = Field(..., description="Attachment content")
    size_bytes: int = Field(..., ge=0, description="Attachment size in bytes")
    inline: bool = Field(default=False, description="Whether attachment is inline")
    content_id: Optional[str] = Field(default=None, description="Content ID for inline attachments")

class PersonalizationData(BaseModel):
    """Data for email personalization"""
    recipient_name: Optional[str] = Field(default=None, description="Recipient's name")
    company_name: Optional[str] = Field(default=None, description="Recipient's company")
    job_title: Optional[str] = Field(default=None, description="Recipient's job title")
    industry: Optional[str] = Field(default=None, description="Company industry")
    location: Optional[str] = Field(default=None, description="Company/recipient location")
    mutual_connections: List[str] = Field(default_factory=list, description="Mutual connections")
    recent_news: List[str] = Field(default_factory=list, description="Recent company news")
    custom_fields: Dict[str, Any] = Field(default_factory=dict, description="Custom personalization fields")

class EmailRecipient(BaseModel):
    """Email recipient information"""
    email: EmailStr = Field(..., description="Recipient email address")
    name: Optional[str] = Field(default=None, description="Recipient name")
    type: str = Field(default="to", description="Recipient type (to, cc, bcc)")
    personalization: Optional[PersonalizationData] = Field(default=None, description="Personalization data")
    lead_id: Optional[str] = Field(default=None, description="Associated lead ID")
    contact_id: Optional[str] = Field(default=None, description="Associated contact ID")
    
    @validator('type')
    def validate_recipient_type(cls, v):
        if v not in ['to', 'cc', 'bcc']:
            raise ValueError('Recipient type must be to, cc, or bcc')
        return v

class EmailTemplate(BaseModel):
    """Email template definition"""
    template_id: str = Field(..., description="Unique template identifier")
    name: str = Field(..., description="Template name")
    description: Optional[str] = Field(default=None, description="Template description")
    
    # Template content
    subject_template: str = Field(..., description="Subject line template")
    html_template: Optional[str] = Field(default=None, description="HTML email template")
    text_template: Optional[str] = Field(default=None, description="Plain text template")
    
    # Template metadata
    email_type: EmailType = Field(..., description="Type of email")
    category: Optional[str] = Field(default=None, description="Template category")
    tags: List[str] = Field(default_factory=list, description="Template tags")
    
    # Personalization
    required_fields: List[str] = Field(default_factory=list, description="Required personalization fields")
    optional_fields: List[str] = Field(default_factory=list, description="Optional personalization fields")
    
    # Settings
    track_opens: bool = Field(default=True, description="Track email opens")
    track_clicks: bool = Field(default=True, description="Track link clicks")
    
    # Metadata
    created_by: Optional[str] = Field(default=None, description="Template creator")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last update timestamp")
    version: str = Field(default="1.0", description="Template version")
    active: bool = Field(default=True, description="Whether template is active")

class EmailContent(BaseModel):
    """Generated email content"""
    subject: str = Field(..., description="Email subject")
    html_content: Optional[str] = Field(default=None, description="HTML email content")
    text_content: Optional[str] = Field(default=None, description="Plain text content")
    
    # Personalization applied
    personalized: bool = Field(default=False, description="Whether content is personalized")
    personalization_score: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Personalization quality score")
    
    # Generated metadata
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Content generation timestamp")
    template_id: Optional[str] = Field(default=None, description="Source template ID")
    ai_generated: bool = Field(default=False, description="Whether content was AI-generated")
    
    # Quality metrics
    spam_score: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Estimated spam score")
    readability_score: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Content readability score")
    sentiment_score: Optional[float] = Field(default=None, ge=-1.0, le=1.0, description="Content sentiment score")

class EmailRequest(BaseModel):
    """Request to send an email"""
    # Recipients
    recipients: List[EmailRecipient] = Field(..., description="Email recipients")
    
    # Content
    content: Optional[EmailContent] = Field(default=None, description="Pre-generated email content")
    template_id: Optional[str] = Field(default=None, description="Template to use for generation")
    
    # Email settings
    email_type: EmailType = Field(default=EmailType.OUTREACH, description="Type of email")
    priority: EmailPriority = Field(default=EmailPriority.NORMAL, description="Email priority")
    
    # Sender information
    sender_email: Optional[EmailStr] = Field(default=None, description="Sender email address")
    sender_name: Optional[str] = Field(default=None, description="Sender name")
    reply_to: Optional[EmailStr] = Field(default=None, description="Reply-to email address")
    
    # Attachments
    attachments: List[EmailAttachment] = Field(default_factory=list, description="Email attachments")
    
    # Scheduling
    send_at: Optional[datetime] = Field(default=None, description="Schedule email for future sending")
    timezone: str = Field(default="UTC", description="Timezone for scheduling")
    
    # Tracking and analytics
    track_opens: bool = Field(default=True, description="Track email opens")
    track_clicks: bool = Field(default=True, description="Track link clicks")
    
    # Campaign association
    campaign_id: Optional[str] = Field(default=None, description="Associated campaign ID")
    
    # Custom metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata")
    tags: List[str] = Field(default_factory=list, description="Email tags")
    
    # Personalization override
    force_personalization: bool = Field(default=False, description="Force personalization even if low quality")
    min_personalization_score: float = Field(default=50.0, ge=0.0, le=100.0, description="Minimum personalization score")

class EmailDelivery(BaseModel):
    """Email delivery tracking"""
    delivery_id: str = Field(..., description="Unique delivery identifier")
    email_id: str = Field(..., description="Associated email ID")
    recipient_email: EmailStr = Field(..., description="Recipient email address")
    
    # Delivery status
    status: DeliveryStatus = Field(..., description="Current delivery status")
    status_message: Optional[str] = Field(default=None, description="Delivery status message")
    
    # Timing
    queued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Queued timestamp")
    sent_at: Optional[datetime] = Field(default=None, description="Sent timestamp")
    delivered_at: Optional[datetime] = Field(default=None, description="Delivered timestamp")
    
    # Tracking
    opened_at: Optional[datetime] = Field(default=None, description="First open timestamp")
    open_count: int = Field(default=0, ge=0, description="Number of opens")
    clicked_at: Optional[datetime] = Field(default=None, description="First click timestamp")
    click_count: int = Field(default=0, ge=0, description="Number of clicks")
    
    # Provider information
    provider: Optional[str] = Field(default=None, description="Email service provider")
    provider_message_id: Optional[str] = Field(default=None, description="Provider message ID")
    
    # Error information
    error_code: Optional[str] = Field(default=None, description="Error code if failed")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    bounce_type: Optional[str] = Field(default=None, description="Bounce type if bounced")

class EmailMetrics(BaseModel):
    """Email performance metrics"""
    email_id: str = Field(..., description="Email identifier")
    
    # Delivery metrics
    total_recipients: int = Field(default=0, ge=0, description="Total number of recipients")
    delivered_count: int = Field(default=0, ge=0, description="Number of delivered emails")
    bounced_count: int = Field(default=0, ge=0, description="Number of bounced emails")
    failed_count: int = Field(default=0, ge=0, description="Number of failed emails")
    
    # Engagement metrics
    opened_count: int = Field(default=0, ge=0, description="Number of opens")
    unique_opens: int = Field(default=0, ge=0, description="Number of unique opens")
    clicked_count: int = Field(default=0, ge=0, description="Number of clicks")
    unique_clicks: int = Field(default=0, ge=0, description="Number of unique clicks")
    replied_count: int = Field(default=0, ge=0, description="Number of replies")
    unsubscribed_count: int = Field(default=0, ge=0, description="Number of unsubscribes")
    
    # Calculated rates
    delivery_rate: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Delivery rate percentage")
    open_rate: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Open rate percentage")
    click_rate: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Click rate percentage")
    reply_rate: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Reply rate percentage")
    unsubscribe_rate: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Unsubscribe rate percentage")
    
    # Time metrics
    average_open_time: Optional[float] = Field(default=None, ge=0, description="Average time to open (hours)")
    average_click_time: Optional[float] = Field(default=None, ge=0, description="Average time to click (hours)")
    
    # Updated timestamp
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last metrics update")

class EmailCampaign(BaseModel):
    """Email campaign definition"""
    campaign_id: str = Field(..., description="Unique campaign identifier")
    name: str = Field(..., description="Campaign name")
    description: Optional[str] = Field(default=None, description="Campaign description")
    
    # Campaign settings
    email_type: EmailType = Field(..., description="Type of emails in campaign")
    template_id: Optional[str] = Field(default=None, description="Default template for campaign")
    
    # Targeting
    target_audience: Dict[str, Any] = Field(default_factory=dict, description="Target audience criteria")
    recipient_list_ids: List[str] = Field(default_factory=list, description="Recipient list IDs")
    
    # Scheduling
    start_date: Optional[datetime] = Field(default=None, description="Campaign start date")
    end_date: Optional[datetime] = Field(default=None, description="Campaign end date")
    send_schedule: Optional[Dict[str, Any]] = Field(default=None, description="Sending schedule configuration")
    
    # Settings
    max_emails_per_day: Optional[int] = Field(default=None, ge=1, description="Maximum emails per day")
    respect_unsubscribes: bool = Field(default=True, description="Respect unsubscribe preferences")
    
    # Status
    status: str = Field(default="draft", description="Campaign status")
    active: bool = Field(default=False, description="Whether campaign is active")
    
    # Metrics
    total_emails_sent: int = Field(default=0, ge=0, description="Total emails sent")
    total_recipients: int = Field(default=0, ge=0, description="Total recipients")
    
    # Metadata
    created_by: Optional[str] = Field(default=None, description="Campaign creator")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Last update timestamp")
    tags: List[str] = Field(default_factory=list, description="Campaign tags")

class EmailResponse(BaseModel):
    """Response from email operations"""
    email_id: str = Field(..., description="Unique email identifier")
    status: EmailStatus = Field(..., description="Email status")
    
    # Recipients processed
    total_recipients: int = Field(default=0, ge=0, description="Total recipients")
    successful_recipients: int = Field(default=0, ge=0, description="Successfully queued recipients")
    failed_recipients: int = Field(default=0, ge=0, description="Failed recipients")
    
    # Content information
    subject: Optional[str] = Field(default=None, description="Email subject")
    personalization_applied: bool = Field(default=False, description="Whether personalization was applied")
    
    # Delivery tracking
    delivery_ids: List[str] = Field(default_factory=list, description="Delivery tracking IDs")
    
    # Timing
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Email creation timestamp")
    scheduled_for: Optional[datetime] = Field(default=None, description="Scheduled send time")
    
    # Errors and warnings
    errors: List[str] = Field(default_factory=list, description="Processing errors")
    warnings: List[str] = Field(default_factory=list, description="Processing warnings")
    
    # Campaign association
    campaign_id: Optional[str] = Field(default=None, description="Associated campaign ID")
    
    # Tracking URLs
    tracking_urls: Dict[str, str] = Field(default_factory=dict, description="Tracking URLs for monitoring")

class UnsubscribeRequest(BaseModel):
    """Unsubscribe request"""
    email: EmailStr = Field(..., description="Email address to unsubscribe")
    unsubscribe_token: Optional[str] = Field(default=None, description="Unsubscribe token")
    reason: Optional[str] = Field(default=None, description="Unsubscribe reason")
    campaign_id: Optional[str] = Field(default=None, description="Campaign to unsubscribe from")
    global_unsubscribe: bool = Field(default=True, description="Global unsubscribe from all emails")
    
    # Metadata
    user_agent: Optional[str] = Field(default=None, description="User agent")
    ip_address: Optional[str] = Field(default=None, description="IP address")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Unsubscribe timestamp")

class EmailConfig(BaseModel):
    """Configuration for email service"""
    # SMTP/API settings
    provider: str = Field(default="smtp", description="Email provider (smtp, sendgrid, mailgun, etc.)")
    smtp_host: Optional[str] = Field(default=None, description="SMTP host")
    smtp_port: Optional[int] = Field(default=587, description="SMTP port")
    smtp_username: Optional[str] = Field(default=None, description="SMTP username")
    smtp_password: Optional[str] = Field(default=None, description="SMTP password")
    smtp_use_tls: bool = Field(default=True, description="Use TLS for SMTP")
    
    # API keys
    api_key: Optional[str] = Field(default=None, description="Email service API key")
    api_secret: Optional[str] = Field(default=None, description="Email service API secret")
    
    # Default sender
    default_sender_email: EmailStr = Field(..., description="Default sender email")
    default_sender_name: str = Field(..., description="Default sender name")
    default_reply_to: Optional[EmailStr] = Field(default=None, description="Default reply-to address")
    
    # Rate limiting
    max_emails_per_second: float = Field(default=1.0, ge=0.1, description="Maximum emails per second")
    max_emails_per_hour: int = Field(default=100, ge=1, description="Maximum emails per hour")
    max_emails_per_day: int = Field(default=1000, ge=1, description="Maximum emails per day")
    
    # Tracking
    tracking_domain: Optional[str] = Field(default=None, description="Domain for email tracking")
    enable_open_tracking: bool = Field(default=True, description="Enable open tracking by default")
    enable_click_tracking: bool = Field(default=True, description="Enable click tracking by default")
    
    # Content generation
    enable_ai_generation: bool = Field(default=True, description="Enable AI content generation")
    ai_provider: str = Field(default="openai", description="AI provider for content generation")
    ai_model: str = Field(default="gpt-3.5-turbo", description="AI model for content generation")
    
    # Quality control
    spam_check_enabled: bool = Field(default=True, description="Enable spam checking")
    min_content_quality_score: float = Field(default=60.0, ge=0.0, le=100.0, description="Minimum content quality score")
    
    # Retry settings
    max_retry_attempts: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")
    retry_delay_seconds: int = Field(default=300, ge=1, description="Retry delay in seconds")
    
    # Storage
    store_sent_emails: bool = Field(default=True, description="Store sent email records")
    retention_days: int = Field(default=90, ge=1, description="Email storage retention in days")
    
    class Config:
        extra = "allow"