@echo off
setlocal enabledelayedexpansion
pushd "%~dp0"

echo.
echo ============================================
echo   TESTS DE BACKEND (Jest)
echo   Validar almacenamiento de imagenes
echo ============================================
echo.

echo Verificando node...

:: Intentar encontrar node en rutas comunes
where node >nul 2>nul
if errorlevel 1 (
	echo [*] Node no encontrado en PATH, buscando en rutas comunes...
	
	set "FOUND=0"
	for %%A in (
		"%ProgramFiles%\nodejs"
		"%ProgramFiles(x86)%\nodejs"
		"%LOCALAPPDATA%\Programs\nodejs"
	) do (
		if !FOUND! equ 0 (
			if exist "%%~A\node.exe" (
				echo [+] Encontrado Node en: %%~A
				set "PATH=%%~A;!PATH!"
				set "FOUND=1"
			)
		)
	)
	
	if !FOUND! equ 0 (
		echo.
		echo [ERROR] Node.js no encontrado. Instala Node LTS desde https://nodejs.org/
		echo.
		pause
		popd
		exit /b 1
	)
)

where node >nul 2>nul
if errorlevel 1 (
	echo [ERROR] Node.js sigue sin estar disponible.
	pause
	popd
	exit /b 1
)

echo ✅ Node.js encontrado
echo.
echo Instalando dependencias si faltan...
call npm install >nul 2>&1

echo.
echo Ejecutando tests con NODE_ENV=test...
set NODE_ENV=test
call npm test
pause
popd
