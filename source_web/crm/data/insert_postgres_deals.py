#!/usr/bin/env python3
"""
Insert valid sample deals into postgres database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from routers.crm_data_router import get_db_connection
from datetime import datetime

def insert_postgres_deals():
    """Insert valid sample deals into postgres database"""
    try:
        print("📝 Inserting valid sample deals into postgres...")
        # Connect to postgres database using authenticated user
        conn = get_db_connection("mark@preludeos.com")  # This should route to postgres
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Sample deals with correct stage values and valid IDs
        sample_deals = [
            {
                'deal_id': 1,
                'deal_name': 'Enterprise Software License',
                'description': 'Large enterprise software licensing deal for Q4',
                'value_usd': 250000.00,
                'stage': 'Negotiation',  # Capital N
                'employee_id': 1001,  # Bolin Wu
                'client_id': 101,     # Fortune Tech Corp
                'expected_close_date': '2024-02-15',
                'last_contact_date': '2024-01-10'
            },
            {
                'deal_id': 2,
                'deal_name': 'Cloud Migration Project',
                'description': 'Complete cloud infrastructure migration',
                'value_usd': 180000.00,
                'stage': 'Proposal',  # Capital P
                'employee_id': 10000001,  # Alice Smith
                'client_id': 102,         # Global Solutions Inc
                'expected_close_date': '2024-03-01',
                'last_contact_date': '2024-01-09'
            },
            {
                'deal_id': 3,
                'deal_name': 'Annual Support Contract',
                'description': 'Yearly support and maintenance contract',
                'value_usd': 95000.00,
                'stage': 'Qualified',  # Capital Q
                'employee_id': 10000005,  # Eva Brown
                'client_id': 103,         # Enterprise Dynamics
                'expected_close_date': '2024-03-15',
                'last_contact_date': '2024-01-08'
            }
        ]
        
        current_time = datetime.now()
        
        for deal in sample_deals:
            insert_sql = """
            INSERT INTO deals (
                deal_id, deal_name, description, value_usd, stage, 
                employee_id, client_id, created_at, updated_at,
                expected_close_date, last_contact_date
            ) VALUES (
                %(deal_id)s, %(deal_name)s, %(description)s, %(value_usd)s, %(stage)s,
                %(employee_id)s, %(client_id)s, %(created_at)s, %(updated_at)s,
                %(expected_close_date)s, %(last_contact_date)s
            ) ON CONFLICT (deal_id) DO UPDATE SET
                deal_name = EXCLUDED.deal_name,
                description = EXCLUDED.description,
                value_usd = EXCLUDED.value_usd,
                stage = EXCLUDED.stage,
                updated_at = EXCLUDED.updated_at;
            """
            
            deal['created_at'] = current_time
            deal['updated_at'] = current_time
            
            cursor.execute(insert_sql, deal)
            print(f"  ✅ Inserted/Updated deal: {deal['deal_name']}")
        
        conn.commit()
        
        # Check results
        cursor.execute("SELECT COUNT(*) as count FROM deals")
        count = cursor.fetchone()
        print(f"\n🎉 Total deals in postgres database: {count['count']}")
        
        # Show sample
        cursor.execute("SELECT deal_id, deal_name, stage, value_usd FROM deals ORDER BY deal_id")
        deals = cursor.fetchall()
        print(f"\n📋 All deals:")
        for deal in deals:
            print(f"  - ID {deal['deal_id']}: {deal['deal_name']} (stage: {deal['stage']}, value: ${deal['value_usd']:,.2f})")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error inserting deals into postgres: {e}")

if __name__ == "__main__":
    insert_postgres_deals()