"""Upload router for CRM customer import functionality."""

import os
import json
import logging
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel

from auth.providers import verify_auth_token
from routers.crm_data_router import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter()

# Schemas for CSV upload functionality
class CustomerUploadResponse(BaseModel):
    message: str
    filename: str
    total_rows: int
    inserted_rows: int
    failed_rows: int
    skipped_rows: int = 0
    columns_detected: List[str]
    processing_time_ms: float
    warnings: Optional[List[str]] = None

class ColumnMappingResponse(BaseModel):
    success: bool
    filename: str
    source_columns: List[str]
    suggested_mappings: Dict[str, str]
    crm_fields: List[str]
    message: str

class CustomerImportPreview(BaseModel):
    success: bool
    filename: str
    preview_data: List[Dict[str, Any]]
    column_mapping: Dict[str, str]
    total_rows: int
    ready_for_import: bool

# Standard CRM customer fields for mapping
CRM_CUSTOMER_FIELDS = {
    'company': 'Company Name',
    'primaryContact': 'Primary Contact',
    'email': 'Email Address',
    'phone': 'Phone Number',
    'industry': 'Industry',
    'location': 'Location',
    'status': 'Status',
    'clientType': 'Client Type',
    'arr': 'Annual Recurring Revenue',
    'contractValue': 'Contract Value',
    'monthlyValue': 'Monthly Value',
    'renewalDate': 'Renewal Date',
    'healthScore': 'Health Score',
    'churnRisk': 'Churn Risk',
    'satisfactionScore': 'Satisfaction Score',
    'expansionPotential': 'Expansion Potential'
}

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file to temporary location."""
    import tempfile
    import shutil
    
    # Create temp file with original extension
    file_ext = Path(upload_file.filename).suffix
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
    
    try:
        # Read file content and write to temp file
        content = await upload_file.read()
        with open(temp_file.name, 'wb') as f:
            f.write(content)
        return temp_file.name
    except Exception as e:
        # Clean up on error
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        raise e

def detect_file_encoding(file_path: str) -> str:
    """Detect file encoding for CSV files."""
    import chardet
    
    with open(file_path, 'rb') as f:
        raw_data = f.read(10000)  # Read first 10KB
        result = chardet.detect(raw_data)
        return result['encoding'] or 'utf-8'

def suggest_column_mappings(source_columns: List[str]) -> Dict[str, str]:
    """Suggest mappings between source columns and CRM fields."""
    mappings = {}
    
    # Create lowercase versions for matching
    source_lower = {col.lower(): col for col in source_columns}
    
    # Define mapping patterns
    mapping_patterns = {
        'company': ['company', 'company_name', 'company name', 'organization', 'org', 'business', 'firm'],
        'primaryContact': ['contact', 'primary_contact', 'primary contact', 'main_contact', 'main contact', 'contact_name', 'contact name', 'name', 'full_name', 'full name'],
        'email': ['email', 'email_address', 'email address', 'e_mail', 'e mail', 'mail'],
        'phone': ['phone', 'phone_number', 'phone number', 'tel', 'telephone', 'mobile', 'cell'],
        'industry': ['industry', 'sector', 'business_type', 'business type', 'vertical'],
        'location': ['location', 'address', 'city', 'state', 'country', 'region'],
        'status': ['status', 'customer_status', 'customer status', 'account_status', 'account status'],
        'clientType': ['client_type', 'client type', 'customer_type', 'customer type', 'type', 'category'],
        'arr': ['arr', 'annual_revenue', 'annual revenue', 'yearly_revenue', 'yearly revenue', 'annual_recurring_revenue', 'annual recurring revenue'],
        'contractValue': ['contract_value', 'contract value', 'deal_value', 'deal value', 'total_value', 'total value', 'contract_amount', 'contract amount'],
        'monthlyValue': ['monthly_value', 'monthly value', 'monthly_revenue', 'monthly revenue', 'mrr'],
        'renewalDate': ['renewal_date', 'renewal date', 'renewal', 'contract_end', 'contract end', 'expiry_date', 'expiry date'],
        'healthScore': ['health_score', 'health score', 'health', 'score', 'customer_health', 'customer health'],
        'churnRisk': ['churn_risk', 'churn risk', 'churn', 'risk_level', 'risk level', 'risk'],
        'satisfactionScore': ['satisfaction_score', 'satisfaction score', 'satisfaction', 'csat', 'nps'],
        'expansionPotential': ['expansion_potential', 'expansion potential', 'expansion', 'upsell_potential', 'upsell potential', 'growth_potential', 'growth potential']
    }
    
    # Try to match each CRM field
    for crm_field, patterns in mapping_patterns.items():
        for pattern in patterns:
            if pattern in source_lower:
                mappings[source_lower[pattern]] = crm_field
                break
    
    return mappings

def validate_customer_data(row_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean customer data before insertion."""
    cleaned_data = {}
    
    def is_valid_value(value):
        """Check if value is not None, NaN, or empty string"""
        if value is None:
            return False
        if pd.isna(value):
            return False
        if str(value).strip() == '':
            return False
        return True
    
    # Required fields
    if 'company' in row_data and is_valid_value(row_data['company']):
        cleaned_data['company'] = str(row_data['company']).strip()
    else:
        raise ValueError("Company name is required")
    
    if 'primaryContact' in row_data and is_valid_value(row_data['primaryContact']):
        cleaned_data['primaryContact'] = str(row_data['primaryContact']).strip()
    else:
        raise ValueError("Primary contact is required")
    
    if 'email' in row_data and is_valid_value(row_data['email']):
        email = str(row_data['email']).strip()
        # Basic email validation
        if '@' not in email:
            raise ValueError(f"Invalid email format: {email}")
        cleaned_data['email'] = email
    else:
        raise ValueError("Email is required")
    
    # Optional fields with defaults
    cleaned_data['phone'] = str(row_data.get('phone', '')).strip()
    cleaned_data['industry'] = str(row_data.get('industry', 'Business')).strip()
    cleaned_data['location'] = str(row_data.get('location', '')).strip()
    cleaned_data['status'] = str(row_data.get('status', 'active')).strip()
    cleaned_data['clientType'] = str(row_data.get('clientType', 'lead')).strip()
    
    # Numeric fields
    for field in ['arr', 'contractValue', 'monthlyValue', 'healthScore', 'satisfactionScore']:
        if field in row_data and row_data[field]:
            try:
                cleaned_data[field] = float(row_data[field])
            except (ValueError, TypeError):
                cleaned_data[field] = 0.0
        else:
            cleaned_data[field] = 0.0
    
    # Date fields
    if 'renewalDate' in row_data and row_data['renewalDate']:
        try:
            # Try to parse date
            date_str = str(row_data['renewalDate']).strip()
            if date_str:
                # Convert to YYYY-MM-DD format if needed
                parsed_date = pd.to_datetime(date_str)
                cleaned_data['renewalDate'] = parsed_date.strftime('%Y-%m-%d')
        except:
            cleaned_data['renewalDate'] = None
    else:
        cleaned_data['renewalDate'] = None
    
    # String fields with defaults
    cleaned_data['churnRisk'] = str(row_data.get('churnRisk', 'low')).strip()
    cleaned_data['expansionPotential'] = str(row_data.get('expansionPotential', 'medium')).strip()
    
    return cleaned_data

@router.post("/analyze-csv", response_model=ColumnMappingResponse)
async def analyze_csv_for_mapping(
    file: UploadFile = File(...),
    user: dict = Depends(verify_auth_token)
):
    """Analyze uploaded CSV/XLSX and suggest column mappings for CRM fields."""
    temp_path = None
    
    try:
        # Validate file
        if not file.filename:
            raise ValueError("No filename provided")
        
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in {'.csv', '.xlsx', '.xls'}:
            raise ValueError(f"File type {file_ext} not supported. Please upload CSV or Excel files.")
        
        # Save file temporarily
        temp_path = await save_upload_file(file)
        
        # Read file
        if file_ext == '.csv':
            detected_encoding = detect_file_encoding(temp_path)
            df = pd.read_csv(temp_path, encoding=detected_encoding, low_memory=False)
        else:
            df = pd.read_excel(temp_path)
        
        # Get source columns
        source_columns = list(df.columns)
        
        # Suggest mappings
        suggested_mappings = suggest_column_mappings(source_columns)
        
        # Get available CRM fields
        crm_fields = list(CRM_CUSTOMER_FIELDS.keys())
        
        return ColumnMappingResponse(
            success=True,
            filename=file.filename,
            source_columns=source_columns,
            suggested_mappings=suggested_mappings,
            crm_fields=crm_fields,
            message=f"Found {len(source_columns)} columns, suggested {len(suggested_mappings)} mappings"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"CSV analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"CSV analysis failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_path}: {e}")

@router.post("/preview-import", response_model=CustomerImportPreview)
async def preview_customer_import(
    file: UploadFile = File(...),
    column_mapping: str = Form(..., description="JSON string of column mappings"),
    sample_size: int = Form(10, ge=1, le=50, description="Number of rows to preview"),
    user: dict = Depends(verify_auth_token)
):
    """Preview customer data with applied column mappings."""
    temp_path = None
    
    try:
        # Parse column mapping
        try:
            mappings = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise ValueError("Invalid column mapping JSON")
        
        # Save and read file
        temp_path = await save_upload_file(file)
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext == '.csv':
            detected_encoding = detect_file_encoding(temp_path)
            df = pd.read_csv(temp_path, encoding=detected_encoding, low_memory=False)
        else:
            df = pd.read_excel(temp_path)
        
        # Apply column mapping
        mapped_df = df.rename(columns=mappings)
        
        # Get preview data
        preview_df = mapped_df.head(sample_size)
        
        # Convert to list of dictionaries for JSON response
        preview_data = []
        for _, row in preview_df.iterrows():
            row_dict = {}
            for col in preview_df.columns:
                value = row[col]
                # Handle NaN values
                if pd.isna(value):
                    row_dict[col] = ""
                else:
                    row_dict[col] = str(value)
            preview_data.append(row_dict)
        
        # Check if ready for import (has required fields)
        required_fields = {'company', 'primaryContact', 'email'}
        mapped_columns = set(mapped_df.columns)
        ready_for_import = required_fields.issubset(mapped_columns)
        
        return CustomerImportPreview(
            success=True,
            filename=file.filename,
            preview_data=preview_data,
            column_mapping=mappings,
            total_rows=len(df),
            ready_for_import=ready_for_import
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Import preview failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import preview failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_path}: {e}")

@router.post("/import-customers", response_model=CustomerUploadResponse)
async def import_customers(
    file: UploadFile = File(...),
    column_mapping: str = Form(..., description="JSON string of column mappings"),
    skip_duplicates: bool = Form(True, description="Skip rows with duplicate emails"),
    user: dict = Depends(verify_auth_token)
):
    """Import customers from CSV/XLSX file with column mapping."""
    temp_path = None
    start_time = datetime.utcnow()
    
    logger.info(f"🚀 Starting CSV import for file: {file.filename}")
    
    try:
        # Parse column mapping
        try:
            mappings = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise ValueError("Invalid column mapping JSON")
        
        # Save and read file
        temp_path = await save_upload_file(file)
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext == '.csv':
            detected_encoding = detect_file_encoding(temp_path)
            df = pd.read_csv(temp_path, encoding=detected_encoding, low_memory=False)
        else:
            df = pd.read_excel(temp_path)
        
        # Apply column mapping
        mapped_df = df.rename(columns=mappings)
        
        # Validate required fields
        required_fields = {'company', 'primaryContact', 'email'}
        mapped_columns = set(mapped_df.columns)
        if not required_fields.issubset(mapped_columns):
            missing = required_fields - mapped_columns
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        # Get database connection
        user_email = user.get('email')
        if not user_email:
            raise ValueError("User email not found in authentication token")
        db = get_db_connection(user_email)
        
        # Process data
        inserted_rows = 0
        failed_rows = 0
        skipped_rows = 0
        warnings = []
        existing_emails = set()
        
        # Get existing emails if skip_duplicates is enabled
        if skip_duplicates:
            try:
                cursor = db.cursor()
                cursor.execute("SELECT email FROM clients_info")
                existing_result = cursor.fetchall()
                existing_emails = {row[0].lower() for row in existing_result}
                cursor.close()
            except Exception as e:
                logger.warning(f"Could not fetch existing emails: {e}")
        
        # Process each row
        for index, row in mapped_df.iterrows():
            try:
                logger.info(f"📝 Processing row {index + 1}/{len(mapped_df)}")
                
                # Convert row to dict and validate
                row_data = row.to_dict()
                logger.debug(f"Raw row data: {row_data}")
                
                # Skip if duplicate email
                if skip_duplicates and 'email' in row_data:
                    email = str(row_data['email']).strip().lower()
                    if email in existing_emails:
                        logger.info(f"⏭️ Skipping row {index + 1}: duplicate email {email}")
                        skipped_rows += 1
                        continue
                
                # Validate and clean data
                logger.debug(f"Validating data for row {index + 1}")
                cleaned_data = validate_customer_data(row_data)
                logger.debug(f"Cleaned data: {cleaned_data}")
                
                # Get next client_id
                logger.debug(f"Getting next client_id for row {index + 1}")
                cursor = db.cursor()
                cursor.execute("SELECT COALESCE(MAX(client_id), 0) + 1 as next_id FROM clients_info")
                result = cursor.fetchone()
                client_id = result[0]
                cursor.close()
                logger.info(f"🆔 Generated client_id {client_id} for row {index + 1}")
                
                # Insert customer
                insert_query = """
                    INSERT INTO clients_info (
                        client_id, name, primary_contact, email, phone, industry, 
                        location, status, source, created_at, updated_at, notes
                    ) VALUES (
                        %(client_id)s, %(company)s, %(primaryContact)s, %(email)s, %(phone)s, 
                        %(industry)s, %(location)s, %(status)s, %(clientType)s, NOW(), NOW(), ''
                    )
                """
                
                # Add client_id to cleaned_data
                cleaned_data['client_id'] = client_id
                logger.debug(f"Executing clients_info insert for client_id {client_id}")
                
                cursor = db.cursor()
                cursor.execute(insert_query, cleaned_data)
                cursor.close()
                customer_id = client_id
                logger.info(f"✅ Inserted clients_info record for client_id {client_id}")
                
                # Insert additional details if provided
                details_data = {
                    'client_id': customer_id,
                    'lifetime_value': cleaned_data.get('contractValue', 0),
                    'monthly_recurring_revenue': cleaned_data.get('monthlyValue', 0),
                    'renewal_date': cleaned_data.get('renewalDate'),
                    'health_score': cleaned_data.get('healthScore', 75),
                    'churn_risk': cleaned_data.get('churnRisk', 'low'),
                    'satisfaction_score': cleaned_data.get('satisfactionScore', 8.0),
                    'upsell_potential': cleaned_data.get('expansionPotential', 'medium'),
                    'product_usage': '{}',
                    'tags': '["imported-customer"]',
                    'recent_activities': '[]',
                    'last_interaction': None,
                    'total_interactions': 0,
                    'support_tickets': 0,
                    'onboarding_complete': False,
                    'negotiation_steps': '[]',
                    'status': cleaned_data.get('status', 'active'),
                    'progress': 0,
                    'contact_birthday': None
                }
                
                details_query = """
                    INSERT INTO clients_details (
                        client_id, lifetime_value, monthly_recurring_revenue, renewal_date, health_score,
                        churn_risk, satisfaction_score, upsell_potential, product_usage,
                        tags, recent_activities, last_interaction, total_interactions,
                        support_tickets, onboarding_complete, negotiation_steps, created_at,
                        updated_at, status, progress, contact_birthday
                    ) VALUES (
                        %(client_id)s, %(lifetime_value)s, %(monthly_recurring_revenue)s, %(renewal_date)s,
                        %(health_score)s, %(churn_risk)s, %(satisfaction_score)s, %(upsell_potential)s,
                        %(product_usage)s, %(tags)s, %(recent_activities)s, %(last_interaction)s,
                        %(total_interactions)s, %(support_tickets)s, %(onboarding_complete)s,
                        %(negotiation_steps)s, NOW(), NOW(), %(status)s, %(progress)s, %(contact_birthday)s
                    )
                """
                
                logger.debug(f"Executing clients_details insert for client_id {customer_id}")
                logger.debug(f"Details data: {details_data}")
                
                cursor = db.cursor()
                cursor.execute(details_query, details_data)
                cursor.close()
                
                # Commit the transaction
                db.commit()
                logger.info(f"✅ Successfully imported row {index + 1} with client_id {customer_id}")
                
                inserted_rows += 1
                
                # Add email to existing set to avoid duplicates within the same file
                if 'email' in cleaned_data:
                    existing_emails.add(cleaned_data['email'].lower())
                
            except Exception as e:
                failed_rows += 1
                error_msg = f"Failed to import row {index + 1}: {str(e)}"
                logger.error(f"❌ {error_msg}")
                logger.error(f"Raw row data: {row_data}")
                if 'cleaned_data' in locals():
                    logger.error(f"Cleaned data: {cleaned_data}")
                if 'details_data' in locals():
                    logger.error(f"Details data: {details_data}")
                warnings.append(error_msg)
                
                # Rollback the transaction on error
                try:
                    db.rollback()
                    logger.debug(f"Rolled back transaction for row {index + 1}")
                except Exception as rollback_error:
                    logger.warning(f"Failed to rollback transaction: {rollback_error}")
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        logger.info(f"🎯 CSV import completed: {inserted_rows} inserted, {failed_rows} failed, {skipped_rows} skipped in {processing_time:.1f}ms")
        
        return CustomerUploadResponse(
            message=f"Successfully imported {inserted_rows} customers from {file.filename}",
            filename=file.filename,
            total_rows=len(mapped_df),
            inserted_rows=inserted_rows,
            failed_rows=failed_rows,
            skipped_rows=skipped_rows,
            columns_detected=list(mapped_df.columns),
            processing_time_ms=processing_time,
            warnings=warnings if warnings else None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Customer import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Customer import failed: {str(e)}")
    finally:
        # Close database connection
        if 'db' in locals() and db:
            try:
                db.close()
            except Exception as e:
                logger.warning(f"Failed to close database connection: {e}")
        
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_path}: {e}")

@router.get("/customer-fields")
async def get_customer_fields():
    """Get available CRM customer fields for mapping."""
    return {
        "success": True,
        "fields": CRM_CUSTOMER_FIELDS,
        "required_fields": ["company", "primaryContact", "email"],
        "optional_fields": [field for field in CRM_CUSTOMER_FIELDS.keys() 
                           if field not in ["company", "primaryContact", "email"]]
    }

@router.get("/download-template")
async def download_customer_template():
    """Download a CSV template for customer import."""
    from fastapi.responses import Response
    
    # Create CSV template with proper column headers
    template_headers = [
        "Company Name",
        "Primary Contact", 
        "Email Address",
        "Phone Number",
        "Industry",
        "Location",
        "Status",
        "Client Type",
        "Annual Recurring Revenue",
        "Contract Value", 
        "Monthly Value",
        "Renewal Date",
        "Health Score",
        "Churn Risk",
        "Satisfaction Score",
        "Expansion Potential"
    ]
    
    # Sample data rows
    sample_rows = [
        ["Acme Corp", "John Doe", "john@acme.com", "555-1234", "Technology", "San Francisco", "active", "enterprise", "100000", "120000", "10000", "2024-12-31", "85", "low", "9.2", "high"],
        ["TechStart Inc", "Jane Smith", "jane@techstart.com", "555-5678", "Healthcare", "New York", "prospect", "startup", "50000", "60000", "5000", "2025-06-30", "75", "medium", "8.5", "medium"]
    ]
    
    # Create CSV content
    csv_content = ",".join(template_headers) + "\n"
    for row in sample_rows:
        csv_content += ",".join(row) + "\n"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customer_import_template.csv"}
    )