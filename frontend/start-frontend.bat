@echo off
setlocal enabledelayedexpansion

REM Cambiar al directorio del frontend
cd /d "%~dp0"

REM Encontrar Node.js en las ubicaciones comunes
set "NODE_PATH="
for %%i in (
  "C:\Program Files\nodejs\node.exe"
  "C:\Program Files(x86)\nodejs\node.exe"
  "%LOCALAPPDATA%\Programs\nodejs\node.exe"
) do (
  if exist %%i (
    set "NODE_PATH=%%i"
    goto :found_node
  )
)

:found_node
if "!NODE_PATH!"=="" (
  echo ❌ ERROR: Node.js no encontrado
  echo    Instala Node.js desde https://nodejs.org/
  pause
  exit /b 1
)

echo ✅ Node.js encontrado: !NODE_PATH!
echo.

echo ============================================
echo   FRONTEND REACT - Puerto 3000
echo ============================================
echo.

REM Verificar si node_modules existe
if not exist "node_modules" (
  echo 📦 Instalando dependencias del frontend...
  call npm install
  if !errorlevel! neq 0 (
    echo ❌ Error al instalar dependencias
    pause
    exit /b 1
  )
  echo ✅ Dependencias instaladas
  echo.
) else (
  echo ✅ Dependencias ya instaladas
  echo.
)

REM Iniciar el servidor de desarrollo
echo 🚀 Iniciando servidor de desarrollo...
echo.
call npm start

pause
