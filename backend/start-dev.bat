@echo off
setlocal enabledelayedexpansion

REM Ir al directorio backend
cd /d "%~dp0"

echo.
echo ============================================
echo   BACKEND - NODE SERVER (Puerto 8080)
echo ============================================
echo.

REM Detectar Node.js en 3 ubicaciones
set "NODE_EXE="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else if exist "C:\Program Files(x86)\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files(x86)\nodejs\node.exe"
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
)

if "!NODE_EXE!"=="" (
    echo ❌ ERROR: Node.js no encontrado en:
    echo    - C:\Program Files\nodejs
    echo    - C:\Program Files(x86)\nodejs
    echo    - %LOCALAPPDATA%\Programs\nodejs
    echo.
    echo Instala Node.js LTS desde: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js: !NODE_EXE!

REM Extraer directorio de Node y agregar al PATH
for /f "tokens=*" %%i in ("!NODE_EXE!") do set "NODE_DIR=%%~dpi"
set "PATH=!NODE_DIR!;!PATH!"

echo ✅ Verificando npm...
"!NODE_EXE!" --version
call npm --version

echo.
echo ✅ Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ❌ ERROR: npm install falló
    pause
    exit /b 1
)

echo.
echo ✅ Ejecutando migración CSV a SQLite...
call "!NODE_EXE!" migrate-csv-to-db.js
if errorlevel 1 (
    echo ⚠️  ADVERTENCIA: Migración no necesaria (BD ya existe)
)

echo.
echo ✅ Iniciando servidor...
echo    - API: http://localhost:8080
echo    - Test: http://localhost:8080/api/health
echo.
call npm run dev
pause