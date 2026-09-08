@echo off
TITLE ASTRAFIRE Backend Server - SIH 2026 (NTRO)
COLOR 0B

echo =====================================================================
echo       ASTRAFIRE: Geospatial AI & Industrial Fire Detection Server
echo              SIH 2026 Problem Statement 26162 (NTRO)
echo =====================================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to system PATH.
    echo Please install Python 3.10+ and try again.
    pause
    exit /b 1
)

:: Install / verify dependencies
echo [1/2] Checking and verifying backend dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] Pip encountered an issue installing dependencies. Attempting to run anyway...
)

echo [2/2] Launching FastAPI ASGI Server via Uvicorn on http://127.0.0.1:8000 ...
echo [INFO] Interactive Swagger Documentation: http://127.0.0.1:8000/docs
echo [INFO] Health Endpoint: http://127.0.0.1:8000/
echo [INFO] Press CTRL+C to terminate server.
echo.

python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload

pause
