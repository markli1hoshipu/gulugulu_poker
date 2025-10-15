import os
import csv
import base64
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Depends
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

def decode_base64(data: str) -> str:
    """Decode base64 encoded data."""
    try:
        return base64.urlsafe_b64decode(data).decode('utf-8')
    except Exception as e:
        logger.error(f"Error decoding base64: {e}")
        return ""

def extract_email_content(payload: Dict) -> Dict:
    """Extract email content from Gmail API payload."""
    headers = payload.get('headers', [])
    
    # Extract headers
    subject = ""
    sender = ""
    recipient = ""
    date = ""
    
    for header in headers:
        name = header.get('name', '').lower()
        value = header.get('value', '')
        
        if name == 'subject':
            subject = value
        elif name == 'from':
            sender = value
        elif name == 'to':
            recipient = value
        elif name == 'date':
            date = value
    
    # Extract body
    body = ""
    if 'parts' in payload:
        for part in payload['parts']:
            if part.get('mimeType') == 'text/plain':
                if 'data' in part.get('body', {}):
                    body = decode_base64(part['body']['data'])
                    break
    elif payload.get('mimeType') == 'text/plain':
        if 'data' in payload.get('body', {}):
            body = decode_base64(payload['body']['data'])
    
    return {
        'subject': subject,
        'sender': sender,
        'recipient': recipient,
        'date': date,
        'body': body[:1000]  # Limit body to first 1000 characters
    }

def save_emails_to_csv(emails: List[Dict], filename: str = "backend/crm/user_emails.csv"):
    """Save emails to CSV file."""
    try:
        # Ensure the directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        fieldnames = ['subject', 'sender', 'recipient', 'date', 'body', 'message_id', 'thread_id']
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for email in emails:
                writer.writerow({
                    'subject': email.get('subject', ''),
                    'sender': email.get('sender', ''),
                    'recipient': email.get('recipient', ''),
                    'date': email.get('date', ''),
                    'body': email.get('body', ''),
                    'message_id': email.get('message_id', ''),
                    'thread_id': email.get('thread_id', '')
                })
        
        logger.info(f"Successfully saved {len(emails)} emails to {filename}")
        return True
    except Exception as e:
        logger.error(f"Error saving emails to CSV: {e}")
        return False

from pydantic import BaseModel
from .database import crm_db, Email

class GmailReadRequest(BaseModel):
    access_token: str
    max_results: int = 100

@router.post("/read-gmail-emails")
async def read_gmail_emails(request: GmailReadRequest):
    """Read emails from Gmail and save to CSV."""
    try:
        # Create credentials object
        credentials = Credentials(token=request.access_token)
        
        # Build Gmail service
        service = build('gmail', 'v1', credentials=credentials)
        
        # Get user's email address
        profile = service.users().getProfile(userId='me').execute()
        user_email = profile.get('emailAddress', 'unknown')
        
        # Get list of messages
        results = service.users().messages().list(
            userId='me',
            maxResults=request.max_results,
            q='in:inbox OR in:sent'  # Get both inbox and sent emails
        ).execute()
        
        messages = results.get('messages', [])
        
        if not messages:
            return {
                "status": "success",
                "message": "No emails found",
                "emails_processed": 0
            }
        
        emails = []
        processed_count = 0
        
        for message in messages:
            try:
                # Get full message details
                msg = service.users().messages().get(
                    userId='me',
                    id=message['id'],
                    format='full'
                ).execute()
                
                # Extract email content
                email_data = extract_email_content(msg['payload'])
                email_data['message_id'] = message['id']
                email_data['thread_id'] = msg.get('threadId', '')
                
                # Save to database
                email_obj = Email(
                    message_id=email_data['message_id'],
                    thread_id=email_data['thread_id'],
                    subject=email_data['subject'],
                    sender=email_data['sender'],
                    recipient=email_data['recipient'],
                    date=email_data['date'],
                    body=email_data['body'],
                    direction='inbound'  # Default to inbound
                )
                crm_db.add_email(email_obj)
                
                emails.append(email_data)
                processed_count += 1
                
                # Log progress every 10 emails
                if processed_count % 10 == 0:
                    logger.info(f"Processed {processed_count}/{len(messages)} emails")
                    
            except HttpError as e:
                logger.error(f"Error processing message {message['id']}: {e}")
                continue
        
        # Save emails to CSV
        csv_filename = f"backend/crm/user_emails_{user_email.replace('@', '_at_').replace('.', '_')}.csv"
        save_success = save_emails_to_csv(emails, csv_filename)
        
        if not save_success:
            raise HTTPException(status_code=500, detail="Failed to save emails to CSV")
        
        return {
            "status": "success",
            "message": f"Successfully processed {processed_count} emails",
            "emails_processed": processed_count,
            "csv_file": csv_filename,
            "user_email": user_email
        }
        
    except HttpError as error:
        logger.error(f"Gmail API error: {error}")
        if error.resp.status == 401:
            raise HTTPException(status_code=401, detail="Invalid or expired access token")
        elif error.resp.status == 403:
            raise HTTPException(status_code=403, detail="Insufficient permissions to access Gmail")
        else:
            raise HTTPException(status_code=500, detail=f"Gmail API error: {error}")
    except Exception as e:
        logger.error(f"Unexpected error reading Gmail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read Gmail emails: {str(e)}")

@router.get("/gmail-emails-status")
async def get_gmail_emails_status():
    """Check if Gmail emails have been processed and get file info."""
    try:
        csv_files = []
        crm_dir = "backend/crm"
        
        if os.path.exists(crm_dir):
            for filename in os.listdir(crm_dir):
                if filename.startswith("user_emails_") and filename.endswith(".csv"):
                    filepath = os.path.join(crm_dir, filename)
                    file_stats = os.stat(filepath)
                    
                    # Count lines in CSV (excluding header)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        line_count = sum(1 for line in f) - 1  # Subtract header
                    
                    csv_files.append({
                        "filename": filename,
                        "filepath": filepath,
                        "size_bytes": file_stats.st_size,
                        "modified_time": datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
                        "email_count": line_count
                    })
        
        return {
            "status": "success",
            "csv_files": csv_files,
            "total_files": len(csv_files)
        }
        
    except Exception as e:
        logger.error(f"Error checking Gmail emails status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}") 