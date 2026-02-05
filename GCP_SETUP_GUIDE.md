# 🔐 Guía de Configuración - Cuenta de Servicio de GCP

Esta guía te ayudará a configurar una cuenta de servicio de Google Cloud Platform (GCP) para conectar tu aplicación OOH con **Cloud Storage** y **BigQuery**.

## 📋 Requisitos Previos

- Tener una cuenta de Google Cloud Platform
- Tener un proyecto de GCP creado
- Acceso de administrador al proyecto

## 🚀 Pasos de Configuración

### 1. Crear una Cuenta de Servicio

1. Ve a la [Consola de GCP](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Navega a: **IAM y administración** > **Cuentas de servicio**
4. Haz clic en **+ CREAR CUENTA DE SERVICIO**
5. Completa los datos:
   - **Nombre**: `ooh-backend-service`
   - **ID**: `ooh-backend-service` (se genera automáticamente)
   - **Descripción**: `Cuenta de servicio para backend OOH - acceso a Cloud Storage y BigQuery`
6. Haz clic en **CREAR Y CONTINUAR**

### 2. Asignar Permisos (Roles)

Asigna los siguientes roles a la cuenta de servicio:

#### Para Cloud Storage:
- **Storage Admin** (`roles/storage.admin`) - Gestión completa de buckets y objetos
- O si prefieres permisos más restrictivos:
  - **Storage Object Creator** (`roles/storage.objectCreator`) - Para subir archivos
  - **Storage Object Viewer** (`roles/storage.objectViewer`) - Para leer archivos

#### Para BigQuery:
- **BigQuery Admin** (`roles/bigquery.admin`) - Gestión completa de datasets y tablas
- O si prefieres permisos más restrictivos:
  - **BigQuery Data Editor** (`roles/bigquery.dataEditor`) - Para insertar/actualizar datos
  - **BigQuery Job User** (`roles/bigquery.jobUser`) - Para ejecutar queries

7. Haz clic en **CONTINUAR** y luego **LISTO**

### 3. Generar Clave JSON

1. En la lista de cuentas de servicio, encuentra la que acabas de crear
2. Haz clic en los **3 puntos** (menú de acciones) > **Administrar claves**
3. Haz clic en **AGREGAR CLAVE** > **Crear clave nueva**
4. Selecciona el tipo **JSON**
5. Haz clic en **CREAR**
6. Se descargará un archivo JSON (ejemplo: `ooh-backend-service-abc123.json`)

⚠️ **IMPORTANTE**: Guarda este archivo en un lugar seguro. **NO lo subas a Git o repositorios públicos**.

### 4. Crear Bucket de Cloud Storage

1. Ve a **Cloud Storage** > **Buckets**
2. Haz clic en **CREAR BUCKET**
3. Configuración recomendada:
   - **Nombre**: `ooh-images-prod` (o el nombre que prefieras - debe ser único globalmente)
   - **Tipo de ubicación**: Region
   - **Ubicación**: `us-east1` (o la más cercana a tus usuarios)
   - **Clase de almacenamiento**: Standard
   - **Control de acceso**: Uniforme (recomendado)
   - **Protección de datos**: 
     - Activar versionamiento si deseas (opcional)
     - Control de acceso público: Impedir el acceso público (recomendado)
4. Haz clic en **CREAR**

### 5. Habilitar APIs de GCP

Asegúrate de que las siguientes APIs están habilitadas en tu proyecto:

1. Ve a **APIs y servicios** > **Biblioteca**
2. Busca y habilita:
   - **Cloud Storage API**
   - **BigQuery API**

O ejecuta estos comandos en Cloud Shell:
```bash
gcloud services enable storage-api.googleapis.com
gcloud services enable bigquery.googleapis.com
```

### 6. Configurar el Proyecto

#### 6.1 Copiar el Archivo de Credenciales

1. Crea una carpeta `config` en el directorio `backend`:
   ```bash
   cd backend
   mkdir config
   ```

2. Copia el archivo JSON descargado a `backend/config/`:
   ```bash
   # En Windows PowerShell
   Copy-Item "C:\ruta\a\tu\ooh-backend-service-abc123.json" -Destination ".\backend\config\service-account-key.json"
   ```

3. Asegúrate de que `config/` está en tu `.gitignore`:
   ```
   # En backend/.gitignore
   config/
   *.json
   ```

#### 6.2 Crear Archivo .env

1. Copia el archivo de ejemplo:
   ```bash
   cd backend
   Copy-Item .env.example -Destination .env
   ```

2. Edita el archivo `.env` con tus valores:
   ```env
   PORT=8080

   # Google Cloud Platform Configuration
   GCP_PROJECT_ID=tu-proyecto-id
   GCP_STORAGE_BUCKET=ooh-images-prod
   GCP_KEY_FILE=./config/service-account-key.json

   # BigQuery Configuration
   BQ_DATASET_ID=ooh_dataset
   BQ_TABLE_ID=ooh_records

   # Activar/Desactivar servicios de GCP
   USE_GCS=true
   USE_BIGQUERY=true

   # Path to Excel file (opcional - backup local)
   EXCEL_FILE_PATH=./ooh_data.xlsx
   ```

3. **Obtener tu Project ID**:
   - Ve a la Consola de GCP
   - En el menú superior, verás el nombre del proyecto con un ID entre paréntesis
   - O ejecuta: `gcloud config get-value project` en Cloud Shell

### 7. Instalar Dependencias

```bash
cd backend
npm install
```

Esto instalará las bibliotecas necesarias:
- `@google-cloud/storage`
- `@google-cloud/bigquery`

### 8. Inicializar BigQuery (Primera Vez)

El sistema creará automáticamente el dataset y tabla en BigQuery al iniciar. Para hacerlo manualmente:

1. Crea un script de inicialización (`backend/init-bigquery.js`):
```javascript
require('dotenv').config();
const bigQueryService = require('./services/bigQueryService');

async function init() {
  try {
    console.log('🔧 Inicializando BigQuery...');
    await bigQueryService.initializeBigQuery();
    console.log('✅ BigQuery inicializado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

init();
```

2. Ejecuta:
```bash
node init-bigquery.js
```

### 9. Verificar la Configuración

1. Inicia el servidor:
   ```bash
   npm start
   ```

2. Verifica los logs de inicio:
   ```
   🔧 Configuración de almacenamiento:
      - Cloud Storage (GCS): ACTIVADO
      - BigQuery: ACTIVADO
      - Almacenamiento local: DESACTIVADO
   ```

3. Prueba subiendo un registro desde el frontend

4. Verifica en GCP:
   - **Cloud Storage**: Ve a tu bucket y busca la carpeta `ooh-images/{MARCA}/{RECORD_ID}/`
   - **BigQuery**: Ve a tu dataset `ooh_dataset` y consulta la tabla `ooh_records`

## 🔒 Seguridad - Mejores Prácticas

### ❌ NO HACER:
- ❌ No subas el archivo `service-account-key.json` a Git
- ❌ No compartas el archivo de credenciales públicamente
- ❌ No uses la cuenta de servicio para otros proyectos

### ✅ SÍ HACER:
- ✅ Usa variables de entorno para las credenciales
- ✅ Agrega `config/` y `.env` al `.gitignore`
- ✅ Usa diferentes cuentas de servicio para desarrollo y producción
- ✅ Rota las claves periódicamente
- ✅ Usa permisos mínimos necesarios (principio de menor privilegio)

### Archivo .gitignore Recomendado:

```gitignore
# Credenciales y configuración sensible
.env
.env.local
.env.production
config/
*-key.json
service-account*.json

# Node
node_modules/
npm-debug.log

# Base de datos local
*.db
*.sqlite
```

## 🌍 Despliegue en Producción

### Para Cloud Run / App Engine:

En lugar de usar un archivo de credenciales, usa la cuenta de servicio predeterminada:

```javascript
// En services/gcsService.js y bigQueryService.js
// NO especifiques keyFilename en producción
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  // keyFilename: process.env.GCP_KEY_FILE  // Comentar en producción
});
```

Y asigna la cuenta de servicio del entorno al desplegar.

### Variables de Entorno en Cloud Run:

```bash
gcloud run deploy ooh-backend \
  --source . \
  --set-env-vars "GCP_PROJECT_ID=tu-proyecto-id" \
  --set-env-vars "GCP_STORAGE_BUCKET=ooh-images-prod" \
  --set-env-vars "BQ_DATASET_ID=ooh_dataset" \
  --set-env-vars "USE_GCS=true" \
  --set-env-vars "USE_BIGQUERY=true"
```

## 📊 Estructura de Almacenamiento

### Cloud Storage:
```
ooh-images-prod/
└── ooh-images/
    ├── AGUILA/
    │   ├── REC-001/
    │   │   ├── imagen_1.jpg
    │   │   ├── imagen_2.jpg
    │   │   └── imagen_3.jpg
    │   └── REC-002/
    ├── POKER/
    └── CLUB_COLOMBIA/
```

### BigQuery:
- Dataset: `ooh_dataset`
- Tabla: `ooh_records`
- Esquema: Ver [bigQueryService.js](./services/bigQueryService.js) líneas 28-77

## 🆘 Troubleshooting

### Error: "Could not load the default credentials"
- Verifica que el archivo `service-account-key.json` existe
- Verifica que la ruta en `.env` es correcta
- Verifica que `GCP_KEY_FILE` apunta al archivo correcto

### Error: "Permission denied"
- Verifica que la cuenta de servicio tiene los roles necesarios
- Revisa los permisos en IAM

### Error: "Bucket not found"
- Verifica que el bucket existe
- Verifica que el nombre del bucket en `.env` es correcto
- Verifica que la cuenta de servicio tiene acceso al bucket

### Error al crear tabla en BigQuery
- Verifica que el dataset existe (se crea automáticamente)
- Verifica los permisos de BigQuery Admin
- Revisa la ubicación (location) del dataset

## 📚 Recursos Adicionales

- [Documentación de Cloud Storage](https://cloud.google.com/storage/docs)
- [Documentación de BigQuery](https://cloud.google.com/bigquery/docs)
- [Mejores prácticas de seguridad](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Autenticación de cuentas de servicio](https://cloud.google.com/docs/authentication/getting-started)

---

¿Necesitas ayuda? Consulta los logs del servidor o revisa la consola de GCP para más detalles.
