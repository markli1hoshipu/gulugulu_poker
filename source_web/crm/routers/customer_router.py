from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel
from data.customer_database import customer_db, Customer, Email
import logging
import os
import csv
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()

# CSV loading function (similar to analytics.py)
def load_customer_data_from_csv():
    """Load customer data from CSV file."""
    csv_file_path = Path(__file__).parent / "customers_data.csv"
    customers = {}

    try:
        with open(csv_file_path, 'r', newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Convert string values to appropriate types
                processed_row = row.copy()

                # Convert numeric fields
                numeric_fields = ['healthScore', 'contractValue', 'arr', 'productUsage', 'renewalProbability', 'expansionProbability']
                for field in numeric_fields:
                    if field in processed_row and processed_row[field]:
                        try:
                            processed_row[field] = int(processed_row[field])
                        except ValueError:
                            processed_row[field] = 0

                customers[row['id']] = processed_row
        return customers
    except FileNotFoundError:
        logger.error("Customer data CSV file not found")
        return {}
    except Exception as e:
        logger.error(f"Error reading customer data: {str(e)}")
        return {}

def csv_to_customer_response(csv_row: dict, customer_id: str) -> dict:
    """Convert CSV row to CustomerResponse format"""
    return {
        "id": int(customer_id),
        "name": csv_row.get('primaryContact', ''),
        "email": csv_row.get('email', ''),
        "company": csv_row.get('company', ''),
        "phone": '',  # Not in CSV
        "position": csv_row.get('title', ''),
        "industry": '',  # Not in CSV, could be inferred from company
        "arr": float(csv_row.get('arr', 0)),
        "status": csv_row.get('status', 'prospect'),
        "last_contact_date": csv_row.get('lastContactDate', ''),
        "notes": csv_row.get('recent_notes', ''),
        "created_at": '',  # Not in CSV
        "updated_at": ''   # Not in CSV
    }

# Pydantic models for API requests/responses
class CustomerCreate(BaseModel):
    name: str
    email: str
    company: str = ""
    phone: str = ""
    position: str = ""
    industry: str = ""
    arr: float = 0.0
    status: str = "prospect"
    last_contact_date: Optional[str] = None
    notes: str = ""

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    industry: Optional[str] = None
    arr: Optional[float] = None
    status: Optional[str] = None
    last_contact_date: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: Optional[int] = None
    name: str
    email: str
    company: str = ""
    phone: str = ""
    position: str = ""
    industry: str = ""
    arr: float = 0.0
    status: str = "prospect"
    last_contact_date: Optional[str] = None
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""

    class Config:
        from_attributes = True

class EmailResponse(BaseModel):
    id: int
    customer_id: Optional[int]
    message_id: str
    thread_id: str
    subject: str
    sender: str
    recipient: str
    date: str
    body: str
    direction: str
    created_at: str

class CustomerWithEmailsResponse(BaseModel):
    customer: CustomerResponse
    emails: List[EmailResponse]
    email_count: int

class DatabaseStatsResponse(BaseModel):
    customer_count: int
    email_count: int
    linked_email_count: int
    status_distribution: Dict[str, int]
    database_path: str

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer_data: CustomerCreate):
    """Create a new customer (CSV mode - read-only, returns error)"""
    raise HTTPException(
        status_code=501,
        detail="Customer creation not supported in CSV mode. Database is read-only."
    )

@router.get("/customers", response_model=List[CustomerResponse])
async def get_all_customers():
    """Get all customers from CSV"""
    try:
        logger.info("Getting all customers from CSV")
        customers_data = load_customer_data_from_csv()
        if not customers_data:
            logger.info("No customers found in CSV")
            return []

        logger.info(f"Found {len(customers_data)} customers in CSV")
        customer_responses = []

        for customer_id, csv_row in customers_data.items():
            customer_response = csv_to_customer_response(csv_row, customer_id)
            customer_responses.append(CustomerResponse(**customer_response))

        return customer_responses
    except Exception as e:
        logger.error(f"Error getting all customers from CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: int):
    """Get a specific customer by ID from CSV"""
    try:
        customers_data = load_customer_data_from_csv()
        csv_row = customers_data.get(str(customer_id))

        if not csv_row:
            raise HTTPException(status_code=404, detail="Customer not found")

        customer_response = csv_to_customer_response(csv_row, str(customer_id))
        return CustomerResponse(**customer_response)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer: {str(e)}")

@router.get("/customers/search/{query}", response_model=List[CustomerResponse])
async def search_customers(query: str):
    """Search customers by name, email, or company in CSV"""
    try:
        customers_data = load_customer_data_from_csv()
        matching_customers = []

        query_lower = query.lower()

        for customer_id, csv_row in customers_data.items():
            # Search in name (primaryContact), email, and company
            if (query_lower in csv_row.get('primaryContact', '').lower() or
                query_lower in csv_row.get('email', '').lower() or
                query_lower in csv_row.get('company', '').lower()):

                customer_response = csv_to_customer_response(csv_row, customer_id)
                matching_customers.append(CustomerResponse(**customer_response))

        return matching_customers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search customers: {str(e)}")

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: int, customer_data: CustomerUpdate):
    """Update a customer (CSV mode - read-only, returns error)"""
    raise HTTPException(
        status_code=501,
        detail="Customer updates not supported in CSV mode. Database is read-only."
    )

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int):
    """Delete a customer (CSV mode - read-only, returns error)"""
    raise HTTPException(
        status_code=501,
        detail="Customer deletion not supported in CSV mode. Database is read-only."
    )

@router.get("/customers/{customer_id}/emails", response_model=List[EmailResponse])
async def get_customer_emails(customer_id: int):
    """Get all emails for a specific customer (CSV mode - returns empty)"""
    try:
        # Verify customer exists in CSV
        customers_data = load_customer_data_from_csv()
        if str(customer_id) not in customers_data:
            raise HTTPException(status_code=404, detail="Customer not found")

        # CSV doesn't contain email records, return empty list
        return []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer emails: {str(e)}")

@router.get("/customers/{customer_id}/with-emails", response_model=CustomerWithEmailsResponse)
async def get_customer_with_emails(customer_id: int):
    """Get a customer with all their emails (CSV mode - no emails)"""
    try:
        # Get customer from CSV
        customers_data = load_customer_data_from_csv()
        csv_row = customers_data.get(str(customer_id))

        if not csv_row:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Convert CSV data to customer response
        customer_response = csv_to_customer_response(csv_row, str(customer_id))

        return CustomerWithEmailsResponse(
            customer=CustomerResponse(**customer_response),
            emails=[],  # CSV doesn't contain email records
            email_count=0
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer with emails: {str(e)}")

@router.get("/database/stats", response_model=DatabaseStatsResponse)
async def get_database_stats():
    """Get database statistics from CSV"""
    try:
        logger.info("Getting database stats from CSV")
        customers_data = load_customer_data_from_csv()

        # Calculate statistics from CSV data
        customer_count = len(customers_data)
        email_count = 0  # CSV doesn't contain email records
        linked_email_count = 0  # CSV doesn't contain email records

        # Calculate status distribution
        status_distribution = {}
        for csv_row in customers_data.values():
            status = csv_row.get('status', 'unknown')
            status_distribution[status] = status_distribution.get(status, 0) + 1

        logger.info(f"CSV Database stats: customers={customer_count}, status_dist={status_distribution}")
        return DatabaseStatsResponse(
            customer_count=customer_count,
            email_count=email_count,
            linked_email_count=linked_email_count,
            status_distribution=status_distribution,
            database_path="customers_data.csv"
        )
    except Exception as e:
        logger.error(f"Error getting database stats from CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/database/link-emails")
async def link_emails_to_customers():
    """Link existing emails to customers (CSV mode - not supported)"""
    raise HTTPException(
        status_code=501,
        detail="Email linking not supported in CSV mode. No email records available."
    )