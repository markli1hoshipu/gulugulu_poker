#!/usr/bin/env python3
"""
Seed Test Customers Script
Adds 10 test customers to the database for development and testing
"""

import os
import sys
import logging
from datetime import datetime, timedelta

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Environment variables should be set externally (via run.sh or system)
# This matches main.py behavior which doesn't load .env file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from data.customer_database import customer_db, Customer

# Test customer data
TEST_CUSTOMERS = [
    {
        "name": "John Smith",
        "email": "john.smith@techcorp.com",
        "company": "TechCorp Solutions",
        "phone": "+1 (555) 123-4567",
        "position": "CEO",
        "industry": "Technology",
        "arr": 150000.0,
        "status": "customer",
        "funnel_stage": "closed",
        "last_contact_date": "2025-01-05",
        "notes": "Large enterprise client, very satisfied with our services"
    },
    {
        "name": "Sarah Johnson",
        "email": "sarah.johnson@innovatelab.com",
        "company": "Innovation Labs",
        "phone": "+1 (555) 234-5678", 
        "position": "CTO",
        "industry": "Software",
        "arr": 95000.0,
        "status": "customer",
        "funnel_stage": "closed",
        "last_contact_date": "2025-01-03",
        "notes": "Tech-forward company, interested in API integrations"
    },
    {
        "name": "Michael Chen",
        "email": "m.chen@dataflow.com",
        "company": "DataFlow Analytics",
        "phone": "+1 (555) 345-6789",
        "position": "VP of Engineering", 
        "industry": "Analytics",
        "arr": 75000.0,
        "status": "qualified",
        "funnel_stage": "proposal",
        "last_contact_date": "2025-01-02",
        "notes": "Evaluating our platform against competitors, price-sensitive"
    },
    {
        "name": "Emily Rodriguez",
        "email": "emily.r@cloudscale.io",
        "company": "CloudScale Systems",
        "phone": "+1 (555) 456-7890",
        "position": "Product Manager",
        "industry": "Cloud Services",
        "arr": 120000.0,
        "status": "lead",
        "funnel_stage": "qualified",
        "last_contact_date": "2024-12-28",
        "notes": "Growing startup, needs scalable solution for Q2 launch"
    },
    {
        "name": "David Park",
        "email": "david.park@fintech.co",
        "company": "FinTech Innovations",
        "phone": "+1 (555) 567-8901",
        "position": "Director of Technology",
        "industry": "Financial Services",
        "arr": 200000.0,
        "status": "prospect",
        "funnel_stage": "lead",
        "last_contact_date": "2024-12-20",
        "notes": "High-value prospect, requires compliance certifications"
    },
    {
        "name": "Lisa Wang",
        "email": "lisa.wang@healthtech.com",
        "company": "HealthTech Solutions",
        "phone": "+1 (555) 678-9012",
        "position": "COO",
        "industry": "Healthcare",
        "arr": 85000.0,
        "status": "lead",
        "funnel_stage": "qualified",
        "last_contact_date": "2024-12-15",
        "notes": "Healthcare industry compliance requirements, HIPAA focused"
    },
    {
        "name": "Robert Taylor",
        "email": "robert.taylor@manufacturing.com",
        "company": "Advanced Manufacturing Corp",
        "phone": "+1 (555) 789-0123",
        "position": "IT Director",
        "industry": "Manufacturing",
        "arr": 65000.0,
        "status": "prospect",
        "funnel_stage": "lead",
        "last_contact_date": "2024-12-10",
        "notes": "Traditional industry, needs extensive training and support"
    },
    {
        "name": "Jessica Adams",
        "email": "j.adams@retailtech.com",
        "company": "RetailTech Dynamics",
        "phone": "+1 (555) 890-1234",
        "position": "Head of Digital",
        "industry": "Retail",
        "arr": 45000.0,
        "status": "qualified",
        "funnel_stage": "proposal",
        "last_contact_date": "2024-12-05",
        "notes": "Retail modernization project, seasonal usage patterns"
    },
    {
        "name": "Mark Thompson",
        "email": "mark.t@education.org",
        "company": "EduTech Solutions",
        "phone": "+1 (555) 901-2345",
        "position": "Technology Coordinator",
        "industry": "Education",
        "arr": 30000.0,
        "status": "lead",
        "funnel_stage": "qualified",
        "last_contact_date": "2024-11-30",
        "notes": "Educational institution, budget constraints, annual renewal cycle"
    },
    {
        "name": "Amanda Foster",
        "email": "amanda.foster@nonprofit.org",
        "company": "Global Impact Foundation",
        "phone": "+1 (555) 012-3456",
        "position": "Operations Manager",
        "industry": "Non-Profit",
        "arr": 25000.0,
        "status": "prospect",
        "funnel_stage": "lead",
        "last_contact_date": "2024-11-25",
        "notes": "Non-profit organization, looking for discounted pricing"
    }
]

def seed_customers():
    """Add test customers to the database"""
    try:
        logger.info("Starting to seed test customers...")
        
        added_count = 0
        for customer_data in TEST_CUSTOMERS:
            try:
                # Create Customer object
                customer = Customer(
                    name=customer_data["name"],
                    email=customer_data["email"],
                    company=customer_data["company"],
                    phone=customer_data["phone"],
                    position=customer_data["position"],
                    industry=customer_data["industry"],
                    arr=customer_data["arr"],
                    status=customer_data["status"],
                    funnel_stage=customer_data["funnel_stage"],
                    last_contact_date=customer_data["last_contact_date"],
                    notes=customer_data["notes"]
                )
                
                # Add to database
                customer_id = customer_db.add_customer(customer)
                logger.info(f"✅ Added customer: {customer.name} (ID: {customer_id})")
                added_count += 1
                
            except Exception as e:
                if "duplicate key value violates unique constraint" in str(e).lower():
                    logger.warning(f"⚠️  Customer {customer_data['name']} already exists (email: {customer_data['email']})")
                else:
                    logger.error(f"❌ Failed to add customer {customer_data['name']}: {e}")
        
        logger.info(f"🎉 Successfully added {added_count} test customers!")
        
        # Display summary
        all_customers = customer_db.get_all_customers()
        logger.info(f"📊 Total customers in database: {len(all_customers)}")
        
        return added_count
        
    except Exception as e:
        logger.error(f"Failed to seed customers: {e}")
        raise

def main():
    """Main function"""
    logger.info("🌱 Seeding test customers...")
    added_count = seed_customers()
    logger.info(f"✨ Seeding complete! Added {added_count} customers.")

if __name__ == "__main__":
    main() 