@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:menu
cls
echo.
echo ============================================
echo.
echo    OOH - SERVIDOR DE DESARROLLO
echo.
echo ============================================
echo.
echo [1] Iniciar ambos servidores (Backend + Frontend)
echo [2] Iniciar solo Backend (Puerto 8080)
echo [3] Iniciar solo Frontend (Puerto 3000)
echo [4] Detener todos los servidores
echo [5] Salir
echo.
echo ============================================
echo.

set /p option="Selecciona una opcion (1-5): "

if "%option%"=="1" goto start_all
if "%option%"=="2" goto start_backend
if "%option%"=="3" goto start_frontend
if "%option%"=="4" goto stop_all
if "%option%"=="5" goto exit_menu

echo.
echo Error: Opcion invalida
timeout /t 2 /nobreak
goto menu

:start_all
cls
echo ============================================
echo   INICIANDO AMBOS SERVIDORES...
echo ============================================
echo.

start "OOH Backend - Puerto 8080" cmd /k ^
  "cd /d \"%~dp0backend\" && ^
   setlocal enabledelayedexpansion && ^
   set PATH=C:\Program Files\nodejs;!PATH! && ^
   echo. && ^
   echo ============================================ && ^
   echo   BACKEND EJECUTANDOSE EN PUERTO 8080 && ^
   echo   CON NODEMON - Auto-restart activado && ^
   echo ============================================ && ^
   echo. && ^
   call npm run dev"

timeout /t 3 /nobreak

start "OOH Frontend - Puerto 3000" cmd /k ^
  "cd /d \"%~dp0frontend\" && ^
   setlocal enabledelayedexpansion && ^
   set PATH=C:\Program Files\nodejs;!PATH! && ^
   echo. && ^
   echo ============================================ && ^
   echo   FRONTEND EJECUTANDOSE EN PUERTO 3000 && ^
   echo ============================================ && ^
   echo. && ^
   call npm start"

echo.
echo ✅ Servidores iniciados
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:3000
echo.
timeout /t 3 /nobreak
goto menu

:start_backend
cls
echo ============================================
echo   INICIANDO BACKEND...
echo ============================================
echo.

start "OOH Backend - Puerto 8080" cmd /k ^
  "cd /d \"%~dp0backend\" && ^
   setlocal enabledelayedexpansion && ^
   set PATH=C:\Program Files\nodejs;!PATH! && ^
   echo. && ^
   echo Backend iniciado en puerto 8080 con NODEMON && ^
   echo. && ^
   call npm run dev"

echo ✅ Backend iniciado en puerto 8080
timeout /t 3 /nobreak
goto menu

:start_frontend
cls
echo ============================================
echo   INICIANDO FRONTEND...
echo ============================================
echo.

start "OOH Frontend - Puerto 3000" cmd /k ^
  "cd /d \"%~dp0frontend\" && ^
   setlocal enabledelayedexpansion && ^
   set PATH=C:\Program Files\nodejs;!PATH! && ^
   echo. && ^
   echo Frontend iniciado en puerto 3000 && ^
   echo. && ^
   call npm start"

echo ✅ Frontend iniciado en puerto 3000
timeout /t 3 /nobreak
goto menu

:stop_all
cls
echo ============================================
echo   DETENIENDO SERVIDORES...
echo ============================================
echo.

taskkill /F /IM node.exe >nul 2>&1
echo [✓] Procesos Node detenidos

timeout /t 2 /nobreak
echo ✅ Todos los servidores han sido detenidos
timeout /t 3 /nobreak
goto menu

:exit_menu
exit /b 0
