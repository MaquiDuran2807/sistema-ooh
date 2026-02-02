# 🎯 Sistema de Gestión OOH - Vallas Publicitarias Colombia

Sistema integral para gestionar vallas publicitarias (Out of Home) con arquitectura ID-based, validación geográfica, lazy loading y generación automática de reportes PPT.

---

## 📋 Características Principales

### ✨ Frontend (React + Context API)
- **Carga incremental**: Scroll infinito con Intersection Observer (48 registros iniciales)
- **Lazy loading de imágenes**: Solo carga imágenes visibles (prefetch 300px)
- **Arquitectura ID-based**: Usa IDs en lugar de nombres para relaciones
- **Auto-completado inteligente**: Al seleccionar dirección, llena ciudad/región/coordenadas
- **Validación en tiempo real**: Coordenadas validadas contra radio de ciudad
- **Gestión de direcciones**: Crea y reutiliza direcciones guardadas

### 🔧 Backend (Node.js + Express + SQLite)
- **Base de datos normalizada**: 11 tablas con relaciones ID-based
- **Paginación**: `?page=1&limit=50` para optimizar carga
- **Validación geográfica**: geolib + radio por ciudad (ej: Bogotá 45km)
- **Generación PPT**: Python script con plantilla base
- **34 ciudades colombianas**: Con coordenadas y radio de cobertura
- **Storage local**: Imágenes organizadas por marca/campaña/mes

---

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- Python 3.8+ (para reportes PPT)
- npm o yarn

### Instalación

```bash
# 1. Instalar dependencias
cd frontend && npm install
cd ../backend && npm install
pip install python-pptx

# 2. Inicializar base de datos
cd backend
node create-database.js

# 3. Iniciar servicios
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend  
cd frontend && npm start
```

Acceso: **http://localhost:3000**

---

## 📁 Estructura del Proyecto

```
nuevo-ooh/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── OOHForm.js              # Formulario con auto-fill
│   │   │   ├── OOHList.js              # Grid con lazy load + IntersectionObserver
│   │   │   ├── AddDireccionModal.js    # Modal con validación geo + bounds
│   │   │   ├── AddCiudadModal.js       # Agregar ciudades
│   │   │   └── [otros modals...]
│   │   ├── context/
│   │   │   └── AppContext.js           # Estado global (brands, cities, records)
│   │   └── services/
│   │       └── dbService.js            # Mapeo nombre→ID usando AppContext
│   └── package.json
│
├── backend/
│   ├── controllers/
│   │   └── oohController.js            # 18 endpoints (create, update, delete)
│   ├── routes/
│   │   └── ooh.js                      # Rutas API
│   ├── services/
│   │   ├── dbService.js                # SQLite (11 tablas normalizadas)
│   │   ├── geoValidationService.js     # Validación coordenadas con geolib
│   │   ├── localStorageService.js      # Gestión de imágenes local
│   │   └── pptService.js               # Generación PPT
│   ├── utils/
│   │   └── ciudadesCoordinates.js      # 34 ciudades con lat/lng/radio
│   ├── __tests__/
│   │   ├── addresses-create.test.js    # Tests endpoint direcciones
│   │   ├── create-edit-complete.test.js # Tests CRUD completo
│   │   ├── geo-validation.test.js      # Tests validación geográfica
│   │   ├── images.test.js              # Tests imágenes
│   │   └── cities-integration.test.js  # Tests ciudades
│   ├── ooh_data.db                     # Base de datos SQLite
│   └── package.json
│
├── README.md                           # Este archivo
└── TESTS_GUIDE.md                      # Guía de tests
```

---

## 🗄️ Base de Datos (SQLite)

### Tablas Normalizadas (11 tablas)

```sql
-- Maestras
regions (id, nombre)
categories (id, nombre)  
advertisers (id, nombre)
brands (id, nombre, category_id, advertiser_id)
campaigns (id, nombre, brand_id)
ooh_types (id, nombre)
providers (id, nombre)
cities (id, nombre, latitud, longitud, radio_km, region_id)

-- Transaccionales
addresses (id, city_id, descripcion, latitud, longitud)
ooh_records (id, brand_id, campaign_id, city_id, ooh_type_id, provider_id, 
             category_id, region_id, direccion, latitud, longitud, 
             fecha_inicio, fecha_final, imagen_1, imagen_2, imagen_3)
images (id, record_id, url, position)
```

### Relaciones ID-based
- `ooh_records.brand_id` → `brands.id`
- `ooh_records.city_id` → `cities.id`
- `cities.region_id` → `regions.id`
- `brands.category_id` → `categories.id`

---

## 🔌 API Endpoints

### Registros OOH
```
GET    /api/ooh/initialize              # Cargar todos los datos maestros
GET    /api/ooh/all?page=1&limit=50     # Listar registros (paginado)
GET    /api/ooh/:id                     # Obtener registro por ID
POST   /api/ooh/create                  # Crear/actualizar registro
DELETE /api/ooh/:id                     # Eliminar registro
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
POST   /api/ooh/addresses/create        # Crear dirección con validación geo
```

### Reportes
```
GET    /api/ooh/report/ppt?month=2026-01&useBase=true  # Generar PPT
```

---

## 🧪 Tests

### Backend Tests (Jest + Supertest)

```bash
cd backend

# Ejecutar todos los tests
npm test

# Tests específicos
npx jest __tests__/addresses-create.test.js         # Direcciones
npx jest __tests__/create-edit-complete.test.js     # CRUD completo
npx jest __tests__/geo-validation.test.js           # Validación geo
npx jest __tests__/images.test.js                   # Imágenes
npx jest __tests__/cities-integration.test.js       # Ciudades
```

**Cobertura:**
- ✅ Creación de registros con IDs (no nombres)
- ✅ Actualización con `existingId` + `imageIndexes`
- ✅ Validación de coordenadas fuera de rango
- ✅ Creación de direcciones con validación geo
- ✅ Gestión de imágenes con hash único

---

## 🎨 Funcionalidades Destacadas

### 1. Carga Incremental con Intersection Observer

```javascript
// OOHList.js
const PAGE_SIZE = 48;
const PREFETCH_MARGIN_PX = 600;

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, displayData.length));
      }
    },
    { rootMargin: `${PREFETCH_MARGIN_PX}px` }
  );
  observer.observe(loadMoreRef.current);
}, []);
```

### 2. Lazy Loading de Imágenes

```javascript
const LazyImage = ({ src, alt }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(imgRef.current);
  }, []);

  return <img src={isVisible ? src : undefined} />;
};
```

### 3. Auto-fill de Formulario

Al seleccionar una dirección guardada, automáticamente llena ciudad, región, latitud y longitud.

### 4. Validación Geográfica

```javascript
// geoValidationService.js
const validarCoordenadasPorCiudad = async (ciudad, latitud, longitud) => {
  const infoCiudad = dbService.getCityByName(ciudad);
  const distanciaEnMetros = geolib.getDistance(
    { latitude: latitud, longitude: longitud },
    { latitude: infoCiudad.latitud, longitude: infoCiudad.longitud }
  );
  
  if (distanciaEnMetros > infoCiudad.radio_km * 1000) {
    return {
      valido: false,
      mensaje: `Coordenadas a ${distanciaEnKm}km del centro...`
    };
  }
  return { valido: true };
};
```

---

## 📊 Generación de Reportes PPT

### Flujo
1. Usuario selecciona mes en modal
2. Backend filtra registros por fecha
3. Llama script Python: `generate_ppt_from_base_v3.py`
4. Python carga plantilla base y genera slides
5. Descarga automática: `reporte_vallas_2026-01.pptx`

---

## 🛠️ Scripts Útiles

```bash
# Base de datos
node create-database.js              # Crear BD desde cero
node check-db.js                     # Inspeccionar BD

# Validación
node check-images.js                 # Verificar rutas de imágenes

# Migración
node migrate-csv-to-db.js            # Importar desde CSV
```

---

## 🐛 Troubleshooting

### Error: "Ciudad no encontrada"
- Usa el modal "Agregar Ciudad" para crearla

### Error: "Coordenadas fuera del rango"
- Verifica que latitud/longitud correspondan a la ciudad
- Radio de validación en `cities.radio_km`

### Imágenes no se muestran
- Verifica rutas en `ooh_records.imagen_X`
- Estructura: `local-images/MARCA/CAMPANA/YYYY-MM/archivo.jpg`

---

## 📝 Notas de Desarrollo

### Arquitectura ID-based
- **Antes**: Nombres (marca="CORONA", ciudad="BOGOTA")
- **Ahora**: IDs (brand_id=4, city_id=5)
- **Ventaja**: Integridad referencial, sin duplicados

### AppContext como Source of Truth
- Frontend carga maestros en `initializeApp()`
- `dbService` busca primero en AppContext
- Evita llamadas API redundantes

### Optimizaciones de Performance
- ✅ Paginación backend: `?page=1&limit=50`
- ✅ Scroll infinito con Intersection Observer
- ✅ Lazy loading de imágenes
- ✅ Prefetch inteligente (300px)
- ✅ Grid optimizado (280px mínimo)

---

## 📦 Dependencias Principales

### Frontend
- `react` ^18.2.0
- `axios` ^1.6.2

### Backend
- `express` ^4.18.2
- `sql.js` ^1.10.3
- `geolib` ^3.3.4
- `multer` ^1.4.5

### Dev/Test
- `jest` ^29.7.0
- `supertest` ^6.3.3

---

## 🚦 Estado del Proyecto

**Versión**: 2.0  
**Última actualización**: Febrero 2026

### Completado ✅
- Arquitectura ID-based
- Validación geográfica
- Lazy loading + scroll infinito
- Auto-fill de formularios
- Tests completos (5 suites)
- Generación PPT con plantilla

---

## 📄 Licencia

Proyecto privado - Todos los derechos reservados
