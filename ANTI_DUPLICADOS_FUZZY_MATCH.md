# 🔍 Sistema Anti-Duplicados con Fuzzy Matching

## Problema Resuelto

Evitar la creación de registros duplicados cuando hay variaciones en los nombres de ciudades y direcciones, como:
- **Ciudades**: "BOGOTA" vs "BOGOTÁ" vs "BOGOTA DC" vs "BOGOTÁ D.C."
- **Errores tipográficos**: "BOGOOTA", "BOGOT", "BOGTOA" (letras invertidas)
- **Direcciones**: "CALLE 123 # 45-67" vs "CLL 123 45 67" vs "CALLE 123 NO 45-67"
- **Coordenadas**: Misma ubicación pero dirección escrita diferente

## Solución Implementada

### 1. 🏙️ Fuzzy Matching para Ciudades (Frontend)

**Algoritmo**: Levenshtein Distance + Similitud de Cadenas

#### Funciones Implementadas:

```javascript
// Calcular distancia de Levenshtein (cuántos cambios necesita una string para convertirse en otra)
levenshteinDistance('BOGOTA', 'BOGOT') = 1  // Falta 1 letra

// Calcular porcentaje de similitud
calculateSimilarity('BOGOTA', 'BOGOTA DC') = 77.78%
calculateSimilarity('BOGOTA', 'BOGOOTA') = 85.71%
calculateSimilarity('BOGOTA', 'BOGOT') = 85.71%

// Normalizar para comparación (sin acentos, sin espacios extras, mayúsculas)
normalizeForComparison('Bogotá D.C.') → 'BOGOTA DC'
normalizeForComparison('  Medellín  ') → 'MEDELLIN'
```

#### Threshold: 85% de Similitud

Si dos nombres tienen **85% o más de similitud**, se consideran la misma ciudad.

#### Ejemplos de Detección:

| Excel Dice | BD Tiene | Similitud | Acción |
|------------|----------|-----------|--------|
| BOGOTA | BOGOTA DC | 77.78% | ❌ No detecta (< 85%) - Crea nueva |
| BOGOTA DC | BOGOTA DC | 100% | ✅ Detecta - Reutiliza |
| BOGOOTA | BOGOTA | 85.71% | ✅ Detecta - Reutiliza |
| MEDELLIN | MEDELLIN | 100% | ✅ Detecta - Reutiliza |
| MEDELIN | MEDELLIN | 87.5% | ✅ Detecta - Reutiliza |
| CALI | CALIFORNIA | 50% | ❌ No detecta - Crea nueva |

#### Logs en Consola:

```javascript
// Coincidencia exacta
♻️ [EXCEL] Ciudad existente (coincidencia exacta): BOGOTA (ID: 1)

// Similitud detectada
🔍 [EXCEL] Ciudad similar encontrada (85.7% similitud):
   Buscado: "BOGOOTA"
   Encontrado: "BOGOTA" (ID: 1)
   ✅ Reutilizando ciudad existente para evitar duplicados

// No se encontró similar
⚡ Ciudad no encontrada (ni similar), creando nueva (INCOMPLETA - falta centro y radio): NUEVA_CIUDAD
```

### 2. 📍 Detección de Direcciones Duplicadas (Backend)

**Estrategia Dual**: Coincidencia Exacta + Coordenadas Cercanas

#### Búsqueda en 2 Pasos:

**Paso 1**: Buscar dirección con descripción EXACTA (normalizada)
```sql
SELECT * FROM addresses 
WHERE city_id = ? AND UPPER(descripcion) = ?
```

**Paso 2**: Si no hay exacta, buscar por **coordenadas cercanas** (±100 metros)
```sql
SELECT * FROM addresses 
WHERE city_id = ?
  AND ABS(latitud - ?) < 0.001 
  AND ABS(longitud - ?) < 0.001
```

**Tolerancia**: 0.001 grados ≈ 100 metros

#### ¿Por qué Coordenadas?

Dos registros con la misma ubicación GPS **probablemente son el mismo lugar**, aunque la dirección esté escrita diferente:
- "CALLE 123 # 45-67" 
- "CLL 123 45 67"
- "CALLE 123 NO 45-67"

→ Si tienen las mismas coordenadas (±100m), se considera la misma dirección.

#### Ejemplos:

| Caso | Descripción Excel | BD Existente | Coordenadas | Resultado |
|------|-------------------|--------------|-------------|-----------|
| 1 | CALLE 123 # 45-67 | CALLE 123 # 45-67 | Exactas | ✅ Reutiliza (Paso 1) |
| 2 | CLL 123 45 67 | CALLE 123 # 45-67 | ±50m | ✅ Reutiliza (Paso 2) |
| 3 | CALLE 456 | CALLE 123 | Diferentes | ❌ Crea nueva |

#### Logs en Backend:

```javascript
// Coincidencia exacta
✅ [CREATE ADDRESS] Dirección existente (coincidencia exacta): {...}

// Similitud por coordenadas
🔍 [CREATE ADDRESS] Dirección SIMILAR encontrada (mismas coordenadas ±100m):
   Buscada: "CLL 123 45 67" (4.6097, -74.0817)
   Existente: "CALLE 123 # 45-67" (4.6098, -74.0816)
   ✅ Reutilizando dirección existente para evitar duplicados
```

### 3. 🏷️ Anti-Duplicados en Otros Catálogos

Ya implementado (con logging mejorado):

- **Marcas**: Coincidencia exacta normalizada (CORONA = CORONA)
- **Proveedores**: Coincidencia exacta normalizada
- **Tipos OOH**: Coincidencia exacta normalizada
- **Campañas**: Coincidencia exacta + mismo brand_id

## Casos de Uso

### Caso 1: Importar Excel con "BOGOOTA" (error tipográfico)

**Sin Fuzzy Matching**:
```
❌ Crea nueva ciudad: BOGOOTA
❌ Ahora tienes: BOGOTA, BOGOOTA (duplicado)
```

**Con Fuzzy Matching**:
```
✅ Detecta similitud 85.7%
♻️ Reutiliza: BOGOTA (ID: 1)
```

### Caso 2: Importar misma dirección escrita diferente

**Excel 1**: 
```
Dirección: "CALLE 123 # 45-67"
Coordenadas: 4.6097, -74.0817
```

**Excel 2**:
```
Dirección: "CLL 123 45 67"  
Coordenadas: 4.6098, -74.0816  (±50m de diferencia)
```

**Resultado**:
```
✅ Detecta coordenadas cercanas (Paso 2)
♻️ Reutiliza dirección existente
```

### Caso 3: Ciudad realmente nueva

**Excel**: "IBAGUE"
**BD**: Tiene BOGOTA, MEDELLIN, CALI

**Resultado**:
```
❌ No encuentra similitud >= 85%
✅ Crea nueva ciudad: IBAGUE
⚠️ Ciudad INCOMPLETA - requiere agregar centro y radio
```

## Configuración

### Ajustar Threshold de Similitud

En [ExcelUploader.js](frontend/src/components/ExcelUploader.js) línea ~595:

```javascript
// Cambiar 85 a otro valor (0-100)
const findOrCreateCity = async (name) => {
  const similarMatch = findMostSimilarCity(nameUpper, cities, 85); // ← Ajustar aquí
  // ...
}
```

**Recomendaciones**:
- **85%**: Balance entre detección de errores y falsos positivos (ACTUAL)
- **90%**: Más estricto (solo errores muy pequeños)
- **80%**: Más permisivo (puede detectar falsos positivos)

### Ajustar Tolerancia de Coordenadas

En [oohController.js](backend/controllers/oohController.js) línea ~1870:

```javascript
// Cambiar 0.001 grados (≈100m)
const tolerance = 0.001; // ← Ajustar aquí (0.001 = ~100m, 0.0001 = ~10m)
```

**Conversión**:
- 1 grado ≈ 111 km
- 0.001 grados ≈ 111 metros
- 0.0001 grados ≈ 11 metros

## Testing

### Prueba 1: Error Tipográfico en Ciudad

1. **BD existente**: MEDELLIN
2. **Excel nuevo**: MEDELIN (falta una L)
3. **Esperado**: Detecta 87.5% similitud, reutiliza MEDELLIN

```javascript
// Consola del navegador (F12)
🔍 [EXCEL] Ciudad similar encontrada (87.5% similitud):
   Buscado: "MEDELIN"
   Encontrado: "MEDELLIN" (ID: 2)
   ✅ Reutilizando ciudad existente para evitar duplicados
```

### Prueba 2: Dirección con Mismas Coordenadas

1. **BD existente**: 
   - Dirección: "CARRERA 7 # 32-16"
   - Coords: (4.6486, -74.0638)

2. **Excel nuevo**:
   - Dirección: "CRA 7 32 16"
   - Coords: (4.6487, -74.0637) ← 50m diferencia

3. **Esperado**: Detecta coordenadas cercanas, reutiliza dirección

```javascript
// Logs del backend (terminal)
🔍 [CREATE ADDRESS] Dirección SIMILAR encontrada (mismas coordenadas ±100m):
   Buscada: "CRA 7 32 16" (4.6487, -74.0637)
   Existente: "CARRERA 7 # 32-16" (4.6486, -74.0638)
   ✅ Reutilizando dirección existente para evitar duplicados
```

### Prueba 3: Ciudad Nueva Legítima

1. **BD existente**: BOGOTA, MEDELLIN, CALI
2. **Excel nuevo**: BARRANQUILLA
3. **Esperado**: No detecta similitud, crea nueva ciudad

```javascript
⚡ Ciudad no encontrada (ni similar), creando nueva: BARRANQUILLA
⚠️ [EXCEL] Ciudad creada INCOMPLETA: BARRANQUILLA - Requiere agregar latitud, longitud y radio
```

## Beneficios

✅ **Evita duplicados** por errores humanos
✅ **Mantiene base de datos limpia** sin ciudades/direcciones repetidas
✅ **Reutiliza IDs consistentemente** (reports y analytics confiables)
✅ **Flexible**: Ajustable threshold según necesidades
✅ **Transparente**: Logs detallados muestran qué se detectó y por qué

## Limitaciones

⚠️ **Ciudades con nombres muy diferentes**: No detecta si alguien escribe "SANTAFE DE BOGOTA" vs "BOGOTA" (similitud < 85%)
⚠️ **Direcciones en lugares diferentes**: Si dos direcciones están a ±100m pero son lugares distintos, las considerará iguales
⚠️ **Performance**: Algoritmo O(n) - con miles de ciudades puede ser lento (actualmente no es problema)

## Solución para Limitaciones

Para **nombres muy diferentes de la misma ciudad**, agregar aliases manualmente en BD:
```sql
-- Agregar alias para ciudades
INSERT INTO city_aliases (city_id, alias) VALUES
  (1, 'BOGOTA'),
  (1, 'BOGOTA DC'),
  (1, 'SANTAFE DE BOGOTA');
```

Luego modificar búsqueda para incluir aliases (futura mejora).

## Archivos Modificados

1. **frontend/src/components/ExcelUploader.js**
   - Funciones: `levenshteinDistance`, `calculateSimilarity`, `normalizeForComparison`, `findMostSimilarCity`
   - Modificado: `findOrCreateCity` con fuzzy matching

2. **backend/controllers/oohController.js**
   - Modificado: `createAddress` con búsqueda dual (exacta + coordenadas)

---

**Última actualización**: 2026-02-05
