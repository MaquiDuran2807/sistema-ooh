# 🔧 OOH Backend

Backend en Node.js/Express para el sistema de gestión OOH con soporte para **Google Cloud Platform** (Cloud Storage + BigQuery).

---

## 📦 Instalación

```bash
npm install
```

---

## ⚙️ Configuración

### Opción 1: Script Automático (Recomendado)

```bash
.\setup-env.bat
```

Este script interactivo te guiará para:
- Crear el archivo `.env`
- Configurar GCP (Project ID, Bucket)
- Activar/desactivar servicios cloud

### Opción 2: Manual

1. Copia `.env.example` a `.env`:
   ```bash
   Copy-Item .env.example -Destination .env
   ```

2. Edita `.env` con tus valores:
   ```env
   PORT=8080

   # Google Cloud Platform
   GCP_PROJECT_ID=zenith-abi
   GCP_STORAGE_BUCKET=publicis-abi
   GCP_HISTORICO_BUCKET=publicis-abi
   GCP_KEY_FILE=./config/service-account-key.json

   # BigQuery
   BQ_DATASET_ID=raw_zenith
   BQ_TABLE_ID=raw_ooh_records

   # Activar/Desactivar GCP
   USE_GCS=true          # true para usar Cloud Storage
   USE_BIGQUERY=true     # true para usar BigQuery

   # Local (opcional)
   EXCEL_FILE_PATH=./ooh_data.xlsx
   ```

3. **(Solo si usas GCP)** Coloca tu archivo de credenciales:
   ```
   backend/config/service-account-key.json
   ```

---

## 🗂️ Arquitectura de Almacenamiento en GCP

### 📁 Estructura de Carpetas en Cloud Storage

Las imágenes se almacenan en el bucket `publicis-abi` con la siguiente estructura:

```
publicis-abi/
└── Historico/
    └── OOH-APP-IMAGES/
        └── {MARCA}/              # Ejemplo: AGUILA, POKER, CLUB_COLOMBIA
            └── {RECORD-ID}/      # UUID único del registro
                ├── imagen_1.jpg
                ├── imagen_2.jpg
                └── imagen_3.jpg
```

### 🔗 URLs Públicas

Las imágenes son accesibles públicamente con el formato:
```
https://storage.googleapis.com/publicis-abi/Historico/OOH-APP-IMAGES/{MARCA}/{RECORD-ID}/imagen_{N}.jpg
```

**Ejemplo:**
```
https://storage.googleapis.com/publicis-abi/Historico/OOH-APP-IMAGES/AGUILA/abc-123-xyz/imagen_1.jpg
```

### 📍 Convenciones de Nombres

- **Marcas**: Se normalizan a MAYÚSCULAS y se reemplazan espacios por guiones bajos
  - `Club Colombia` → `CLUB_COLOMBIA`
  - `Pony Malta` → `PONY_MALTA`

- **Record IDs**: UUID v4 generado automáticamente
  - Ejemplo: `164fecbb-9919-4e55-b34c-948f61fcee84`

- **Imágenes**: Numeradas secuencialmente (1, 2, 3)
  - Se preserva la extensión original (.jpg, .png, .jpeg)

### 🔧 Script de Configuración Inicial

Si necesitas recrear la estructura de carpetas:

```bash
node create-ooh-folder.js
```

Este script:
- Verifica la existencia del bucket `publicis-abi`
- Crea la estructura `Historico/OOH-APP-IMAGES/`
- Configura permisos de lectura pública

---

## ☁️ Configuración de Google Cloud Platform

Para usar Cloud Storage y BigQuery:

1. **Lee la guía completa**: [../GCP_SETUP_GUIDE.md](../GCP_SETUP_GUIDE.md)

2. **Resumen rápido**:
   - Crea cuenta de servicio en GCP
   - Descarga credenciales JSON
   - Coloca en `backend/config/service-account-key.json`
   - Configura `.env` (ver arriba)

3. **Inicializa BigQuery** (primera vez):
   ```bash
   npm run init:bigquery
   ```

---

## 🚀 Desarrollo

```bash
npm run dev
```

Inicia el servidor con **nodemon** (recarga automática).

---

## 🏭 Producción

```bash
npm start
```

---

## 📊 Scripts Disponibles

```bash
npm start              # Iniciar servidor
npm run dev            # Desarrollo con nodemon
npm test               # Ejecutar tests
npm run seed:records   # Poblar BD con datos de prueba
npm run init:bigquery  # Inicializar BigQuery (☁️)
```

---

## 🔌 API Endpoints

### Registros OOH
```
GET    /api/ooh/initialize              # Cargar datos maestros
GET    /api/ooh/all?page=1&limit=50     # Listar (paginado)
GET    /api/ooh/:id                     # Obtener por ID
POST   /api/ooh/create                  # Crear/actualizar
DELETE /api/ooh/:id                     # Eliminar
```

### Ciudades
```
GET    /api/ooh/cities                  # Todas las ciudades
GET    /api/ooh/cities/by-name          # Buscar por nombre
POST   /api/ooh/cities/create           # Crear ciudad
POST   /api/ooh/cities/validate         # Validar nombre
```

### Direcciones
```
POST   /api/ooh/addresses/create        # Crear con validación geo
```

### Reportes
```
GET    /api/ooh/report/ppt?month=2026-01&useBase=true
```

---

## 🗂️ Estructura de Servicios

```
services/
├── dbService.js              # SQLite (base de datos local)
├── gcsService.js             # ☁️ Google Cloud Storage
├── bigQueryService.js        # ☁️ BigQuery
├── geoValidationService.js   # Validación geográfica
├── localStorageService.js    # Almacenamiento local de imágenes
└── pptService.js             # Generación de reportes PPT
```

### Servicios de GCP (☁️)

#### gcsService.js
- `uploadToGCS(files, brand, recordId)` - Subir imágenes a `Historico/OOH-APP-IMAGES/{MARCA}/{RECORD-ID}/`
- `deleteFromGCS(imageUrl)` - Eliminar imagen individual
- `deleteRecordFolder(brand, recordId)` - Eliminar todas las imágenes de un registro
- `listFiles(prefix, brand, recordId)` - Listar archivos por marca/registro
- `getRecordImages(brand, recordId)` - Obtener URLs de todas las imágenes de un registro

**Organización:**
- Ruta: `publicis-abi/Historico/OOH-APP-IMAGES/{MARCA}/{RECORD-ID}/imagen_X.jpg`
- URLs públicas: `https://storage.googleapis.com/publicis-abi/Historico/OOH-APP-IMAGES/...`

#### bigQueryService.js
- `initializeBigQuery()` - Crear dataset/tabla
- `insertOOHRecord(record)` - Insertar registro
- `updateOOHRecord(record)` - Actualizar registro
- `queryOOHRecords(filters)` - Consultar con filtros
- `getOOHRecordById(id)` - Obtener por ID
- `deleteOOHRecord(id)` - Eliminar
- `getStatsByBrand()` - Estadísticas por marca

---

## 🧪 Tests

```bash
# Todos los tests
npm test

# Tests específicos
npx jest __tests__/addresses-create.test.js
npx jest __tests__/create-edit-complete.test.js
npx jest __tests__/geo-validation.test.js
```

---

## 🔒 Seguridad

### ❌ Nunca subas a Git:
- `backend/.env`
- `backend/config/`
- `*-key.json`
- `service-account*.json`

### ✅ Archivos protegidos en `.gitignore`:
```gitignore
.env
.env.local
.env.production
config/
*-key.json
service-account*.json
*.db
```

---

## 📚 Documentación Adicional

- [Guía de Configuración GCP](../GCP_SETUP_GUIDE.md)
- [Resumen de Integración GCP](../GCP_INTEGRATION_SUMMARY.md)
- [README Principal](../README.md)
- [Guía de Tests](../TESTS_GUIDE.md)

---

## 🆘 Troubleshooting

### Error: "Could not load default credentials"
- Verifica que `GCP_KEY_FILE` apunte al archivo correcto
- Verifica que el archivo JSON existe en `backend/config/`

### Error: "Bucket not found"
- Verifica `GCP_STORAGE_BUCKET` en `.env`
- Verifica que la cuenta de servicio tenga acceso

### Error al crear tabla en BigQuery
- Ejecuta: `npm run init:bigquery`
- Verifica permisos de BigQuery Admin

---

## 📄 Licencia

Proyecto privado - Todos los derechos reservados
