# 📱 Aplicación OOH - Sistema de Gestión de Inventario

## 📝 Descripción Ejecutiva

**Plataforma web para gestionar inventario de publicidad exterior (OOH), con validación geográfica automática, mapas interactivos, prevención de duplicados y reportes integrados.**

---

## 🎯 Capacidades Principales

### 1. Gestión de Inventario OOH
- **CRUD completo** de registros de publicidad exterior
- Administración de **marcas, campañas, tipos OOH y proveedores**
- Gestión de **ciudades y direcciones** con coordenadas GPS
- **Estados de registro** trackables (activo, pausado, finalizado)
- **Importación masiva** desde archivos Excel

### 2. Validación Geográfica Inteligente
- ✅ **Cálculo Haversine**: Valida que coordenadas estén dentro del radio de la ciudad
- 🗺️ **Geocodificación automática**: Completa coordenadas de ciudades usando OpenStreetMap
- 📍 **Mapas interactivos (Leaflet)**: Marcadores arrastrables, círculos de radio, validación visual
- 🎯 **Sugerencia de región**: Detecta región correcta basándose en coordenadas GPS

### 3. Prevención de Duplicados
- 🔍 **Fuzzy matching**: Busca similitudes en nombres (ej: "bogota" vs "BOGOTÁ")
- 💡 **Sugerencias en tiempo real**: Muestra coincidencias mientras el usuario escribe
- ✏️ **Modo actualización automático**: Si selecciona existente, cambia a edición

### 4. Integraciones y Exportación
- ☁️ **Google Cloud Storage** (opcional): Almacenamiento de imágenes
- 📊 **BigQuery** (opcional): Sincronización diaria de datos
- 📄 **Exportación a Excel**: Reportes descargables
- 🖨️ **Generación de presentaciones**: PPT automático con evidencias

### 5. Experiencia de Usuario
- ⚡ **Interfaz React moderna** con búsqueda y filtros avanzados
- 🗂️ **Vistas múltiples**: Tabla completa, cards resumidas, detalle modal
- 🖼️ **Gestión de imágenes**: Subida, preview y asignación de roles (antes/después)
- 📱 **Responsive**: Funciona en desktop y móvil

---

## 🏗️ Arquitectura Técnica

### Backend
- **Runtime**: Node.js 18+ con Express
- **Base de datos**: SQLite (sql.js) - 12 tablas normalizadas
- **Almacenamiento**: Local filesystem o Google Cloud Storage
- **APIs externas**: OpenStreetMap Nominatim (geocoding)
- **Validaciones**: Geográficas (Haversine), fuzzy matching (Levenshtein)

### Frontend
- **Framework**: React 18 con Context API
- **Mapas**: Leaflet + react-leaflet
- **Estilos**: CSS vanilla (sin frameworks)
- **Build**: Create React App

### Testing
- **Backend**: Suite de tests automatizados con Jest
- **Frontend**: Tests de componentes y integración
- **Performance**: Scripts k6 para carga (incluidos en repo)

---

## 📊 Especificaciones de Desempeño

### Capacidad
- ✅ **15 usuarios concurrentes** sin degradación
- ✅ **~50,000 requests/mes** estimados
- ✅ **Latencia P95**: < 1 segundo (objetivo)
- ✅ **Tasa de error**: < 1%

### Recursos Recomendados (Cloud Run)
```yaml
CPU: 1 vCPU
Memoria: 512 MB
Concurrencia: 20 requests/instancia
Timeout: 300s (para importaciones)
Autoscaling: 0-3 instancias
```

### Estimación de Costos Mensuales
- **Escenario**: 15 usuarios, 5 días/semana, 4 horas/día
- **Costo estimado**: ~$0.50 USD/mes
- **Status**: Dentro del free tier de GCP ($300 créditos)

---

## 📦 Entregables

1. ✅ **Código fuente** completo (backend + frontend)
2. ✅ **Base de datos** SQLite con esquema normalizado
3. ✅ **Scripts de pruebas** (k6 + monitoreo Docker)
4. ✅ **Dockerfile** multi-stage optimizado
5. ✅ **Documentación técnica** (README, guías, reportes)
6. ✅ **Suite de tests** automatizados

---

## 🚀 Despliegue

### Local (Desarrollo)
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start
```

### Docker (Producción)
```bash
docker build -t ooh-app .
docker run -d -p 8080:8080 ooh-app
```

### Cloud Run (GCP)
```bash
gcloud run deploy ooh-app \
  --image gcr.io/PROJECT_ID/ooh-app \
  --platform managed \
  --cpu 1 --memory 512Mi
```

---

## 📚 Documentación Disponible

| Documento | Descripción |
|-----------|-------------|
| `README.md` | Información general del proyecto |
| `PERFORMANCE_TESTS.md` | Guía completa de pruebas de rendimiento |
| `GCP_SETUP_GUIDE.md` | Configuración de Google Cloud Platform |
| `VALIDACION_GEOGRAFICA_GUIA.md` | Sistema de validación geográfica |
| `ANTI_DUPLICADOS_FUZZY_MATCH.md` | Fuzzy matching y prevención de duplicados |
| `REPORTE_CIUDADES.md` | Estado de coordenadas de ciudades |

---

## 🛠️ Stack Tecnológico Completo

**Backend:**
- Node.js, Express, sql.js (SQLite)
- node-geocoder, @google-cloud/storage, @google-cloud/bigquery
- multer, cors, dotenv, node-cron

**Frontend:**
- React 18, react-router-dom, Context API
- Leaflet, react-leaflet
- date-fns, ExcelJS (cliente)

**DevOps:**
- Docker multi-stage
- k6 (pruebas de carga)
- Jest (testing)
- GitHub (versionado)

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0  
**Mantenido por**: Equipo OOH
