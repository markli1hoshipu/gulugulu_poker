#!/usr/bin/env python3
"""
Database Connection Diagnostic Script
====================================

This script helps diagnose database connection issues by checking
environment variables and testing the connection step by step.

Usage:
    python diagnose_connection.py
"""

import os
import sys
import logging
import psycopg2
from typing import Dict, Any

# Configure logging to show everything
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_environment_variables() -> Dict[str, Any]:
    """Check and display all relevant environment variables."""
    print("🔍 CHECKING ENVIRONMENT VARIABLES")
    print("=" * 50)
    
    env_vars = {
        'DATABASE_URL': os.getenv('DATABASE_URL'),
        'DB_HOST': os.getenv('DB_HOST'),
        'DB_PORT': os.getenv('DB_PORT'),
        'DB_USER': os.getenv('DB_USER'),
        'DB_PASSWORD': os.getenv('DB_PASSWORD'),
        'DB_NAME': os.getenv('DB_NAME'),
        
        # Check Prelude platform variables too
        'CRM_DATABASE_URL': os.getenv('CRM_DATABASE_URL'),
        'SESSIONS_DB_HOST': os.getenv('SESSIONS_DB_HOST'),
        'SESSIONS_DB_PORT': os.getenv('SESSIONS_DB_PORT'),
        'SESSIONS_DB_USER': os.getenv('SESSIONS_DB_USER'),
        'SESSIONS_DB_PASSWORD': os.getenv('SESSIONS_DB_PASSWORD'),
        'SESSIONS_DB_NAME': os.getenv('SESSIONS_DB_NAME'),
    }
    
    found_vars = {}
    
    for var_name, value in env_vars.items():
        if value:
            if 'PASSWORD' in var_name or 'URL' in var_name:
                display_value = f"***{value[-8:] if len(value) > 8 else '***'}"
            else:
                display_value = value
            print(f"✅ {var_name}: {display_value}")
            found_vars[var_name] = value
        else:
            print(f"❌ {var_name}: Not set")
    
    print()
    return found_vars

def parse_database_url(database_url: str) -> Dict[str, Any]:
    """Parse DATABASE_URL and return connection parameters."""
    try:
        import urllib.parse as urlparse
        parsed = urlparse.urlparse(database_url)
        
        config = {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'user': parsed.username,
            'password': parsed.password,
            'database': parsed.path[1:] if parsed.path.startswith('/') else parsed.path
        }
        
        print("📋 PARSED DATABASE_URL:")
        print(f"   Host: {config['host']}")
        print(f"   Port: {config['port']}")
        print(f"   User: {config['user']}")
        print(f"   Password: ***{config['password'][-4:] if config['password'] and len(config['password']) > 4 else '***'}")
        print(f"   Database: {config['database']}")
        print()
        
        return config
        
    except Exception as e:
        print(f"❌ Error parsing DATABASE_URL: {e}")
        return {}

def get_connection_config(env_vars: Dict[str, Any]) -> Dict[str, Any]:
    """Determine the best connection configuration."""
    print("🔧 DETERMINING CONNECTION CONFIGURATION")
    print("=" * 50)
    
    # Try DATABASE_URL first
    if env_vars.get('DATABASE_URL'):
        print("Using DATABASE_URL...")
        return parse_database_url(env_vars['DATABASE_URL'])
    
    # Try CRM_DATABASE_URL
    elif env_vars.get('CRM_DATABASE_URL'):
        print("Using CRM_DATABASE_URL...")
        return parse_database_url(env_vars['CRM_DATABASE_URL'])
    
    # Try individual variables or use Google Cloud defaults
    else:
        print("Using Google Cloud PostgreSQL configuration (same as database_reader.py)...")
        config = {
            'host': env_vars.get('SESSIONS_DB_HOST') or '35.193.231.128',
            'port': int(env_vars.get('SESSIONS_DB_PORT') or 5432),
            'user': env_vars.get('SESSIONS_DB_USER') or 'postgres',
            'password': env_vars.get('SESSIONS_DB_PASSWORD') or 'llLCr(({L_{81c2A',
            'database': env_vars.get('SESSIONS_DB_NAME') or 'postgres'
        }
        
        print(f"   Host: {config['host']}")
        print(f"   Port: {config['port']}")
        print(f"   User: {config['user']}")
        print(f"   Password: {'***set***' if config['password'] else '***empty***'}")
        print(f"   Database: {config['database']}")
        print()
        
        return config

def test_connection(config: Dict[str, Any]) -> bool:
    """Test the database connection."""
    print("🔌 TESTING DATABASE CONNECTION")
    print("=" * 50)
    
    if not config:
        print("❌ No valid configuration found")
        return False
    
    try:
        print("Attempting to connect...")
        conn = psycopg2.connect(
            host=config['host'],
            port=config['port'],
            user=config['user'],
            password=config['password'],
            database=config['database']
        )
        
        print("✅ Connection successful!")
        
        # Test basic query
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"📊 PostgreSQL Version: {version}")
        
        # Check if we can create databases
        cursor.execute("""
            SELECT 1 FROM pg_database 
            WHERE has_database_privilege(current_user, datname, 'CREATE')
            LIMIT 1
        """)
        can_create = cursor.fetchone()
        
        if can_create:
            print("✅ User has CREATE DATABASE privileges")
        else:
            print("⚠️  User may not have CREATE DATABASE privileges")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Common solutions:")
        print("   - Check if PostgreSQL server is running")
        print("   - Verify host and port are correct")
        print("   - Check username and password")
        print("   - Ensure the database exists")
        print("   - Check firewall settings")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def suggest_fixes(env_vars: Dict[str, Any], connection_worked: bool):
    """Suggest fixes based on the diagnosis."""
    print("\n💡 SUGGESTED FIXES")
    print("=" * 50)
    
    if connection_worked:
        print("✅ Connection works! You can now run create_database.py")
        return
    
    if not env_vars:
        print("❌ No environment variables found.")
        print("\n🔧 Set environment variables:")
        print("   Option 1 - Database URL:")
        print('   export DATABASE_URL="postgresql://user:password@host:5432/database"')
        print("\n   Option 2 - Individual variables:")
        print('   export DB_HOST="localhost"')
        print('   export DB_PORT="5432"')
        print('   export DB_USER="postgres"')
        print('   export DB_PASSWORD="your_password"')
        print('   export DB_NAME="postgres"')
    
    else:
        print("🔧 Try these fixes:")
        print("   1. Check if PostgreSQL is running:")
        print("      - Windows: Check Services for 'postgresql'")
        print("      - Linux/Mac: sudo systemctl status postgresql")
        print()
        print("   2. Verify connection details:")
        print("      - Host: Is the server accessible?")
        print("      - Port: Default is 5432")
        print("      - User: Does the user exist?")
        print("      - Password: Is it correct?")
        print()
        print("   3. Test with psql command:")
        print("      psql -h host -p port -U user -d database")

def main():
    """Main diagnostic function."""
    print("🩺 PostgreSQL Connection Diagnostic Tool")
    print("=" * 60)
    print("This tool helps diagnose connection issues with your PostgreSQL database.")
    print()
    
    # Step 1: Check environment variables
    env_vars = check_environment_variables()
    
    # Step 2: Determine configuration
    config = get_connection_config(env_vars)
    
    # Step 3: Test connection
    connection_worked = test_connection(config)
    
    # Step 4: Suggest fixes
    suggest_fixes(env_vars, connection_worked)
    
    print("\n" + "=" * 60)
    if connection_worked:
        print("🎉 DIAGNOSIS COMPLETE - Ready to create database!")
    else:
        print("🔧 DIAGNOSIS COMPLETE - Please fix connection issues first")
    print("=" * 60)
    
    return connection_worked

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)