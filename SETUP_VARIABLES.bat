@echo off
REM Este script configura las variables de entorno de forma PERMANENTE
REM Ejecuta como ADMINISTRADOR para que funcione

echo.
echo ============================================
echo   CONFIGURAR VARIABLES DE ENTORNO
echo ============================================
echo.

REM Verificar si se ejecuta como admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Debes ejecutar este script como ADMINISTRADOR
    echo.
    echo Pasos:
    echo   1. Click derecho en SETUP_VARIABLES.bat
    echo   2. Selecciona "Ejecutar como administrador"
    pause
    exit /b 1
)

echo ✅ Ejecutándose como administrador...
echo.

REM Encontrar Node.js
set "NODE_BIN="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_BIN=C:\Program Files\nodejs"
    echo ✅ Node.js encontrado en: C:\Program Files\nodejs
) else if exist "C:\Program Files(x86)\nodejs\node.exe" (
    set "NODE_BIN=C:\Program Files(x86)\nodejs"
    echo ✅ Node.js encontrado en: C:\Program Files(x86)\nodejs
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "NODE_BIN=%LOCALAPPDATA%\Programs\nodejs"
    echo ✅ Node.js encontrado en: %LOCALAPPDATA%\Programs\nodejs
) else (
    echo ❌ Node.js no encontrado
    echo    Instala desde: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo ⏳ Agregando Node.js al PATH del sistema...

REM Agregar al PATH del sistema (permanente)
setx PATH "%NODE_BIN%;%%PATH%%" /M

if errorlevel 1 (
    echo ❌ ERROR: No se pudo actualizar el PATH
    pause
    exit /b 1
)

echo ✅ PATH actualizado correctamente
echo.
echo ✅ Verificando instalación...
call node --version
call npm --version

echo.
echo ============================================
echo   ✅ CONFIGURACIÓN COMPLETADA
echo ============================================
echo.
echo Debes REINICIAR las ventanas de comando/PowerShell
echo para que los cambios tengan efecto.
echo.
pause
