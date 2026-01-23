# 🚀 Guía de Despliegue (Deployment)

## Opciones de Despliegue

### Para Desarrollo
- ✅ Localhost (tu máquina)

### Para Pequeños Negocios
- 🟡 Heroku (PaaS simple)
- 🟡 Railway (PaaS moderno)
- 🟡 Render (PaaS fácil)

### Para Producción
- 🔵 GCP (Cloud Run + Cloud Storage) ⭐ **RECOMENDADO**
- 🔵 AWS (EC2 + RDS + S3)
- 🔵 Azure (App Service + SQL)
- 🔵 DigitalOcean (App Platform)
- 🔵 Docker + Kubernetes (Cloud-agnostic)

---

## 🟡 Opción 1: Heroku (Más Fácil)

### Prerequisites
- Cuenta Heroku
- Heroku CLI instalado

### Backend

1. **Crear app en Heroku**
```bash
heroku login
heroku create mi-app-ooh-backend
```

2. **Preparar para Heroku**
```bash
cd backend
echo "node_modules/" >> .gitignore
```

3. **Agregar Procfile**
```bash
echo "web: node server.js" > Procfile
```

4. **Configurar variables de entorno**
```bash
heroku config:set AWS_ACCESS_KEY_ID=tu_key
heroku config:set AWS_SECRET_ACCESS_KEY=tu_secret
heroku config:set AWS_REGION=us-east-1
heroku config:set AWS_S3_BUCKET=tu-bucket
heroku config:set EXCEL_FILE_PATH=/tmp/ooh_data.xlsx
```

5. **Deploy**
```bash
git push heroku main
```

6. **Ver logs**
```bash
heroku logs --tail
```

### Frontend

1. **Crear app Heroku**
```bash
heroku create mi-app-ooh-frontend
```

2. **Crear buildpack**
```bash
heroku buildpacks:add heroku/node
heroku buildpacks:add https://github.com/mars/create-react-app-buildpack.git
```

3. **Configurar API URL**
```bash
cd frontend
heroku config:set REACT_APP_API_URL=https://mi-app-ooh-backend.herokuapp.com
```

4. **Deploy**
```bash
git push heroku main
```

---

## 🔵 Opción 2: GCP (Cloud Run + Cloud Storage) ⭐ RECOMENDADO

GCP Cloud Run es ideal para aplicaciones como la tuya - serverless, escalable y muy económico.

### Prerequisitos
- Cuenta GCP activa (con free tier: $300 crédito)
- gcloud CLI instalado: https://cloud.google.com/sdk/docs/install
- Proyecto GCP creado

### Paso 1: Configurar gcloud CLI

```bash
gcloud init
gcloud auth login
gcloud config set project PROJECT_ID
```

### Paso 2: Crear Cloud Storage Bucket

```bash
# Crear bucket para imágenes OOH
gcloud storage buckets create gs://ooh-images-prod \
  --location=us-central1 \
  --uniform-bucket-level-access

# Permitir acceso público (lectura)
gcloud storage buckets add-iam-policy-binding gs://ooh-images-prod \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

### Paso 3: Crear Service Account

```bash
# Crear cuenta de servicio
gcloud iam service-accounts create ooh-backend-sa \
  --display-name="OOH Backend Service Account"

# Dar permisos de almacenamiento
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:ooh-backend-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Crear clave JSON
gcloud iam service-accounts keys create ~/ooh-key.json \
  --iam-account=ooh-backend-sa@PROJECT_ID.iam.gserviceaccount.com
```

### Paso 4: Actualizar backend para GCP

Instala el paquete de Google Cloud:

```bash
cd backend
npm install @google-cloud/storage
```

Crea `backend/services/gcsService.js`:

```javascript
const {Storage} = require('@google-cloud/storage');
const {v4: uuidv4} = require('uuid');

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE
});

const bucket = storage.bucket(process.env.GCP_STORAGE_BUCKET);

const uploadToGCS = async (files) => {
  try {
    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const filename = `ooh-images/${Date.now()}-${uuidv4()}-${file.originalname}`;
        const gcsFile = bucket.file(filename);

        gcsFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype
          }
        }, (err) => {
          if (err) {
            reject(new Error('Error al subir imagen a Cloud Storage'));
          } else {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
            resolve(publicUrl);
          }
        });
      });
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error al subir a GCS:', error);
    throw error;
  }
};

const deleteFromGCS = async (imageUrl) => {
  try {
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    await bucket.file(filename).delete();
  } catch (error) {
    console.error('Error al eliminar de GCS:', error);
  }
};

module.exports = {
  uploadToGCS,
  deleteFromGCS
};
```

Actualiza `backend/routes/ooh.js`:

```javascript
const gcsService = require('../services/gcsService');  // Cambiar de s3Service

// En createOOH:
const imageUrls = await gcsService.uploadToGCS(req.files);  // Cambiar de s3Service
```

### Paso 5: Preparar Backend para Cloud Run

Cloud Run usa puerto 8080. Actualiza `backend/server.js`:

```javascript
const PORT = process.env.PORT || 8080;
```

Crea `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
```

Crea `.dockerignore` en la raíz del backend:

```
node_modules
npm-debug.log
.env
.git
```

### Paso 6: Deploy Backend a Cloud Run

```bash
cd backend

# Build y push a Artifact Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/ooh-backend

# Deploy a Cloud Run
gcloud run deploy ooh-backend \
  --image gcr.io/PROJECT_ID/ooh-backend \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --timeout 3600 \
  --set-env-vars \
    GCP_PROJECT_ID=PROJECT_ID,\
    GCP_STORAGE_BUCKET=ooh-images-prod,\
    GCP_KEY_FILE=/etc/secrets/cloud-storage/key.json \
  --allow-unauthenticated

# Obtener URL del servicio (la necesitarás para el frontend)
gcloud run services describe ooh-backend --region us-central1
```

Copia la URL del servicio, debería ser algo como:
```
https://ooh-backend-XXXXXXXX-uc.a.run.app
```

### Paso 7: Preparar Frontend para Cloud Run

Frontend también puede correr en Cloud Run. Crea `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# Copiar configuración nginx para SPA
RUN echo 'server { listen 8080; root /usr/share/nginx/html; \
  location / { try_files $uri $uri/ /index.html; } }' \
  > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

### Paso 8: Configurar variables de entorno del Frontend

Crea `frontend/.env.production`:

```
REACT_APP_API_URL=https://ooh-backend-XXXXXXXX-uc.a.run.app
```

Reemplaza la URL con la que obtuviste en el Paso 6.

### Paso 9: Deploy Frontend a Cloud Run

```bash
cd frontend

# Build y deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/ooh-frontend

gcloud run deploy ooh-frontend \
  --image gcr.io/PROJECT_ID/ooh-frontend \
  --platform managed \
  --region us-central1 \
  --memory 256Mi \
  --allow-unauthenticated

# Obtener URL
gcloud run services describe ooh-frontend --region us-central1
```

### Paso 10: Configurar Cloud CDN (Opcional pero recomendado)

```bash
# Crear backend bucket
gcloud compute backend-buckets create ooh-frontend-backend \
  --gcs-uri-prefix=gs://ooh-frontend-frontend \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC

# Crear URL map
gcloud compute url-maps create ooh-lb \
  --default-backend-bucket=ooh-frontend-backend

# Crear certificado SSL (necesitas tu dominio)
gcloud compute ssl-certificates create ooh-cert \
  --domains=tu-dominio.com

# Crear HTTPS proxy
gcloud compute target-https-proxies create ooh-https-proxy \
  --ssl-certificates=ooh-cert \
  --url-map=ooh-lb

# Reservar IP estática
gcloud compute addresses create ooh-ip --global

# Crear regla de forwarding
gcloud compute forwarding-rules create ooh-https-fw \
  --global \
  --target-https-proxy=ooh-https-proxy \
  --address=ooh-ip \
  --ports=443
```

### Paso 11: Configurar dominio personalizado (Opcional)

En tu registrador de dominio, actualiza los DNS records:

```
A record -> IP_ADDRESS (obtenida de paso anterior)
```

---

## 🔵 Opción 3: AWS (EC2 + S3)

Para instrucciones de AWS, consulta la [documentación oficial de AWS](https://aws.amazon.com/documentation/)

---

## 🐳 Opción 3: Docker + Any Cloud

### Dockerfile Backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Dockerfile Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - EXCEL_FILE_PATH=/tmp/ooh_data.xlsx
    volumes:
      - ./backend/ooh_data.xlsx:/tmp/ooh_data.xlsx

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
```

### Ejecutar localmente con Docker

```bash
docker-compose up
```

### Deploy en Kubernetes

1. **Build y push images**
```bash
docker build -t tu-usuario/ooh-backend ./backend
docker build -t tu-usuario/ooh-frontend ./frontend
docker push tu-usuario/ooh-backend
docker push tu-usuario/ooh-frontend
```

2. **Crear manifiestos Kubernetes**

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ooh-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ooh-backend
  template:
    metadata:
      labels:
        app: ooh-backend
    spec:
      containers:
      - name: backend
        image: tu-usuario/ooh-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-key
```

3. **Deploy**
```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
```

---

## 🔐 Configuración de Producción

### Variables de Entorno

```env
# .env.production
NODE_ENV=production
PORT=5000

# AWS
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
AWS_REGION=us-east-1
AWS_S3_BUCKET=prod-bucket

# Excel
EXCEL_FILE_PATH=/persistent/ooh_data.xlsx

# Seguridad
JWT_SECRET=***
CORS_ORIGIN=https://tu-dominio.com
```

### HTTPS

1. **Usar certificado Let's Encrypt**
```bash
sudo yum install -y certbot python2-certbot-nginx
sudo certbot certonly --nginx -d tu-dominio.com
```

2. **Actualizar Nginx**
```nginx
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
```

### Bases de Datos

Para escalar, reemplaza Excel con PostgreSQL:

```yaml
# docker-compose con PostgreSQL
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ooh_db
      POSTGRES_USER: ooh_user
      POSTGRES_PASSWORD: ***
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

### Backup

```bash
# Backup automático diario
0 2 * * * aws s3 cp ooh_data.xlsx s3://backups/ooh_$(date +%Y%m%d).xlsx
```

### Monitoreo

```bash
# Sentry para errores
npm install @sentry/node
sentry init --dsn YOUR_DSN

# New Relic para APM
npm install newrelic
node -r newrelic server.js
```

---

## 📊 Comparación de Opciones

| Opción | Costo | Escalabilidad | Facilidad |
|--------|-------|---------------|-----------|
| Localhost | Gratis | Baja | ⭐⭐⭐⭐⭐ |
| Heroku | $7-50/mes | Media | ⭐⭐⭐⭐ |
| Railway | $5+/mes | Media | ⭐⭐⭐⭐ |
| AWS | $5-500+/mes | Alta | ⭐⭐ |
| Azure | $5-500+/mes | Alta | ⭐⭐ |
| GCP | $5-500+/mes | Alta | ⭐⭐ |

---

## ✅ Checklist Pre-Deployment

- [ ] Verificar todas las variables de entorno
- [ ] Tests unitarios pasando
- [ ] Tests de integración pasando
- [ ] HTTPS configurado
- [ ] CORS configurado correctamente
- [ ] Backups automáticos habilitados
- [ ] Logs configurados
- [ ] Monitoreo habilitado
- [ ] Documentación actualizada
- [ ] Health check funcionando
- [ ] Rate limiting implementado (si es necesario)
- [ ] Autenticación funcionando
- [ ] Performance optimizado

---

## 🚨 Pasos Post-Deployment

1. **Verificar que todo está corriendo**
```bash
curl https://tu-dominio.com/health
```

2. **Revisar logs**
```bash
tail -f /var/log/application.log
```

3. **Monitorear performance**
- Usar New Relic, DataDog o similar
- Configurar alertas

4. **Backup inicial**
```bash
aws s3 cp ooh_data.xlsx s3://backups/initial-backup.xlsx
```

5. **Configurar backup automático**
- CloudWatch Events + Lambda
- Cron job automático

---

## 🆘 Troubleshooting Deployment

### Backend no inicia
```bash
# Ver logs
pm2 logs ooh-backend
# Ver logs del sistema
journalctl -u nginx -f
```

### Errores de conexión S3
- Verificar credenciales AWS
- Verificar permisos IAM
- Verificar nombre del bucket

### Frontend no carga
- Verificar REACT_APP_API_URL
- Verificar CORS headers
- Revisar console del navegador (F12)

### Slow performance
- Agregar caché (Redis)
- Optimizar imágenes
- Usar CDN
- Índices en base de datos

---

## 📚 Recursos Útiles

- [Heroku Node.js Documentation](https://devcenter.heroku.com/articles/nodejs-support)
- [AWS EC2 Tutorial](https://docs.aws.amazon.com/ec2/index.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

---

**Consejo**: Para producción, comienza con Heroku o Railway. Son simples de usar y luego puedes migrar a AWS/Azure cuando crezcas.
