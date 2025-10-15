#!/usr/bin/env python3
"""
Manually add a test customer to prelude_panacea database
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
from datetime import datetime

def add_test_customer():
    """Add a test customer to prelude_panacea"""
    try:
        # Database connection
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

        # Get next client_id
        cursor.execute("SELECT COALESCE(MAX(client_id), 0) + 1 as next_id FROM clients_info")
        result = cursor.fetchone()
        client_id = result['next_id']

        print(f"🆔 Next client_id: {client_id}")

        # Customer data
        current_time = datetime.now()

        # Insert into clients_info
        cursor.execute("""
            INSERT INTO clients_info (
                client_id, name, primary_contact, email, phone, industry, location,
                preferred_language, source, status, created_at, updated_at, notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            client_id,
            'Manual Test Customer',
            'Test Contact',
            'manual.test@example.com',
            '1234567890',
            'Technology',
            'Test Location',
            'en',
            'manual',
            'active',
            current_time,
            current_time,
            'Manually created test customer'
        ))

        # Insert into clients_details with default values
        cursor.execute("""
            INSERT INTO clients_details (
                client_id, lifetime_value, monthly_recurring_revenue, health_score,
                churn_risk, satisfaction_score, upsell_potential, product_usage,
                tags, recent_activities, total_interactions, support_tickets,
                onboarding_complete, current_stage, progress, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            client_id,
            0.0,  # lifetime_value
            0.0,  # monthly_recurring_revenue
            75.0,  # health_score
            'low',  # churn_risk
            80.0,  # satisfaction_score
            'medium',  # upsell_potential
            '{}',  # product_usage (JSON)
            '["new-customer"]',  # tags (JSON array)
            '[]',  # recent_activities (JSON array)
            0,  # total_interactions
            0,  # support_tickets
            True,  # onboarding_complete
            'prospect',  # current_stage
            0,  # progress
            current_time,
            current_time
        ))

        conn.commit()

        print(f"✅ Successfully added customer with client_id={client_id}")
        print(f"   Name: Manual Test Customer")
        print(f"   Email: manual.test@example.com")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error adding customer: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    add_test_customer()
