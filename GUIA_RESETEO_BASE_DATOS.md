# 🔄 GUÍA COMPLETA: RESETEO DE BASE DE DATOS

## 📋 Índice

1. [¿Qué hace el reseteo?](#qué-hace-el-reseteo)
2. [¿Cuándo usar este proceso?](#cuándo-usar-este-proceso)
3. [Scripts disponibles](#scripts-disponibles)
4. [Proceso paso a paso](#proceso-paso-a-paso)
5. [Estructura de la base de datos](#estructura-de-la-base-de-datos)
6. [Datos que se crean](#datos-que-se-crean)
7. [Datos que NO se crean](#datos-que-no-se-crean)
8. [Troubleshooting](#troubleshooting)

---

## ¿Qué hace el reseteo?

El script `reset-database-clean.js` **elimina completamente** la base de datos actual y crea una nueva con:

✅ **Catálogos completos** (regiones, marcas, ciudades, etc.)  
❌ **Sin registros OOH de prueba**  
❌ **Sin direcciones**  
❌ **Sin imágenes**

Es una base de datos **limpia y lista para producción**, donde importarás tus datos reales desde Excel.

---

## ¿Cuándo usar este proceso?

Usa este reseteo cuando:

- 🗑️ Quieras eliminar todos los datos de prueba
- 🧪 Tengas registros inconsistentes o corruptos
- 🆕 Quieras empezar con una base de datos limpia
- 🔄 Hayas hecho cambios en la estructura y quieras aplicarlos
- 📊 Estés listo para migrar a producción con datos reales

---

## Scripts disponibles

Tienes 3 scripts en la carpeta `backend/`:

### 1️⃣ `reset-database-clean.js` ⭐ **RECOMENDADO**
```bash
node reset-database-clean.js
```
- ✅ Crea BD limpia sin registros de prueba
- ✅ Solo catálogos esenciales
- ✅ Listo para importar Excel
- ✅ Backup automático de BD anterior
- ✅ Logging detallado del proceso

### 2️⃣ `create-proper-database.js`
```bash
node create-proper-database.js
```
- ⚠️ Similar al anterior pero menos detallado
- ⚠️ Podría tener configuraciones antiguas

### 3️⃣ `create-fresh-database.js`
```bash
node create-fresh-database.js
```
- ⚠️ Puede incluir datos de prueba
- ⚠️ Estructura podría estar desactualizada

---

## Proceso paso a paso

### 🔴 PASO 1: Detener el servidor backend

**Importante:** El servidor debe estar apagado para poder reemplazar la base de datos.

```powershell
# En la terminal donde corre el servidor, presiona:
Ctrl + C
```

O cierra la terminal donde ejecutaste `npm start` o `node server.js`.

**Verificar que está detenido:**
```powershell
# Debería decir "No connections could be made"
curl http://localhost:8080/api/ooh/health
```

---

### 🟡 PASO 2: Navegar a la carpeta backend

```powershell
cd "C:\Users\migduran\Documents\nuevo ooh\backend"
```

**Verificar que estás en el lugar correcto:**
```powershell
ls
# Deberías ver: reset-database-clean.js, ooh_data.db, server.js, etc.
```

---

### 🟢 PASO 3: Ejecutar el script de reseteo

```powershell
node reset-database-clean.js
```

**Lo que verás en pantalla:**

```
╔═══════════════════════════════════════════════════════════════════╗
║                  RESETEO DE BASE DE DATOS                         ║
╚═══════════════════════════════════════════════════════════════════╝

📦 PASO 1: Respaldo de la base de datos actual

   ✅ Backup creado: ooh_data.backup.1738786543210.db
   📂 Ubicación: C:\Users\migduran\...\backend\ooh_data.backup.1738786543210.db

🆕 PASO 2: Creando nueva base de datos SQLite

   ✅ Base de datos en memoria inicializada

🏗️  PASO 3: Creando estructura de tablas

   📋 Creando tabla: regions
   📋 Creando tabla: categories
   📋 Creando tabla: advertisers
   📋 Creando tabla: brands
   📋 Creando tabla: campaigns
   📋 Creando tabla: ooh_types
   📋 Creando tabla: providers
   📋 Creando tabla: cities
   📋 Creando tabla: addresses
   📋 Creando tabla: ooh_records
   📋 Creando tabla: images

   ✅ 11 tablas creadas exitosamente

🗺️  PASO 4: Insertando REGIONES

   ✅ CO Norte
   ✅ CO Centro
   ✅ CO Andes
   ✅ CO Sur

   Total: 4 regiones

📂 PASO 5: Insertando CATEGORÍAS

   ✅ CERVEZAS
   ✅ NABS

   Total: 2 categorías

🏢 PASO 6: Insertando ANUNCIANTES

   ✅ ABI
   ✅ ABInBEV
   ✅ BAVARIA

   Total: 3 anunciantes

🔗 PASO 7: Creando mapas de relaciones

   ✅ Mapa de categorías: 2 entradas
   ✅ Mapa de anunciantes: 3 entradas
   ✅ Mapa de regiones: 4 entradas

🏷️  PASO 8: Insertando MARCAS

   ✅ AGUILA (CERVEZAS - ABI)
   ✅ BBC (CERVEZAS - ABI)
   ✅ CBM (CERVEZAS - ABI)
   ✅ CFC (CERVEZAS - BAVARIA)
   ✅ CLUB COLOMBIA (CERVEZAS - ABI)
   ✅ COLA & POLA (CERVEZAS - ABI)
   ✅ CORONA (CERVEZAS - ABInBEV)
   ✅ COSTEÑA (CERVEZAS - ABI)
   ✅ MICHELOB (CERVEZAS - ABInBEV)
   ✅ PILSEN (CERVEZAS - ABI)
   ✅ POKER (CERVEZAS - ABI)
   ✅ PONY MALTA (NABS - ABI)
   ✅ REDDS (CERVEZAS - ABI)
   ✅ STELLA ARTOIS (CERVEZAS - ABInBEV)
   ✅ TADA (CERVEZAS - ABI)

   Total: 15 marcas

📺 PASO 9: Insertando CAMPAÑAS

   ✅ 127 (AGUILA)
   ✅ FRANCHISE (AGUILA)
   ✅ 100 YEARS (CORONA)
   ✅ 2 BOT FRIAS (AGUILA)
   ✅ 20 JULIO (CLUB COLOMBIA)
   ✅ 473 (CLUB COLOMBIA)
   ✅ 7 DE AGOSTO (CLUB COLOMBIA)
   ✅ AGUILA IMPERIAL (AGUILA)
   ✅ AON 100 YEARS (CORONA)
   ✅ AON ENERGIA NUTRITIVA (PONY MALTA)
   ... y 23 campañas más

   Total: 33 campañas

🎯 PASO 10: Insertando TIPOS DE OOH

   ✅ VALLA
   ✅ POSTER
   ✅ PISO
   ✅ FASCIA
   ✅ DIGITAL

   Total: 5 tipos

🚚 PASO 11: Insertando PROVEEDORES

   ✅ APX
   ✅ MEDIA TOTAL
   ✅ PUBLICIDAD

   Total: 3 proveedores

🏙️  PASO 12: Insertando CIUDADES CON COORDENADAS

   ✅ ARMENIA → CO Andes (4.5339, -75.6811)
   ✅ BARRANQUILLA → CO Norte (10.9685, -74.7813)
   ✅ BELLO → CO Andes (6.3370, -75.5547)
   ✅ BOGOTA DC → CO Centro (4.7110, -74.0721)
   ✅ BUCARAMANGA → CO Norte (7.1254, -73.1198)
   ✅ CALI → CO Sur (3.4516, -76.5320)
   ✅ CARTAGENA DE INDIAS → CO Norte (10.3910, -75.4794)
   ✅ CORDOBA → CO Norte (8.7479, -75.8195)
   ✅ CUCUTA → CO Norte (7.8939, -72.5078)
   ✅ DUITAMA → CO Centro (5.8267, -73.0338)
   ... y 22 ciudades más

   Total: 32 ciudades

💾 PASO 13: Guardando base de datos en disco

   ✅ Archivo creado: ooh_data.db
   📂 Ubicación: C:\Users\migduran\Documents\nuevo ooh\backend\ooh_data.db
   📊 Tamaño: 67.54 KB

✓ PASO 14: Verificación de integridad

   ╔═══════════════════════════════════════╗
   ║  CONTENIDO DE LA BASE DE DATOS        ║
   ╠═══════════════════════════════════════╣
   ║  Regiones:           4 ✅        ║
   ║  Categorías:         2 ✅        ║
   ║  Anunciantes:        3 ✅        ║
   ║  Marcas:            15 ✅        ║
   ║  Campañas:          33 ✅        ║
   ║  Tipos OOH:          5 ✅        ║
   ║  Proveedores:        3 ✅        ║
   ║  Ciudades:          32 ✅        ║
   ╠═══════════════════════════════════════╣
   ║  Direcciones:        0 (vacío) ║
   ║  Registros OOH:      0 (vacío) ║
   ║  Imágenes:           0 (vacío) ║
   ╚═══════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════╗
║                   ✅ PROCESO COMPLETADO                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  La base de datos ha sido reseteada exitosamente.                ║
║  Solo contiene catálogos, sin registros de prueba.               ║
║                                                                   ║
║  📌 SIGUIENTE PASO:                                               ║
║     Importa tus datos reales desde Excel usando el frontend      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Duración:** ~3-5 segundos

---

### 🔵 PASO 4: Reiniciar el servidor backend

```powershell
cd backend
npm start
```

O si usas el script de inicio:
```powershell
.\start-dev.bat
```

**Verificar que arrancó correctamente:**
```
🚀 Servidor ejecutándose en http://localhost:8080
✅ Conectado a la base de datos: ooh_data.db
```

---

### 🟣 PASO 5: Verificar el frontend

1. Abre el navegador en `http://localhost:3000`
2. La tabla principal debería estar **vacía** (0 registros)
3. Los filtros de Marca, Ciudad, Tipo deberían mostrar los catálogos

---

### 🟠 PASO 6: Importar datos reales desde Excel

1. Clic en botón **"📊 Cargar Excel"**
2. Selecciona tu archivo Excel con los registros reales
3. Verifica el preview
4. Clic en **"🚀 Crear registros"**
5. Espera el reporte final
6. Descarga CSV de registros fallidos (si hay)
7. Corrige y reimporta los fallidos

---

## Estructura de la base de datos

### 📊 Diagrama de relaciones

```
┌────────────────┐
│   REGIONS      │─┐
│ - id           │ │
│ - nombre       │ │
└────────────────┘ │
                   │
┌────────────────┐ │    ┌────────────────┐
│  CATEGORIES    │ │    │   CITIES       │←┐
│ - id           │ │    │ - id           │ │
│ - nombre       │ │    │ - nombre       │ │
└────────────────┘ │    │ - region_id    │─┘
                   │    │ - latitud      │
┌────────────────┐ │    │ - longitud     │
│  ADVERTISERS   │ │    │ - radio_km     │
│ - id           │ │    └────────────────┘
│ - nombre       │ │              │
└────────────────┘ │              │
         ↓         │              ↓
┌────────────────┐ │    ┌────────────────┐
│    BRANDS      │←┘    │   ADDRESSES    │←┐
│ - id           │      │ - id           │ │
│ - nombre       │      │ - city_id      │─┘
│ - category_id  │─┐    │ - descripcion  │
│ - advertiser_id│─┘    │ - latitud      │
└────────────────┘      │ - longitud     │
         │              └────────────────┘
         ↓                        │
┌────────────────┐                │
│   CAMPAIGNS    │                │
│ - id           │                │
│ - nombre       │                │
│ - brand_id     │─┐              │
└────────────────┘ │              │
                   │              │
┌────────────────┐ │              │
│   OOH_TYPES    │ │              │
│ - id           │ │              │
│ - nombre       │ │              │
└────────────────┘ │              │
                   │              │
┌────────────────┐ │              │
│   PROVIDERS    │ │              │
│ - id           │ │              │
│ - nombre       │ │              │
└────────────────┘ │              │
         ↓         ↓              ↓
┌─────────────────────────────────────┐
│         OOH_RECORDS                 │
│ - id (PK)                           │
│ - brand_id (FK)                     │
│ - campaign_id (FK)                  │
│ - ooh_type_id (FK)                  │
│ - address_id (FK)                   │
│ - provider_id (FK)                  │
│ - anunciante                        │
│ - estado                            │
│ - fecha_inicio                      │
│ - fecha_final                       │
│ - imagen_1, imagen_2, imagen_3      │
│ - checked                           │
│ - synced_to_bigquery                │
│ - bq_sync_status                    │
└─────────────────────────────────────┘
                   │
                   ↓
         ┌────────────────┐
         │    IMAGES      │
         │ - id           │
         │ - ooh_record_id│─┘
         │ - ruta         │
         │ - orden        │
         └────────────────┘
```

---

## Datos que se crean

### ✅ Catálogos completos

#### 1. **Regiones** (4)
```
CO Norte   → Barranquilla, Cartagena, Montería, Cucuta, Santa Marta, etc.
CO Centro  → Bogotá, Mosquera, Tunja, Duitama, Sesquile, etc.
CO Andes   → Medellín, Armenia, Pereira, Manizales, Bello, etc.
CO Sur     → Cali, Neiva, Popayán, Tuluá
```

#### 2. **Categorías** (2)
```
CERVEZAS   → Para marcas alcohólicas
NABS       → Para no-alcohólicas (Pony Malta)
```

#### 3. **Anunciantes** (3)
```
ABI        → Anheuser-Busch InBev Colombia
ABInBEV    → Anheuser-Busch InBev Global
BAVARIA    → Bavaria S.A.
```

#### 4. **Marcas** (15)
```
AGUILA, BBC, CBM, CFC, CLUB COLOMBIA, COLA & POLA, CORONA, 
COSTEÑA, MICHELOB, PILSEN, POKER, PONY MALTA, REDDS, 
STELLA ARTOIS, TADA
```

Cada marca tiene:
- `category_id` → CERVEZAS o NABS
- `advertiser_id` → ABI, ABInBEV o BAVARIA

#### 5. **Campañas** (33)
```
127, FRANCHISE, 100 YEARS, 2 BOT FRIAS, 20 JULIO, 473, 
7 DE AGOSTO, AGUILA IMPERIAL, AON 100 YEARS, 
AON ENERGIA NUTRITIVA, AON NATURAL, BACANA, BEER, 
BIG PROMO, COPA AMERICA, CORDILLERA, CRAVING CAPS, 
ENERGIA NUTRITIVA, ENERGÍA NUTRITIVA, EQUITY, 
FERIA DE FLORES, FERIAS Y FIESTAS, FIESTAS DEL MAR, 
LIGHT, LIGHT - LDACs PLATFORM, LIGHT BEER, 
MICHELOB ULTRA, ORIGINAL, PILSEN ROJA, POKER LIMON, 
ROJA, STELLA, ULTRA
```

Cada campaña está vinculada a su marca correspondiente.

#### 6. **Tipos OOH** (5)
```
VALLA      → Vallas publicitarias tradicionales
POSTER     → Pósters de menor tamaño
PISO       → Publicidad en piso
FASCIA     → Fascías comerciales
DIGITAL    → Pantallas digitales
```

#### 7. **Proveedores** (3)
```
APX            → Proveedor principal
MEDIA TOTAL    → Proveedor secundario
PUBLICIDAD     → Proveedor genérico
```

#### 8. **Ciudades** (32 con coordenadas exactas)
```
ARMENIA, BARRANQUILLA, BELLO, BOGOTA DC, BUCARAMANGA, CALI, 
CARTAGENA DE INDIAS, CORDOBA, CUCUTA, DUITAMA, IBAGUE, ITAGUI, 
LA MESA, MANIZALES, MEDELLIN, MONTERÍA, MOSQUERA, NEIVA, PEREIRA, 
POPAYAN, ROVIRA, SANTA MARTA, SESQUILE, SINCELEJO, SOACHA, 
SOGAMOSO, TULUA, TUNJA, VALLEDUPAR, VILLAVICENCIO, VITERBO, 
ZIPAQUIRA
```

Cada ciudad tiene:
- Coordenadas exactas (latitud, longitud)
- Radio de validación en km
- Región asignada

---

## Datos que NO se crean

### ❌ Tablas vacías (listas para recibir datos reales)

1. **addresses** → 0 registros
   - Se crean automáticamente al importar Excel
   - Validación geográfica por ciudad

2. **ooh_records** → 0 registros
   - Los registros reales vienen del Excel
   - Cada registro tiene IDs de todas las entidades

3. **images** → 0 registros
   - Se vinculan cuando subes fotos desde el frontend
   - Máximo 3 imágenes por registro

---

## Troubleshooting

### ❌ Error: "Cannot find module 'sql.js'"

**Solución:**
```powershell
cd backend
npm install
```

---

### ❌ Error: "EBUSY: resource busy or locked"

**Causa:** El servidor backend está corriendo.

**Solución:**
1. Detener el servidor (Ctrl+C)
2. Esperar 5 segundos
3. Ejecutar el reseteo nuevamente

---

### ❌ Error: "ENOENT: no such file or directory"

**Causa:** No estás en la carpeta `backend`.

**Solución:**
```powershell
cd "C:\Users\migduran\Documents\nuevo ooh\backend"
node reset-database-clean.js
```

---

### ⚠️ El servidor no arranca después del reseteo

**Verificar:**
```powershell
ls ooh_data.db
# Debería mostrar el archivo con timestamp reciente
```

**Revisar logs:**
```powershell
node server.js
# Observa errores en consola
```

**Si persiste:**
1. Cierra todas las terminales
2. Abre una nueva terminal
3. Ejecuta nuevamente:
```powershell
cd backend
npm start
```

---

### 🔄 Restaurar backup anterior

Si algo salió mal, puedes restaurar el backup:

1. **Identificar el backup:**
```powershell
ls ooh_data.backup.*.db
# ooh_data.backup.1738786543210.db
```

2. **Restaurar:**
```powershell
copy ooh_data.backup.1738786543210.db ooh_data.db
```

3. **Reiniciar servidor:**
```powershell
npm start
```

---

## 📝 Checklist final

Después del reseteo, verifica:

- [ ] Backend arranca sin errores
- [ ] Frontend carga correctamente
- [ ] Tabla principal está vacía (0 registros)
- [ ] Filtro de Marca muestra las 15 marcas
- [ ] Filtro de Ciudad muestra las 32 ciudades
- [ ] Filtro de Tipo muestra los 5 tipos OOH
- [ ] Puedes abrir el modal de "Cargar Excel"
- [ ] Archivo `ooh_data.backup.*.db` existe como respaldo

---

## 🎯 Resumen ejecutivo

```
┌─────────────────────────────────────────────────────────────┐
│  ANTES DEL RESETEO                                          │
├─────────────────────────────────────────────────────────────┤
│  • Base de datos con datos de prueba mezclados             │
│  • Posibles registros inconsistentes                        │
│  • Imágenes locales de testing                             │
│  • Direcciones duplicadas                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
                  node reset-database-clean.js
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DESPUÉS DEL RESETEO                                        │
├─────────────────────────────────────────────────────────────┤
│  ✅ Base de datos limpia con estructura perfecta           │
│  ✅ Catálogos completos (regiones, marcas, ciudades, etc.) │
│  ✅ 0 registros OOH (listo para datos reales)              │
│  ✅ 0 direcciones (se crean al importar)                   │
│  ✅ 0 imágenes (se suben desde frontend)                   │
│  ✅ Backup automático de BD anterior                       │
│  ✅ Sistema listo para producción                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 Soporte

Si tienes problemas durante el reseteo:

1. Revisa esta guía completa
2. Verifica los mensajes de error en consola
3. Asegúrate que el servidor esté detenido
4. Revisa que tengas espacio en disco
5. Confirma que estás en la carpeta `backend/`
6. Si nada funciona, restaura el backup

---

**Última actualización:** Febrero 5, 2026  
**Versión del script:** 1.0.0  
**Autor:** Sistema OOH Bavaria
