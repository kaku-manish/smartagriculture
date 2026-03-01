@echo off
title PaddyPulse - Backend Server
color 0A
echo.
echo  ============================================
echo   PaddyPulse AI - Backend Server (Port 3000)
echo  ============================================
echo.

cd /d "%~dp0server_python"

IF NOT EXIST "venv\Scripts\python.exe" (
    echo [ERROR] venv not found! Run: python -m venv venv ^& venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo [INFO] Starting FastAPI backend on http://localhost:3000 ...
echo [INFO] Press Ctrl+C to stop the server.
echo.

venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload

pause
