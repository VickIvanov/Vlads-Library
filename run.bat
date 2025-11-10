@echo off
chcp 65001 >nul
echo ========================================
echo  КОСМИЧЕСКАЯ БИБЛИОТЕКА
echo ========================================
echo.
echo Проверка зависимостей...
pip install -r requirements.txt --quiet
echo.
echo Запуск сервера...
echo Откройте браузер: http://localhost:5000
echo.
python app.py
pause

