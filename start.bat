@echo off
echo ============================================
echo   YUKTIK 2026 - Emergency Coordination
echo ============================================
echo.
echo Starting Backend (FastAPI)...
start "YUKTIK Backend" cmd /k "cd /d d:\YUTIK\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 >nul
echo Starting Frontend (React)...
start "YUKTIK Frontend" cmd /k "cd /d d:\YUTIK\frontend && npm run dev"
timeout /t 3 >nul
echo.
echo ============================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API Docs: http://localhost:8000/docs
echo ============================================
echo.
start "" "http://localhost:5173"

