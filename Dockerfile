# Multi-stage build para optimizar tamaño de imagen
# Stage 1: Build del frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copiar package.json y package-lock.json
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY frontend/ ./

# Build de producción
RUN npm run build

# Stage 2: Backend + Frontend estático
FROM node:18-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias para sql.js
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copiar package.json del backend
COPY backend/package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código del backend
COPY backend/ ./

# Copiar build del frontend desde stage anterior
COPY --from=frontend-build /app/frontend/build ./public

# Crear directorio para la base de datos y logs
RUN mkdir -p /app/data /app/logs

# Exponer puerto
EXPOSE 8080

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_FILE_PATH=/app/data/ooh_data.db
ENV USE_GCS=false
ENV USE_BIGQUERY=false

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar el servidor
CMD ["node", "server.js"]
