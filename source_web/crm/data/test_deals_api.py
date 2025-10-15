#!/usr/bin/env python3
"""
Test the deals API endpoint directly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from routers.crm_data_router import get_db_connection
import traceback

def test_deals_query():
    """Test the deals query directly"""
    try:
        print("🔍 Testing deals query directly...")
        # Connect to postgres database using authenticated user
        conn = get_db_connection("mark@preludeos.com")
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            d.deal_id,
            d.deal_name,
            d.description,
            d.value_usd,
            d.stage,
            d.employee_id,
            d.client_id,
            d.created_at,
            d.updated_at,
            d.completion_time,
            d.last_contact_date,
            d.expected_close_date,
            e.name as salesman_name,
            c.name as client_name
        FROM deals d
        LEFT JOIN employee_info e ON d.employee_id = e.employee_id
        LEFT JOIN clients_info c ON d.client_id = c.client_id
        ORDER BY d.created_at DESC
        """
        
        cursor.execute(query)
        deals_data = cursor.fetchall()
        
        print(f"✅ Found {len(deals_data)} deals")
        
        for deal_data in deals_data:
            print(f"\n📋 Deal ID {deal_data['deal_id']}:")
            print(f"  - Name: {deal_data['deal_name']}")
            print(f"  - Stage: {deal_data['stage']}")
            print(f"  - Value: ${deal_data['value_usd']}")
            print(f"  - Salesman: {deal_data.get('salesman_name', 'Unknown')}")
            print(f"  - Client: {deal_data.get('client_name', 'Unknown')}")
            print(f"  - Created: {deal_data['created_at']}")
            print(f"  - Employee ID: {deal_data['employee_id']}")
            print(f"  - Client ID: {deal_data['client_id']}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error testing deals query: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_deals_query()