#!/usr/bin/env python3
"""
Quick script to add a single mock deal to the database
"""

import sys
import os
import io

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def add_mock_deal():
    """Add a single mock deal to the database"""
    try:
        # Database connection config for prelude_panacea
        db_config = {
            'host': os.getenv('SESSIONS_DB_HOST', '35.193.231.128'),
            'port': int(os.getenv('SESSIONS_DB_PORT', 5432)),
            'user': os.getenv('SESSIONS_DB_USER', 'postgres'),
            'password': os.getenv('SESSIONS_DB_PASSWORD', 'llLCr(({L_{81c2A'),
            'database': 'prelude_panacea'  # Use prelude_panacea database
        }

        print(f"📝 Connecting to database: {db_config['database']}...")
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get next deal_id
        cursor.execute("SELECT COALESCE(MAX(deal_id), 0) + 1 as next_id FROM deals")
        result = cursor.fetchone()
        deal_id = result['next_id']

        # Mock deal data - stage must match CHECK constraint
        mock_deal = {
            'deal_id': deal_id,
            'deal_name': 'Mock Enterprise Deal',
            'description': 'Test deal for frontend validation',
            'value_usd': 150000.00,
            'stage': 'Qualified',  # Must be capitalized per CHECK constraint
            'employee_id': 1001,
            'client_id': 2,  # Test Company Manual (from prelude_panacea)
            'expected_close_date': '2024-12-31',
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }

        insert_sql = """
        INSERT INTO deals (
            deal_id, deal_name, description, value_usd, stage,
            employee_id, client_id, created_at, updated_at,
            expected_close_date
        ) VALUES (
            %(deal_id)s, %(deal_name)s, %(description)s, %(value_usd)s, %(stage)s,
            %(employee_id)s, %(client_id)s, %(created_at)s, %(updated_at)s,
            %(expected_close_date)s
        )
        """

        cursor.execute(insert_sql, mock_deal)
        conn.commit()

        print(f"✅ Successfully added mock deal with ID: {deal_id}")
        print(f"   Name: {mock_deal['deal_name']}")
        print(f"   Stage: {mock_deal['stage']}")
        print(f"   Value: ${mock_deal['value_usd']:,.2f}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error adding mock deal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    add_mock_deal()
