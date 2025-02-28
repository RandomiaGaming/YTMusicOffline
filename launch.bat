@echo off
where python >nul 2>&1

if %errorlevel% neq 0 (
    echo "ERROR: Python is not installed or is not added to PATH."
    pause
    exit /b 1
)

python server/server.py