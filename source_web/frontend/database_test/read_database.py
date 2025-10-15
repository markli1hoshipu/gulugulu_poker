#!/usr/bin/env python3
"""
Database Reader Script
======================

This script reads and displays all rows from the user_profiles table
in the PostgreSQL database created by create_database.py.

Usage:
    python read_database.py

Environment Variables Required:
    DATABASE_URL or individual DB connection parameters
"""

import os
import sys
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseReader:
    """Reads and displays data from user_profiles table."""
    
    def __init__(self):
        """Initialize database reader with connection parameters."""
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
    
    def read_all_rows(self) -> List[Dict[str, Any]]:
        """Read all rows from user_profiles table."""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            # Read all rows
            cursor.execute(f"""
                SELECT id, email, company, role, database_name, level, created_at, updated_at
                FROM {self.table_name}
                ORDER BY id
            """)
            
            rows = cursor.fetchall()
            cursor.close()
            
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"❌ Failed to read rows: {e}")
            return []
    
    def get_table_stats(self) -> Dict[str, Any]:
        """Get statistics about the table."""
        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) as total_rows FROM {self.table_name}")
            total_rows = cursor.fetchone()['total_rows']
            
            # Get unique companies
            cursor.execute(f"SELECT COUNT(DISTINCT company) as unique_companies FROM {self.table_name}")
            unique_companies = cursor.fetchone()['unique_companies']
            
            # Get unique roles
            cursor.execute(f"SELECT COUNT(DISTINCT role) as unique_roles FROM {self.table_name}")
            unique_roles = cursor.fetchone()['unique_roles']
            
            # Get latest entry
            cursor.execute(f"""
                SELECT created_at 
                FROM {self.table_name} 
                ORDER BY created_at DESC 
                LIMIT 1
            """)
            latest_result = cursor.fetchone()
            latest_entry = latest_result['created_at'] if latest_result else None
            
            cursor.close()
            
            return {
                'total_rows': total_rows,
                'unique_companies': unique_companies,
                'unique_roles': unique_roles,
                'latest_entry': latest_entry
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get table stats: {e}")
            return {}
    
    def display_rows(self, rows: List[Dict[str, Any]]):
        """Display rows in a formatted table."""
        if not rows:
            print("📭 No rows found in the database.")
            return
        
        print(f"\n📊 USER INFORMATIONS TABLE ({len(rows)} rows)")
        print("=" * 140)
        
        # Header
        print(f"{'ID':<4} {'EMAIL':<30} {'COMPANY':<20} {'ROLE':<20} {'DATABASE':<25} {'LVL':<4} {'CREATED':<15}")
        print("-" * 140)
        
        # Rows
        for row in rows:
            # Format timestamp
            created_at = row.get('created_at', '')
            if isinstance(created_at, datetime):
                created_str = created_at.strftime('%Y-%m-%d')
            else:
                created_str = str(created_at)[:10] if created_at else ''
            
            # Truncate long values
            email = str(row.get('email', ''))[:29]
            company = str(row.get('company', ''))[:19]
            role = str(row.get('role', ''))[:19]
            database_name = str(row.get('database_name', ''))[:24]
            level = str(row.get('level', ''))[:3]
            
            print(f"{row.get('id', ''):<4} {email:<30} {company:<20} {role:<20} {database_name:<25} {level:<4} {created_str:<15}")
        
        print("=" * 140)
    
    def display_stats(self, stats: Dict[str, Any]):
        """Display table statistics."""
        if not stats:
            return
        
        print(f"\n📈 TABLE STATISTICS")
        print("-" * 30)
        print(f"Total Users: {stats.get('total_rows', 0)}")
        print(f"Unique Companies: {stats.get('unique_companies', 0)}")
        print(f"Unique Roles: {stats.get('unique_roles', 0)}")
        if stats.get('latest_entry'):
            latest = stats['latest_entry']
            if isinstance(latest, datetime):
                latest_str = latest.strftime('%Y-%m-%d %H:%M:%S')
            else:
                latest_str = str(latest)
            print(f"Latest Entry: {latest_str}")
        print("-" * 30)
    
    def close(self):
        """Close database connection."""
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
            logger.info("🔌 Database connection closed")

def main():
    """Main function to read and display database data."""
    print("📖 Database Reader - User Informations")
    print("=" * 45)
    
    reader = DatabaseReader()
    
    try:
        # Connect to database
        if not reader.connect():
            print("❌ Failed to connect to database")
            return False
        
        # Read all rows
        print("\n🔍 Reading all rows from user_profiles table...")
        rows = reader.read_all_rows()
        
        # Get statistics
        stats = reader.get_table_stats()
        
        # Display results
        reader.display_stats(stats)
        reader.display_rows(rows)
        
        # Additional information
        print(f"\n💡 Database: {reader.database_name}")
        print(f"📋 Table: {reader.table_name}")
        print(f"🔗 Host: {reader.db_config['host']}:{reader.db_config['port']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading database: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False
        
    finally:
        reader.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)