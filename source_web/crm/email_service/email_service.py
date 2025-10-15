"""
Lead Email Service - Comprehensive email functionality for lead generation.
Migrated and enhanced from backend_lead.
"""

import os
import logging
import smtplib
from typing import Dict, List, Optional, Any
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# AI imports
try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logging.warning("Google AI not available. Email generation will use templates only.")

# Import local models and config
from .models import (
    EmailType, EmailProvider, EmailStatus, EmailSentiment,
    EmailGenerationRequest, EmailSendRequest, EmailGenerationResponse,
    EmailSendResponse, EmailTemplate, EmailHistory, EmailReply,
    EmailConfiguration, EmailAnalytics
)
# LeadStatus not needed in CRM context - commenting out
# from config.constants import LeadStatus

logger = logging.getLogger(__name__)

class LeadEmailService:
    """Comprehensive email service for lead generation."""

    def __init__(self):
        """Initialize the email service."""
        # AI Configuration
        self.api_key = (
            os.getenv('GOOGLE_AI_API_KEY') or
            os.getenv('GEMINI_API_KEY') or
            os.getenv('GOOGLE_API_KEY')
        )

        # SMTP Configuration
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER')
        self.smtp_password = os.getenv('SMTP_PASSWORD')

        # Initialize Google AI if available
        if GENAI_AVAILABLE and self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("Google AI not configured. Using template-based email generation.")

        # Email tracking
        self.email_history: List[EmailHistory] = []
        self.email_templates: List[EmailTemplate] = self._initialize_templates()

    def _initialize_templates(self) -> List[EmailTemplate]:
        """Initialize default email templates."""
        templates = [
            EmailTemplate(
                template_id="cold_outreach",
                name="Cold Outreach",
                subject="Partnership Opportunity - {lead_company} & {company_name}",
                body="""Dear {recipient_name},

I hope this email finds you well. I'm {sender_name} from {company_name}.

{lead_context}

Based on what I've learned about {lead_company}, I believe we have solutions that could help you {value_proposition}.

{custom_message}

Would you have 10 minutes available for a call this week?

Thanks,
{sender_name}
{company_name}""",
                email_type=EmailType.COLD_OUTREACH,
                variables=["recipient_name", "sender_name", "company_name", "lead_company", "lead_context", "value_proposition", "custom_message"]
            ),
            EmailTemplate(
                template_id="warm_introduction",
                name="Warm Introduction",
                subject="Introduction - {lead_company} & {company_name}",
                body="""Dear {recipient_name},

I hope you're having a great week. I'm {sender_name} from {company_name}.

{mutual_connection} suggested I reach out to you regarding {topic}.

{lead_context}

{custom_message}

Would you be open to a brief conversation about how we might be able to help {lead_company}?

Best regards,
{sender_name}
{sender_role}
{company_name}""",
                email_type=EmailType.WARM_INTRODUCTION,
                variables=["recipient_name", "sender_name", "company_name", "lead_company", "mutual_connection", "topic", "lead_context", "custom_message", "sender_role"]
            ),
            EmailTemplate(
                template_id="follow_up",
                name="Follow Up",
                subject="Following up on our conversation - {lead_company}",
                body="""Hi {recipient_name},

I wanted to follow up on our recent conversation about {topic}.

{previous_conversation_summary}

{custom_message}

{next_steps}

Looking forward to hearing from you.

Best,
{sender_name}
{company_name}""",
                email_type=EmailType.FOLLOW_UP,
                variables=["recipient_name", "topic", "previous_conversation_summary", "custom_message", "next_steps", "sender_name", "company_name"]
            ),
            EmailTemplate(
                template_id="meeting_request",
                name="Meeting Request",
                subject="Meeting Request - {lead_company} & {company_name}",
                body="""Dear {recipient_name},

I hope you're having a great week. I'm {sender_name} from {company_name}.

{lead_context}

Based on this understanding of {lead_company}, I believe we have solutions that could significantly impact your {business_area}.

{custom_message}

Would you be available for a 30-minute meeting next week to discuss how we might collaborate?

Looking forward to connecting,
{sender_name}
{sender_role}
{company_name}""",
                email_type=EmailType.MEETING_REQUEST,
                variables=["recipient_name", "sender_name", "company_name", "lead_company", "lead_context", "business_area", "custom_message", "sender_role"]
            )
        ]
        return templates

    def get_email_templates(self) -> List[EmailTemplate]:
        """Get available email templates."""
        return self.email_templates

    def format_lead_context(self, lead_data: Dict) -> str:
        """Format lead data for email context."""
        context_parts = []

        # Basic company info
        if lead_data.get('company'):
            context_parts.append(f"Company: {lead_data['company']}")

        if lead_data.get('industry'):
            context_parts.append(f"Industry: {lead_data['industry']}")

        if lead_data.get('location'):
            context_parts.append(f"Location: {lead_data['location']}")

        if lead_data.get('website'):
            context_parts.append(f"Website: {lead_data['website']}")

        # Company details
        if lead_data.get('company_size'):
            context_parts.append(f"Size: {lead_data['company_size']}")

        if lead_data.get('revenue'):
            context_parts.append(f"Revenue: {lead_data['revenue']}")

        return "; ".join(context_parts) if context_parts else "Limited company information available"

    def format_email_history_for_prompt(self, emails: List[Dict]) -> str:
        """Format email history for AI prompt context."""
        if not emails:
            return "No previous email communications found."

        formatted_emails = []

        for email in emails:
            # Handle datetime formatting
            try:
                if hasattr(email.get('created_at'), 'strftime'):
                    email_date = email['created_at'].strftime("%Y-%m-%d %H:%M")
                else:
                    email_date = str(email.get('created_at', 'Unknown date'))
            except:
                email_date = "Unknown date"

            sender = email.get('from_email', 'Unknown')
            recipient = email.get('to_email', 'Unknown')
            subject = email.get('subject', 'No Subject')
            body = email.get('body', '').strip()

            # Truncate body if too long
            if len(body) > 500:
                body = body[:500] + "..."

            formatted_email = f"""
[{email_date}]
From: {sender}
To: {recipient}
Subject: {subject}
Body: {body}
"""
            formatted_emails.append(formatted_email)

        return "\n".join(formatted_emails)

    async def generate_email_with_ai(
        self,
        lead_data: Dict,
        email_type: str = "cold_outreach",
        custom_prompt: str = "",
        email_history: List[Dict] = None,
        user_info: Dict = None
    ) -> EmailGenerationResponse:
        """Generate email using AI (Gemini)."""
        if not self.client:
            return await self.generate_email_with_template(lead_data, email_type, custom_prompt, user_info)

        try:
            # Prepare context
            lead_context = self.format_lead_context(lead_data)
            history_context = self.format_email_history_for_prompt(email_history or [])

            # Default user info
            if not user_info:
                user_info = {
                    "name": "Sales Representative",
                    "role": "Business Development",
                    "company": "Your Company"
                }

            # Build AI prompt
            prompt = f"""
You are an expert sales email writer. Generate a professional, personalized email for the following lead:

LEAD INFORMATION:
{lead_context}

EMAIL TYPE: {email_type}

PREVIOUS EMAIL HISTORY:
{history_context}

SENDER INFORMATION:
Name: {user_info.get('name', 'Sales Representative')}
Role: {user_info.get('role', 'Business Development')}
Company: {user_info.get('company', 'Your Company')}

CUSTOM INSTRUCTIONS:
{custom_prompt if custom_prompt else 'Use standard best practices for this email type.'}

REQUIREMENTS:
1. Generate both subject line and email body
2. Keep the tone professional but personable
3. Include a clear call-to-action
4. Personalize based on the lead's industry and company information
5. Keep the email concise (under 150 words)
6. Make it relevant to their business needs

Please respond with:
SUBJECT: [subject line]
BODY: [email body]
"""

            # Generate with Gemini
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )

            # Parse response
            content = response.text

            # Extract subject and body
            subject = ""
            body = ""

            lines = content.split('\n')
            current_section = None

            for line in lines:
                line = line.strip()
                if line.startswith('SUBJECT:'):
                    subject = line.replace('SUBJECT:', '').strip()
                    current_section = 'subject'
                elif line.startswith('BODY:'):
                    body = line.replace('BODY:', '').strip()
                    current_section = 'body'
                elif current_section == 'body' and line:
                    body += '\n' + line

            # Fallback if parsing fails
            if not subject or not body:
                subject = f"Partnership Opportunity - {lead_data.get('company', 'Your Company')}"
                body = content.strip()

            return EmailGenerationResponse(
                email_data={
                    "subject": subject,
                    "body": body.strip(),
                    "recipient_email": lead_data.get('email'),
                    "recipient_name": lead_data.get('name'),
                    "lead_id": lead_data.get('id')
                },
                subject=subject,
                body=body.strip(),
                template_used="ai_generated",
                success=True
            )

        except Exception as e:
            logger.error(f"Error generating email with AI: {e}")
            # Fallback to template-based generation
            return await self.generate_email_with_template(lead_data, email_type, custom_prompt, user_info)

    async def generate_email_with_template(
        self,
        lead_data: Dict,
        email_type: str = "cold_outreach",
        custom_prompt: str = "",
        user_info: Dict = None
    ) -> EmailGenerationResponse:
        """Generate email using templates."""
        try:
            # Find template
            template = None
            for t in self.email_templates:
                if t.template_id == email_type:
                    template = t
                    break

            if not template:
                template = self.email_templates[0]  # Default to first template

            # Default user info
            if not user_info:
                user_info = {
                    "name": "Sales Representative",
                    "role": "Business Development",
                    "company": "Your Company"
                }

            # Prepare template variables
            variables = {
                "recipient_name": lead_data.get('name', 'there'),
                "sender_name": user_info.get('name', 'Sales Representative'),
                "sender_role": user_info.get('role', 'Business Development'),
                "company_name": user_info.get('company', 'Your Company'),
                "lead_company": lead_data.get('company', 'your company'),
                "lead_context": self.format_lead_context(lead_data),
                "custom_message": custom_prompt or "I'd love to learn more about your current challenges and see how we might be able to help.",
                "value_proposition": "streamline your operations and drive growth",
                "business_area": lead_data.get('industry', 'business'),
                "topic": "potential partnership opportunities",
                "mutual_connection": "A mutual colleague",
                "previous_conversation_summary": "our previous discussion about your business needs",
                "next_steps": "I'll follow up with some additional information that might be helpful."
            }

            # Format template
            subject = template.subject
            body = template.body

            for var, value in variables.items():
                subject = subject.replace(f"{{{var}}}", str(value))
                body = body.replace(f"{{{var}}}", str(value))

            return EmailGenerationResponse(
                email_data={
                    "subject": subject,
                    "body": body,
                    "recipient_email": lead_data.get('email'),
                    "recipient_name": lead_data.get('name'),
                    "lead_id": lead_data.get('id')
                },
                subject=subject,
                body=body,
                template_used=template.template_id,
                success=True
            )

        except Exception as e:
            logger.error(f"Error generating email with template: {e}")
            return EmailGenerationResponse(
                email_data={},
                success=False
            )

    async def send_email_smtp(
        self,
        to_email: str,
        subject: str,
        body: str,
        sender_info: Dict = None
    ) -> EmailSendResponse:
        """Send email using SMTP."""
        try:
            if not self.smtp_user or not self.smtp_password:
                raise ValueError("SMTP credentials not configured")

            # Default sender info
            if not sender_info:
                sender_info = {
                    "name": "Sales Team",
                    "email": self.smtp_user
                }

            # Create message
            msg = MIMEMultipart()
            msg['From'] = formataddr((sender_info.get('name', 'Sales Team'), sender_info.get('email', self.smtp_user)))
            msg['To'] = to_email
            msg['Subject'] = subject

            # Add body
            msg.attach(MIMEText(body, 'plain'))

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            return EmailSendResponse(
                sent_to=to_email,
                success=True,
                message="Email sent successfully via SMTP",
                provider=EmailProvider.SMTP
            )

        except Exception as e:
            logger.error(f"Error sending email via SMTP: {e}")
            return EmailSendResponse(
                sent_to=to_email,
                success=False,
                message=f"Failed to send email: {str(e)}",
                provider=EmailProvider.SMTP
            )

    async def analyze_email_reply(
        self,
        reply_text: str,
        original_email: Dict = None
    ) -> Dict:
        """Analyze email reply sentiment using AI."""
        if not self.client:
            # Fallback sentiment analysis
            return self._analyze_reply_fallback(reply_text)

        try:
            prompt = f"""
Analyze the following email reply and determine:
1. Overall sentiment (positive, negative, neutral, interested, not_interested)
2. Confidence level (0.0 to 1.0)
3. Whether this indicates potential interest in continuing the conversation
4. Brief analysis summary

Original context: {original_email.get('subject', 'Email conversation') if original_email else 'Cold outreach'}

Reply to analyze:
"{reply_text}"

Respond in this exact format:
SENTIMENT: [one of: positive, negative, neutral, interested, not_interested]
CONFIDENCE: [0.0 to 1.0]
IS_POSITIVE: [true or false]
SUMMARY: [brief analysis in 1-2 sentences]
"""

            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )

            # Parse response
            content = response.text
            lines = content.split('\n')

            sentiment = EmailSentiment.NEUTRAL
            confidence = 0.5
            is_positive = False
            summary = "Reply analyzed."

            for line in lines:
                line = line.strip()
                if line.startswith('SENTIMENT:'):
                    sent_value = line.replace('SENTIMENT:', '').strip().lower()
                    try:
                        sentiment = EmailSentiment(sent_value)
                    except ValueError:
                        sentiment = EmailSentiment.NEUTRAL
                elif line.startswith('CONFIDENCE:'):
                    try:
                        confidence = float(line.replace('CONFIDENCE:', '').strip())
                    except:
                        confidence = 0.5
                elif line.startswith('IS_POSITIVE:'):
                    is_positive = line.replace('IS_POSITIVE:', '').strip().lower() == 'true'
                elif line.startswith('SUMMARY:'):
                    summary = line.replace('SUMMARY:', '').strip()

            return {
                "sentiment": sentiment,
                "confidence": confidence,
                "is_positive": is_positive,
                "analysis_summary": summary
            }

        except Exception as e:
            logger.error(f"Error analyzing email reply: {e}")
            return self._analyze_reply_fallback(reply_text)

    def _analyze_reply_fallback(self, reply_text: str) -> Dict:
        """Fallback sentiment analysis using keyword matching."""
        text_lower = reply_text.lower()

        positive_keywords = [
            'interested', 'yes', 'sounds good', 'great', 'excellent', 'perfect',
            'love to', 'would like', 'tell me more', 'learn more', 'schedule',
            'meeting', 'call', 'discuss', 'when', 'available', 'free time'
        ]

        negative_keywords = [
            'not interested', 'no thank', 'not looking', 'not at this time',
            'remove', 'unsubscribe', 'stop', 'never', 'not for us', 'no need'
        ]

        positive_count = sum(1 for keyword in positive_keywords if keyword in text_lower)
        negative_count = sum(1 for keyword in negative_keywords if keyword in text_lower)

        if positive_count > negative_count and positive_count > 0:
            return {
                "sentiment": EmailSentiment.POSITIVE,
                "confidence": min(0.8, 0.5 + positive_count * 0.1),
                "is_positive": True,
                "analysis_summary": f"Reply contains {positive_count} positive indicators."
            }
        elif negative_count > positive_count and negative_count > 0:
            return {
                "sentiment": EmailSentiment.NEGATIVE,
                "confidence": min(0.8, 0.5 + negative_count * 0.1),
                "is_positive": False,
                "analysis_summary": f"Reply contains {negative_count} negative indicators."
            }
        else:
            return {
                "sentiment": EmailSentiment.NEUTRAL,
                "confidence": 0.5,
                "is_positive": False,
                "analysis_summary": "Reply sentiment is neutral or unclear."
            }

    def should_update_lead_status(
        self,
        current_status: str,
        email_sent: bool = False,
        reply_analysis: Dict = None
    ) -> tuple[bool, Optional[str]]:
        """Determine if lead status should be updated based on email activity."""
        # This method is specific to lead management and not used in CRM context
        # Returning False to indicate no status update needed
        return False, None

    async def get_lead_email_history(self, lead_id: str, limit: int = 20) -> List[EmailHistory]:
        """Get email history for a lead."""
        # This would integrate with the database service
        # For now, return empty list as placeholder
        return []

    def get_email_analytics(self, lead_id: Optional[str] = None) -> EmailAnalytics:
        """Get email analytics."""
        # This would integrate with the database service
        # For now, return default analytics
        return EmailAnalytics(
            total_sent=0,
            total_delivered=0,
            total_opened=0,
            total_replied=0,
            delivery_rate=0.0,
            open_rate=0.0,
            reply_rate=0.0
        )


# Service factory function
_email_service_instance = None

async def get_lead_email_service() -> LeadEmailService:
    """Get or create the lead email service instance."""
    global _email_service_instance
    if _email_service_instance is None:
        _email_service_instance = LeadEmailService()
    return _email_service_instance