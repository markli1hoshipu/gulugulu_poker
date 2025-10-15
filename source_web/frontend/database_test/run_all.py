#!/usr/bin/env python3
"""
Database Test Suite Runner
==========================

This script runs all database operations in sequence:
1. Creates the database and table
2. Reads and displays the data
3. Optionally adds more data

Usage:
    python run_all.py
"""

import os
import sys
import subprocess
import time

def run_script(script_name: str, description: str) -> bool:
    """Run a Python script and return success status."""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}")
    
    try:
        # Run the script
        result = subprocess.run([
            sys.executable, script_name
        ], capture_output=False, text=True)
        
        if result.returncode == 0:
            print(f"✅ {description} completed successfully!")
            return True
        else:
            print(f"❌ {description} failed with exit code {result.returncode}")
            return False
            
    except Exception as e:
        print(f"❌ Error running {script_name}: {e}")
        return False

def main():
    """Main function to run all database scripts."""
    print("🗄️  PostgreSQL Database Test Suite")
    print("="*50)
    print("This will:")
    print("1. Create database and table")
    print("2. Read and display all data")
    print("3. Show you how to add new data")
    print()
    
    # Check if scripts exist
    scripts = [
        ('create_database.py', 'Database and Table Creation'),
        ('read_database.py', 'Data Reading and Display'),
        ('add_row.py', 'Row Addition Example')
    ]
    
    missing_scripts = []
    for script, _ in scripts:
        if not os.path.exists(script):
            missing_scripts.append(script)
    
    if missing_scripts:
        print(f"❌ Missing scripts: {', '.join(missing_scripts)}")
        print("Please ensure all scripts are in the current directory.")
        return False
    
    # Ask user for confirmation
    response = input("Do you want to proceed? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("Operation cancelled.")
        return False
    
    success_count = 0
    total_scripts = len(scripts) - 1  # Exclude add_row.py from automatic execution
    
    # Step 1: Create database
    if run_script('create_database.py', 'Database and Table Creation'):
        success_count += 1
        time.sleep(1)  # Brief pause between operations
    else:
        print("\n❌ Database creation failed. Stopping execution.")
        return False
    
    # Step 2: Read database
    if run_script('read_database.py', 'Data Reading and Display'):
        success_count += 1
        time.sleep(1)
    else:
        print("\n⚠️  Database reading failed, but continuing...")
    
    # Step 3: Explain add_row.py
    print(f"\n{'='*60}")
    print("📝 Adding New Data")
    print(f"{'='*60}")
    print("To add new data:")
    print("1. Edit the variables at the top of 'add_row.py'")
    print("2. Set your desired email, company, and role")
    print("3. Run: python add_row.py")
    print()
    print("Example variables to modify:")
    print('USER_EMAIL = "your.email@company.com"')
    print('USER_COMPANY = "Your Company Name"')
    print('USER_ROLE = "Your Job Role"')
    
    # Ask if user wants to run add_row.py with current settings
    print(f"\n{'='*60}")
    add_response = input("Do you want to run add_row.py with current settings? (y/N): ").strip().lower()
    if add_response in ['y', 'yes']:
        if run_script('add_row.py', 'Adding Sample Row'):
            success_count += 1
            
            # Re-read database to show updated data
            print("\n🔄 Re-reading database to show updated data...")
            time.sleep(1)
            run_script('read_database.py', 'Updated Data Display')
    
    # Final summary
    print(f"\n{'='*60}")
    print("🎉 Database Test Suite Summary")
    print(f"{'='*60}")
    print(f"Scripts executed successfully: {success_count}")
    print()
    print("📁 Files created:")
    print("   - PostgreSQL database: prelude_test_db")
    print("   - Table: user_informations")
    print()
    print("💡 Next steps:")
    print("   - Modify add_row.py to add your own data")
    print("   - Use read_database.py to view current data")
    print("   - Integrate these patterns into your application")
    print(f"{'='*60}")
    
    return success_count >= 2  # Consider successful if at least create and read worked

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)