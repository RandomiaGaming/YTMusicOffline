@echo off
where python >nul 2>&1

if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not added to PATH.
    exit /b 1
)

python server/server.py