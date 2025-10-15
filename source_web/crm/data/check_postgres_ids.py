#!/usr/bin/env python3
"""
Check available employee and client IDs in postgres database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from routers.crm_data_router import get_db_connection

def check_postgres_ids():
    """Check available employee and client IDs"""
    try:
        print("🔍 Checking available IDs in postgres database...")
        # Connect to postgres database using authenticated user
        conn = get_db_connection("mark@preludeos.com")  # This should route to postgres
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check employee IDs
        cursor.execute("SELECT employee_id, name FROM employee_info ORDER BY employee_id LIMIT 10")
        employees = cursor.fetchall()
        print(f"\n👥 Available employees ({len(employees)}):")
        for emp in employees:
            print(f"  - ID {emp['employee_id']}: {emp['name']}")
        
        # Check client IDs  
        cursor.execute("SELECT client_id, name FROM clients_info ORDER BY client_id LIMIT 10")
        clients = cursor.fetchall()
        print(f"\n🏢 Available clients ({len(clients)}):")
        for client in clients:
            print(f"  - ID {client['client_id']}: {client['name']}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error checking postgres IDs: {e}")

if __name__ == "__main__":
    check_postgres_ids()