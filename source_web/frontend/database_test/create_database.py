#!/usr/bin/env python3
"""
PostgreSQL Database Creator Script
==================================

This script creates a new PostgreSQL database with a user_profiles table.
The table includes columns for email (unique key), company, and role.

Usage:
    python create_database.py

Environment Variables Required:
    DATABASE_URL or individual DB connection parameters
"""

import os
import sys
import logging
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseCreator:
    """Creates and initializes PostgreSQL database with user_profiles table."""
    
    def __init__(self):
        """Initialize database creator with connection parameters."""
        self.db_config = self._load_config()
        self.database_name = "prelude_user_management"
        self.table_name = "user_informations"
    
    def _load_config(self) -> dict:
        """Load database configuration from environment variables."""
        database_url = os.getenv('DATABASE_URL')
        
        if database_url:
            # Parse DATABASE_URL
            import urllib.parse as urlparse
            parsed = urlparse.urlparse(database_url)
            return {
                'host': parsed.hostname,
                'port': parsed.port or 5432,
                'user': parsed.username,
                'password': parsed.password,
                'database': parsed.path[1:] if parsed.path.startswith('/') else parsed.path  # Remove leading /
            }
        else:
            # Use Google Cloud PostgreSQL configuration (same as database_reader.py)
            return {
                'host': os.getenv('SESSIONS_DB_HOST', '35.193.231.128'),
                'port': int(os.getenv('SESSIONS_DB_PORT', 5432)),
                'user': os.getenv('SESSIONS_DB_USER', 'postgres'),
                'password': os.getenv('SESSIONS_DB_PASSWORD', 'llLCr(({L_{81c2A'),
                'database': os.getenv('SESSIONS_DB_NAME', 'postgres')  # Connect to default database first
            }
    
    def create_database(self) -> bool:
        """Create the new database if it doesn't exist."""
        try:
            # Connect to default database (usually 'postgres') to create new database
            conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database=self.db_config['database']
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            cursor = conn.cursor()
            
            # Check if database already exists
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (self.database_name,)
            )
            
            if cursor.fetchone():
                logger.info(f"✅ Database '{self.database_name}' already exists")
            else:
                # Create new database
                cursor.execute(f'CREATE DATABASE "{self.database_name}"')
                logger.info(f"✅ Created database '{self.database_name}'")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create database: {e}")
            return False
    
    def create_table(self) -> bool:
        """Create the user_profiles table in the new database."""
        try:
            # Connect to the new database
            conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database=self.database_name
            )
            
            cursor = conn.cursor()
            
            # First, create the table if it doesn't exist (basic version)
            create_table_sql = f"""
            CREATE TABLE IF NOT EXISTS {self.table_name} (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                company VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            cursor.execute(create_table_sql)
            
            # Check what columns exist and add missing ones
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s 
                ORDER BY ordinal_position
            """, (self.table_name,))
            
            existing_columns = [row[0] for row in cursor.fetchall()]
            logger.info(f"📋 Existing columns: {', '.join(existing_columns)}")
            
            # Add missing columns
            if 'database_name' not in existing_columns:
                logger.info("➕ Adding database_name column...")
                cursor.execute(f"""
                    ALTER TABLE {self.table_name} 
                    ADD COLUMN database_name VARCHAR(255) DEFAULT 'default_db'
                """)
                # Update existing rows with default values
                cursor.execute(f"""
                    UPDATE {self.table_name} 
                    SET database_name = CASE 
                        WHEN email LIKE '%@prelude.com' THEN 'prelude_main_db'
                        WHEN email LIKE '%@techcorp.com' THEN 'techcorp_dev_db'
                        WHEN email LIKE '%@consulting.com' THEN 'consulting_client_db'
                        WHEN email LIKE '%@startup.io' THEN 'startup_core_db'
                        WHEN email LIKE '%@enterprise.com' THEN 'enterprise_pm_db'
                        ELSE 'default_db'
                    END
                    WHERE database_name = 'default_db'
                """)
                # Now make it NOT NULL
                cursor.execute(f"ALTER TABLE {self.table_name} ALTER COLUMN database_name SET NOT NULL")
            
            if 'level' not in existing_columns:
                logger.info("➕ Adding level column...")
                cursor.execute(f"""
                    ALTER TABLE {self.table_name} 
                    ADD COLUMN level INTEGER DEFAULT 1
                """)
                # Update existing rows with role-based levels
                cursor.execute(f"""
                    UPDATE {self.table_name} 
                    SET level = CASE 
                        WHEN role ILIKE '%administrator%' OR role ILIKE '%admin%' THEN 5
                        WHEN role ILIKE '%cto%' OR role ILIKE '%chief%' THEN 4
                        WHEN role ILIKE '%senior%' OR role ILIKE '%manager%' THEN 3
                        WHEN role ILIKE '%developer%' OR role ILIKE '%analyst%' THEN 2
                        ELSE 1
                    END
                    WHERE level = 1
                """)
                # Now make it NOT NULL
                cursor.execute(f"ALTER TABLE {self.table_name} ALTER COLUMN level SET NOT NULL")
            
            # Create indexes for better performance
            cursor.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_user_informations_email 
                    ON {self.table_name}(email);
                CREATE INDEX IF NOT EXISTS idx_user_informations_company 
                    ON {self.table_name}(company);
                CREATE INDEX IF NOT EXISTS idx_user_informations_role 
                    ON {self.table_name}(role);
                CREATE INDEX IF NOT EXISTS idx_user_informations_database_name 
                    ON {self.table_name}(database_name);
                CREATE INDEX IF NOT EXISTS idx_user_informations_level 
                    ON {self.table_name}(level);
            """)
            
            # Create trigger to update updated_at timestamp
            cursor.execute(f"""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
                
                DROP TRIGGER IF EXISTS update_user_informations_updated_at 
                    ON {self.table_name};
                CREATE TRIGGER update_user_informations_updated_at
                    BEFORE UPDATE ON {self.table_name}
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            """)
            conn.commit()
            
            logger.info(f"✅ Created table '{self.table_name}' with required columns")
            logger.info("   📋 Columns: id, email (unique), company, role, database_name, level (int), created_at, updated_at")
            
            # Insert some sample data
            self._insert_sample_data(cursor, conn)
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create table: {e}")
            return False
    
    def _insert_sample_data(self, cursor, conn):
        """Insert sample data into the user_profiles table."""
        try:
            # Check current row count first
            cursor.execute(f"SELECT COUNT(*) FROM {self.table_name}")
            current_count = cursor.fetchone()[0]
            
            if current_count == 0:
                logger.info("📊 Table is empty, inserting sample data...")
                sample_data = [
                    ('admin@prelude.com', 'Prelude Technologies', 'Administrator', 'prelude_main_db', 5),
                    ('john.doe@techcorp.com', 'TechCorp Inc', 'Developer', 'techcorp_dev_db', 2),
                    ('jane.smith@consulting.com', 'Consulting Group', 'Senior Consultant', 'consulting_client_db', 3),
                    ('mike.wilson@startup.io', 'Startup Solutions', 'CTO', 'startup_core_db', 4),
                    ('sarah.brown@enterprise.com', 'Enterprise Systems', 'Project Manager', 'enterprise_pm_db', 3)
                ]
                
                insert_sql = f"""
                INSERT INTO {self.table_name} (email, company, role, database_name, level)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (email) DO NOTHING
                """
                
                cursor.executemany(insert_sql, sample_data)
                conn.commit()
                
                # Check how many rows were inserted
                cursor.execute(f"SELECT COUNT(*) FROM {self.table_name}")
                row_count = cursor.fetchone()[0]
                
                logger.info(f"📊 Sample data inserted. Total rows in table: {row_count}")
            else:
                logger.info(f"📊 Table already has {current_count} rows, skipping sample data insertion")
            
        except Exception as e:
            logger.warning(f"⚠️  Failed to insert sample data: {e}")
    
    def get_connection_string(self) -> str:
        """Get the connection string for the new database."""
        return (
            f"postgresql://{self.db_config['user']}:{self.db_config['password']}"
            f"@{self.db_config['host']}:{self.db_config['port']}/{self.database_name}"
        )
    
    def verify_setup(self) -> bool:
        """Verify that the database and table were created successfully."""
        try:
            conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database=self.database_name
            )
            
            cursor = conn.cursor()
            
            # Check table exists and get structure
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position
            """, (self.table_name,))
            
            columns = cursor.fetchall()
            
            if not columns:
                logger.error(f"❌ Table '{self.table_name}' not found")
                return False
            
            logger.info(f"✅ Table structure verified:")
            for col in columns:
                logger.info(f"   📋 {col[0]} ({col[1]}) - Nullable: {col[2]}")
            
            # Check row count
            cursor.execute(f"SELECT COUNT(*) FROM {self.table_name}")
            row_count = cursor.fetchone()[0]
            logger.info(f"📊 Total rows: {row_count}")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ Verification failed: {e}")
            return False

def main():
    """Main function to create database and table."""
    print("🚀 PostgreSQL Database Creator")
    print("=" * 40)
    
    try:
        print("🔧 Initializing database creator...")
        creator = DatabaseCreator()
        
        # Show configuration (safely)
        print(f"📊 Target database: {creator.database_name}")
        print(f"📋 Target table: {creator.table_name}")
        print(f"🔗 Host: {creator.db_config.get('host', 'unknown')}")
        print(f"🔌 Port: {creator.db_config.get('port', 'unknown')}")
        print(f"👤 User: {creator.db_config.get('user', 'unknown')}")
        print(f"🗄️  Default DB: {creator.db_config.get('database', 'unknown')}")
        
        # Step 1: Create database
        print("\n📦 Step 1: Creating database...")
        if not creator.create_database():
            print("❌ Failed to create database")
            return False
        
        # Step 2: Create table
        print("\n📋 Step 2: Creating table...")
        if not creator.create_table():
            print("❌ Failed to create table")
            return False
        
        # Step 3: Verify setup
        print("\n🔍 Step 3: Verifying setup...")
        if not creator.verify_setup():
            print("❌ Verification failed")
            return False
        
        # Success message
        print("\n" + "=" * 40)
        print("✅ Database setup completed successfully!")
        print(f"📊 Database: {creator.database_name}")
        print(f"📋 Table: {creator.table_name}")
        print(f"🔗 Connection: {creator.get_connection_string()}")
        print("\n💡 You can now use the other scripts:")
        print("   - read_database.py (to read all rows)")
        print("   - add_row.py (to add new rows)")
        print("=" * 40)
        
        return True
        
    except Exception as e:
        print(f"❌ Critical error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)