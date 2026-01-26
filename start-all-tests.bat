@echo off
setlocal enabledelayedexpansion

echo.
echo =====================================================
echo  OOH System - FULL TEST SUITE
echo =====================================================
echo.

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

REM Cambiar al directorio del backend
pushd "%~dp0"

REM Tests del Backend
echo.
echo =====================================================
echo  BACKEND TESTS (Jest + Supertest)
echo =====================================================
echo.

if exist "package.json" (
  echo 📦 Instalando dependencias del backend...
  call npm install >nul 2>&1
  
  echo 🧪 Ejecutando tests del backend...
  set "NODE_ENV=test"
  call npm test
  
  if !errorlevel! neq 0 (
    echo ❌ Tests del backend fallaron
  ) else (
    echo ✅ Tests del backend pasados
  )
) else (
  echo ⚠️  No se encontró package.json en backend
)

REM Tests del Frontend
echo.
echo =====================================================
echo  FRONTEND TESTS (React Testing Library)
echo =====================================================
echo.

if exist "..\frontend\package.json" (
  echo 📦 Instalando dependencias del frontend...
  cd ..\frontend
  call npm install >nul 2>&1
  
  echo 🧪 Ejecutando tests del frontend...
  call npm test -- --coverage --watchAll=false
  
  if !errorlevel! neq 0 (
    echo ❌ Tests del frontend fallaron
  ) else (
    echo ✅ Tests del frontend pasados
  )
  
  cd ..\backend
) else (
  echo ⚠️  No se encontró package.json en frontend
)

REM Resumen Final
echo.
echo =====================================================
echo  RESUMEN DE TESTS
echo =====================================================
echo.
echo ✅ Suite completa de tests ejecutada
echo.
echo Próximos pasos:
echo  1. Revisar los reportes de cobertura
echo  2. Verificar que todos los tests pasen
echo  3. Para correr tests en watch mode:
echo     - Backend: npm test -- --watch
echo     - Frontend: npm run test:watch
echo.

popd
pause
