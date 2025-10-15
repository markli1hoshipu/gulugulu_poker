#!/usr/bin/env python3
"""
Initialize customer_data and user_data databases
Run this script to create the necessary tables and indexes
"""

import os
import sys
import logging
from dotenv import load_dotenv
from .database import crm_db
import sqlite3

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Initialize both databases"""
    try:
        # Initialize database manager first
        logger.info("Initializing database manager...")
        
        # Initialize customer database
        logger.info("Initializing customer database...")
        # For table creation:
        # crm_db._create_tables()
        # For DB access:
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM customers")
            customer_count = cursor.fetchone()[0]
            logger.info(f"Customer database connected successfully. Customer count: {customer_count}")
        logger.info("Customer database initialized successfully!")
        
        # Initialize user database
        logger.info("Initializing user database...")
        # For table creation:
        # crm_db._create_tables()
        # For DB access:
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            logger.info(f"User database connected successfully. User count: {user_count}")
        logger.info("User database initialized successfully!")
        
        # Test connections
        logger.info("Testing database connections...")
        
        # Test customer database connection
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM customers")
            customer_count = cursor.fetchone()[0]
            logger.info(f"Customer database connected successfully. Customer count: {customer_count}")
        
        # Test user database connection
        with sqlite3.connect(crm_db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            logger.info(f"User database connected successfully. User count: {user_count}")
        
        logger.info("All databases initialized and tested successfully!")
        
    except Exception as e:
        logger.error(f"Failed to initialize databases: {e}")
        raise

if __name__ == "__main__":
    main() 