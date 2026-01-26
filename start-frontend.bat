@echo off
setlocal enabledelayedexpansion

REM Ir al directorio frontend
cd /d "%~dp0"

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
    echo ❌ ERROR: Node.js no encontrado
    echo    Instala desde: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js: !NODE_EXE!

REM Extraer directorio de Node
for /f "tokens=*" %%i in ("!NODE_EXE!") do set "NODE_DIR=%%~dpi"
set "PATH=!NODE_DIR!;!PATH!"

echo ✅ Verificando npm...
"!NODE_EXE!" --version
call npm --version

echo ✅ Instalando dependencias...
call npm install

echo.
echo ✅ Frontend iniciando (Puerto 3000)...
echo.
call npm start
pause
