@echo off
REM Script de deployment a Google Cloud Run para Windows
REM Uso: deploy-gcp.bat [backend|frontend|all]

setlocal enabledelayedexpansion

REM Obtener project ID
for /f "delims=" %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i

if "!PROJECT_ID!"=="" (
    echo Error: No hay project ID configurado.
    echo Ejecuta: gcloud config set project PROJECT_ID
    exit /b 1
)

set REGION=us-central1

echo.
echo Project ID: !PROJECT_ID!
echo Region: !REGION!
echo.

REM Verificar gcloud
where gcloud >nul 2>nul
if errorlevel 1 (
    echo Error: gcloud CLI no esta instalado
    echo Descargalo desde: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

setlocal
set TARGET=%1
if "!TARGET!"=="" set TARGET=all

if "!TARGET!"=="backend" goto deploy_backend
if "!TARGET!"=="frontend" goto deploy_frontend
if "!TARGET!"=="all" goto deploy_all
echo Uso: deploy-gcp.bat [backend^|frontend^|all]
exit /b 1

:deploy_backend
echo.
echo ==== DEPLOYMENT BACKEND ====
echo.
cd backend

echo Building Docker image...
call gcloud builds submit ^
    --tag gcr.io/!PROJECT_ID!/ooh-backend ^
    --project !PROJECT_ID!

if errorlevel 1 (
    echo Error en build
    exit /b 1
)

echo Deployando a Cloud Run...
call gcloud run deploy ooh-backend ^
    --image gcr.io/!PROJECT_ID!/ooh-backend ^
    --platform managed ^
    --region !REGION! ^
    --memory 512Mi ^
    --cpu 2 ^
    --timeout 3600 ^
    --max-instances 100 ^
    --min-instances 1 ^
    --allow-unauthenticated ^
    --set-env-vars GCP_PROJECT_ID=!PROJECT_ID!,GCP_STORAGE_BUCKET=ooh-images-prod,GCP_KEY_FILE=/etc/secrets/cloud-storage/key.json ^
    --quiet

echo.
echo Backend deployado exitosamente!
echo.
cd ..
exit /b 0

:deploy_frontend
echo Error: Primero deploya el backend con: deploy-gcp.bat backend
exit /b 1

:deploy_all
echo.
echo ==== DEPLOYMENT BACKEND ====
echo.
cd backend

echo Building Docker image...
call gcloud builds submit ^
    --tag gcr.io/!PROJECT_ID!/ooh-backend ^
    --project !PROJECT_ID!

if errorlevel 1 (
    echo Error en build del backend
    exit /b 1
)

echo Deployando a Cloud Run...
call gcloud run deploy ooh-backend ^
    --image gcr.io/!PROJECT_ID!/ooh-backend ^
    --platform managed ^
    --region !REGION! ^
    --memory 512Mi ^
    --cpu 2 ^
    --timeout 3600 ^
    --max-instances 100 ^
    --min-instances 1 ^
    --allow-unauthenticated ^
    --set-env-vars GCP_PROJECT_ID=!PROJECT_ID!,GCP_STORAGE_BUCKET=ooh-images-prod,GCP_KEY_FILE=/etc/secrets/cloud-storage/key.json ^
    --quiet

echo Backend deployado!

cd ..

echo.
echo ==== DEPLOYMENT FRONTEND ====
echo.
cd frontend

echo Building React app...
call npm run build

if errorlevel 1 (
    echo Error en build de React
    exit /b 1
)

echo Building Docker image...
call gcloud builds submit ^
    --tag gcr.io/!PROJECT_ID!/ooh-frontend ^
    --project !PROJECT_ID!

if errorlevel 1 (
    echo Error en build del frontend
    exit /b 1
)

echo Deployando a Cloud Run...
call gcloud run deploy ooh-frontend ^
    --image gcr.io/!PROJECT_ID!/ooh-frontend ^
    --platform managed ^
    --region !REGION! ^
    --memory 256Mi ^
    --cpu 1 ^
    --timeout 60 ^
    --max-instances 50 ^
    --min-instances 1 ^
    --allow-unauthenticated ^
    --quiet

echo.
echo ====================================
echo DEPLOYMENT COMPLETADO
echo ====================================
echo.

cd ..
exit /b 0
