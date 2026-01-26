@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo =====================================================
echo   OOH SYSTEM - Backend + Frontend
echo =====================================================
echo.

REM Detectar Node.js (buscar en 3 ubicaciones)
set "NODE_EXE="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
)
if exist "C:\Program Files (x86)\nodejs\node.exe" if "%NODE_EXE%"=="" (
    set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" if "%NODE_EXE%"=="" (
    set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
)

if "%NODE_EXE%"=="" (
    echo ❌ ERROR: Node.js no encontrado en:
    echo    - C:\Program Files\nodejs
    echo    - C:\Program Files (x86)\nodejs
    echo    - %LOCALAPPDATA%\Programs\nodejs
    echo.
    echo Instala Node.js LTS desde: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js: %NODE_EXE%
echo.

REM Configurar PATH con Node.js
for /f "tokens=*" %%i in ("!NODE_EXE!") do set "NODE_DIR=%%~dpi"
set "PATH=!NODE_DIR!;!PATH!"

REM Iniciar Backend en ventana nueva
echo 🔵 Backend iniciando (Puerto 8080)...
set "ROOT=%CD%"
start "Backend OOH" /D "%ROOT%\backend" cmd /k "node --version && npm --version && (if exist package-lock.json (npm ci) else (npm install)) || (echo ❌ Instalación backend falló & pause & exit /b 1) && node migrate-csv-to-db.js && npm run dev"

timeout /t 4 /nobreak

REM Iniciar Frontend en ventana nueva
echo 🟣 Frontend iniciando (Puerto 3000)...
start "Frontend OOH" /D "%ROOT%\frontend" cmd /k "node --version && npm --version && (if exist package-lock.json (npm ci) else (npm install)) || (echo ❌ Instalación frontend falló & pause & exit /b 1) && npm start"

timeout /t 2 /nobreak

timeout /t 5 /nobreak

REM Abrir navegador automáticamente
start http://localhost:3000

echo.
echo ✅ Sistema iniciado:
echo    - Backend: http://localhost:8080
echo    - Frontend: http://localhost:3000
echo.
echo Pruebas:
echo    - Para probar: start-all-tests.bat
echo    - Para solo Backend: cd backend ^&^& npm run dev
echo    - Para solo Frontend: cd frontend ^&^& npm start
echo.
echo Cierra ambas ventanas para detener el sistema.
