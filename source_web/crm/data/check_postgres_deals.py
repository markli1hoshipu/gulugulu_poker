#!/usr/bin/env python3
"""
Check the deals table structure in postgres database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from routers.crm_data_router import get_db_connection

def check_postgres_deals():
    """Check the deals table structure in postgres"""
    try:
        print("🔍 Checking deals table in postgres database...")
        # Connect to postgres database using authenticated user
        conn = get_db_connection("mark@preludeos.com")  # This should route to postgres
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check table structure
        cursor.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'deals' 
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print(f"📋 Table structure ({len(columns)} columns):")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
        
        # Check constraints
        cursor.execute("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'deals';
        """)
        
        constraints = cursor.fetchall()
        print(f"\n🔒 Constraints ({len(constraints)}):")
        for constraint in constraints:
            print(f"  - {constraint['constraint_name']}: {constraint['constraint_type']}")
        
        # Check check constraints specifically
        cursor.execute("""
            SELECT c.constraint_name, c.check_clause
            FROM information_schema.check_constraints c
            JOIN information_schema.table_constraints tc ON c.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'deals';
        """)
        
        check_constraints = cursor.fetchall()
        print(f"\n✅ Check constraints ({len(check_constraints)}):")
        for check in check_constraints:
            print(f"  - {check['constraint_name']}: {check['check_clause']}")
        
        # Count existing deals
        cursor.execute("SELECT COUNT(*) as count FROM deals")
        count = cursor.fetchone()
        print(f"\n📊 Current deals count: {count['count']}")
        
        # Get sample deals if any exist
        cursor.execute("SELECT deal_id, deal_name, stage FROM deals LIMIT 5")
        samples = cursor.fetchall()
        if samples:
            print(f"\n📄 Sample deals:")
            for deal in samples:
                print(f"  - ID {deal['deal_id']}: {deal['deal_name']} (stage: {deal['stage']})")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error checking postgres deals table: {e}")

if __name__ == "__main__":
    check_postgres_deals()