# 📊 Modelo Relacional OOH Sistema v2.0

## Tablas y Campos

### 1. **regions** - Regiones de Colombia
```
├─ id (PK)
├─ nombre (TEXT UNIQUE)
└─ created_at (TIMESTAMP)
```

### 2. **categories** - Categorías de Productos
```
├─ id (PK)
├─ nombre (TEXT UNIQUE)
└─ created_at (TIMESTAMP)
```

### 3. **advertisers** - Anunciantes/Corporaciones
```
├─ id (PK)
├─ nombre (TEXT UNIQUE)
└─ created_at (TIMESTAMP)
```

### 4. **brands** - Marcas Comerciales
```
├─ id (PK)
├─ nombre (TEXT UNIQUE)
├─ category_id (FK → categories.id)
├─ advertiser_id (FK → advertisers.id)
└─ created_at (TIMESTAMP)
```

### 5. **campaigns** - Campañas de Marketing
```
├─ id (PK)
├─ nombre (TEXT)
├─ brand_id (FK → brands.id)
├─ created_at (TIMESTAMP)
└─ UNIQUE(nombre, brand_id)
```

### 6. **ooh_types** - Tipos de OOH
```
├─ id (PK)
├─ nombre (TEXT UNIQUE) - [VALLA, POSTER, PISO, FASCIA, DIGITAL]
└─ created_at (TIMESTAMP)
```

### 7. **ooh_states** - Estados/Condiciones de OOH ✨ NUEVO
```
├─ id (PK)
├─ nombre (TEXT UNIQUE) - [ACTIVO, ARRIENDO, PRODUCCION, BONIFICADO, CONSUMO, INACTIVO]
├─ descripcion (TEXT)
└─ created_at (TIMESTAMP)
```

### 8. **providers** - Proveedores/Arrendadores
```
├─ id (PK)
├─ nombre (TEXT UNIQUE)
└─ created_at (TIMESTAMP)
```

### 9. **regions** 
```
├─ id (PK)
├─ nombre (TEXT UNIQUE)
└─ created_at (TIMESTAMP)
```

### 10. **cities** - Ciudades Colombianas
```
├─ id (PK)
├─ nombre (TEXT UNIQUE)
├─ region_id (FK → regions.id)
├─ latitud (REAL) - Centro de la ciudad
├─ longitud (REAL) - Centro de la ciudad
├─ radio_km (REAL) - Radio de cobertura
└─ created_at (TIMESTAMP)
```

### 11. **addresses** - Direcciones/Ubicaciones
```
├─ id (PK)
├─ city_id (FK → cities.id)
├─ descripcion (TEXT)
├─ latitud (REAL)
├─ longitud (REAL)
└─ created_at (TIMESTAMP)
```

### 12. **ooh_records** ⭐ NÚCLEO DEL SISTEMA
```
IDENTIFICACIÓN
├─ id (TEXT PK) - UUID único

RELACIONES REQUERIDAS
├─ brand_id (FK → brands.id)
├─ campaign_id (FK → campaigns.id)
├─ ooh_type_id (FK → ooh_types.id)
├─ provider_id (FK → providers.id)
├─ estado_id (FK → ooh_states.id) ✨ NUEVO

DATOS DERIVADOS (Auto-completados desde relaciones)
├─ city_id (FK → cities.id) ✨ NUEVO
├─ category_id (FK → categories.id) ✨ NUEVO
├─ region_id (FK → regions.id) ✨ NUEVO
├─ address_id (FK → addresses.id)

ESTADO Y REVISIÓN ✨ MEJORADO
├─ checked (INTEGER DEFAULT 0)
├─ review_required (INTEGER DEFAULT 0) - 👉 ¿Requiere revisión?
├─ review_reason (TEXT) - 👉 Motivo: coordenadas generadas/corregidas
├─ estado (TEXT) - Texto del estado

UBICACIÓN Y FECHAS
├─ fecha_inicio (TEXT NOT NULL) - 👉 AHORA REQUERIDO
├─ fecha_final (TEXT) - Fin de vigencia
├─ anunciante (TEXT DEFAULT 'ABI')

IMÁGENES (Denormalizadas para búsqueda rápida)
├─ imagen_1 (TEXT)
├─ imagen_2 (TEXT)
├─ imagen_3 (TEXT)

SINCRONIZACIÓN CON BIGQUERY 📡
├─ synced_to_bigquery (DATETIME) - Timestamp de último sync exitoso
├─ bq_sync_status (TEXT DEFAULT 'pending') - Estado: pending, synced, failed
├─ last_bigquery_sync (DATETIME) ✨ NUEVO - Control de sincronización

AUDITORÍA
├─ created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
└─ updated_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

### 13. **images** 🖼️ MEJORADA
```
├─ id (PK)
├─ ooh_record_id (FK → ooh_records.id)
├─ ruta (TEXT NOT NULL) - Path local o URL

INFORMACIÓN DE IMAGEN
├─ tipo (TEXT DEFAULT 'local') - local, gcs, s3
├─ orden (INTEGER DEFAULT 1) - Posición en la secuencia
├─ role (TEXT DEFAULT 'primary') - primary, gallery, thumbnail
├─ slot (INTEGER) - Número de slot (1, 2, 3)

METADATOS ✨ NUEVO
├─ size_bytes (INTEGER) - Tamaño en bytes
├─ width (INTEGER) - Ancho en píxeles
├─ height (INTEGER) - Alto en píxeles
├─ format (TEXT) - jpg, png, webp, etc.
├─ uploaded_by (TEXT) - Usuario que subió la imagen

SINCRONIZACIÓN GCS ✨ NUEVO
├─ synced_to_gcs (BOOLEAN DEFAULT 0) - ¿Sincronizado a Google Cloud Storage?
├─ gcs_url (TEXT) - URL pública de GCS

AUDITORÍA
├─ created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
├─ updated_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
└─ UNIQUE(ooh_record_id, orden)
```

---

## 📋 CAMPOS DE VALIDACIÓN Y REVISIÓN

### **review_required & review_reason** - Sistema de Banderas para QA
Los registros se marcan para revisión en estos casos:

| Caso | review_reason | Origen |
|------|---------------|--------|
| Coordenadas generadas | "Coordenadas generadas cerca al centro de [CIUDAD], verificar que sea correcto" | Importación Excel sin lat/lng |
| Coordenadas corregidas | "Se corrigió la coordenada revisar si es correcta" | Parser detectó formato incorrecto |
| Coordenadas fuera de rango | "Coordenadas erradas: fuera de la ciudad [CIUDAD], ~X km fuera del rango" | Validación geográfica |

### **checked** - Estados de Verificación
- `0` = No verificado
- `1` = Verificado y aprobado
- Puede ser usado en combinación con `review_required`

---

## 🔄 FLUJO DE SINCRONIZACIÓN BIGQUERY

```
ooh_record creado/actualizado
    ↓
bq_sync_status = 'pending'
synced_to_bigquery = NULL
    ↓
Ejecutar sync (realtime o batch)
    ↓
✅ Éxito:
    ├─ synced_to_bigquery = AHORA
    ├─ bq_sync_status = 'synced'
    └─ last_bigquery_sync = AHORA
    
❌ Fallo:
    ├─ bq_sync_status = 'failed'
    └─ last_bigquery_sync = INTENTÓ EN HORA
```

### Campos de Control
- **synced_to_bigquery**: DATETIME - Cuándo fue el último ÉXITO
- **bq_sync_status**: 'pending' | 'synced' | 'failed' 
- **last_bigquery_sync**: DATETIME - Cuándo fue el último intento (éxito o fallo)

---

## 🖼️ FLUJO DE IMÁGENES

```
Usuario sube imagen
    ↓
1. Guardar local: /local-images/[MARCA]/[REC-XXX]/img.jpg
2. Insertar en tabla images con:
   ├─ tipo='local'
   ├─ rol='primary'|'gallery'
   ├─ slot=1|2|3
   ├─ size_bytes, width, height, format
   ├─ synced_to_gcs=0
   └─ gcs_url=NULL
    ↓
3. Guardar referencia en ooh_records:
   ├─ imagen_1 = ruta[0]
   ├─ imagen_2 = ruta[1]
   └─ imagen_3 = ruta[2]
    ↓
Sync GCS (batch):
    ├─ Subir a Google Cloud Storage
    ├─ images.synced_to_gcs = 1
    └─ images.gcs_url = URL pública
```

---

## 💡 VALIDACIONES Y RESTRICCIONES

### en **ooh_records**
- ✅ `fecha_inicio` es REQUERIDA (NOT NULL)
- ✅ `brand_id`, `campaign_id`, `ooh_type_id`, `provider_id` son REQUERIDAS
- ✅ `estado_id` DEFAULT 1 (ACTIVO)
- ✅ `checked` DEFAULT 0 (no verificado)
- ✅ `review_required` DEFAULT 0 (no requiere revisión)

### en **ooh_states**
```sql
-- 6 estados disponibles
ACTIVO, ARRIENDO, PRODUCCION, BONIFICADO, CONSUMO, INACTIVO
```

### en **images**
- ✅ UNIQUE(ooh_record_id, orden) - No duplicar orden para el mismo registro
- ✅ Referencia con ON DELETE CASCADE - Si borro ooh_record, borro imágenes

---

## 📈 ÍNDICES RECOMENDADOS (Performance)

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_ooh_brand ON ooh_records(brand_id);
CREATE INDEX idx_ooh_city ON ooh_records(city_id);
CREATE INDEX idx_ooh_campaign ON ooh_records(campaign_id);
CREATE INDEX idx_ooh_reviewed ON ooh_records(review_required);
CREATE INDEX idx_ooh_synced ON ooh_records(bq_sync_status);

-- Imágenes
CREATE INDEX idx_images_record ON images(ooh_record_id);
CREATE INDEX idx_images_synced ON images(synced_to_gcs);
```

---

## 🔐 INTEGRIDAD REFERENCIAL

Todas las relaciones tienen:
- ✅ FOREIGN KEY constraints
- ❌ ON DELETE SET NULL - Prohibido (excepto en images)
- ✅ ON DELETE CASCADE - Solo en images

Si intentas borrar una brand, falla (protege integridad de datos)

---

## ✨ Resumen de Mejoras v2.0

| Área | Cambio | Beneficio |
|------|--------|-----------|
| **Revisión** | `review_required`, `review_reason` | QA visual de problemas |
| **Sincronización** | `last_bigquery_sync` | Auditoría de intentos sync |
| **Datos Derivados** | `city_id`, `category_id`, `region_id` | Búsquedas rápidas sin JOINs |
| **Imágenes** | Tabla images con metadatos | Gestión de múltiples formatos/destinos |
| **Validación** | `fecha_inicio` NOT NULL | Evita registros sin fecha |
| **Estados** | Tabla ooh_states + descripción | Control de condiciones de OOH |
| **Auditoría** | `created_at`, `updated_at` | Trazabilidad de cambios |

