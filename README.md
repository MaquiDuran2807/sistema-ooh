# 🏢 OOH Management System - Gestión de Campañas Publicitarias en Espacios Exteriores

**OOH (Out of Home)** es un sistema integral de gestión y control de campañas publicitarias en espacios exteriores. Permite creación, edición, visualización e inventario de registros de campañas con geolocalización, imágenes asociadas, y sincronización con BigQuery.

---

## 📋 Tabla de Contenidos

- [Características Principales](#características-principales)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso del Sistema](#uso-del-sistema)
- [Endpoints de la API](#endpoints-de-la-api)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Desarrollo](#desarrollo)
- [Performance](#performance)

---

## ✨ Características Principales

### 📝 Creación y Edición de Registros
- Formulario completo para crear nuevos registros OOH
- Modal de edición con validación en tiempo real
- Captura de geolocalización con mapa interactivo
- Soporte para 3 imágenes por registro (principal + galerías)
- Arrastrar y soltar (drag & drop) para importar imágenes

### 🗺️ Componentes de Localización
- Selección automática de coordenadas por ciudad
- Mapa interactivo con búsqueda y validación geográfica
- Soporte para regiones, ciudades y direcciones
- Base de datos de ciudades con coordenadas predefinidas
- Exportación de reportes con datos geográficos

### 🔍 Gestión y Búsqueda
- Vista de registros en tabla y tarjetas personalizables
- Filtros por marca, campaña, fecha, período, ciudad y región
- Búsqueda de direcciones con autocompletado
- Paginación infinita para optimización de desempeño (6000px prefetch)
- Selección múltiple de registros

### 🖼️ Gestión de Imágenes
- **Service Worker** para caché de imágenes (600ms → 5-17ms)
- Storage local e IndexedDB para metadatos de imágenes
- Cache-Control headers de 30 días
- Compresión y lazy loading automático
- Visualización previa (thumbnail) sin cargar imagen completa

### 📊 Reporting y Exportación
- Generación de reportes PPT con datos de campañas
- Exportación a Excel con validación de datos
- Integración con BigQuery para sincronización en la nube
- Historial de cambios y auditoría

### 🔗 Integración Externa
- **BigQuery**: Sincronización de datos en tiempo real
- **Google Cloud Storage**: Almacenamiento de imágenes
- **Power Automate**: Endpoints preparados para automatización
- **Excel/Power Query**: Integración de datos externos

### ⚡ Características Técnicas
- Caché inteligente para optimización de imágenes
- Validación de datos en frontend y backend
- Sistema de roles y permisos para imágenes
- Sincronización bidireccional de datos
- Logs y análisis de desempeño

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18+)                     │
├─────────────────────────────────────────────────────────────┤
│  App.js (Router Principal)                                   │
│  ├─ OOHForm (Crear registros)                               │
│  ├─ OOHList (Listar/editar registros)                       │
│  │  ├─ useOOHEditModal (Lógica modal edición)              │
│  │  ├─ useOOHImages (Gestión imágenes)                     │
│  │  ├─ RecordTableView (Vista tabla)                        │
│  │  ├─ RecordCardsView (Vista tarjetas)                     │
│  │  └─ MapPicker (Mapa interactivo)                         │
│  ├─ AddCampanaModal (Crear campañas)                        │
│  ├─ AddMarcaModal (Crear marcas)                            │
│  ├─ AddCiudadModal (Crear ciudades)                         │
│  ├─ AddProveedorModal (Crear proveedores)                   │
│  ├─ AddTipoOOHModal (Crear tipos OOH)                       │
│  ├─ AddDireccionModal (Crear direcciones)                   │
│  ├─ ExcelUploader (Cargar datos desde Excel)                │
│  └─ DebugPanel (Panel de diagnóstico)                       │
│                                                              │
│  Context Global (AppContext):                               │
│  - brands, campaigns, cities, providers, oohTypes, regions  │
│  - Records con paginación                                   │
│  - Funciones CRUD (crear, actualizar, eliminar)            │
│                                                              │
│  Service Worker:                                             │
│  - Caché inteligente de imágenes                            │
│  - Estrategia cache-first con validación de nombre         │
│                                                              │
│  Services:                                                   │
│  - oohService.js (Llamadas API)                             │
│  - dbService.js (LocalStorage/IndexedDB)                    │
│  - imageCache.js (Metadatos de imágenes)                    │
│                                                              │
│  Hooks:                                                       │
│  - useOOHEditModal (Modal edición)                          │
│  - useOOHImages (Imágenes y drag & drop)                    │
└─────────────────────────────────────────────────────────────┘
                             ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                │
├─────────────────────────────────────────────────────────────┤
│  server.js (Configuración central)                           │
│  ├─ CORS (Permitir localhost, Power Automate)               │
│  ├─ Cache Headers (30 días para imágenes)                   │
│  └─ Error Middleware                                         │
│                                                              │
│  Routes:                                                     │
│  ├─ /api/ooh (Endpoints principales)                       │
│  └─ /api/automation (Power Automate)                        │
│                                                              │
│  Controllers:                                                │
│  └─ oohController.js (Lógica de negocios)                  │
│                                                              │
│  Services:                                                   │
│  ├─ dbService.js (SQLite CRUD)                             │
│  ├─ bigQueryService.js (BigQuery sync)                      │
│  ├─ gcsService.js (Google Cloud Storage)                    │
│  ├─ excelService.js (Excel import/export)                   │
│  ├─ pptService.js (Reportes PPT)                            │
│  ├─ geoValidationService.js (Validación geográfica)         │
│  └─ localStorageService.js (Imágenes locales)              │
│                                                              │
│  Database:                                                   │
│  └─ SQLite (ooh_data.db)                                   │
│     ├─ ooh (registros principales)                         │
│     ├─ brands (marcas)                                      │
│     ├─ campaigns (campañas)                                 │
│     ├─ cities (ciudades)                                    │
│     ├─ providers (proveedores)                              │
│     ├─ ooh_types (tipos de OOH)                             │
│     ├─ img_record (asociación imágenes)                     │
│     └─ + otras tablas maestras                              │
│                                                              │
│  External Services:                                          │
│  ├─ BigQuery (Data warehouse)                               │
│  ├─ Google Cloud Storage (Almacenamiento)                   │
│  └─ Power Automate (Automatización)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 18+** - UI framework
- **Axios** - HTTP client
- **Service Worker** - Caché de activos
- **IndexedDB + localStorage** - Almacenamiento local
- **CSS3** - Estilos responsive
- **LazyImage** - Carga perezosa optimizada

### Backend
- **Node.js** - Runtime
- **Express.js** - Framework web
- **SQLite3** - Base de datos relacional
- **Multer** - Carga de archivos
- **node-cron** - Tareas programadas
- **dotenv** - Variables de entorno

### Integraciones
- **Google BigQuery** - Data warehouse
- **Google Cloud Storage** - Almacenamiento de imágenes
- **Microsoft Power Automate** - Automatización
- **Excel/XLSX** - Importación y reportes

---

## 📦 Instalación

### Requisitos Previos
- Node.js 16+
- npm o yarn
- SQLite3
- Credenciales GCP (para BigQuery)

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd nuevo\ ooh
```

2. **Instalar dependencias del backend**
```bash
cd backend
npm install
```

3. **Instalar dependencias del frontend**
```bash
cd ../frontend
npm install
```

4. **Configurar variables de entorno**
```bash
cd ../backend
cp .env.example .env
# Editar .env con:
# - PORT=8080
# - USE_BIGQUERY=true/false
# - GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
# - etc.
```

5. **Inicializar base de datos**
```bash
# Respaldar datos existentes si es necesario
node reset-database-clean.js

# O inicializar BigQuery
node init-bigquery.js
```

6. **Iniciar servidor**
```bash
npm run dev
```

7. **Iniciar frontend (en otra terminal, puerto 3000)**
```bash
cd ../frontend
npm start
# Frontend estará en http://localhost:3000
# Backend en http://localhost:8080
```

---

## ⚙️ Configuración

### Variables de Entorno (.env)

```env
# Backend
PORT=8080
NODE_ENV=development

# BigQuery
USE_BIGQUERY=true
BIGQUERY_PROJECT_ID=tu-proyecto-gcp
BIGQUERY_DATASET_ID=tu_dataset
BIGQUERY_DAILY_SYNC=true
BIGQUERY_SYNC_CRON='0 18 * * *'
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Frontend (Puerto 3000)
REACT_APP_API_URL=http://localhost:8080
REACT_APP_ENABLE_DEBUG=true

# Storage (Google Cloud Storage)
STORAGE_TYPE=local|gcs
GCS_BUCKET_NAME=tu-bucket
```

### Estructura de Base de Datos

**Tabla Principal: `ooh`**
```sql
id, marca, campaña, categoría, proveedor, ciudad, región, 
dirección, latitud, longitud, fecha_inicio, fecha_final,
imagen_1, imagen_2, imagen_3, checked, synced_to_bigquery,
created_at, updated_at, review_required, review_reason
```

**Tablas Maestras:**
- `brands`: id, nombre, categoría, advertiser_id
- `campaigns`: id, nombre, brand_id
- `cities`: id, nombre, región, latitud, longitud
- `providers`: id, nombre
- `ooh_types`: id, nombre
- `img_record`: id, ooh_id, imagen_filename, role, slot

---

## 🎯 Uso del Sistema

### Flujo Principal

#### 1. Crear Nuevo Registro
1. Ir a **"📝 Nuevo Registro"**
2. Llenar formulario:
   - Seleccionar o crear Marca
   - Seleccionar o crear Campaña (se filtra por marca)
   - Ingresar Dirección (o seleccionar de lista)
   - Sistema auto-completa: Ciudad, Región, Coordenadas
   - Subir 3 imágenes vía drag & drop
3. Hacer clic en **"➕ Crear Registro"**

#### 2. Editar Registro
1. Ir a **"📋 Ver Registros"**
2. Hacer clic en registro o en botón **"✏️ Editar"**
3. Modal de edición muestra:
   - Marca, Campañ, Ciudad, Región, Tipo OOH: **readonly** (no editable)
   - Dirección, Fechas: **editable**
   - Imágenes: reemplazar o agregar
4. Guardar cambios

#### 3. Filtrar y Buscar
- **Buscar por dirección**: Input de búsqueda con autocompletado
- **Filtrar por marca**: Dropdown dinámico
- **Filtrar por campaña**: Se actualiza según marca
- **Filtrar por fecha (rango)**: Date pickers
- **Filtrar por período (año/mes)**: Dropdowns
- **Múltiples selecciones**: Marcar casillas en tarjetas

#### 4. Gestionar Imágenes
1. Hacer clic en **"➕ Ver más fotos"** en modal de registro
2. Arrastrar y soltar imágenes en zona de drop
3. Asignar a slots (3 principales + galería)
4. Definir rol de cada imagen (principal/secundaria)
5. Hacer clic en **"💾 Guardar todo"**

#### 5. Generar Reportes
- En lista, hay botón de descarga de reportes (PPT/Excel)
- Sistema expota registros visibles con imágenes

---

## 🔌 Endpoints de la API

### Inicialización

**GET** `/api/ooh/initialize`
- Carga todos los datos maestros (marcas, campañas, ciudades, etc.)
- Respuesta: `{ success: true, data: { brands[], campaigns[], cities[], ... } }`

### Catálogos y Maestros

#### Marcas
- **GET** `/api/ooh/brands` - Obtener todas
- **GET** `/api/ooh/brands/by-name?nombre=CORONA` - Buscar por nombre
- **POST** `/api/ooh/brands` - Crear nueva `{ nombre, categoría, advertiser_id }`

#### Campañas
- **GET** `/api/ooh/campaigns` - Obtener todas
- **GET** `/api/ooh/brands/:brandId/campaigns` - Obtener campañas de marca
- **GET** `/api/ooh/campaigns/by-name?nombre=VERANO` - Buscar por nombre
- **POST** `/api/ooh/campaigns` - Crear nueva `{ nombre, brandId }`

#### Ciudades
- **GET** `/api/ooh/cities` - Obtener todas
- **GET** `/api/ooh/cities/by-name?nombre=BOGOTÁ` - Buscar por nombre
- **GET** `/api/ooh/cities/coordinates?ciudad=BOGOTÁ` - Obtener coordenadas
- **GET** `/api/ooh/cities/region/:region` - Por región
- **POST** `/api/ooh/cities` - Crear nueva `{ nombre, región, latitud, longitud }`
- **PUT** `/api/ooh/cities/:id` - Actualizar
- **POST** `/api/ooh/cities/validate` - Validar duplicados `{ nombre }`

#### Tipos OOH
- **GET** `/api/ooh/types` - Obtener todos
- **GET** `/api/ooh/types/by-name?nombre=CAJITA_DE_LUZ` - Buscar por nombre
- **POST** `/api/ooh/types` - Crear nuevo `{ nombre }`

#### Proveedores
- **GET** `/api/ooh/providers` - Obtener todos
- **GET** `/api/ooh/providers/by-name?nombre=EAFIT` - Buscar por nombre
- **POST** `/api/ooh/providers` - Crear nuevo `{ nombre }`

#### Direcciones
- **POST** `/api/ooh/addresses/create` - Crear nueva `{ descripción, ciudad, coordenadas }`

### Registros OOH (CRUD)

#### Lectura
- **GET** `/api/ooh/all` - Obtener todos (con paginación)
- **GET** `/api/ooh/:id` - Obtener por ID
- **GET** `/api/ooh/periods/available` - Períodos disponibles (años, meses)

#### Creación
- **POST** `/api/ooh/create` - Crear registro
  ```
  FormData:
  - marca, campaña, categoría, proveedor
  - ciudad, región, dirección
  - latitud, longitud
  - fechaInicio, fechaFin
  - imagenes (multipart, hasta 25 archivos)
  ```

#### Actualización
- **PATCH** `/api/ooh/:id/check` - Marcar como revisado `{ checked: boolean }`
- **PUT** `/api/ooh/:id` (vía oohService.updateRecord)
  ```
  Actualizar: dirección, fechas, coordenadas, imágenes
  ```

#### Eliminación
- **DELETE** `/api/ooh/:id` - Borrar registro

### Gestión de Imágenes

- **GET** `/api/ooh/:id/images` - Obtener todas
- **POST** `/api/ooh/:id/images/upload` - Subir imágenes
  ```
  FormData: imagenes (multipart)
  ```
- **POST** `/api/ooh/:id/images/upload-with-slots` - Subir con asignación
  ```
  FormData: imagenes, imageIndexes (p.ej: "1,2,3")
  ```
- **PATCH** `/api/ooh/:id/images/roles` - Asignar roles
  ```
  JSON: { imagen_1: "primary", imagen_2: "secondary", ... }
  ```

### BigQuery Sync

- **POST** `/api/ooh/bigquery/sync` - Sincronizar todo desde SQLite
- **POST** `/api/ooh/:id/sync-bigquery` - Sincronizar registro específico

### Reportes

- **GET** `/api/ooh/report/ppt` - Descargar PPT con datos

### Automatización (Power Automate)

- **POST** `/api/automation/sync-excel` - Importar desde Excel
- **POST** `/api/automation/export-report` - Exportar datos

---

## 📁 Estructura de Carpetas

```
nuevo\ ooh/
├── backend/
│   ├── __tests__/              # Tests unitarios e integración
│   ├── config/                 # Configuraciones
│   ├── controllers/
│   │   └── oohController.js
│   ├── routes/
│   │   ├── ooh.js              # Endpoints principales
│   │   └── excelAutomation.js  # Power Automate
│   ├── services/
│   │   ├── dbService.js        # SQLite
│   │   ├── bigQueryService.js  # BigQuery
│   │   ├── gcsService.js       # Google Cloud Storage
│   │   ├── excelService.js     # Excel
│   │   ├── pptService.js       # Reportes
│   │   ├── geoValidationService.js
│   │   ├── localStorageService.js
│   │   └── s3Service.js
│   ├── utils/
│   │   ├── cityNormalizer.js
│   │   ├── ciudadesCoordinates.js
│   │   └── regionValidator.js
│   ├── local-images/           # Imágenes locales para desarrollo
│   ├── server.js               # Entrada principal
│   ├── ooh_data.db.sql         # Schema inicial
│   ├── reset-database-clean.js # Limpieza/semilla DB
│   ├── init-bigquery.js        # Inicializar BigQuery
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── service-worker.js   # Caché inteligente
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── OOHForm.js
│   │   │   ├── OOHList.js
│   │   │   ├── MapPicker.js
│   │   │   ├── AddCampanaModal.js
│   │   │   ├── AddMarcaModal.js
│   │   │   ├── AddCiudadModal.js
│   │   │   ├── ExcelUploader.js
│   │   │   ├── RecordTableView.js
│   │   │   ├── RecordCardsView.js
│   │   │   └── ... (otros componentes)
│   │   ├── hooks/
│   │   │   ├── useOOHEditModal.js  # Lógica modal edición
│   │   │   └── useOOHImages.js     # Gestión imágenes
│   │   ├── context/
│   │   │   └── AppContext.js       # Estado global
│   │   ├── services/
│   │   │   ├── oohService.js       # Llamadas API
│   │   │   ├── dbService.js        # LocalStorage
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   ├── imageCache.js       # Metadatos imágenes
│   │   │   └── fuzzyMatch.js       # Búsqueda difusa
│   │   ├── data/
│   │   │   └── ciudades.js         # Ciudades predefinidas
│   │   ├── App.js
│   │   ├── index.js
│   │   └── ... (CSS, tests)
│   ├── setupProxy.js
│   ├── package.json
│   └── ... (configuración React)
│
└── package.json (root)
```

---

## 💻 Desarrollo

### Scripts Disponibles

**Backend:**
```bash
npm run dev          # Iniciar servidor (con nodemon)
npm run start        # Iniciar producción
npm test             # Ejecutar tests
npm run init-bigquery # Inicializar BigQuery
npm run reset-db     # Limpiar y resambrar BD
```

**Frontend:**
```bash
npm start            # Iniciar dev server (puerto 3000)
npm run build        # Build de producción
npm test             # Ejecutar tests
npm run eject        # (No recomendado)
```

### Arquitectura del Frontend

**Componentes inteligentes vs presentacionales:**
- Componentes "smart": `OOHForm`, `OOHList` (lógica + estado)
- Componentes "dumb": `MapPicker`, `RecordTableView` (solo props)

**Hooks personalizados:**
- `useOOHEditModal`: Encapsula lógica de modal (abrir, cerrar, guardar, sincronizar)
- `useOOHImages`: Gestiona imágenes, drag & drop, asignación de slots

**Context Global:**
- `AppContext`: Estado compartido (brands, campaigns, records, etc.)
- Provee funciones CRUD para mantener datos sincronizados

**Services:**
- `oohService.js`: Todas las llamadas HTTP a backend
- `dbService.js`: Operaciones de localStorage/IndexedDB
- `fuzzyMatch.js`: Búsqueda difusa para autocompletados

### Debugging

Usar **DebugPanel** en esquina inferior derecha:
- Ver estado global
- Inspeccionar localstorage
- Limpiar caché
- Ver logs

### Performance

Optimizaciones implementadas:
1. **Paginación infinita**: Carga 6000px antes del final
2. **LazyImage**: Carga de imágenes solo cuando son visibles
3. **Service Worker**: Caché de imágenes (600ms → 5-17ms)
4. **Memoización**: `React.memo()` y `useCallback`
5. **Code splitting**: Componentes modales cargados bajo demanda

---

## ⚡ Performance

### Benchmarks

| Métrica | Antes | Después |
|---------|-------|---------|
| Carga imagen (primera vez) | 600ms | 600ms |
| Carga imagen (desde cache) | 600ms | 5-17ms |
| Listado con 1000 registros | 8s | 200ms |
| Sincronización BigQuery | Manual | Automática (18:00h) |
| Tamaño bundle frontend | 450KB | 450KB* |

*Sin cambios en tamaño; optimizaciones son runtime.

### Estrategia de Caché

**Backend (HTTP Headers):**
```
Cache-Control: public, max-age=2592000, immutable
Expires: <fecha 30 días adelante>
```

**Frontend (Service Worker):**
- Estrategia: Cache-first
- Validación: Nombre de archivo (ignora query params)
- Storage: IndexedDB + localStorage para metadatos

---

## 📝 Licencia

Proyecto propietario. Todos los derechos reservados.

---

## 👥 Contacto y Soporte

Para preguntas o reportar issues:
1. Revisar documentación en este README
2. Consultar logs en DebugPanel
3. Verificar .env y credenciales GCP
4. Contactar al equipo de desarrollo

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0.0
