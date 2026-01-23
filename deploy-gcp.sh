#!/bin/bash

# Script de deployment a Google Cloud Run
# Uso: ./deploy-gcp.sh [backend|frontend|all]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir
print_step() {
    echo -e "${GREEN}→ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Verificar que gcloud esté instalado
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI no está instalado. Instálalo desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Obtener project ID
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

if [ -z "$PROJECT_ID" ]; then
    print_error "No hay project ID configurado. Ejecuta: gcloud config set project PROJECT_ID"
    exit 1
fi

print_step "Usando Project ID: $PROJECT_ID"
print_step "Región: $REGION"

# Funciones de deployment
deploy_backend() {
    print_step "Iniciando deployment del backend..."
    
    cd backend
    
    # Build de imagen Docker
    print_step "Building imagen Docker..."
    gcloud builds submit \
        --tag gcr.io/$PROJECT_ID/ooh-backend \
        --project $PROJECT_ID
    
    # Deploy a Cloud Run
    print_step "Deployando a Cloud Run..."
    SERVICE_URL=$(gcloud run deploy ooh-backend \
        --image gcr.io/$PROJECT_ID/ooh-backend \
        --platform managed \
        --region $REGION \
        --memory 512Mi \
        --cpu 2 \
        --timeout 3600 \
        --max-instances 100 \
        --min-instances 1 \
        --allow-unauthenticated \
        --set-env-vars \
            GCP_PROJECT_ID=$PROJECT_ID,\
            GCP_STORAGE_BUCKET=ooh-images-prod,\
            GCP_KEY_FILE=/etc/secrets/cloud-storage/key.json \
        --quiet \
        --format='value(status.url)')
    
    print_step "✓ Backend deployado exitosamente"
    echo -e "${GREEN}URL: $SERVICE_URL${NC}"
    
    cd ..
    
    echo $SERVICE_URL
}

deploy_frontend() {
    BACKEND_URL=$1
    
    print_step "Iniciando deployment del frontend..."
    
    cd frontend
    
    # Crear .env.production
    print_step "Creando .env.production..."
    cat > .env.production << EOF
REACT_APP_API_URL=$BACKEND_URL
EOF
    
    print_step "Building React app..."
    npm run build
    
    # Build de imagen Docker
    print_step "Building imagen Docker..."
    gcloud builds submit \
        --tag gcr.io/$PROJECT_ID/ooh-frontend \
        --project $PROJECT_ID
    
    # Deploy a Cloud Run
    print_step "Deployando a Cloud Run..."
    FRONTEND_URL=$(gcloud run deploy ooh-frontend \
        --image gcr.io/$PROJECT_ID/ooh-frontend \
        --platform managed \
        --region $REGION \
        --memory 256Mi \
        --cpu 1 \
        --timeout 60 \
        --max-instances 50 \
        --min-instances 1 \
        --allow-unauthenticated \
        --quiet \
        --format='value(status.url)')
    
    print_step "✓ Frontend deployado exitosamente"
    echo -e "${GREEN}URL: $FRONTEND_URL${NC}"
    
    cd ..
    
    echo $FRONTEND_URL
}

# Main
TARGET=${1:-all}

case $TARGET in
    backend)
        deploy_backend
        ;;
    frontend)
        print_warning "Para deployar frontend necesitas la URL del backend"
        echo "Uso: ./deploy-gcp.sh frontend <BACKEND_URL>"
        exit 1
        ;;
    all)
        BACKEND_URL=$(deploy_backend)
        print_step "Esperando antes de deployar frontend..."
        sleep 5
        FRONTEND_URL=$(deploy_frontend $BACKEND_URL)
        
        echo ""
        echo "======================================"
        echo "✓ DEPLOYMENT COMPLETADO"
        echo "======================================"
        echo -e "Backend URL:  ${GREEN}$BACKEND_URL${NC}"
        echo -e "Frontend URL: ${GREEN}$FRONTEND_URL${NC}"
        echo ""
        ;;
    *)
        echo "Uso: ./deploy-gcp.sh [backend|frontend|all]"
        exit 1
        ;;
esac
