import os
import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr
from google import genai

# Import auth from the local auth module
from auth.providers import verify_auth_token

# Import shared database functions
from routers.crm_data_router import (
    get_db_connection,
    get_customer_by_id as get_customer_crm,
    get_employee_id_by_email,
    get_employee_info_by_email,
    get_customer_interactions_by_employee,
    get_customer_interactions_all
)

# Import email services
from email_service import (
    EmailProvider, EmailSendResponse,
    get_lead_email_service, get_gmail_service
)
# Note: We don't import get_email_database_service because CRM logs directly to customer_interactions table

logger = logging.getLogger(__name__)
router = APIRouter()

# Import database dependencies
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    raise ImportError("psycopg2-binary is required. Install with: pip install psycopg2-binary")

def format_interactions_for_prompt(interactions: List[Dict]) -> str:
    """Format interactions for Gemini prompt"""
    if not interactions:
        return "No previous interactions found."
    
    formatted_interactions = []
    
    for interaction in interactions:
        # Handle datetime formatting
        try:
            if hasattr(interaction['created_at'], 'strftime'):
                interaction_date = interaction['created_at'].strftime("%Y-%m-%d %H:%M")
            else:
                interaction_date = str(interaction['created_at'])
        except:
            interaction_date = "Unknown date"
        
        employee_name = interaction.get('employee_name', 'Unknown Employee')
        employee_role = interaction.get('employee_role', 'Unknown Role')
        employee_info = f"{employee_name} ({employee_role})"
        
        formatted_interaction = f"""
DATE: {interaction_date}
TYPE: {interaction['type'].upper()}
EMPLOYEE: {employee_info}
CONTENT: {interaction['content']}
---"""
        formatted_interactions.append(formatted_interaction)
    
    return "\n".join(formatted_interactions)

class EmailGenerationRequest(BaseModel):
    custom_prompt: str = ""

class EmailSendRequest(BaseModel):
    """Request model for sending emails."""
    to_email: EmailStr
    subject: str
    body: str
    customer_id: Optional[int] = None
    provider: Optional[str] = None
    access_token: Optional[str] = None

class EmailTemplateResponse(BaseModel):
    """Email template response."""
    id: str
    name: str
    description: str

@router.post("/generate-email/{customer_id}")
async def generate_email(
    customer_id: str, 
    request: EmailGenerationRequest = EmailGenerationRequest(),
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict:
    """Generate a professional email for a customer using Gemini AI based on interaction history."""
    
    try:
        logger.info(f"Generating email for customer {customer_id}")
        logger.info(f"Request custom_prompt: '{request.custom_prompt}'")
        logger.info(f"Request custom_prompt type: {type(request.custom_prompt)}")
        logger.info(f"Request custom_prompt length: {len(request.custom_prompt) if request.custom_prompt else 0}")
        
        # Convert customer_id to int for CRM service
        try:
            customer_id_int = int(customer_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid customer ID format")
        
        # Get customer data using comprehensive CRM service function
        try:
            customer = await get_customer_crm(customer_id_int, authenticated_user)
        except HTTPException as e:
            if e.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")
            raise e
        
        # Extract user information for signature and get employee_id
        user_name = authenticated_user.get('name', 'Customer Success Manager')
        user_email = authenticated_user.get('email', '')
        user_role = 'Customer Success Manager'  # Default role
        
        # Get employee information by email
        employee_id = None
        if user_email:
            try:
                employee_id = get_employee_id_by_email(user_email)
                # Get employee details for proper signature
                employee_info = get_employee_info_by_email(user_email)
                user_name = employee_info.get('name', user_name)
                user_role = employee_info.get('role', user_role)
            except HTTPException as e:
                if e.status_code == 404:
                    logger.warning(f"Employee not found for email {user_email}, using all interactions")
                else:
                    raise e
        
        # Get interaction history from database - filtered by employee if available
        if employee_id:
            interactions = get_customer_interactions_by_employee(customer_id, employee_id)
        else:
            interactions = get_customer_interactions_all(customer_id)
            
        formatted_interactions = format_interactions_for_prompt(interactions)
        
        # Get API key
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="API key not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
            )
        
        # Initialize Gemini client
        client = genai.Client(api_key=api_key)
        
        # Extract customer information from CRM service data model
        company_name = customer.company
        primary_contact = customer.primaryContact
        customer_email = customer.email
        industry = customer.industry or 'Business'
        status = customer.status
        location = customer.location or 'Unknown'
        client_type = customer.clientType
        notes = customer.recent_notes or 'No additional notes'
        health_score = customer.healthScore
        satisfaction_score = customer.satisfactionScore
        arr = customer.arr
        churn_risk = customer.churnRisk
        
                # Enhanced prompt prioritizing user's custom guidance
        logger.info(f"Checking custom_prompt condition: '{request.custom_prompt}' and '{request.custom_prompt.strip() if request.custom_prompt else None}'")
        
        if request.custom_prompt and request.custom_prompt.strip():
            logger.info("Using CUSTOM prompt path")
            print(f"Custom prompt: {request.custom_prompt.strip()}")
            
            prompt = f"""Write an email to {primary_contact} at {company_name} from {user_name}.

USER'S REQUEST: {request.custom_prompt.strip()}

CUSTOMER INFORMATION:
- Company: {company_name}
- Primary Contact: {primary_contact}
- Email: {customer_email}
- Industry: {industry}
- Location: {location}
- Status: {status}
- Client Type: {client_type}
- Annual Recurring Revenue: ${arr:,.2f}
- Health Score: {health_score}/100
- Satisfaction Score: {satisfaction_score}/10
- Churn Risk: {churn_risk}
- Notes: {notes}

INTERACTION HISTORY:
{formatted_interactions}

EMAIL SENDER:
- Name: {user_name}
- Role: {user_role}

INSTRUCTIONS:
- Focus on the user's specific request above
- Use professional CRM tone appropriate for {industry} industry
- Consider health score ({health_score}) and satisfaction score ({satisfaction_score}) in your approach
- Address {primary_contact} by first name only
- Use proper email formatting with line breaks
- Use YOUR actual name "{user_name}" and role "{user_role}" in the signature
- Reference relevant past interactions if they help support your purpose
- If user's request conflicts with these instructions, prioritize the user's request

Return your response in EXACTLY this format:
SUBJECT: [your subject line here]
BODY: [your email body here]"""
        else:
            # Fallback to original prompt when no custom guidance is provided
            logger.info("Using DEFAULT prompt path")
            prompt = f"""You are {user_name}, a {user_role} writing a professional follow-up email. Use the customer information and interaction history below to craft a personalized, contextually appropriate email.

CUSTOMER INFORMATION:
- Company: {company_name}
- Primary Contact: {primary_contact}
- Email: {customer_email}
- Industry: {industry}
- Location: {location}
- Status: {status}
- Client Type: {client_type}
- Annual Recurring Revenue: ${arr:,.2f}
- Health Score: {health_score}/100
- Satisfaction Score: {satisfaction_score}/10
- Churn Risk: {churn_risk}
- Notes: {notes}

INTERACTION HISTORY:
{formatted_interactions}

EMAIL SENDER:
- Name: {user_name}
- Role: {user_role}

CRITICAL INSTRUCTIONS:
1. Use ONLY the exact names and information provided above
2. Do NOT use any placeholder text like [Your Company Name] or [Company Name]
3. Use the actual company name "{company_name}" when referring to the customer's company
4. Use the actual contact name "{primary_contact}" when addressing the recipient
5. Reference specific past interactions when relevant
6. Show continuity from previous conversations
7. Address any outstanding items or follow-ups mentioned in interactions
8. Be appropriate for the {industry} industry
9. Consider the health score ({health_score}) and satisfaction score ({satisfaction_score}) in your tone
10. If churn risk is high or health score is low, address concerns proactively
11. Include a clear next step or call to action
12. NO PLACEHOLDERS OR BRACKETS - use real data only
13. Use YOUR actual name "{user_name}" and role "{user_role}" in the signature

Return your response in EXACTLY this format:
SUBJECT: [your subject line here]
BODY: [your email body here]

SUBJECT Requirements:
- 6-8 words maximum
- Professional and engaging
- Reference {company_name} or recent interaction when relevant
- No quotes or special characters

BODY Requirements:
- Address {primary_contact} by first name only
- Reference {company_name} specifically (never use placeholder text)
- Use proper email formatting with line breaks
- Follow this structure:

Dear [First name of {primary_contact}],

[Opening paragraph - Reference recent interaction or appropriate greeting based on health score and satisfaction]

[Value/Context paragraph - Address any pending items, provide relevant updates based on interaction history, or address concerns if health score is low]

[Call-to-action paragraph - Clear next step, meeting request, or follow-up action appropriate for their status and metrics]

Best regards,
{user_name}
{user_role}

Generate the email now:"""

        # Make API call
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        # Validate response
        if not response.text:
            raise Exception("Failed to generate email content")
        
        # Parse the structured response
        content = response.text.strip()
        
        # Extract subject and body
        subject = ""
        body = ""
        
        # Find the subject line
        if "SUBJECT:" in content:
            subject_start = content.find("SUBJECT:") + len("SUBJECT:")
            subject_end = content.find("\n", subject_start)
            if subject_end == -1:
                subject_end = content.find("BODY:", subject_start)
            subject = content[subject_start:subject_end].strip()
        
        # Find the body content
        if "BODY:" in content:
            body_start = content.find("BODY:") + len("BODY:")
            body = content[body_start:].strip()
        
        # Clean up subject (remove quotes, extra formatting)
        subject = subject.replace('"', '').replace("'", "").replace('*', '').strip()
        
        # Clean up body - preserve line breaks but remove extra spaces
        if body:
            # Split by lines, strip each line, then rejoin with proper line breaks
            body_lines = [line.strip() for line in body.split('\n') if line.strip()]
            body = '\n\n'.join(body_lines)  # Double line break for proper paragraph spacing
            
            # Ensure proper greeting format
            if not body.startswith(('Dear', 'Hi', 'Hello')):
                first_name = primary_contact.split()[0] if primary_contact else "there"
                body = f'Dear {first_name},\n\n' + body
                
            # Check if signature already exists with user's name
            has_signature = (
                any(closing in body for closing in ['Sincerely,', 'Best regards,', 'Best,']) and
                user_name in body
            )
            
            # Only add signature if it doesn't already exist
            if not has_signature:
                if not body.endswith('\n'):
                    body += '\n\n'
                body += f'Best regards,\n{user_name}\n{user_role}'
        
        # Validation and fallbacks with customer-specific data
        if not subject or len(subject) < 5 or len(subject) > 60:
            subject = f"Following up with {company_name}"
            
        if not body or len(body) < 50:
            # Fallback with customer-specific formatting
            first_name = primary_contact.split()[0] if primary_contact else "there"
            health_message = ""
            if health_score and health_score < 60:
                health_message = "I wanted to check in and see how we can better support your needs. "
            elif satisfaction_score and satisfaction_score < 7:
                health_message = "I hope everything is going well with your recent experience. "
            
            body = f"""Dear {first_name},

I hope you're doing well. As your Customer Success Manager, I wanted to reach out regarding {company_name}.

{health_message}Based on your focus in {industry}, I believe there are opportunities to discuss how we can better support your business objectives.

Would you be available for a brief 15-minute call next week to explore how we can add value to your operations?

Best regards,
{user_name}
{user_role}"""

        # Additional context for response with comprehensive customer data
        interaction_summary = {
            'total_interactions': len(interactions),
            'interaction_types': list(set([i['type'] for i in interactions])) if interactions else [],
            'last_interaction_date': interactions[0].get('created_at') if interactions else None,
            'last_employee_contacted': interactions[0].get('employee_name') if interactions else None,
            'data_source': 'database_with_crm_service',
            'health_score': health_score,
            'satisfaction_score': satisfaction_score,
            'churn_risk': churn_risk,
            'arr': arr,
            'employee_filtered': employee_id is not None,
            'employee_id': employee_id
        }

        logger.info(f"Successfully generated email for customer {customer_id}")

        return {
            "status": "success",
            "email_data": {
                "to": customer.email,
                "subject": subject,
                "body": body,
                "generated_by": "gemini-2.5-flash",
                "customer_id": customer_id,
                "customer_company": company_name,
                "customer_contact": primary_contact,
                "sender_name": user_name,
                "sender_email": user_email,
                "formatted": True,
                "interaction_context": interaction_summary
            }
        }
        
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="Google Genai library not installed. Please install with: pip install google-genai"
        )
    except Exception as e:
        logger.error(f"Error generating email for customer {customer_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate email: {str(e)}"
        )

@router.get("/email-templates")
async def get_email_templates(
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict:
    """Get available email templates."""
    templates = [
        {
            "id": "followup",
            "name": "Follow-up Email",
            "description": "Follow up on previous conversation or meeting"
        },
        {
            "id": "check_in",
            "name": "Check-in Email",
            "description": "Check in on customer status and satisfaction"
        },
        {
            "id": "renewal",
            "name": "Renewal Email",
            "description": "Discuss contract renewal and upsell opportunities"
        },
        {
            "id": "support",
            "name": "Support Email",
            "description": "Address customer concerns or issues"
        },
        {
            "id": "update",
            "name": "Product Update",
            "description": "Share new features or product improvements"
        }
    ]
    return {"templates": templates}

@router.post("/generate-custom-email")
async def generate_custom_email(
    request: Dict,
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict:
    """Generate custom email - compatible with frontend EmailComposer."""
    try:
        customer_id = request.get('customer_id')
        email_type = request.get('email_type', 'followup')
        custom_message = request.get('custom_message', '')

        if not customer_id:
            raise HTTPException(status_code=400, detail="customer_id is required")

        # Build custom prompt from email type and custom message
        templates = {
            'followup': 'Follow up on previous conversation or meeting',
            'check_in': 'Check in on customer status and satisfaction',
            'renewal': 'Discuss contract renewal and upsell opportunities',
            'support': 'Address customer concerns or issues',
            'update': 'Share new features or product improvements'
        }

        prompt = templates.get(email_type, '')
        if custom_message:
            prompt += ('. ' if prompt else '') + custom_message

        # Call the existing generate_email endpoint logic
        email_request = EmailGenerationRequest(custom_prompt=prompt)
        result = await generate_email(str(customer_id), email_request, authenticated_user)

        return result

    except Exception as e:
        logger.error(f"Error in generate_custom_email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate email: {str(e)}")

@router.post("/send-email")
async def send_email(
    request: EmailSendRequest,
    authenticated_user: dict = Depends(verify_auth_token)
) -> Dict:
    """Send email to customer with Gmail API or SMTP fallback."""
    try:
        logger.info(f"=== SEND EMAIL ENDPOINT CALLED ===")
        logger.info(f"To: {request.to_email}")
        logger.info(f"Subject: {request.subject}")
        logger.info(f"Customer ID: {request.customer_id}")
        logger.info(f"Provider: {request.provider}")
        logger.info(f"Has access token: {bool(request.access_token)}")
        logger.info(f"User: {authenticated_user.get('email')}")

        # Get email services
        gmail_service = await get_gmail_service()
        email_service = await get_lead_email_service()

        result = None

        # Try Gmail API first if access token provided
        if request.provider == "gmail" and request.access_token:
            logger.info("Attempting to send via Gmail API...")
            if gmail_service.is_available():
                user_email = authenticated_user.get('email', 'support@company.com')
                user_name = authenticated_user.get('name', 'Customer Success Manager')
                logger.info(f"Gmail service available, sending from {user_email}")

                result = await gmail_service.send_email(
                    access_token=request.access_token,
                    to_email=request.to_email,
                    subject=request.subject,
                    body=request.body,
                    from_email=user_email,
                    from_name=user_name
                )
                logger.info(f"Gmail API result: success={result.success if result else None}")
            else:
                logger.warning("Gmail API not available, falling back to SMTP")
        else:
            logger.info(f"Not using Gmail API (provider={request.provider}, has_token={bool(request.access_token)})")

        # Fallback to SMTP
        if not result or not result.success:
            logger.info("Using SMTP fallback...")
            sender_info = {
                "name": authenticated_user.get('name', 'Customer Success Manager'),
                "email": authenticated_user.get('email', 'support@company.com')
            }
            logger.info(f"SMTP sender info: {sender_info}")

            result = await email_service.send_email_smtp(
                to_email=request.to_email,
                subject=request.subject,
                body=request.body,
                sender_info=sender_info
            )
            logger.info(f"SMTP result: success={result.success if result else None}, message={result.message if result else None}")

        # Log sent email to database if customer_id provided
        if result.success and request.customer_id:
            try:
                conn = get_db_connection()
                cursor = conn.cursor()

                user_email = authenticated_user.get('email')
                employee_id = None

                # Get employee_id for logging
                try:
                    employee_id = get_employee_id_by_email(user_email)
                    logger.info(f"Found employee_id {employee_id} for user {user_email}")
                except Exception as e:
                    logger.error(f"Failed to get employee_id for user {user_email}: {e}")

                # Get next interaction_id
                cursor.execute("SELECT COALESCE(MAX(interaction_id), 0) + 1 FROM interaction_details")
                next_id = cursor.fetchone()[0]

                # Log as interaction_details (CRM table)
                cursor.execute("""
                    INSERT INTO interaction_details
                    (interaction_id, customer_id, type, content, employee_id, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    next_id,
                    request.customer_id,
                    'email',
                    f"Subject: {request.subject}\n\n{request.body}",
                    employee_id,
                    datetime.utcnow(),
                    datetime.utcnow()
                ))

                conn.commit()
                cursor.close()
                conn.close()

                logger.info(f"Logged sent email for customer {request.customer_id}")

            except Exception as e:
                logger.error(f"Failed to log email to database: {e}")
                # Don't fail the request if logging fails

        response_data = {
            "status": "success",
            "message": result.message if result else "Email sent successfully",
            "sent_to": request.to_email,
            "method": "gmail_api" if (request.provider == "gmail" and request.access_token) else "smtp"
        }
        logger.info(f"Email sent successfully to {request.to_email}")
        logger.info(f"Response: {response_data}")
        return response_data

    except Exception as e:
        logger.error(f"ERROR sending email: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )