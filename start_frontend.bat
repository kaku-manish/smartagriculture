@echo off
title PaddyPulse - Frontend (Port 5173)
color 0B
echo.
echo  ============================================
echo   PaddyPulse AI - Frontend (Port 5173)
echo  ============================================
echo.

cd /d "%~dp0client"

IF NOT EXIST "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
)

echo [INFO] Starting React frontend on http://localhost:5173 ...
echo [INFO] Press Ctrl+C to stop.
echo.

call npm run dev

pause
