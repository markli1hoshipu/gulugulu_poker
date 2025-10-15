# PostgreSQL Database Test Scripts

## Overview

This folder contains three Python scripts to create, read, and add data to a PostgreSQL database with a `user_informations` table.

## Files

### 1. `create_database.py`
**Purpose**: Creates a new PostgreSQL database with the `user_informations` table.

**Features**:
- ✅ Creates `prelude_test_db` database
- ✅ Creates `user_informations` table with columns:
  - `id` (SERIAL PRIMARY KEY)
  - `email` (VARCHAR, UNIQUE, NOT NULL)
  - `company` (VARCHAR, NOT NULL)
  - `role` (VARCHAR, NOT NULL)
  - `database_name` (VARCHAR, NOT NULL)
  - `level` (INTEGER, NOT NULL)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP with auto-update trigger)
- ✅ Adds indexes for performance
- ✅ Inserts sample data
- ✅ Verifies setup

### 2. `read_database.py`
**Purpose**: Reads and displays all rows from the `user_informations` table.

**Features**:
- ✅ Connects to `prelude_test_db`
- ✅ Displays all users in formatted table
- ✅ Shows table statistics (total users, unique companies/roles)
- ✅ Handles database connections gracefully

### 3. `add_row.py`
**Purpose**: Adds new rows to the `user_informations` table using local variables.

**Features**:
- ✅ Add single user (modify variables in script)
- ✅ Add multiple users (batch mode)
- ✅ Validates email uniqueness
- ✅ Input validation
- ✅ Shows recently added users

## Quick Start

### 1. Install Dependencies
```bash
cd prelude/frontend/database_test
pip install -r requirements.txt
```

### 2. Set Environment Variables
Make sure your PostgreSQL connection is configured. The scripts will use:
```bash
# Option 1: Database URL (recommended)
export DATABASE_URL="postgresql://postgres:password@host:5432/postgres"

# Option 2: Individual variables
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_USER="postgres"
export DB_PASSWORD="your_password"
```

### 3. Run the Scripts

#### Step 1: Create Database and Table
```bash
python create_database.py
```

#### Step 2: Read All Data
```bash
python read_database.py
```

#### Step 3: Add New Data
Edit the local variables in `add_row.py`:
```python
USER_EMAIL = "your.email@company.com"
USER_COMPANY = "Your Company Name"
USER_ROLE = "Your Role"
```

Then run:
```bash
python add_row.py
```

## Table Schema

```sql
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Adding Single User
Edit `add_row.py`:
```python
USER_EMAIL = "john.doe@techcorp.com"
USER_COMPANY = "TechCorp Inc"
USER_ROLE = "Senior Developer"
USER_DATABASE_NAME = "techcorp_main_db"
USER_LEVEL = 3
ADD_MULTIPLE_USERS = False
```

### Adding Multiple Users
Edit `add_row.py`:
```python
MULTIPLE_USERS = [
    {
        "email": "alice@startup.io",
        "company": "Startup Solutions",
        "role": "CTO",
        "database_name": "startup_core_db",
        "level": 5
    },
    {
        "email": "bob@consulting.com",
        "company": "Consulting Group",
        "role": "Senior Consultant",
        "database_name": "consulting_client_db",
        "level": 4
    }
]
ADD_MULTIPLE_USERS = True
```

## Sample Output

### Create Database
```
🚀 PostgreSQL Database Creator
========================================

📦 Step 1: Creating database...
✅ Created database 'prelude_test_db'

📋 Step 2: Creating table...
✅ Created table 'user_informations' with required columns
   📋 Columns: id, email (unique), company, role, created_at, updated_at
📊 Sample data inserted. Total rows in table: 5

🔍 Step 3: Verifying setup...
✅ Table structure verified:
   📋 id (integer) - Nullable: NO
   📋 email (character varying) - Nullable: NO
   📋 company (character varying) - Nullable: NO
   📋 role (character varying) - Nullable: NO
   📋 created_at (timestamp without time zone) - Nullable: YES
   📋 updated_at (timestamp without time zone) - Nullable: YES
📊 Total rows: 5

========================================
✅ Database setup completed successfully!
📊 Database: prelude_test_db
📋 Table: user_informations
🔗 Connection: postgresql://postgres:***@host:5432/prelude_test_db
========================================
```

### Read Database
```
📖 Database Reader - User Informations
=============================================

🔍 Reading all rows from user_profiles table...

📈 TABLE STATISTICS
------------------------------
Total Users: 5
Unique Companies: 5
Unique Roles: 5
Latest Entry: 2024-08-09 16:58:23
------------------------------

📊 USER INFORMATIONS TABLE (5 rows)
====================================================================================================
ID   EMAIL                          COMPANY                   ROLE                 CREATED        
----------------------------------------------------------------------------------------------------
1    admin@prelude.com              Prelude Technologies      Administrator        2024-08-09     
2    john.doe@techcorp.com          TechCorp Inc              Developer            2024-08-09     
3    jane.smith@consulting.com      Consulting Group          Senior Consultant    2024-08-09     
4    mike.wilson@startup.io         Startup Solutions         CTO                  2024-08-09     
5    sarah.brown@enterprise.com     Enterprise Systems        Project Manager      2024-08-09     
====================================================================================================
```

### Add Row
```
➕ Database Row Adder - User Informations
==================================================

📊 Current users in database: 5

➕ Adding single user...
   📧 Email: new.user@example.com
   🏢 Company: Example Company Ltd
   👔 Role: Software Engineer

✅ Successfully added new user:
   📧 Email: new.user@example.com
   🏢 Company: Example Company Ltd
   👔 Role: Software Engineer
   🆔 ID: 6
   📅 Created: 2024-08-09 17:05:15.123456

📊 Total users in database: 6
```

## Troubleshooting

### Connection Issues
- Verify your `DATABASE_URL` environment variable
- Check if PostgreSQL server is running
- Ensure your user has CREATE DATABASE privileges

### Permission Issues
```bash
# Grant necessary permissions
GRANT CREATE ON DATABASE postgres TO your_user;
GRANT ALL PRIVILEGES ON DATABASE prelude_test_db TO your_user;
```

### Testing Connection
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"
```

## Integration with Prelude Platform

These scripts are designed to work with your existing Prelude platform:
- Uses the same environment variable patterns
- Compatible with your existing database configuration
- Follows the same logging and error handling patterns

## Next Steps

1. Run `create_database.py` to set up the database
2. Use `read_database.py` to verify the setup
3. Modify `add_row.py` variables to add your own data
4. Integrate these patterns into your larger application