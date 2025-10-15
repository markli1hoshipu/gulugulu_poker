import asyncio
import smtplib
import uuid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
import logging
import re
from jinja2 import Template
import aiohttp
import asyncio
from urllib.parse import quote
import json

from .schemas import (
    EmailTemplate,
    EmailContent,
    EmailRequest,
    EmailResponse,
    EmailCampaign,
    EmailMetrics,
    EmailRecipient,
    EmailAttachment,
    EmailDelivery,
    EmailType,
    EmailPriority,
    EmailStatus,
    DeliveryStatus,
    EmailConfig,
    PersonalizationData,
    UnsubscribeRequest
)

logger = logging.getLogger(__name__)

class EmailServiceError(Exception):
    """Email service specific errors"""
    pass

@dataclass
class EmailStats:
    """Email service statistics"""
    total_emails_sent: int = 0
    total_emails_delivered: int = 0
    total_emails_bounced: int = 0
    total_emails_opened: int = 0
    total_emails_clicked: int = 0
    total_unsubscribes: int = 0
    emails_sent_today: int = 0
    emails_sent_this_hour: int = 0

class ContentGenerator:
    """Generates personalized email content"""
    
    def __init__(self, ai_enabled: bool = True):
        self.ai_enabled = ai_enabled
        self.templates_cache: Dict[str, EmailTemplate] = {}
    
    def generate_content(self, template: EmailTemplate, recipient: EmailRecipient) -> EmailContent:
        """Generate personalized email content from template"""
        try:
            # Get personalization data
            personalization = recipient.personalization or PersonalizationData()
            
            # Create template context
            context = self._build_template_context(personalization, recipient)
            
            # Generate subject
            subject_template = Template(template.subject_template)
            subject = subject_template.render(**context)
            
            # Generate HTML content
            html_content = None
            if template.html_template:
                html_template = Template(template.html_template)
                html_content = html_template.render(**context)
            
            # Generate text content
            text_content = None
            if template.text_template:
                text_template = Template(template.text_template)
                text_content = text_template.render(**context)
            elif html_content:
                # Convert HTML to text (simplified)
                text_content = self._html_to_text(html_content)
            
            # Calculate personalization score
            personalization_score = self._calculate_personalization_score(context, template)
            
            # Calculate quality scores
            spam_score = self._calculate_spam_score(subject, html_content or text_content or "")
            readability_score = self._calculate_readability_score(text_content or html_content or "")
            sentiment_score = self._calculate_sentiment_score(text_content or html_content or "")
            
            return EmailContent(
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                personalized=True,
                personalization_score=personalization_score,
                template_id=template.template_id,
                ai_generated=False,  # Template-based generation
                spam_score=spam_score,
                readability_score=readability_score,
                sentiment_score=sentiment_score
            )
            
        except Exception as e:
            logger.error(f"Error generating email content: {e}")
            # Return basic content as fallback
            return EmailContent(
                subject=template.subject_template,
                html_content=template.html_template,
                text_content=template.text_template,
                personalized=False,
                personalization_score=0.0,
                template_id=template.template_id
            )
    
    def _build_template_context(self, personalization: PersonalizationData, recipient: EmailRecipient) -> Dict[str, Any]:
        """Build template rendering context"""
        context = {
            # Recipient information
            'recipient_name': personalization.recipient_name or recipient.name or 'there',
            'recipient_email': recipient.email,
            'company_name': personalization.company_name or 'your company',
            'job_title': personalization.job_title or 'your role',
            'industry': personalization.industry or 'your industry',
            'location': personalization.location or 'your area',
            
            # Personalization data
            'mutual_connections': personalization.mutual_connections,
            'recent_news': personalization.recent_news,
            
            # Utility functions
            'first_name': (personalization.recipient_name or recipient.name or '').split()[0] if (personalization.recipient_name or recipient.name) else 'there',
            'has_mutual_connections': len(personalization.mutual_connections) > 0,
            'has_recent_news': len(personalization.recent_news) > 0,
            
            # Timestamps
            'current_date': datetime.now().strftime('%B %d, %Y'),
            'current_year': datetime.now().year,
            
            # Custom fields
            **personalization.custom_fields
        }
        
        return context
    
    def _calculate_personalization_score(self, context: Dict[str, Any], template: EmailTemplate) -> float:
        """Calculate personalization quality score"""
        score = 0.0
        max_score = 100.0
        
        # Base score for having recipient name
        if context.get('recipient_name') and context['recipient_name'] != 'there':
            score += 20.0
        
        # Score for company information
        if context.get('company_name') and context['company_name'] != 'your company':
            score += 20.0
        
        # Score for job title
        if context.get('job_title') and context['job_title'] != 'your role':
            score += 15.0
        
        # Score for industry
        if context.get('industry') and context['industry'] != 'your industry':
            score += 15.0
        
        # Score for mutual connections
        if context.get('has_mutual_connections'):
            score += 15.0
        
        # Score for recent news
        if context.get('has_recent_news'):
            score += 15.0
        
        return min(score, max_score)
    
    def _calculate_spam_score(self, subject: str, content: str) -> float:
        """Calculate estimated spam score"""
        spam_indicators = [
            r'free', r'urgent', r'act now', r'limited time', r'guaranteed',
            r'make money', r'cash', r'credit', r'loan', r'investment',
            r'!!+', r'\$+', r'click here', r'buy now'
        ]
        
        text = (subject + ' ' + content).lower()
        
        spam_count = 0
        for indicator in spam_indicators:
            if re.search(indicator, text):
                spam_count += 1
        
        # Simple scoring: more indicators = higher spam score
        spam_score = min(spam_count * 10, 100)
        
        return spam_score
    
    def _calculate_readability_score(self, text: str) -> float:
        """Calculate content readability score (simplified)"""
        if not text:
            return 0.0
        
        # Simple readability based on sentence and word length
        sentences = text.split('.')
        words = text.split()
        
        if not sentences or not words:
            return 0.0
        
        avg_sentence_length = len(words) / len(sentences)
        avg_word_length = sum(len(word) for word in words) / len(words)
        
        # Higher scores for shorter sentences and words
        readability = max(0, 100 - (avg_sentence_length * 2) - (avg_word_length * 5))
        
        return min(readability, 100)
    
    def _calculate_sentiment_score(self, text: str) -> float:
        """Calculate content sentiment score (simplified)"""
        if not text:
            return 0.0
        
        positive_words = ['excellent', 'great', 'amazing', 'wonderful', 'fantastic', 'pleased', 'excited', 'opportunity']
        negative_words = ['terrible', 'awful', 'bad', 'worst', 'hate', 'disappointed', 'frustrated', 'problem']
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        # Normalize to -1 to 1 scale
        total_words = len(text.split())
        if total_words == 0:
            return 0.0
        
        sentiment = (positive_count - negative_count) / total_words * 10
        return max(-1.0, min(1.0, sentiment))
    
    def _html_to_text(self, html: str) -> str:
        """Convert HTML to plain text (simplified)"""
        # Remove HTML tags
        import re
        text = re.sub(r'<[^>]+>', '', html)
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

class EmailDeliveryProvider:
    """Base class for email delivery providers"""
    
    def __init__(self, config: EmailConfig):
        self.config = config
    
    async def send_email(self, recipients: List[EmailRecipient], content: EmailContent, 
                        sender_email: str, sender_name: str, attachments: List[EmailAttachment] = None) -> List[EmailDelivery]:
        """Send email to recipients"""
        raise NotImplementedError("Subclasses must implement send_email")

class SMTPProvider(EmailDeliveryProvider):
    """SMTP email delivery provider"""
    
    async def send_email(self, recipients: List[EmailRecipient], content: EmailContent,
                        sender_email: str, sender_name: str, attachments: List[EmailAttachment] = None) -> List[EmailDelivery]:
        """Send email via SMTP"""
        deliveries = []
        
        try:
            # Create SMTP connection
            server = smtplib.SMTP(self.config.smtp_host, self.config.smtp_port)
            if self.config.smtp_use_tls:
                server.starttls()
            
            if self.config.smtp_username and self.config.smtp_password:
                server.login(self.config.smtp_username, self.config.smtp_password)
            
            for recipient in recipients:
                try:
                    # Create message
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = content.subject
                    msg['From'] = f"{sender_name} <{sender_email}>"
                    msg['To'] = recipient.email
                    
                    # Add text content
                    if content.text_content:
                        text_part = MIMEText(content.text_content, 'plain')
                        msg.attach(text_part)
                    
                    # Add HTML content
                    if content.html_content:
                        html_part = MIMEText(content.html_content, 'html')
                        msg.attach(html_part)
                    
                    # Add attachments
                    if attachments:
                        for attachment in attachments:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.content)
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {attachment.filename}'
                            )
                            msg.attach(part)
                    
                    # Send email
                    server.send_message(msg)
                    
                    # Create successful delivery record
                    delivery = EmailDelivery(
                        delivery_id=str(uuid.uuid4()),
                        email_id="",  # Will be set by EmailService
                        recipient_email=recipient.email,
                        status=DeliveryStatus.DELIVERED,
                        provider="smtp",
                        sent_at=datetime.now(timezone.utc),
                        delivered_at=datetime.now(timezone.utc)
                    )
                    deliveries.append(delivery)
                    
                except Exception as e:
                    logger.error(f"Failed to send email to {recipient.email}: {e}")
                    
                    # Create failed delivery record
                    delivery = EmailDelivery(
                        delivery_id=str(uuid.uuid4()),
                        email_id="",
                        recipient_email=recipient.email,
                        status=DeliveryStatus.FAILED,
                        provider="smtp",
                        error_message=str(e)
                    )
                    deliveries.append(delivery)
            
            server.quit()
            
        except Exception as e:
            logger.error(f"SMTP connection failed: {e}")
            # Create failed deliveries for all recipients
            for recipient in recipients:
                delivery = EmailDelivery(
                    delivery_id=str(uuid.uuid4()),
                    email_id="",
                    recipient_email=recipient.email,
                    status=DeliveryStatus.FAILED,
                    provider="smtp",
                    error_message=str(e)
                )
                deliveries.append(delivery)
        
        return deliveries

class MockProvider(EmailDeliveryProvider):
    """Mock email provider for testing"""
    
    async def send_email(self, recipients: List[EmailRecipient], content: EmailContent,
                        sender_email: str, sender_name: str, attachments: List[EmailAttachment] = None) -> List[EmailDelivery]:
        """Mock email sending"""
        deliveries = []
        
        for recipient in recipients:
            # Simulate some delivery scenarios
            if 'bounce' in recipient.email.lower():
                status = DeliveryStatus.BOUNCED
                error_message = "Email address bounced"
            elif 'fail' in recipient.email.lower():
                status = DeliveryStatus.FAILED
                error_message = "Delivery failed"
            else:
                status = DeliveryStatus.DELIVERED
                error_message = None
            
            delivery = EmailDelivery(
                delivery_id=str(uuid.uuid4()),
                email_id="",
                recipient_email=recipient.email,
                status=status,
                provider="mock",
                provider_message_id=f"mock_{uuid.uuid4().hex[:8]}",
                sent_at=datetime.now(timezone.utc),
                delivered_at=datetime.now(timezone.utc) if status == DeliveryStatus.DELIVERED else None,
                error_message=error_message
            )
            deliveries.append(delivery)
            
            # Simulate processing delay
            await asyncio.sleep(0.1)
        
        return deliveries

class RateLimiter:
    """Rate limiter for email sending"""
    
    def __init__(self, config: EmailConfig):
        self.config = config
        self.sent_count_per_second: Dict[int, int] = {}
        self.sent_count_per_hour: Dict[int, int] = {}
        self.sent_count_per_day: Dict[int, int] = {}
    
    async def acquire(self) -> bool:
        """Acquire permission to send an email"""
        now = datetime.now()
        
        # Check per-second limit
        current_second = int(now.timestamp())
        if self.sent_count_per_second.get(current_second, 0) >= self.config.max_emails_per_second:
            await asyncio.sleep(1.0 - (now.timestamp() - current_second))
            current_second = int(datetime.now().timestamp())
        
        # Check per-hour limit
        current_hour = int(now.timestamp() // 3600)
        if self.sent_count_per_hour.get(current_hour, 0) >= self.config.max_emails_per_hour:
            return False
        
        # Check per-day limit
        current_day = int(now.timestamp() // 86400)
        if self.sent_count_per_day.get(current_day, 0) >= self.config.max_emails_per_day:
            return False
        
        # Update counters
        self.sent_count_per_second[current_second] = self.sent_count_per_second.get(current_second, 0) + 1
        self.sent_count_per_hour[current_hour] = self.sent_count_per_hour.get(current_hour, 0) + 1
        self.sent_count_per_day[current_day] = self.sent_count_per_day.get(current_day, 0) + 1
        
        # Clean up old counters
        self._cleanup_counters(now)
        
        return True
    
    def _cleanup_counters(self, now: datetime):
        """Clean up old counter entries"""
        current_second = int(now.timestamp())
        current_hour = int(now.timestamp() // 3600)
        current_day = int(now.timestamp() // 86400)
        
        # Keep only current second
        self.sent_count_per_second = {k: v for k, v in self.sent_count_per_second.items() if k >= current_second - 1}
        
        # Keep only current hour
        self.sent_count_per_hour = {k: v for k, v in self.sent_count_per_hour.items() if k >= current_hour - 1}
        
        # Keep only current day
        self.sent_count_per_day = {k: v for k, v in self.sent_count_per_day.items() if k >= current_day - 1}

class EmailService:
    """Main email service for lead generation"""
    
    def __init__(self, config: EmailConfig):
        self.config = config
        self.content_generator = ContentGenerator(config.enable_ai_generation)
        self.rate_limiter = RateLimiter(config)
        
        # Initialize delivery provider
        if config.provider == "smtp":
            self.delivery_provider = SMTPProvider(config)
        else:
            # Default to mock provider for testing
            self.delivery_provider = MockProvider(config)
        
        # Storage
        self.emails: Dict[str, EmailResponse] = {}
        self.deliveries: Dict[str, EmailDelivery] = {}
        self.templates: Dict[str, EmailTemplate] = {}
        self.campaigns: Dict[str, EmailCampaign] = {}
        self.unsubscribes: Dict[str, UnsubscribeRequest] = {}
        
        # Statistics
        self.stats = EmailStats()
    
    def register_template(self, template: EmailTemplate):
        """Register an email template"""
        self.templates[template.template_id] = template
        logger.info(f"Registered email template: {template.template_id}")
    
    def get_template(self, template_id: str) -> Optional[EmailTemplate]:
        """Get email template by ID"""
        return self.templates.get(template_id)
    
    async def send_email(self, request: EmailRequest) -> EmailResponse:
        """Send an email"""
        email_id = str(uuid.uuid4())
        
        try:
            # Validate request
            if not request.recipients:
                raise EmailServiceError("No recipients specified")
            
            # Filter out unsubscribed recipients
            active_recipients = self._filter_unsubscribed_recipients(request.recipients)
            if not active_recipients:
                raise EmailServiceError("All recipients have unsubscribed")
            
            # Generate content if not provided
            if not request.content:
                if not request.template_id:
                    raise EmailServiceError("Either content or template_id must be provided")
                
                template = self.get_template(request.template_id)
                if not template:
                    raise EmailServiceError(f"Template not found: {request.template_id}")
                
                # Generate personalized content for each recipient
                # For simplicity, we'll use the first recipient's personalization
                content = self.content_generator.generate_content(template, active_recipients[0])
            else:
                content = request.content
            
            # Validate content quality
            if self.config.spam_check_enabled and content.spam_score and content.spam_score > 70:
                raise EmailServiceError(f"Content failed spam check (score: {content.spam_score})")
            
            if content.personalization_score and content.personalization_score < request.min_personalization_score and not request.force_personalization:
                raise EmailServiceError(f"Personalization score too low: {content.personalization_score}")
            
            # Determine sender
            sender_email = request.sender_email or self.config.default_sender_email
            sender_name = request.sender_name or self.config.default_sender_name
            
            # Check rate limits and send emails
            successful_recipients = []
            failed_recipients = []
            delivery_ids = []
            
            for recipient in active_recipients:
                # Check rate limit
                if not await self.rate_limiter.acquire():
                    failed_recipients.append(recipient)
                    logger.warning(f"Rate limit exceeded, skipping {recipient.email}")
                    continue
                
                # Send to individual recipient
                try:
                    deliveries = await self.delivery_provider.send_email(
                        [recipient], content, sender_email, sender_name, request.attachments
                    )
                    
                    for delivery in deliveries:
                        delivery.email_id = email_id
                        self.deliveries[delivery.delivery_id] = delivery
                        delivery_ids.append(delivery.delivery_id)
                        
                        if delivery.status in [DeliveryStatus.DELIVERED, DeliveryStatus.QUEUED]:
                            successful_recipients.append(recipient)
                        else:
                            failed_recipients.append(recipient)
                    
                    # Update statistics
                    self.stats.total_emails_sent += 1
                    self.stats.emails_sent_today += 1
                    self.stats.emails_sent_this_hour += 1
                    
                except Exception as e:
                    logger.error(f"Failed to send email to {recipient.email}: {e}")
                    failed_recipients.append(recipient)
            
            # Create response
            response = EmailResponse(
                email_id=email_id,
                status=EmailStatus.SENT if successful_recipients else EmailStatus.FAILED,
                total_recipients=len(request.recipients),
                successful_recipients=len(successful_recipients),
                failed_recipients=len(failed_recipients),
                subject=content.subject,
                personalization_applied=content.personalized,
                delivery_ids=delivery_ids,
                scheduled_for=request.send_at,
                campaign_id=request.campaign_id
            )
            
            # Add errors and warnings
            if failed_recipients:
                response.errors.append(f"Failed to send to {len(failed_recipients)} recipients")
            
            if content.spam_score and content.spam_score > 50:
                response.warnings.append(f"High spam score: {content.spam_score}")
            
            # Store email record
            if self.config.store_sent_emails:
                self.emails[email_id] = response
            
            logger.info(f"Sent email {email_id} to {len(successful_recipients)} recipients")
            return response
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            
            return EmailResponse(
                email_id=email_id,
                status=EmailStatus.FAILED,
                total_recipients=len(request.recipients),
                successful_recipients=0,
                failed_recipients=len(request.recipients),
                errors=[str(e)]
            )
    
    def _filter_unsubscribed_recipients(self, recipients: List[EmailRecipient]) -> List[EmailRecipient]:
        """Filter out unsubscribed recipients"""
        return [
            recipient for recipient in recipients
            if recipient.email not in self.unsubscribes
        ]
    
    async def process_unsubscribe(self, unsubscribe: UnsubscribeRequest) -> bool:
        """Process an unsubscribe request"""
        try:
            self.unsubscribes[unsubscribe.email] = unsubscribe
            self.stats.total_unsubscribes += 1
            
            logger.info(f"Processed unsubscribe for {unsubscribe.email}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing unsubscribe: {e}")
            return False
    
    def get_email_metrics(self, email_id: str) -> Optional[EmailMetrics]:
        """Get metrics for a specific email"""
        if email_id not in self.emails:
            return None
        
        # Get all deliveries for this email
        email_deliveries = [d for d in self.deliveries.values() if d.email_id == email_id]
        
        if not email_deliveries:
            return None
        
        # Calculate metrics
        metrics = EmailMetrics(email_id=email_id)
        
        metrics.total_recipients = len(email_deliveries)
        metrics.delivered_count = len([d for d in email_deliveries if d.status == DeliveryStatus.DELIVERED])
        metrics.bounced_count = len([d for d in email_deliveries if d.status == DeliveryStatus.BOUNCED])
        metrics.failed_count = len([d for d in email_deliveries if d.status == DeliveryStatus.FAILED])
        
        metrics.opened_count = sum(d.open_count for d in email_deliveries)
        metrics.unique_opens = len([d for d in email_deliveries if d.open_count > 0])
        metrics.clicked_count = sum(d.click_count for d in email_deliveries)
        metrics.unique_clicks = len([d for d in email_deliveries if d.click_count > 0])
        
        # Calculate rates
        if metrics.total_recipients > 0:
            metrics.delivery_rate = (metrics.delivered_count / metrics.total_recipients) * 100
        
        if metrics.delivered_count > 0:
            metrics.open_rate = (metrics.unique_opens / metrics.delivered_count) * 100
            metrics.click_rate = (metrics.unique_clicks / metrics.delivered_count) * 100
        
        return metrics
    
    def get_campaign_metrics(self, campaign_id: str) -> Optional[EmailMetrics]:
        """Get aggregated metrics for a campaign"""
        campaign_emails = [e for e in self.emails.values() if e.campaign_id == campaign_id]
        
        if not campaign_emails:
            return None
        
        # Aggregate metrics across all emails in campaign
        aggregated = EmailMetrics(email_id=campaign_id)  # Using campaign_id as identifier
        
        for email in campaign_emails:
            email_metrics = self.get_email_metrics(email.email_id)
            if email_metrics:
                aggregated.total_recipients += email_metrics.total_recipients
                aggregated.delivered_count += email_metrics.delivered_count
                aggregated.bounced_count += email_metrics.bounced_count
                aggregated.failed_count += email_metrics.failed_count
                aggregated.opened_count += email_metrics.opened_count
                aggregated.unique_opens += email_metrics.unique_opens
                aggregated.clicked_count += email_metrics.clicked_count
                aggregated.unique_clicks += email_metrics.unique_clicks
        
        # Calculate aggregated rates
        if aggregated.total_recipients > 0:
            aggregated.delivery_rate = (aggregated.delivered_count / aggregated.total_recipients) * 100
        
        if aggregated.delivered_count > 0:
            aggregated.open_rate = (aggregated.unique_opens / aggregated.delivered_count) * 100
            aggregated.click_rate = (aggregated.unique_clicks / aggregated.delivered_count) * 100
        
        return aggregated
    
    def track_email_open(self, delivery_id: str) -> bool:
        """Track email open event"""
        delivery = self.deliveries.get(delivery_id)
        if not delivery:
            return False
        
        delivery.open_count += 1
        if not delivery.opened_at:
            delivery.opened_at = datetime.now(timezone.utc)
            self.stats.total_emails_opened += 1
        
        return True
    
    def track_email_click(self, delivery_id: str) -> bool:
        """Track email click event"""
        delivery = self.deliveries.get(delivery_id)
        if not delivery:
            return False
        
        delivery.click_count += 1
        if not delivery.clicked_at:
            delivery.clicked_at = datetime.now(timezone.utc)
            self.stats.total_emails_clicked += 1
        
        return True
    
    def get_stats(self) -> EmailStats:
        """Get email service statistics"""
        return self.stats
    
    def list_templates(self) -> List[EmailTemplate]:
        """List all email templates"""
        return list(self.templates.values())
    
    def list_campaigns(self) -> List[EmailCampaign]:
        """List all email campaigns"""
        return list(self.campaigns.values())

# Service factory function
async def get_email_service(config: EmailConfig) -> EmailService:
    """Factory function to create email service instance"""
    return EmailService(config)