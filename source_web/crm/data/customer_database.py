import os
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from .legacy_database import crm_db
import sqlite3

logger = logging.getLogger(__name__)

@dataclass
class Customer:
    """Customer data model"""
    id: Optional[int] = None
    name: str = ""
    email: str = ""
    company: str = ""
    phone: str = ""
    position: str = ""
    industry: str = ""
    arr: float = 0.0  # Annual Recurring Revenue
    status: str = "prospect"  # prospect, lead, customer, churned
    funnel_stage: str = "lead"  # lead, qualified, proposal, negotiation, closed
    last_contact_date: Optional[str] = None
    notes: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert customer to dictionary"""
        return {k: v for k, v in asdict(self).items() if v is not None}

@dataclass
class Email:
    """Email data model"""
    id: Optional[int] = None
    customer_id: Optional[int] = None
    message_id: str = ""
    thread_id: str = ""
    subject: str = ""
    sender: str = ""
    recipient: str = ""
    date: str = ""
    body: str = ""
    direction: str = "inbound"  # inbound, outbound
    created_at: Optional[str] = None

class CustomerDatabase:
    """PostgreSQL database manager for customer data"""
    
    def __init__(self):
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Create database tables if they don't exist"""
        # This method is no longer needed as tables are managed by crm_db
        pass
    
    def add_customer(self, customer: Customer) -> int:
        """Add a new customer to the database"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO customers (
                    name, email, company, phone, position, industry, 
                    arr, status, funnel_stage, last_contact_date, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                customer.name, customer.email, customer.company, customer.phone,
                customer.position, customer.industry, customer.arr, customer.status,
                customer.funnel_stage, customer.last_contact_date, customer.notes
            ))
            
            customer_id = cursor.fetchone()[0]
            conn.commit()
            logger.info(f"Added customer: {customer.name} (ID: {customer_id})")
            return customer_id
    
    def update_customer(self, customer: Customer) -> bool:
        """Update an existing customer"""
        if not customer.id:
            raise ValueError("Customer ID is required for updates")
        
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE customers SET
                    name = %s, email = %s, company = %s, phone = %s, position = %s,
                    industry = %s, arr = %s, status = %s, funnel_stage = %s,
                    last_contact_date = %s, notes = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                customer.name, customer.email, customer.company, customer.phone,
                customer.position, customer.industry, customer.arr, customer.status,
                customer.funnel_stage, customer.last_contact_date, customer.notes, customer.id
            ))
            
            conn.commit()
            updated = cursor.rowcount > 0
            if updated:
                logger.info(f"Updated customer: {customer.name} (ID: {customer.id})")
            return updated
    
    def get_customer(self, customer_id: int) -> Optional[Customer]:
        """Get a customer by ID"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute('SELECT * FROM customers WHERE id = %s', (customer_id,))
            row = cursor.fetchone()
            
            if row:
                return Customer(**dict(row))
            return None
    
    def get_customer_by_email(self, email: str) -> Optional[Customer]:
        """Get a customer by email address"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute('SELECT * FROM customers WHERE email = %s', (email,))
            row = cursor.fetchone()
            
            if row:
                return Customer(**dict(row))
            return None
    
    def search_customers(self, query: str) -> List[Customer]:
        """Search customers by name, email, or company"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            search_query = f"%{query}%"
            cursor.execute("""
                SELECT * FROM customers 
                WHERE name ILIKE %s OR email ILIKE %s OR company ILIKE %s
                ORDER BY name
            """, (search_query, search_query, search_query))
            
            rows = cursor.fetchall()
            return [Customer(**dict(row)) for row in rows]
    
    def get_all_customers(self) -> List[Customer]:
        """Get all customers"""
        try:
            with sqlite3.connect(crm_db.db_path) as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                logger.info("Executing get_all_customers query")
                cursor.execute('SELECT * FROM customers ORDER BY name')
                rows = cursor.fetchall()
                logger.info(f"Found {len(rows)} customers")
                
                customers = []
                for row in rows:
                    # Convert datetime objects to strings
                    if row['last_contact_date']:
                        row['last_contact_date'] = row['last_contact_date'].isoformat()
                    if row['created_at']:
                        row['created_at'] = row['created_at'].isoformat()
                    if row['updated_at']:
                        row['updated_at'] = row['updated_at'].isoformat()
                    
                    # Ensure all string fields have default values
                    row['company'] = row['company'] or ""
                    row['phone'] = row['phone'] or ""
                    row['position'] = row['position'] or ""
                    row['industry'] = row['industry'] or ""
                    row['notes'] = row['notes'] or ""
                    
                    customers.append(Customer(**row))
                
                return customers
        except Exception as e:
            logger.error(f"Error in get_all_customers: {str(e)}")
            raise
    
    def delete_customer(self, customer_id: int) -> bool:
        """Delete a customer"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM customers WHERE id = %s', (customer_id,))
            conn.commit()
            
            deleted = cursor.rowcount > 0
            if deleted:
                logger.info(f"Deleted customer ID: {customer_id}")
            return deleted
    
    def add_email(self, email: Email) -> int:
        """Add an email to the database"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO emails (
                    customer_id, message_id, thread_id, subject, sender,
                    recipient, date, body, direction
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                email.customer_id, email.message_id, email.thread_id, email.subject,
                email.sender, email.recipient, email.date, email.body, email.direction
            ))
            
            email_id = cursor.fetchone()[0]
            conn.commit()
            logger.info(f"Added email: {email.subject} (ID: {email_id})")
            return email_id
    
    def get_customer_emails(self, customer_id: int) -> List[Email]:
        """Get all emails for a customer"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT * FROM emails 
                WHERE customer_id = %s 
                ORDER BY date DESC
            """, (customer_id,))
            
            rows = cursor.fetchall()
            return [Email(**dict(row)) for row in rows]
    
    def get_all_emails(self) -> List[Email]:
        """Get all emails"""
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute('SELECT * FROM emails ORDER BY date DESC LIMIT 100')
            rows = cursor.fetchall()
            return [Email(**dict(row)) for row in rows]
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            with sqlite3.connect(crm_db.db_path) as conn:
                cursor = conn.cursor()
                logger.info("Getting database statistics")
                
                # Get customer count
                cursor.execute('SELECT COUNT(*) FROM customers')
                customer_count = cursor.fetchone()[0]
                logger.info(f"Customer count: {customer_count}")
                
                # Get email count
                cursor.execute('SELECT COUNT(*) FROM emails')
                email_count = cursor.fetchone()[0]
                logger.info(f"Email count: {email_count}")
                
                # Get customers by status
                cursor.execute("""
                    SELECT status, COUNT(*) as count 
                    FROM customers 
                    GROUP BY status
                """)
                status_counts = dict(cursor.fetchall())
                logger.info(f"Status distribution: {status_counts}")
                
                return {
                    'total_customers': customer_count,
                    'total_emails': email_count,
                    'customers_by_status': status_counts,
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Error in get_database_stats: {str(e)}")
            raise

# Global database instance
customer_db = CustomerDatabase() 