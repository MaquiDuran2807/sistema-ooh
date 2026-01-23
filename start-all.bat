@echo off
setlocal enabledelayedexpansion

:: Cambiar a la carpeta del proyecto
cd /d "c:\Users\migduran\Documents\nuevo ooh"

:: Mostrar información
cls
echo ============================================
echo   INICIANDO SERVIDOR OOH
echo ============================================
echo.
echo [*] Iniciando BACKEND en puerto 8080...
echo [*] Iniciando FRONTEND en puerto 3000...
echo.
echo Espera a que aparezcan las ventanas...
echo.

:: Esperar 2 segundos
timeout /t 2 /nobreak

:: Iniciar BACKEND en una ventana nueva
start "OOH Backend - Puerto 8080" cmd /k ^
  "cd /d \"c:\Users\migduran\Documents\nuevo ooh\backend\" && ^
   setlocal enabledelayedexpansion && ^
   set PATH=C:\Program Files\nodejs;!PATH! && ^
   echo. && ^
   echo ============================================ && ^
   echo   BACKEND EJECUTANDOSE EN PUERTO 8080 && ^
   echo   CON NODEMON - Auto-restart activado && ^
   echo ============================================ && ^
   echo. && ^
   call \"C:\Program Files\nodejs\npm.cmd\" run dev"

:: Esperar 3 segundos para que inicie el backend
timeout /t 3 /nobreak

:: Iniciar FRONTEND en una ventana nueva
start "OOH Frontend - Puerto 3000" cmd /k ^
  "cd /d \"c:\Users\migduran\Documents\nuevo ooh\frontend\" && ^
   setlocal enabledelayedexpansion && ^
   set PATH=C:\Program Files\nodejs;!PATH! && ^
   echo. && ^
   echo ============================================ && ^
   echo   FRONTEND EJECUTANDOSE EN PUERTO 3000 && ^
   echo ============================================ && ^
   echo. && ^
   call \"C:\Program Files\nodejs\npm.cmd\" start"

echo.
echo ============================================
echo   ✅ Ambos servidores iniciados
echo ============================================
echo.
echo Backend: http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo Cierra esta ventana cuando quieras detener los servidores.
pause
