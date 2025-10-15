#!/usr/bin/env python3
"""
Database Row Deleter Script
============================

This script deletes rows from the user_profiles table using local variables.
Modify the variables below to specify which user(s) to delete.

Usage:
    1. Edit the LOCAL VARIABLES section below
    2. Run: python delete_row.py

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
# LOCAL VARIABLES - MODIFY THESE TO DELETE YOUR DATA
# ========================================

# Email of user to delete from the database
USER_EMAIL_TO_DELETE = "prelude@preludeos.com"

# Alternative: You can also define multiple emails to delete at once
MULTIPLE_EMAILS_TO_DELETE = [
    "aoxue@preludeos.com",
    "benjamin@preludeos.com",
    "bohan@preludeos.com",
    "bolin@preludeos.com",
    "james@preludeos.com",
    "prelude@preludeos.com",
    "vincent@preludeos.com",
    "mark@preludeos.com"
]

# Set to True to delete multiple users, False to delete single user
DELETE_MULTIPLE_USERS = False

# Safety setting - require confirmation before deletion
REQUIRE_CONFIRMATION = True

# ========================================
# END OF LOCAL VARIABLES
# ========================================

class RowDeleter:
    """Deletes rows from the user_profiles table."""
    
    def __init__(self):
        """Initialize row deleter with connection parameters."""
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
    
    def get_user_by_email(self, email: str) -> dict:
        """Get user information by email before deletion."""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute(f"""
                SELECT id, email, company, role, database_name, level, created_at
                FROM {self.table_name} 
                WHERE email = %s
            """, (email,))
            
            user = cursor.fetchone()
            cursor.close()
            
            return dict(user) if user else None
            
        except Exception as e:
            logger.error(f"❌ Failed to get user by email: {e}")
            return None
    
    def delete_single_row(self, email: str) -> bool:
        """Delete a single row from the user_profiles table."""
        return self._delete_single_row_internal(email, skip_confirmation=False)
    
    def _delete_single_row_internal(self, email: str, skip_confirmation: bool = False) -> bool:
        """Internal method to delete a single row with optional confirmation skip."""
        try:
            # First, get the user information to display what will be deleted
            user_info = self.get_user_by_email(email)
            
            if not user_info:
                print(f"⚠️  User with email '{email}' not found in database")
                return False
            
            # Display user information
            print(f"🔍 Found user to delete:")
            print(f"   📧 Email: {user_info['email']}")
            print(f"   🏢 Company: {user_info['company']}")
            print(f"   👔 Role: {user_info['role']}")
            print(f"   🗄️  Database: {user_info['database_name']}")
            print(f"   📊 Level: {user_info['level']}")
            print(f"   🆔 ID: {user_info['id']}")
            print(f"   📅 Created: {user_info['created_at']}")
            
            # Confirmation check (skip for batch operations)
            if REQUIRE_CONFIRMATION and not skip_confirmation:
                response = input(f"\n⚠️  Are you sure you want to delete user '{email}'? (yes/no): ").lower().strip()
                if response not in ['yes', 'y']:
                    print("❌ Deletion cancelled by user")
                    return False
            
            cursor = self.conn.cursor()
            
            # Delete the row
            delete_sql = f"""
                DELETE FROM {self.table_name}
                WHERE email = %s
            """
            
            cursor.execute(delete_sql, (email,))
            deleted_count = cursor.rowcount
            
            self.conn.commit()
            cursor.close()
            
            if deleted_count > 0:
                print(f"✅ Successfully deleted user: {email}")
                return True
            else:
                print(f"⚠️  No user found with email: {email}")
                return False
            
        except Exception as e:
            logger.error(f"❌ Failed to delete row: {e}")
            self.conn.rollback()
            return False
    
    def delete_multiple_rows(self, emails: list) -> int:
        """Delete multiple rows from the user_profiles table."""
        deleted_count = 0
        
        # First, show all users that will be deleted
        print(f"\n🔍 Found {len(emails)} emails to process:")
        users_to_delete = []
        
        for email in emails:
            user_info = self.get_user_by_email(email)
            if user_info:
                users_to_delete.append(user_info)
                print(f"   ✓ {email} (ID: {user_info['id']}, Company: {user_info['company']}, Role: {user_info['role']})")
            else:
                print(f"   ✗ {email} (not found)")
        
        if not users_to_delete:
            print("❌ No valid users found to delete")
            return 0
        
        # Confirmation check for batch deletion
        if REQUIRE_CONFIRMATION:
            print(f"\n⚠️  You are about to delete {len(users_to_delete)} user(s)")
            response = input("Are you sure you want to proceed? (yes/no): ").lower().strip()
            if response not in ['yes', 'y']:
                print("❌ Batch deletion cancelled by user")
                return 0
        
        # Delete each user
        for i, email in enumerate(emails, 1):
            print(f"\n🗑️  Deleting user {i}/{len(emails)}...")
            
            if not email or '@' not in email:
                print(f"⚠️  Skipping invalid email: {email}")
                continue
            
            # For batch operations, pass a flag to skip confirmation
            if self._delete_single_row_internal(email, skip_confirmation=True):
                deleted_count += 1
        
        return deleted_count
    
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
    
    def display_recent_users(self, limit: int = 5):
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
                print(f"\n📊 {len(rows)} Most Recent Users (after deletion):")
                print("-" * 120)
                for row in rows:
                    created_str = row['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                    print(f"ID {row['id']}: {row['email']} | {row['company']} | {row['role']} | {row['database_name']} | Lv.{row['level']} | {created_str}")
                print("-" * 120)
            else:
                print("\n📊 No users found in database")
            
        except Exception as e:
            logger.error(f"❌ Failed to display recent users: {e}")
    
    def close(self):
        """Close database connection."""
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
            logger.info("🔌 Database connection closed")

def validate_email(email: str) -> bool:
    """Validate email format."""
    if not email or '@' not in email or len(email.strip()) < 5:
        print(f"❌ Invalid email format: {email}")
        return False
    return True

def main():
    """Main function to delete row(s) from the database."""
    print("🗑️  Database Row Deleter - User Informations")
    print("=" * 50)
    
    deleter = RowDeleter()
    
    try:
        # Connect to database
        if not deleter.connect():
            print("❌ Failed to connect to database")
            return False
        
        # Get initial count
        initial_count = deleter.get_current_count()
        print(f"📊 Current users in database: {initial_count}")
        
        # Delete row(s)
        if DELETE_MULTIPLE_USERS:
            print(f"\n🔄 Processing {len(MULTIPLE_EMAILS_TO_DELETE)} emails for deletion...")
            deleted_count = deleter.delete_multiple_rows(MULTIPLE_EMAILS_TO_DELETE)
            print(f"\n✅ Successfully deleted {deleted_count}/{len(MULTIPLE_EMAILS_TO_DELETE)} users")
        else:
            print(f"\n🗑️  Deleting single user...")
            print(f"   📧 Email: {USER_EMAIL_TO_DELETE}")
            
            # Validate email
            if not validate_email(USER_EMAIL_TO_DELETE):
                print("❌ Please fix the email format and try again")
                return False
            
            success = deleter.delete_single_row(USER_EMAIL_TO_DELETE)
            if not success:
                print("❌ Failed to delete user")
                return False
        
        # Get final count
        final_count = deleter.get_current_count()
        print(f"\n📊 Total users in database: {final_count}")
        print(f"📉 Users deleted: {initial_count - final_count}")
        
        # Display recent users
        deleter.display_recent_users()
        
        print("\n💡 Use read_database.py to view all remaining users")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting row(s): {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False
        
    finally:
        deleter.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)