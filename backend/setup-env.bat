@echo off
REM Script para configurar el archivo .env del backend

echo ========================================
echo Configuracion del Backend - Variables de Entorno
echo ========================================
echo.

REM Verificar si ya existe .env
if exist .env (
    echo [AVISO] Ya existe un archivo .env
    set /p OVERWRITE="¿Deseas sobrescribirlo? (S/N): "
    if /i not "%OVERWRITE%"=="S" (
        echo.
        echo Operacion cancelada.
        pause
        exit /b
    )
)

REM Copiar desde .env.example
if exist .env.example (
    copy .env.example .env
    echo.
    echo [OK] Archivo .env creado desde .env.example
) else (
    echo [ERROR] No se encontro .env.example
    pause
    exit /b 1
)

echo.
echo ========================================
echo Configuracion de GCP
echo ========================================
echo.
echo Para configurar GCP, necesitas:
echo   1. Project ID de GCP
echo   2. Nombre del bucket de Cloud Storage
echo   3. Archivo de credenciales (service account key JSON)
echo.
echo ¿Deseas configurar GCP ahora? (Puedes hacerlo manualmente despues)
set /p CONFIGURE_GCP="(S/N): "

if /i "%CONFIGURE_GCP%"=="S" (
    echo.
    set /p GCP_PROJECT_ID="Ingresa tu GCP Project ID: "
    set /p GCP_BUCKET="Ingresa el nombre de tu bucket (ej: ooh-images-prod): "
    
    echo.
    echo Coloca tu archivo de credenciales en: backend\config\service-account-key.json
    echo.
    
    REM Crear directorio config si no existe
    if not exist config mkdir config
    
    REM Actualizar .env con los valores
    powershell -Command "(Get-Content .env) -replace 'your-gcp-project-id', '%GCP_PROJECT_ID%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'ooh-images-prod', '%GCP_BUCKET%' | Set-Content .env"
    
    echo.
    echo [OK] Valores de GCP actualizados en .env
    echo.
    echo IMPORTANTE: No olvides copiar tu archivo de credenciales a:
    echo   backend\config\service-account-key.json
    echo.
)

echo.
echo ========================================
echo ¿Deseas activar los servicios de GCP?
echo ========================================
echo.
set /p USE_GCS="Activar Cloud Storage (S/N): "
set /p USE_BIGQUERY="Activar BigQuery (S/N): "

if /i "%USE_GCS%"=="S" (
    powershell -Command "(Get-Content .env) -replace 'USE_GCS=false', 'USE_GCS=true' | Set-Content .env"
    echo [OK] Cloud Storage ACTIVADO
)

if /i "%USE_BIGQUERY%"=="S" (
    powershell -Command "(Get-Content .env) -replace 'USE_BIGQUERY=false', 'USE_BIGQUERY=true' | Set-Content .env"
    echo [OK] BigQuery ACTIVADO
)

echo.
echo ========================================
echo Configuracion completada
echo ========================================
echo.
echo Archivo .env creado exitosamente
echo.
echo Proximos pasos:
echo   1. Revisa y edita el archivo .env si es necesario
echo   2. Si usas GCP, copia las credenciales a backend\config\
echo   3. Ejecuta: npm install
if /i "%USE_BIGQUERY%"=="S" (
    echo   4. Ejecuta: npm run init:bigquery
    echo   5. Ejecuta: npm start
) else (
    echo   4. Ejecuta: npm start
)
echo.
echo Para mas informacion, consulta: GCP_SETUP_GUIDE.md
echo.

pause
