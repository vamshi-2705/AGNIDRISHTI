@echo off
TITLE ASTRAFIRE Unified Launcher - SIH 2026 (NTRO)
COLOR 0E

echo =====================================================================
echo           ASTRAFIRE: Unified Tactical Stack Launcher
echo               SIH 2026 Problem Statement 26162
echo =====================================================================
echo.
cd /d "%~dp0"

echo [1/2] Launching Python FastAPI Backend Server on http://127.0.0.1:8000 ...
start "ASTRAFIRE Backend (FastAPI)" cmd /c run_backend.bat

echo [2/2] Launching React Vite Frontend Dashboard on http://localhost:5173 ...
start "ASTRAFIRE Frontend (Vite)" cmd /c run_frontend.bat

echo.
echo =====================================================================
echo  Both services launched in separate windows!
echo  - Interactive Swagger Docs: http://127.0.0.1:8000/docs
echo  - Tactical Defense Dashboard: http://localhost:5173
echo =====================================================================
echo.
pause
