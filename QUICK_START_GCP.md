# 🚀 Inicio Rápido - Integración con GCP

Esta guía te llevará de 0 a 100 en **15 minutos** para tener tu app funcionando con Google Cloud Platform.

---

## ✅ Checklist de Configuración

- [ ] Cuenta de Google Cloud Platform
- [ ] Proyecto de GCP creado
- [ ] Node.js 18+ instalado
- [ ] Código del proyecto descargado

---

## 📋 Pasos Rápidos

### 1️⃣ Crear Cuenta de Servicio (5 min)

1. Ve a [GCP Console](https://console.cloud.google.com)
2. **IAM y administración** > **Cuentas de servicio** > **CREAR CUENTA DE SERVICIO**
3. Nombre: `ooh-backend-service`
4. Roles:
   - `Storage Admin`
   - `BigQuery Admin`
5. **Administrar claves** > **Crear clave nueva** > **JSON**
6. Descarga el archivo JSON

### 2️⃣ Crear Bucket de Cloud Storage (2 min)

1. **Cloud Storage** > **Buckets** > **CREAR BUCKET**
2. Nombre: `ooh-images-prod` (o el que prefieras)
3. Ubicación: `us-east1`
4. Clase: Standard
5. **CREAR**

### 3️⃣ Habilitar APIs (1 min)

Cloud Shell:
```bash
gcloud services enable storage-api.googleapis.com
gcloud services enable bigquery.googleapis.com
```

### 4️⃣ Configurar Backend (5 min)

```bash
cd backend

# Crear carpeta config
mkdir config

# Copiar archivo de credenciales (reemplaza la ruta)
Copy-Item "C:\Downloads\tu-archivo-key.json" -Destination ".\config\service-account-key.json"

# Ejecutar script de configuración
.\setup-env.bat

# Responde las preguntas:
# - Project ID: [tu-proyecto-id]
# - Bucket: ooh-images-prod
# - Activar Cloud Storage: S
# - Activar BigQuery: S
```

### 5️⃣ Instalar e Inicializar (2 min)

```bash
# Instalar dependencias (si aún no lo hiciste)
npm install

# Inicializar BigQuery
npm run init:bigquery

# Deberías ver:
# ✅ Dataset ooh_dataset creado
# ✅ Tabla ooh_records creada
```

### 6️⃣ Iniciar Servidor

```bash
npm start
```

**Verifica los logs**:
```
🔧 Configuración de almacenamiento:
   - Cloud Storage (GCS): ACTIVADO ✅
   - BigQuery: ACTIVADO ✅
   - Almacenamiento local: DESACTIVADO
```

### 7️⃣ Probar

1. Abre el frontend: `http://localhost:3000`
2. Crea un registro con imágenes
3. Verifica en GCP:
   - **Cloud Storage**: Ve a tu bucket → `ooh-images/[MARCA]/[RECORD_ID]/`
   - **BigQuery**: Abre tu proyecto → `ooh_dataset` → `ooh_records` → Ver datos

---

## 🎯 Verificación Rápida

### Ver imágenes en Cloud Storage

```bash
# En Cloud Shell o con gcloud CLI instalado
gsutil ls gs://ooh-images-prod/ooh-images/
```

### Consultar BigQuery

```sql
-- En la consola de BigQuery
SELECT 
  id, 
  brand, 
  city, 
  created_at,
  image_1_url
FROM `tu-proyecto-id.ooh_dataset.ooh_records`
ORDER BY created_at DESC
LIMIT 10
```

---

## 🔄 Alternar entre Local y Cloud

En cualquier momento puedes cambiar el modo en `.env`:

### Modo Cloud (Producción)
```env
USE_GCS=true
USE_BIGQUERY=true
```

### Modo Local (Desarrollo)
```env
USE_GCS=false
USE_BIGQUERY=false
```

### Modo Híbrido (BigQuery + Imágenes Locales)
```env
USE_GCS=false
USE_BIGQUERY=true
```

Después de cambiar, **reinicia el servidor**.

---

## 🐛 Problemas Comunes

### "Could not load default credentials"
```bash
# Verifica que el archivo existe
ls backend/config/service-account-key.json

# Verifica la variable en .env
cat backend/.env | grep GCP_KEY_FILE
# Debe ser: GCP_KEY_FILE=./config/service-account-key.json
```

### "Permission denied" en GCS
1. Ve a **Cloud Storage** > Tu bucket
2. **Permisos**
3. Verifica que `ooh-backend-service@...` tiene rol `Storage Admin`

### "Dataset not found" en BigQuery
```bash
# Reinicializa
npm run init:bigquery
```

### Imágenes no se suben
```bash
# Verifica los logs del servidor
# Deberías ver:
# ☁️ Subiendo a Google Cloud Storage...
# ✅ Imagen subida: https://storage.googleapis.com/...
```

---

## 📊 Estructura Resultante

```
Cloud Storage:
  ooh-images-prod/
    └── ooh-images/
        ├── AGUILA/
        │   └── abc-123-uuid/
        │       ├── imagen_1.jpg
        │       ├── imagen_2.jpg
        │       └── imagen_3.jpg
        └── POKER/

BigQuery:
  tu-proyecto-id
    └── ooh_dataset
        └── ooh_records (tabla)
            ├── id
            ├── brand
            ├── city
            ├── image_1_url
            ├── latitude, longitude
            ├── created_at
            └── full_data (JSON)
```

---

## 🎓 Próximos Pasos

1. ✅ **Funcionando**: Ya tienes la integración activa
2. 📊 **Analytics**: Consulta datos en BigQuery
3. 🔍 **Optimizar**: Ajusta permisos según necesites
4. 📈 **Escalar**: Considera Cloud CDN para imágenes
5. 🔐 **Seguridad**: Revisa [mejores prácticas](./GCP_SETUP_GUIDE.md#-seguridad---mejores-prácticas)

---

## 📚 Recursos

- [Documentación completa](./GCP_SETUP_GUIDE.md)
- [Resumen de integración](./GCP_INTEGRATION_SUMMARY.md)
- [Consola de GCP](https://console.cloud.google.com)

---

## 💡 Tips

### Costos
- Cloud Storage: ~$0.02 por GB/mes
- BigQuery: Primeros 10GB gratis, luego $0.02 por GB almacenado
- Consultas: Primeros 1TB gratis/mes

### Performance
- Coloca el bucket en la misma región que tu servidor
- Usa CDN para servir imágenes globalmente
- BigQuery es instantáneo hasta millones de registros

### Backup
- Cloud Storage tiene versionamiento automático
- BigQuery guarda histórico de consultas
- Mantén SQLite local como backup rápido

---

¡Listo! 🎉 Ya tienes tu app integrada con GCP.
