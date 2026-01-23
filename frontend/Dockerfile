# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para build)
RUN npm ci

# Copiar código fuente
COPY . .

# Build de la aplicación React
RUN npm run build

# Stage 2: Runtime
FROM nginx:alpine

# Copiar archivos estáticos de build al directorio de nginx
COPY --from=build /app/build /usr/share/nginx/html

# Configurar nginx para SPA (single page application)
# Esto permite que cualquier ruta vaya a index.html
RUN echo 'server { \
  listen 8080; \
  root /usr/share/nginx/html; \
  \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
  \
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
    expires 1y; \
    add_header Cache-Control "public, immutable"; \
  } \
}' > /etc/nginx/conf.d/default.conf

# Exponer puerto 8080 (requerido por Cloud Run)
EXPOSE 8080

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
