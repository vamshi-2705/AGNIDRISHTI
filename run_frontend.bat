@echo off
TITLE ASTRAFIRE Frontend Web Console - SIH 2026 (NTRO)
COLOR 0A

echo =====================================================================
echo        ASTRAFIRE: Geospatial Defense Intelligence Dashboard
echo              SIH 2026 Problem Statement 26162 (NTRO)
echo =====================================================================
echo.

cd frontend

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing frontend dependencies...
    cmd /c npm install
)

echo [INFO] Launching Vite Development Server on http://localhost:5173 ...
echo [INFO] Backend URL configured: http://127.0.0.1:8000
echo [INFO] Press CTRL+C to terminate frontend server.
echo.

cmd /c npm run dev -- --host 0.0.0.0 --port 5173

pause
