@echo off
setlocal enabledelayedexpansion
title KERNELiOS Launcher

echo.
echo                   Starting Advanced Simulator System  v2.0
echo.

:: ── Paths ──────────────────────────────────────────────────────────────────
set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend
set VENV=%BACKEND%\.venv

:: ── Python venv ─────────────────────────────────────────────────────────────
if not exist "%VENV%\Scripts\activate.bat" (
    echo [INIT] Creating Python virtual environment...
    python -m venv "%VENV%"
    if errorlevel 1 ( echo [ERROR] Python not found. Install Python 3.10+. && pause && exit /b 1 )
)

call "%VENV%\Scripts\activate.bat"

:: ── Install / upgrade backend deps ──────────────────────────────────────────
echo [INIT] Installing backend dependencies...
pip install -q --upgrade pip
pip install -q -r "%BACKEND%\requirements.txt"

:: ── Copy .env if missing ─────────────────────────────────────────────────────
if not exist "%BACKEND%\.env" (
    echo [INIT] Creating backend\.env from example...
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
)

:: ── Apply migrations ─────────────────────────────────────────────────────────
echo [INIT] Running database migrations...
cd /d "%BACKEND%"
python manage.py migrate --run-syncdb -v 0

:: ── Seed data (safe to run multiple times) ───────────────────────────────────
echo [INIT] Seeding admin + HQ branch...
python manage.py seed_admin
echo [INIT] Seeding default brand-kit...
python manage.py seed_brand_kit

:: ── Install frontend deps if needed ─────────────────────────────────────────
if not exist "%FRONTEND%\node_modules" (
    echo [INIT] Installing frontend dependencies ^(first run — may take a minute^)...
    cd /d "%FRONTEND%"
    npm install --silent
)

:: ── Kill any stale Node/Django processes on ports 3000 and 8000 ─────────────
echo [CLEAN] Killing any stale servers on ports 3000/8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: ── Launch backend in new window ────────────────────────────────────────────
echo [START] Launching Django backend on http://localhost:8000 ...
start "KERNELiOS Backend" cmd /k "cd /d "%BACKEND%" && call "%VENV%\Scripts\activate.bat" && python manage.py runserver 0.0.0.0:8000"

:: ── Launch frontend in new window ───────────────────────────────────────────
echo [START] Launching Next.js frontend on http://localhost:3000 ...
start "KERNELiOS Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

:: ── Wait and open browser ───────────────────────────────────────────────────
echo [INFO] Opening browser in 4 seconds...
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo  Backend  →  http://localhost:8000
echo  Frontend →  http://localhost:3000
echo  API      →  http://localhost:8000/api/health/
echo  Django admin → http://localhost:8000/admin/
echo.
echo  Close the two console windows to stop the servers.
echo.
endlocal
