@echo off
cd /d "%~dp0"

echo.
echo =====================================================
echo   OOH SYSTEM - Start Direct (Backend + Frontend)
echo =====================================================
echo.

echo 🔵 Iniciando Backend (asume dependencias ya instaladas)...
start "Backend OOH" /D "%~dp0backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 2 /nobreak >nul

echo 🟣 Iniciando Frontend (asume dependencias ya instaladas)...
start "Frontend OOH" /D "%~dp0frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

timeout /t 3 /nobreak >nul

echo Abriendo navegador en http://localhost:3000
start http://localhost:3000

echo.
echo Si alguno falla, entra en la carpeta correspondiente y ejecuta:
echo    npm install
echo luego vuelve a ejecutar este script.

pause
