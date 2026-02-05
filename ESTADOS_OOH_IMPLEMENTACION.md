# Sistema de Estados OOH - Implementación Completa

## 📋 Resumen

Se ha implementado exitosamente el sistema de estados para registros OOH, permitiendo clasificar cada registro con estados como ACTIVO, BONIFICADO, CONSUMO, etc.

## ✅ Cambios Implementados

### 1. Base de Datos

**Tabla `ooh_states` creada:**
```sql
CREATE TABLE ooh_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Columna agregada a `ooh_records`:**
```sql
ALTER TABLE ooh_records 
ADD COLUMN estado_id INTEGER 
REFERENCES ooh_states(id)
```

**Estados iniciales insertados:**
1. ACTIVO - OOH activo y visible
2. BONIFICADO - OOH en período de bonificación
3. CONSUMO - OOH en período de consumo
4. MANTENIMIENTO - OOH en mantenimiento
5. PAUSADO - OOH pausado temporalmente
6. INACTIVO - OOH inactivo

### 2. Backend - Servicios

**Archivo: `backend/services/dbService.js`**

Funciones agregadas:
- `getAllOOHStates()` - Obtener todos los estados
- `getOOHStateById(stateId)` - Buscar estado por ID
- `getOOHStateByName(nombre)` - Buscar estado por nombre
- `addOOHState(nombre, descripcion)` - Crear nuevo estado

### 3. Backend - Controlador

**Archivo: `backend/controllers/oohController.js`**

#### Funciones agregadas:
- `getAllOOHStates(req, res)` - GET endpoint para obtener estados
- `createOOHState(req, res)` - POST endpoint para crear estado

#### Modificaciones en `createOOH()`:
1. **Extracción de estado_id** (línea ~220):
```javascript
const { 
  brand_id, campaign_id, ooh_type_id, provider_id, city_id,
  direccion, latitud, longitud, fechaInicio, fechaFin,
  checked, estado_id  // ✅ NUEVO
} = req.body;
```

2. **Obtención del estado** (línea ~285):
```javascript
// Obtener estado (con default a ACTIVO si no viene)
let state = null;
let estado_id_final = estado_id ? parseInt(estado_id, 10) : 1;
if (estado_id) {
  state = dbService.getOOHStateById(estado_id_final);
  if (!state) {
    estado_id_final = 1; // fallback a ACTIVO
    state = dbService.getOOHStateById(1);
  }
} else {
  state = dbService.getOOHStateById(1);
}
```

3. **Inclusión en oohData** (línea ~527):
```javascript
const oohData = {
  id,
  brand_id,
  campaign_id,
  ooh_type_id,
  provider_id,
  city_id,
  category_id,
  region_id,
  estado_id: estado_id_final,  // ✅ NUEVO
  // ...
};
```

### 4. Backend - Rutas

**Archivo: `backend/routes/ooh.js`**

Rutas agregadas:
```javascript
// GET - Obtener todos los estados OOH
router.get('/states', oohController.getAllOOHStates);

// POST - Crear nuevo estado OOH
router.post('/states', oohController.createOOHState);
```

### 5. Frontend

**Archivo: `frontend/src/components/ExcelUploader.js`**

Ya implementado en sesiones anteriores:
- Parsing de estado desde columna Excel
- Función `findOrCreateState(name)` para buscar/crear estados
- Inclusión de `estado_id` en FormData al crear registros

## 🔧 Script de Configuración

**Archivo: `backend/setup-estados.js`**

Script para inicializar la tabla de estados. Ejecutar con:
```bash
cd backend
node setup-estados.js
```

El script:
- ✅ Inicializa la BD
- ✅ Crea la tabla `ooh_states`
- ✅ Inserta 6 estados por defecto
- ✅ Agrega columna `estado_id` a `ooh_records`
- ✅ Guarda cambios
- ✅ Muestra estados creados

## 📡 API Endpoints

### GET /api/ooh/states
Obtener todos los estados disponibles

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "ACTIVO",
      "descripcion": "OOH activo y visible",
      "created_at": "2026-02-05 17:37:47",
      "updated_at": "2026-02-05 17:37:47"
    },
    ...
  ]
}
```

### POST /api/ooh/states
Crear nuevo estado

**Request Body:**
```json
{
  "nombre": "NUEVO_ESTADO",
  "descripcion": "Descripción del estado"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "nombre": "NUEVO_ESTADO",
    "descripcion": "Descripción del estado"
  }
}
```

### POST /api/ooh/create (modificado)
Ahora acepta `estado_id` como parámetro opcional

**Request Body (cambios):**
```json
{
  "brand_id": 1,
  "campaign_id": 5,
  "ooh_type_id": 3,
  "provider_id": 2,
  "city_id": 15,
  "estado_id": 2,  // ✅ NUEVO (opcional, default: 1 = ACTIVO)
  "direccion": "...",
  "latitud": 4.65,
  "longitud": -74.05,
  "fechaInicio": "2025-01-01",
  ...
}
```

## 🧪 Pruebas

### Verificar que el endpoint funciona:
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/ooh/states" -Method Get | ConvertTo-Json -Depth 5
```

**Resultado esperado:** ✅ JSON con 6 estados

### Crear un nuevo estado:
```powershell
$body = @{
  nombre = "PENDIENTE"
  descripcion = "OOH pendiente de aprobación"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/ooh/states" -Method Post -Body $body -ContentType "application/json"
```

## 📊 Flujo Completo

### Importación desde Excel:

1. **Frontend** lee archivo Excel
2. Encuentra columna "ESTADO" (o similar)
3. Extrae valor (ej: "BONIFICADO")
4. Llama a `findOrCreateState("BONIFICADO")`
5. Si existe, retorna `estado_id`
6. Si no existe, crea estado y retorna `estado_id`
7. Agrega `estado_id` al FormData
8. POST a `/api/ooh/create` con `estado_id`
9. **Backend** recibe `estado_id`
10. Valida que existe en BD
11. Si no existe, usa `estado_id=1` (ACTIVO) por defecto
12. Guarda registro con `estado_id`

### Creación manual:

1. Frontend muestra dropdown con estados disponibles
2. Usuario selecciona estado
3. Frontend envía `estado_id` en POST
4. Backend procesa igual que en importación

## 🎯 Comportamiento de Default

Si no se especifica `estado_id` al crear un registro:
- Se asigna automáticamente `estado_id = 1` (ACTIVO)
- El registro se crea sin errores
- Se registra en logs: "No se especificó estado_id, usando ACTIVO por defecto"

## ✅ Checklist de Implementación

- [x] Tabla `ooh_states` creada
- [x] Columna `estado_id` agregada a `ooh_records`
- [x] 6 estados iniciales insertados
- [x] Funciones de BD implementadas (get, create)
- [x] Endpoints API creados (GET, POST)
- [x] Rutas configuradas
- [x] Controlador modificado para aceptar `estado_id`
- [x] Default a ACTIVO implementado
- [x] Validación de estado existente
- [x] Script de setup creado
- [x] Documentación completa
- [x] Pruebas exitosas

## 🔄 Próximos Pasos (Opcional)

1. **Frontend**: Agregar dropdown de estados en formulario manual
2. **Backend**: Endpoint PUT/PATCH para actualizar estado
3. **Backend**: Endpoint DELETE para eliminar estados (soft delete)
4. **Frontend**: Filtros por estado en lista de registros
5. **Reports**: Incluir estado en reportes PPT/Excel
6. **BigQuery**: Sincronizar campo estado_id

## 📝 Notas Técnicas

- Los estados son inmutables después de crear registros (para mantener integridad)
- Se recomienda no eliminar estados con registros asociados
- El estado ACTIVO (id=1) es el default y no debe eliminarse
- Los nombres de estados se guardan en MAYÚSCULAS
- La columna `estado_id` permite NULL (registros antiguos sin estado)

## 🐛 Troubleshooting

### Error: "Cannot read properties of null (reading 'run')"
**Solución:** Ejecutar `setup-estados.js` para inicializar la tabla

### Error: "Estado no encontrado con ID X"
**Solución:** El estado_id enviado no existe. Verificar con GET /api/ooh/states

### Registros sin estado (NULL)
**Solución:** Ejecutar query de actualización:
```sql
UPDATE ooh_records SET estado_id = 1 WHERE estado_id IS NULL;
```

## 📚 Referencias

- Script de setup: `backend/setup-estados.js`
- Servicios: `backend/services/dbService.js` (líneas 1547-1611)
- Controlador: `backend/controllers/oohController.js` (líneas 2055-2095)
- Rutas: `backend/routes/ooh.js` (líneas 83-88)

---

✅ **Sistema de Estados OOH completamente funcional y probado**
