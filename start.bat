@echo off
cd /d %~dp0
echo Starting Flask server...
echo.
echo Open browser: http://localhost:5000
echo.
python app.py

echo Запуск Next.js dev server...
cd /d "%~dp0"
npm run dev
pause


