@echo off
echo Starting Gulugulu Poker Backend in development mode (with auto-reload)...
echo.
echo API Documentation: http://localhost:6005/docs
echo WebSocket: ws://localhost:6005
echo.
echo Press Ctrl+C to stop the server
echo.

REM 使用uvicorn命令直接运行，带自动重载
uvicorn main:socket_app --reload --host 0.0.0.0 --port 6005 --log-level info