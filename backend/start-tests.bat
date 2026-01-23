@echo off
cd /d "c:\Users\migduran\Documents\nuevo ooh\backend"
set PATH=C:\Program Files\nodejs;%PATH%

echo Verificando node...
where node >nul 2>nul || (
    echo [ERROR] Node.js no esta en el PATH. Instala Node LTS y vuelve a intentar.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   TESTS DE BACKEND (Jest)
echo   Ejecuta suite en entorno test
============================================
echo.

echo Instalando dependencias...
call npm install
if errorlevel 1 (
    echo [ERROR] No se pudieron instalar las dependencias.
    pause
    exit /b 1
)

echo.
echo Ejecutando tests con NODE_ENV=test...
set NODE_ENV=test
call npm test
pause
