#!/usr/bin/env python3
"""
开发环境启动脚本 - 支持自动重启
"""
import sys
import os
from pathlib import Path
import logging

# Change to backend directory
backend_dir = Path(__file__).parent
os.chdir(backend_dir)

# Add project root to path
project_root = backend_dir.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(backend_dir))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import uvicorn with reloading support
import uvicorn

if __name__ == "__main__":
    logger.info("Starting Gulugulu Poker Backend in development mode...")
    logger.info(f"Working directory: {os.getcwd()}")
    logger.info("Auto-reload enabled - server will restart when files change")
    logger.info("API Documentation: http://localhost:6005/docs")
    logger.info("WebSocket: ws://localhost:6005")
    
    # 确保在backend目录中
    if not Path("main.py").exists():
        logger.error("main.py not found! Please run this script from the backend directory.")
        sys.exit(1)
    
    # 启动开发服务器，支持自动重载
    uvicorn.run(
        "main:socket_app",  # 应用模块
        host="0.0.0.0",
        port=6005,
        reload=True,  # 启用自动重载
        reload_dirs=[
            str(backend_dir),  # backend目录
            str(project_root / "src"),   # src目录
        ],
        log_level="info",
        access_log=True
    )