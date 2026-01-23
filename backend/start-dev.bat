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
echo   BACKEND CON NODEMON - Puerto 8080
echo   Los logs apareceran aqui
echo ============================================
echo.
echo Instalando dependencias...
call npm install
if errorlevel 1 (
	echo [ERROR] No se pudieron instalar las dependencias.
	pause
	exit /b 1
)
echo.
echo Ejecutando migracion de CSV a SQLite...
node migrate-csv-to-db.js
if errorlevel 1 (
	echo [WARNING] La migracion fallo, continuando de todas formas...
)
echo.
call npm run dev
pause
