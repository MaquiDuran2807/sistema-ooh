# 📦 Resumen de Integración GCP

## ✅ Archivos Creados/Modificados

### Nuevos Servicios
1. **`backend/services/bigQueryService.js`** - Servicio completo de BigQuery
   - Inicialización automática de dataset y tabla
   - CRUD completo de registros OOH
   - Consultas y estadísticas
   - Esquema optimizado para datos no relacionales

2. **`backend/services/gcsService.js`** - Mejorado
   - Organización jerárquica: `ooh-images/{MARCA}/{RECORD_ID}/imagen_X.jpg`
   - Metadata en cada archivo (marca, recordId, fecha)
   - Funciones para eliminar carpetas completas
   - Listar imágenes por marca/registro

3. **`backend/controllers/oohController.js`** - Actualizado
   - Integración con GCS y BigQuery
   - Variables de entorno para activar/desactivar servicios
   - Manejo de errores robusto
   - Guardado dual (local + cloud) opcional

### Configuración
4. **`backend/.env.example`** - Actualizado
   - Variables de GCP (Project ID, Bucket, Service Account)
   - Variables de BigQuery (Dataset, Table)
   - Flags de activación (USE_GCS, USE_BIGQUERY)

5. **`backend/package.json`** - Actualizado
   - Dependencia `@google-cloud/bigquery` agregada

6. **`backend/init-bigquery.js`** - Script de inicialización
   - Crea dataset y tabla automáticamente
   - Validación de configuración

### Documentación
7. **`GCP_SETUP_GUIDE.md`** - Guía completa
   - Paso a paso para crear cuenta de servicio
   - Configuración de permisos
   - Creación de bucket
   - Mejores prácticas de seguridad
   - Troubleshooting

8. **`backend/services/bigQueryService.js`** - Funciones disponibles:
   - `initializeBigQuery()` - Inicializar dataset/tabla
   - `insertOOHRecord(record)` - Insertar registro
   - `updateOOHRecord(record)` - Actualizar registro
   - `queryOOHRecords(filters)` - Consultar con filtros
   - `getOOHRecordById(id)` - Obtener por ID
   - `deleteOOHRecord(id)` - Eliminar registro
   - `getStatsByBrand()` - Estadísticas por marca

## 🚀 Cómo Usar

### 1. Configuración Inicial

```bash
# 1. Instalar dependencias
cd backend
npm install

# 2. Copiar y configurar .env
Copy-Item .env.example -Destination .env
# Editar .env con tus valores de GCP

# 3. Inicializar BigQuery (primera vez)
node init-bigquery.js
```

### 2. Activar/Desactivar Servicios

En tu archivo `.env`:

```env
# Modo local (por defecto)
USE_GCS=false
USE_BIGQUERY=false

# Modo cloud
USE_GCS=true
USE_BIGQUERY=true

# Modo híbrido (local + BigQuery)
USE_GCS=false
USE_BIGQUERY=true
```

### 3. Flujo de Datos

#### Con GCS + BigQuery Activos:

```
Frontend → Backend Controller
    ↓
    ├→ Subir imágenes a GCS
    │   └→ ooh-images/{MARCA}/{RECORD_ID}/imagen_X.jpg
    │
    ├→ Guardar en SQLite local (búsqueda rápida)
    │   └→ ooh_data.db
    │
    └→ Guardar en BigQuery (datos completos)
        └→ ooh_dataset.ooh_records
```

#### Solo Local (desarrollo):
```
Frontend → Backend Controller
    ↓
    ├→ Subir imágenes localmente
    │   └→ backend/local-images/{MARCA}/{RECORD_ID}/
    │
    └→ Guardar en SQLite
        └→ ooh_data.db
```

## 📊 Estructura en GCP

### Cloud Storage
```
ooh-images-prod/
└── ooh-images/
    ├── AGUILA/
    │   ├── abc-123-uuid/
    │   │   ├── imagen_1.jpg
    │   │   ├── imagen_2.jpg
    │   │   └── imagen_3.jpg
    │   └── def-456-uuid/
    ├── POKER/
    ├── CLUB_COLOMBIA/
    └── ...
```

### BigQuery Schema
```
ooh_dataset.ooh_records:
  - id (STRING, REQUIRED)
  - brand (STRING)
  - record_code (STRING)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - country, city, neighborhood, address
  - latitude, longitude
  - ooh_type, dimensions, orientation
  - illumination, material, provider
  - start_date, end_date
  - cost, currency
  - image_1_url, image_2_url, image_3_url
  - notes, status
  - full_data (JSON) ← Registro completo
```

## 🔐 Seguridad

### Archivos Sensibles (NO subir a Git):
```
backend/.env
backend/config/
backend/config/service-account-key.json
```

### Agregar a .gitignore:
```gitignore
# Credenciales
.env
.env.local
.env.production
config/
*-key.json
service-account*.json

# Bases de datos
*.db
*.sqlite
ooh_data.db
```

## 📈 Beneficios de la Arquitectura

### Cloud Storage:
- ✅ Almacenamiento escalable
- ✅ URLs públicas para imágenes
- ✅ Organización jerárquica
- ✅ Metadata en archivos
- ✅ Versionamiento opcional
- ✅ CDN integrado

### BigQuery:
- ✅ Almacenamiento de datos completo (no relacional)
- ✅ Consultas SQL potentes
- ✅ Análisis y reportes
- ✅ Integración con Data Studio/Looker
- ✅ Escalabilidad automática
- ✅ Backup automático

### Arquitectura Híbrida:
- ✅ SQLite para búsquedas rápidas locales
- ✅ BigQuery para análisis profundo
- ✅ GCS para imágenes persistentes
- ✅ Fallback a local si GCP falla

## 🧪 Testing

```bash
# Probar conexión a GCS
node -e "require('dotenv').config(); const gcs = require('./services/gcsService'); console.log('GCS OK')"

# Probar conexión a BigQuery
node init-bigquery.js

# Probar creación de registro
# (usar el frontend o Postman)
POST http://localhost:8080/api/ooh
```

## 📚 Próximos Pasos

1. ✅ **Completado**: Servicios de GCS y BigQuery
2. ✅ **Completado**: Integración en controller
3. ✅ **Completado**: Documentación

### Mejoras Futuras (Opcional):
- [ ] Migración de datos locales a BigQuery
- [ ] Dashboard de analytics con Looker Studio
- [ ] API de consultas desde BigQuery
- [ ] Backup automático a GCS
- [ ] Compresión de imágenes antes de subir
- [ ] CDN con Cloud CDN
- [ ] Autenticación con Firebase Auth

## 🆘 Soporte

Si encuentras problemas:
1. Revisa [GCP_SETUP_GUIDE.md](./GCP_SETUP_GUIDE.md)
2. Verifica los logs del servidor
3. Consulta la consola de GCP
4. Revisa los permisos de la cuenta de servicio

---

**¡Configuración completada!** 🎉

Para comenzar a usar GCP, sigue la guía en [GCP_SETUP_GUIDE.md](./GCP_SETUP_GUIDE.md).
