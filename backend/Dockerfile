FROM node:18-alpine

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código de la aplicación
COPY . .

# Exponer puerto (Cloud Run usa 8080 por defecto)
EXPOSE 8080

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
