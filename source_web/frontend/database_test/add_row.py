#!/usr/bin/env python3
"""
Database Row Adder Script
=========================

This script adds a new row to the user_profiles table using local variables.
Modify the variables below to add your desired user information.

Usage:
    1. Edit the LOCAL VARIABLES section below
    2. Run: python add_row.py

Environment Variables Required:
    DATABASE_URL or individual DB connection parameters
"""

import os
import sys
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========================================
# LOCAL VARIABLES - MODIFY THESE TO ADD YOUR DATA
# ========================================

# User information to add to the database
USER_EMAIL = "mark@preludeos.com"
USER_COMPANY = "prelude"
USER_ROLE = "admin"
USER_DATABASE_NAME = "postgres"
USER_LEVEL = 10

# Alternative: You can also define multiple users to add at once
MULTIPLE_USERS = [
    {
        "email": "aoxue@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 9
    },
    {
        "email": "benjamin@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 9
    },
    {
        "email": "bohan@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 9
    },
    {
        "email": "bolin@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 9
    },
    {
        "email": "james@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 9
    },
    {
        "email": "prelude@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 7
    },
    {
        "email": "vincent@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 9
    },
    {
        "email": "mark@preludeos.com",
        "company": "prelude",
        "role": "admin",
        "database_name": "postgres",
        "level": 10
    }
]


# Set to True to add multiple users, False to add single user
ADD_MULTIPLE_USERS = False

# ========================================
# END OF LOCAL VARIABLES
# ========================================

class RowAdder:
    """Adds new rows to the user_profiles table."""
    
    def __init__(self):
        """Initialize row adder with connection parameters."""
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
            }
        else:
            # Use Google Cloud PostgreSQL configuration (same as database_reader.py)
            return {
                'host': os.getenv('SESSIONS_DB_HOST', '35.193.231.128'),
                'port': int(os.getenv('SESSIONS_DB_PORT', 5432)),
                'user': os.getenv('SESSIONS_DB_USER', 'postgres'),
                'password': os.getenv('SESSIONS_DB_PASSWORD', 'llLCr(({L_{81c2A'),
            }
    
    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database=self.database_name
            )
            logger.info(f"✅ Connected to database '{self.database_name}'")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            return False
    
    def add_single_row(self, email: str, company: str, role: str, database_name: str, level: int) -> bool:
        """Add a single row to the user_profiles table."""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            # Check if email already exists
            cursor.execute(f"""
                SELECT id, email FROM {self.table_name} 
                WHERE email = %s
            """, (email,))
            
            existing_user = cursor.fetchone()
            
            if existing_user:
                print(f"⚠️  User with email '{email}' already exists (ID: {existing_user['id']})")
                cursor.close()
                return False
            
            # Insert new row
            insert_sql = f"""
                INSERT INTO {self.table_name} (email, company, role, database_name, level)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, email, company, role, database_name, level, created_at
            """
            
            cursor.execute(insert_sql, (email, company, role, database_name, level))
            new_row = cursor.fetchone()
            
            self.conn.commit()
            cursor.close()
            
            # Display the added row
            print(f"✅ Successfully added new user:")
            print(f"   📧 Email: {new_row['email']}")
            print(f"   🏢 Company: {new_row['company']}")
            print(f"   👔 Role: {new_row['role']}")
            print(f"   🗄️  Database: {new_row['database_name']}")
            print(f"   📊 Level: {new_row['level']}")
            print(f"   🆔 ID: {new_row['id']}")
            print(f"   📅 Created: {new_row['created_at']}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to add row: {e}")
            self.conn.rollback()
            return False
    
    def add_multiple_rows(self, users: list) -> int:
        """Add multiple rows to the user_profiles table."""
        added_count = 0
        
        for i, user in enumerate(users, 1):
            print(f"\n➕ Adding user {i}/{len(users)}...")
            
            email = user.get('email', '')
            company = user.get('company', '')
            role = user.get('role', '')
            database_name = user.get('database_name', '')
            level = user.get('level', 1)
            
            if not email or not company or not role or not database_name:
                print(f"⚠️  Skipping user {i}: Missing required fields")
                continue
            
            if self.add_single_row(email, company, role, database_name, level):
                added_count += 1
        
        return added_count
    
    def get_current_count(self) -> int:
        """Get current number of rows in the table."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {self.table_name}")
            count = cursor.fetchone()[0]
            cursor.close()
            return count
        except Exception as e:
            logger.error(f"❌ Failed to get row count: {e}")
            return 0
    
    def display_recent_additions(self, limit: int = 5):
        """Display the most recently added rows."""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute(f"""
                SELECT id, email, company, role, database_name, level, created_at
                FROM {self.table_name}
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
            
            rows = cursor.fetchall()
            cursor.close()
            
            if rows:
                print(f"\n📊 {len(rows)} Most Recent Users:")
                print("-" * 120)
                for row in rows:
                    created_str = row['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                    print(f"ID {row['id']}: {row['email']} | {row['company']} | {row['role']} | {row['database_name']} | Lv.{row['level']} | {created_str}")
                print("-" * 120)
            
        except Exception as e:
            logger.error(f"❌ Failed to display recent additions: {e}")
    
    def close(self):
        """Close database connection."""
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
            logger.info("🔌 Database connection closed")

def validate_user_data(email: str, company: str, role: str, database_name: str, level: int) -> bool:
    """Validate user data before adding to database."""
    errors = []
    
    if not email or '@' not in email:
        errors.append("Invalid email address")
    
    if not company or len(company.strip()) < 2:
        errors.append("Company name must be at least 2 characters")
    
    if not role or len(role.strip()) < 2:
        errors.append("Role must be at least 2 characters")
    
    if not database_name or len(database_name.strip()) < 2:
        errors.append("Database name must be at least 2 characters")
    
    if not isinstance(level, int) or level < 1 or level > 10:
        errors.append("Level must be an integer between 1 and 10")
    
    if errors:
        print("❌ Validation errors:")
        for error in errors:
            print(f"   - {error}")
        return False
    
    return True

def main():
    """Main function to add row(s) to the database."""
    print("➕ Database Row Adder - User Informations")
    print("=" * 50)
    
    adder = RowAdder()
    
    try:
        # Connect to database
        if not adder.connect():
            print("❌ Failed to connect to database")
            return False
        
        # Get initial count
        initial_count = adder.get_current_count()
        print(f"📊 Current users in database: {initial_count}")
        
        # Add row(s)
        if ADD_MULTIPLE_USERS:
            print(f"\n🔄 Adding {len(MULTIPLE_USERS)} users...")
            added_count = adder.add_multiple_rows(MULTIPLE_USERS)
            print(f"\n✅ Successfully added {added_count}/{len(MULTIPLE_USERS)} users")
        else:
            print(f"\n➕ Adding single user...")
            print(f"   📧 Email: {USER_EMAIL}")
            print(f"   🏢 Company: {USER_COMPANY}")
            print(f"   👔 Role: {USER_ROLE}")
            print(f"   🗄️  Database: {USER_DATABASE_NAME}")
            print(f"   📊 Level: {USER_LEVEL}")
            
            # Validate data
            if not validate_user_data(USER_EMAIL, USER_COMPANY, USER_ROLE, USER_DATABASE_NAME, USER_LEVEL):
                print("❌ Please fix the validation errors and try again")
                return False
            
            success = adder.add_single_row(USER_EMAIL, USER_COMPANY, USER_ROLE, USER_DATABASE_NAME, USER_LEVEL)
            if not success:
                print("❌ Failed to add user")
                return False
        
        # Get final count
        final_count = adder.get_current_count()
        print(f"\n📊 Total users in database: {final_count}")
        
        # Display recent additions
        adder.display_recent_additions()
        
        print("\n💡 Use read_database.py to view all users")
        
        return True
        
    except Exception as e:
        print(f"❌ Error adding row(s): {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False
        
    finally:
        adder.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)