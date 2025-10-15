from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel
from .customer_database import customer_db, Customer, Email

router = APIRouter()

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
    funnel_stage: str = "lead"
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
    funnel_stage: Optional[str] = None
    last_contact_date: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    company: str
    phone: str
    position: str
    industry: str
    arr: float
    status: str
    funnel_stage: str
    last_contact_date: Optional[str]
    notes: str
    created_at: Optional[str]
    updated_at: Optional[str]

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
    created_at: Optional[str]

class DatabaseStatsResponse(BaseModel):
    total_customers: int
    total_emails: int
    customers_by_status: Dict[str, int]
    last_updated: str

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer_data: CustomerCreate):
    """Create a new customer"""
    try:
        customer = Customer(
            name=customer_data.name,
            email=customer_data.email,
            company=customer_data.company,
            phone=customer_data.phone,
            position=customer_data.position,
            industry=customer_data.industry,
            arr=customer_data.arr,
            status=customer_data.status,
            funnel_stage=customer_data.funnel_stage,
            last_contact_date=customer_data.last_contact_date,
            notes=customer_data.notes
        )
        
        customer_id = customer_db.add_customer(customer)
        created_customer = customer_db.get_customer(customer_id)
        
        if not created_customer:
            raise HTTPException(status_code=500, detail="Failed to retrieve created customer")
        
        return CustomerResponse(
            id=created_customer.id or 0,
            name=created_customer.name,
            email=created_customer.email,
            company=created_customer.company,
            phone=created_customer.phone,
            position=created_customer.position,
            industry=created_customer.industry,
            arr=created_customer.arr,
            status=created_customer.status,
            funnel_stage=created_customer.funnel_stage,
            last_contact_date=created_customer.last_contact_date,
            notes=created_customer.notes,
            created_at=created_customer.created_at,
            updated_at=created_customer.updated_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")

@router.get("/customers", response_model=List[CustomerResponse])
async def get_all_customers():
    """Get all customers"""
    try:
        customers = customer_db.get_all_customers()
        return [
            CustomerResponse(
                id=customer.id or 0,
                name=customer.name,
                email=customer.email,
                company=customer.company,
                phone=customer.phone,
                position=customer.position,
                industry=customer.industry,
                arr=customer.arr,
                status=customer.status,
                funnel_stage=customer.funnel_stage,
                last_contact_date=customer.last_contact_date,
                notes=customer.notes,
                created_at=customer.created_at,
                updated_at=customer.updated_at
            )
            for customer in customers
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customers: {str(e)}")

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: int):
    """Get a specific customer by ID"""
    try:
        customer = customer_db.get_customer(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return CustomerResponse(
            id=customer.id or 0,
            name=customer.name,
            email=customer.email,
            company=customer.company,
            phone=customer.phone,
            position=customer.position,
            industry=customer.industry,
            arr=customer.arr,
            status=customer.status,
            funnel_stage=customer.funnel_stage,
            last_contact_date=customer.last_contact_date,
            notes=customer.notes,
            created_at=customer.created_at,
            updated_at=customer.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer: {str(e)}")

@router.get("/customers/search/{query}", response_model=List[CustomerResponse])
async def search_customers(query: str):
    """Search customers by name, email, or company"""
    try:
        customers = customer_db.search_customers(query)
        return [
            CustomerResponse(
                id=customer.id or 0,
                name=customer.name,
                email=customer.email,
                company=customer.company,
                phone=customer.phone,
                position=customer.position,
                industry=customer.industry,
                arr=customer.arr,
                status=customer.status,
                funnel_stage=customer.funnel_stage,
                last_contact_date=customer.last_contact_date,
                notes=customer.notes,
                created_at=customer.created_at,
                updated_at=customer.updated_at
            )
            for customer in customers
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search customers: {str(e)}")

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: int, customer_data: CustomerUpdate):
    """Update a customer"""
    try:
        existing_customer = customer_db.get_customer(customer_id)
        if not existing_customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Update only provided fields
        update_data = customer_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing_customer, field, value)
        
        success = customer_db.update_customer(existing_customer)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update customer")
        
        updated_customer = customer_db.get_customer(customer_id)
        if not updated_customer:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated customer")
        
        return CustomerResponse(
            id=updated_customer.id or 0,
            name=updated_customer.name,
            email=updated_customer.email,
            company=updated_customer.company,
            phone=updated_customer.phone,
            position=updated_customer.position,
            industry=updated_customer.industry,
            arr=updated_customer.arr,
            status=updated_customer.status,
            funnel_stage=updated_customer.funnel_stage,
            last_contact_date=updated_customer.last_contact_date,
            notes=updated_customer.notes,
            created_at=updated_customer.created_at,
            updated_at=updated_customer.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update customer: {str(e)}")

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int):
    """Delete a customer"""
    try:
        success = customer_db.delete_customer(customer_id)
        if not success:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"message": "Customer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete customer: {str(e)}")

@router.get("/customers/{customer_id}/emails", response_model=List[EmailResponse])
async def get_customer_emails(customer_id: int):
    """Get all emails for a customer"""
    try:
        customer = customer_db.get_customer(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        emails = customer_db.get_customer_emails(customer_id)
        return [
            EmailResponse(
                id=email.id or 0,
                customer_id=email.customer_id,
                message_id=email.message_id,
                thread_id=email.thread_id,
                subject=email.subject,
                sender=email.sender,
                recipient=email.recipient,
                date=email.date,
                body=email.body,
                direction=email.direction,
                created_at=email.created_at
            )
            for email in emails
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get customer emails: {str(e)}")

@router.get("/database/stats", response_model=DatabaseStatsResponse)
async def get_database_stats():
    """Get database statistics"""
    try:
        stats = customer_db.get_database_stats()
        return DatabaseStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

@router.post("/database/init")
async def init_database():
    """Initialize database tables"""
    try:
        customer_db._ensure_tables()
        return {"message": "Database initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize database: {str(e)}") 