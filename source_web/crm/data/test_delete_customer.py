#!/usr/bin/env python3
"""
Test deleting a customer from prelude_panacea database
"""

import sys
import os
import io

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import psycopg2
from psycopg2.extras import RealDictCursor

def test_delete_customer():
    """Test deleting customer with client_id = 9"""
    try:
        # Database connection config for prelude_panacea
        db_config = {
            'host': '35.193.231.128',
            'port': 5432,
            'user': 'postgres',
            'password': 'llLCr(({L_{81c2A',
            'database': 'prelude_panacea'
        }

        print(f"📝 Connecting to database: {db_config['database']}...")
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        customer_id = 9

        # First check if customer exists
        cursor.execute("SELECT client_id, name FROM clients_info WHERE client_id = %s", (customer_id,))
        result = cursor.fetchone()

        if not result:
            print(f"❌ Customer with client_id={customer_id} not found!")
            return

        print(f"✅ Found customer: client_id={result['client_id']}, name={result['name']}")
        print(f"🗑️  Deleting customer with client_id={customer_id}...")

        # Delete the customer
        cursor.execute("DELETE FROM clients_info WHERE client_id = %s", (customer_id,))
        deleted_count = cursor.rowcount
        conn.commit()

        print(f"✅ Successfully deleted {deleted_count} customer(s)")

        # Verify deletion
        cursor.execute("SELECT COUNT(*) as count FROM clients_info WHERE client_id = %s", (customer_id,))
        count = cursor.fetchone()['count']
        print(f"📊 Verification: {count} customers with client_id={customer_id} remain (should be 0)")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_delete_customer()
