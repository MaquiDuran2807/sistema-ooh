@echo off
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   🚀 AUTOMATIZACION DE PRUEBAS DE RENDIMIENTO            ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Verificar que Docker está corriendo
echo [1/6] Verificando Docker...
docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker no está corriendo. Por favor abre Docker Desktop.
    pause
    exit /b 1
)
echo ✅ Docker está corriendo
echo.

REM Limpiar contenedores anteriores
echo [2/6] Limpiando contenedores anteriores...
docker stop ooh-test >nul 2>&1
docker rm ooh-test >nul 2>&1
echo ✅ Limpieza completada
echo.

REM Construir imagen
echo [3/6] Construyendo imagen Docker (puede tardar 5-10 min)...
docker build -t ooh-app .
if errorlevel 1 (
    echo ❌ Error construyendo imagen
    pause
    exit /b 1
)
echo ✅ Imagen construida
echo.

REM Ejecutar contenedor
echo [4/6] Ejecutando contenedor...
docker run -d -p 8080:8080 --name ooh-test ooh-app
if errorlevel 1 (
    echo ❌ Error ejecutando contenedor
    pause
    exit /b 1
)
echo ✅ Contenedor iniciado
echo.

REM Esperar a que el servidor inicie
echo [5/6] Esperando a que el servidor inicie (10 segundos)...
timeout /t 10 /nobreak >nul
echo ✅ Servidor listo
echo.

REM Instrucciones finales
echo [6/6] ¡Todo listo para las pruebas!
echo.
echo ═══════════════════════════════════════════════════════════
echo 📊 SIGUIENTE PASO: Ejecutar pruebas
echo ═══════════════════════════════════════════════════════════
echo.
echo Abre 2 terminales PowerShell en esta carpeta:
echo.
echo Terminal 1 - Monitoreo (ejecutar primero):
echo   node monitor-docker.js
echo.
echo Terminal 2 - Pruebas de carga (ejecutar después de 10 seg):
echo   k6 run load-test.js
echo.
echo Duración total: ~20 minutos
echo.
echo Cuando terminen ambas, ejecuta:
echo   node generate-performance-report.js
echo.
echo ═══════════════════════════════════════════════════════════
echo.

REM Mostrar logs en tiempo real (opcional)
echo ¿Quieres ver los logs del contenedor en tiempo real? (S/N)
set /p ver_logs="> "
if /i "%ver_logs%"=="S" (
    echo.
    echo Presiona Ctrl+C para salir de los logs
    echo.
    docker logs -f ooh-test
) else (
    echo.
    echo Para ver logs más tarde ejecuta: docker logs ooh-test
    echo.
)

pause
