import sqlite3
import os
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass

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
    last_contact_date: Optional[str] = None
    notes: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

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

class CRMDatabase:
    """SQLite database manager for CRM system"""
    
    def __init__(self, db_path: str = "backend/crm/user_information.db"):
        self.db_path = db_path
        self._ensure_db_directory()
        self._create_tables()
    
    def _ensure_db_directory(self):
        """Ensure the database directory exists"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
    
    def _create_tables(self):
        """Create database tables if they don't exist and migrate schema if needed"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create customers table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    company TEXT,
                    phone TEXT,
                    position TEXT,
                    industry TEXT,
                    arr REAL DEFAULT 0.0,
                    status TEXT DEFAULT 'prospect',
                    last_contact_date TEXT,
                    notes TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # --- Migration: Add missing 'status' column if not present ---
            try:
                cursor.execute("ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'prospect'")
            except sqlite3.OperationalError:
                pass  # Column already exists

            # Create emails table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS emails (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    message_id TEXT UNIQUE NOT NULL,
                    thread_id TEXT,
                    subject TEXT,
                    sender TEXT,
                    recipient TEXT,
                    date TEXT,
                    body TEXT,
                    direction TEXT DEFAULT 'inbound',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            ''')
            
            # Create indexes for better performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_customers_company ON customers (company)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_emails_customer_id ON emails (customer_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails (message_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_emails_date ON emails (date)')
            
            conn.commit()
            logger.info("Database tables created successfully")
    
    def add_customer(self, customer: Customer) -> int:
        """Add a new customer to the database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO customers (
                    name, email, company, phone, position, industry, 
                    arr, status, last_contact_date, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                customer.name, customer.email, customer.company, customer.phone,
                customer.position, customer.industry, customer.arr, customer.status,
                customer.last_contact_date, customer.notes
            ))
            
            customer_id = cursor.lastrowid
            conn.commit()
            if customer_id is None:
                raise RuntimeError("Failed to get customer ID after insertion")
            logger.info(f"Added customer: {customer.name} (ID: {customer_id})")
            return customer_id
    
    def update_customer(self, customer: Customer) -> bool:
        """Update an existing customer"""
        if not customer.id:
            raise ValueError("Customer ID is required for updates")
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE customers SET
                    name = ?, email = ?, company = ?, phone = ?, position = ?,
                    industry = ?, arr = ?, status = ?, last_contact_date = ?,
                    notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                customer.name, customer.email, customer.company, customer.phone,
                customer.position, customer.industry, customer.arr, customer.status,
                customer.last_contact_date, customer.notes, customer.id
            ))
            
            conn.commit()
            updated = cursor.rowcount > 0
            if updated:
                logger.info(f"Updated customer: {customer.name} (ID: {customer.id})")
            return updated
    
    def get_customer(self, customer_id: int) -> Optional[Customer]:
        """Get a customer by ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM customers WHERE id = ?', (customer_id,))
            row = cursor.fetchone()
            
            if row:
                return Customer(
                    id=row[0], name=row[1], email=row[2], company=row[3],
                    phone=row[4], position=row[5], industry=row[6], arr=row[7],
                    status=row[8], last_contact_date=row[9], notes=row[10],
                    created_at=row[11], updated_at=row[12]
                )
            return None
    
    def get_customer_by_email(self, email: str) -> Optional[Customer]:
        """Get a customer by email address"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM customers WHERE email = ?', (email,))
            row = cursor.fetchone()
            
            if row:
                return Customer(
                    id=row[0], name=row[1], email=row[2], company=row[3],
                    phone=row[4], position=row[5], industry=row[6], arr=row[7],
                    status=row[8], last_contact_date=row[9], notes=row[10],
                    created_at=row[11], updated_at=row[12]
                )
            return None
    
    def search_customers(self, query: str) -> List[Customer]:
        """Search customers by name, email, or company"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            search_term = f"%{query}%"
            cursor.execute('''
                SELECT * FROM customers 
                WHERE name LIKE ? OR email LIKE ? OR company LIKE ?
                ORDER BY name
            ''', (search_term, search_term, search_term))
            
            customers = []
            for row in cursor.fetchall():
                customers.append(Customer(
                    id=row[0], name=row[1], email=row[2], company=row[3],
                    phone=row[4], position=row[5], industry=row[6], arr=row[7],
                    status=row[8], last_contact_date=row[9], notes=row[10],
                    created_at=row[11], updated_at=row[12]
                ))
            
            return customers
    
    def get_all_customers(self) -> List[Customer]:
        """Get all customers"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM customers ORDER BY name')
            
            customers = []
            for row in cursor.fetchall():
                customers.append(Customer(
                    id=row[0], name=row[1], email=row[2], company=row[3],
                    phone=row[4], position=row[5], industry=row[6], arr=row[7],
                    status=row[8], last_contact_date=row[9], notes=row[10],
                    created_at=row[11], updated_at=row[12]
                ))
            
            return customers
    
    def delete_customer(self, customer_id: int) -> bool:
        """Delete a customer and all associated emails"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Delete associated emails first
            cursor.execute('DELETE FROM emails WHERE customer_id = ?', (customer_id,))
            
            # Delete customer
            cursor.execute('DELETE FROM customers WHERE id = ?', (customer_id,))
            
            conn.commit()
            deleted = cursor.rowcount > 0
            if deleted:
                logger.info(f"Deleted customer ID: {customer_id}")
            return deleted
    
    def add_email(self, email: Email) -> int:
        """Add a new email to the database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR IGNORE INTO emails (
                    customer_id, message_id, thread_id, subject, sender,
                    recipient, date, body, direction
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                email.customer_id, email.message_id, email.thread_id,
                email.subject, email.sender, email.recipient, email.date,
                email.body, email.direction
            ))
            
            email_id = cursor.lastrowid
            conn.commit()
            if email_id is None:
                raise RuntimeError("Failed to get email ID after insertion")
            logger.info(f"Added email: {email.subject} (ID: {email_id})")
            return email_id
    
    def get_customer_emails(self, customer_id: int) -> List[Email]:
        """Get all emails for a specific customer"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM emails 
                WHERE customer_id = ? 
                ORDER BY date DESC
            ''', (customer_id,))
            
            emails = []
            for row in cursor.fetchall():
                emails.append(Email(
                    id=row[0], customer_id=row[1], message_id=row[2],
                    thread_id=row[3], subject=row[4], sender=row[5],
                    recipient=row[6], date=row[7], body=row[8],
                    direction=row[9], created_at=row[10]
                ))
            
            return emails
    
    def get_all_emails(self) -> List[Email]:
        """Get all emails"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM emails ORDER BY date DESC')
            
            emails = []
            for row in cursor.fetchall():
                emails.append(Email(
                    id=row[0], customer_id=row[1], message_id=row[2],
                    thread_id=row[3], subject=row[4], sender=row[5],
                    recipient=row[6], date=row[7], body=row[8],
                    direction=row[9], created_at=row[10]
                ))
            
            return emails
    
    def link_emails_to_customers(self):
        """Link existing emails to customers based on email addresses"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get all emails without customer_id
            cursor.execute('SELECT * FROM emails WHERE customer_id IS NULL')
            unlinked_emails = cursor.fetchall()
            
            linked_count = 0
            for email_row in unlinked_emails:
                email_id = email_row[0]
                sender = email_row[5]
                recipient = email_row[6]
                
                # Try to find customer by sender or recipient email
                customer = None
                if sender:
                    customer = self.get_customer_by_email(sender)
                if not customer and recipient:
                    customer = self.get_customer_by_email(recipient)
                
                if customer:
                    cursor.execute(
                        'UPDATE emails SET customer_id = ? WHERE id = ?',
                        (customer.id, email_id)
                    )
                    linked_count += 1
            
            conn.commit()
            logger.info(f"Linked {linked_count} emails to customers")
            return linked_count
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Count customers
            cursor.execute('SELECT COUNT(*) FROM customers')
            customer_count = cursor.fetchone()[0]
            
            # Count emails
            cursor.execute('SELECT COUNT(*) FROM emails')
            email_count = cursor.fetchone()[0]
            
            # Count linked emails
            cursor.execute('SELECT COUNT(*) FROM emails WHERE customer_id IS NOT NULL')
            linked_email_count = cursor.fetchone()[0]
            
            # Get status distribution
            cursor.execute('''
                SELECT status, COUNT(*) FROM customers 
                GROUP BY status
            ''')
            status_distribution = dict(cursor.fetchall())
            
            return {
                'customer_count': customer_count,
                'email_count': email_count,
                'linked_email_count': linked_email_count,
                'status_distribution': status_distribution,
                'database_path': self.db_path
            }

# Global database instance
crm_db = CRMDatabase() 