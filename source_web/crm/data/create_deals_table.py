#!/usr/bin/env python3
"""
Create the deals table in the PostgreSQL database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2.extras import RealDictCursor
from routers.crm_data_router import get_db_connection


def create_deals_table():
    """Create the deals table in both user_database and postgres"""
    
    # Create in user_database
    try:
        print("🚀 Creating deals table in user_database...")
        # Connect to user_database 
        conn = get_db_connection("")  # Empty string uses fallback to user_database
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Create the deals table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS deals (
            deal_id INTEGER PRIMARY KEY,
            deal_name VARCHAR(255) NOT NULL,
            description TEXT,
            value_usd NUMERIC(12, 2) DEFAULT 0.00,
            stage VARCHAR(50) DEFAULT 'qualification',
            employee_id INTEGER,
            client_id INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            completion_time TIMESTAMP WITH TIME ZONE,
            last_contact_date DATE,
            expected_close_date DATE,
            FOREIGN KEY (employee_id) REFERENCES employee_info(employee_id),
            FOREIGN KEY (client_id) REFERENCES clients_info(client_id)
        );
        """
        
        cursor.execute(create_table_sql)
        
        # Create indexes for better performance
        index_sql = [
            "CREATE INDEX IF NOT EXISTS idx_deals_employee_id ON deals(employee_id);",
            "CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);",
            "CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);",
            "CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);",
        ]
        
        for sql in index_sql:
            cursor.execute(sql)
        
        # Commit the changes
        conn.commit()
        
        print("✅ Deals table created successfully!")
        
        # Insert some sample deals
        print("📝 Inserting sample deals...")
        
        sample_deals = [
            {
                'deal_id': 1,
                'deal_name': 'Enterprise Software License',
                'description': 'Large enterprise software licensing deal for Q4',
                'value_usd': 250000.00,
                'stage': 'negotiation',
                'employee_id': 1001,
                'client_id': 2001,
                'expected_close_date': '2024-02-15',
                'last_contact_date': '2024-01-10'
            },
            {
                'deal_id': 2,
                'deal_name': 'Cloud Migration Project',
                'description': 'Complete cloud infrastructure migration',
                'value_usd': 180000.00,
                'stage': 'proposal',
                'employee_id': 1002,
                'client_id': 2003,
                'expected_close_date': '2024-03-01',
                'last_contact_date': '2024-01-09'
            },
            {
                'deal_id': 3,
                'deal_name': 'Annual Support Contract',
                'description': 'Yearly support and maintenance contract',
                'value_usd': 95000.00,
                'stage': 'qualification',
                'employee_id': 1003,
                'client_id': 2005,
                'expected_close_date': '2024-03-15',
                'last_contact_date': '2024-01-08'
            }
        ]
        
        for deal in sample_deals:
            insert_sql = """
            INSERT INTO deals (
                deal_id, deal_name, description, value_usd, stage, 
                employee_id, client_id, expected_close_date, last_contact_date
            ) VALUES (
                %(deal_id)s, %(deal_name)s, %(description)s, %(value_usd)s, %(stage)s,
                %(employee_id)s, %(client_id)s, %(expected_close_date)s, %(last_contact_date)s
            ) ON CONFLICT (deal_id) DO NOTHING;
            """
            
            cursor.execute(insert_sql, deal)
        
        conn.commit()
        
        # Check if data was inserted
        cursor.execute("SELECT COUNT(*) as count FROM deals")
        count = cursor.fetchone()
        print(f"✅ Sample deals inserted! Total deals in database: {count['count']}")
        
        cursor.close()
        conn.close()
        
        print("✅ user_database deals table setup completed!")
        
    except Exception as e:
        print(f"❌ Error creating deals table in user_database: {e}")
        # Continue to postgres database
    
    # Create in postgres database  
    try:
        print("🚀 Creating deals table in postgres database...")
        # Connect to postgres database using authenticated user
        conn = get_db_connection("mark@preludeos.com")  # This should route to postgres
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Create the deals table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS deals (
            deal_id INTEGER PRIMARY KEY,
            deal_name VARCHAR(255) NOT NULL,
            description TEXT,
            value_usd NUMERIC(12, 2) DEFAULT 0.00,
            stage VARCHAR(50) DEFAULT 'qualification',
            employee_id INTEGER,
            client_id INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            completion_time TIMESTAMP WITH TIME ZONE,
            last_contact_date DATE,
            expected_close_date DATE
        );
        """
        
        cursor.execute(create_table_sql)
        
        # Create indexes for better performance
        index_sql = [
            "CREATE INDEX IF NOT EXISTS idx_deals_employee_id ON deals(employee_id);",
            "CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);",
            "CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);",
            "CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);",
        ]
        
        for sql in index_sql:
            cursor.execute(sql)
        
        # Commit the changes
        conn.commit()
        
        print("✅ postgres deals table created successfully!")
        
        # Insert some sample deals
        print("📝 Inserting sample deals into postgres...")
        
        sample_deals = [
            {
                'deal_id': 1,
                'deal_name': 'Enterprise Software License',
                'description': 'Large enterprise software licensing deal for Q4',
                'value_usd': 250000.00,
                'stage': 'negotiation',
                'employee_id': 1001,
                'client_id': 2001,
                'expected_close_date': '2024-02-15',
                'last_contact_date': '2024-01-10'
            },
            {
                'deal_id': 2,
                'deal_name': 'Cloud Migration Project',
                'description': 'Complete cloud infrastructure migration',
                'value_usd': 180000.00,
                'stage': 'proposal',
                'employee_id': 1002,
                'client_id': 2003,
                'expected_close_date': '2024-03-01',
                'last_contact_date': '2024-01-09'
            },
            {
                'deal_id': 3,
                'deal_name': 'Annual Support Contract',
                'description': 'Yearly support and maintenance contract',
                'value_usd': 95000.00,
                'stage': 'qualification',
                'employee_id': 1003,
                'client_id': 2005,
                'expected_close_date': '2024-03-15',
                'last_contact_date': '2024-01-08'
            }
        ]
        
        for deal in sample_deals:
            insert_sql = """
            INSERT INTO deals (
                deal_id, deal_name, description, value_usd, stage, 
                employee_id, client_id, expected_close_date, last_contact_date
            ) VALUES (
                %(deal_id)s, %(deal_name)s, %(description)s, %(value_usd)s, %(stage)s,
                %(employee_id)s, %(client_id)s, %(expected_close_date)s, %(last_contact_date)s
            ) ON CONFLICT (deal_id) DO NOTHING;
            """
            
            cursor.execute(insert_sql, deal)
        
        conn.commit()
        
        # Check if data was inserted
        cursor.execute("SELECT COUNT(*) as count FROM deals")
        count = cursor.fetchone()
        print(f"✅ Sample deals inserted into postgres! Total deals: {count['count']}")
        
        cursor.close()
        conn.close()
        
        print("🎉 Both databases deals table setup completed!")
        
    except Exception as e:
        print(f"❌ Error creating deals table in postgres: {e}")
        print("This might be expected if postgres database doesn't have the required tables")

if __name__ == "__main__":
    create_deals_table()