#!/usr/bin/env python3
"""
Startup script for Prelude CRM Service.
Run this to start the FastAPI server.
"""

import uvicorn
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add src directory to Python path
src_path = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_path))

# Load environment variables from .env file
load_dotenv()

from app import app

if __name__ == "__main__":
    # Get port from environment variable (for Cloud Run) or default to 8003 (for local)
    port = int(os.environ.get("PORT", 8003))

    print("Starting Prelude CRM Service...")
    print(f"API Documentation: http://localhost:{port}/docs")
    print("CRM Features Available:")
    print("   1. Customer management and database operations")
    print("   2. AI-powered email generation")
    print("   3. Analytics insights and reporting")
    print("   4. Task management (handled by Dashboard service)")
    print("   5. Interaction summaries and tracking")
    print()

    uvicorn.run(
        "src.app:app",  # Use string import
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload for production/Docker compatibility
        log_level="info"
    )