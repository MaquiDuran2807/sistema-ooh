# 🗺️ GUÍA: VALIDACIÓN GEOGRÁFICA Y ERRORES DE COORDENADAS

## 📋 Problema Detectado

Cuando cargas un Excel, algunos registros pueden fallar con el error:

```
❌ Coordenadas fuera del rango de la ciudad

Las coordenadas están a 4715.14km del centro de BOGOTA, 
pero el radio permitido es de 45km. 
Verifica que la ciudad sea correcta.
```

**¿Por qué ocurre?** Las coordenadas en el Excel no corresponden a la ciudad seleccionada.

---

## 🔍 Cómo funciona la validación geográfica

### 1️⃣ **Sistema de validación**

Cada ciudad tiene un **radio permitido**:

```
BOGOTA DC      → Centro en (4.7110, -74.0721), radio 45 km
MEDELLIN       → Centro en (6.2476, -75.5658), radio 35 km
CALI           → Centro en (3.4516, -76.5320), radio 30 km
BARRANQUILLA   → Centro en (10.9685, -74.7813), radio 25 km
```

### 2️⃣ **Cálculo de distancia**

Cuando intentas crear un registro:

```
1. Toma las coordenadas del Excel (latitud, longitud)
2. Toma el centro de la ciudad (lat, lng fijos)
3. Calcula la distancia en km usando la fórmula de Haversine
4. Compara con el radio permitido de la ciudad
5. Si distancia > radio → ❌ ERROR
6. Si distancia ≤ radio → ✅ VÁLIDO
```

### 3️⃣ **Ejemplo real**

**Entrada:**
```
Ciudad: BOGOTA
Latitud: 47.067806
Longitud: -74.0544038
```

**Cálculo:**
```
Centro de BOGOTA:  (4.7110, -74.0721)
Coordenadas Excel: (47.067806, -74.0544038)
Distancia: 4715.14 km ❌
Radio permitido: 45 km
Resultado: RECHAZADO
```

**¿Qué pasó?** La latitud `47.067806` está en Europa, no en Bogotá (que debería ser ~4.71).

---

## 💡 Razones comunes de error

### ❌ 1. Coordenadas completamente incorrectas

```
Buscaste: BOGOTA DC (4.7110, -74.0721)
Excel tiene: (47.067806, -74.0544038)

Problema: Latitud invertida o de otra ciudad
Solución: Revisa que las coordenadas coincidan con la ciudad
```

### ❌ 2. Confusión de ciudades

```
Declaraste: BOGOTA
Pero las coordenadas pertenecen a: MEDELLIN (6.2476, -75.5658)

Problema: Seleccionaste la ciudad equivocada
Solución: Cambia "BOGOTA" por "MEDELLIN" en el Excel
```

### ❌ 3. Radio muy pequeño para la ciudad

```
Ciudad: CALI (radio 30 km)
Coordenadas a: 35 km del centro

Problema: Ubicación fuera del área de cobertura
Solución: Usa una ubicación dentro del radio de 30 km
```

### ❌ 4. Formato incorrecto de coordenadas

```
Excel tiene: "4,7110 -74,0721" (con comas)
Debería ser: "4.7110 -74.0721" (con puntos decimales)

Problema: Formato de número incorrecto
Solución: Usa punto decimal (.) no coma (,)
```

---

## ✅ Cómo CORREGIR los errores

### 🔧 Paso 1: Identificar los registros fallidos

Después de cargar el Excel, verás en el **Reporte de Importación**:

```
⚠️ REGISTROS NO CREADOS - REVISA LOS DETALLES

Fila | Marca  | Ciudad  | Dirección  | Lat    | Lng     | Motivo
-----+--------+---------+------------+--------+---------+----------------------------------
3    | CORONA | BOGOTA  | Calle 80   | 47.07  | -74.05  | Coordenadas fuera del rango de...
7    | AGUILA | CALI    | Carrera 50 | 3.45   | -76.60  | ✅ Válidas pero error en creación
```

### 🔧 Paso 2: Descargar el CSV de fallidos

Haz clic en: **"📥 Descargar CSV de registros fallidos"**

Obtendrás un archivo como:
```csv
Fila,Marca,Ciudad,Dirección,Latitud,Longitud,Motivo
"3","CORONA","BOGOTA","Calle 80","47.067806","-74.0544038","Coordenadas fuera del rango..."
"7","AGUILA","CALI","Carrera 50","3.4516","-76.5320","Error creando dirección..."
```

### 🔧 Paso 3: Corregir en Excel

**Para el registro de la fila 3:**

1. Abre el Excel original
2. Fila 3, columnas de Latitud/Longitud
3. **ANTES:** `47.067806`, `-74.0544038` ❌
4. **DESPUÉS:** `4.7110`, `-74.0721` ✅ (coordenadas de Bogotá)

---

## 📍 Tabla de Coordenadas Correctas

### Usaaqui estas coordenadas EXACTAS para cada ciudad:

```
ARMENIA           4.5339   -75.6811   (radio 12 km)
BARRANQUILLA      10.9685  -74.7813   (radio 25 km)
BELLO             6.3370   -75.5547   (radio 10 km)
BOGOTA DC         4.7110   -74.0721   (radio 45 km) ⭐ MÁS GRANDE
BUCARAMANGA       7.1254   -73.1198   (radio 20 km)
CALI              3.4516   -76.5320   (radio 30 km)
CARTAGENA         10.3910  -75.4794   (radio 20 km)
CORDOBA           8.7479   -75.8195   (radio 15 km)
CUCUTA            7.8939   -72.5078   (radio 18 km)
DUITAMA           5.8267   -73.0338   (radio 8 km)
IBAGUE            4.4389   -75.2322   (radio 15 km)
ITAGUI            6.1849   -75.5994   (radio 10 km)
LA MESA           4.6333   -74.4667   (radio 8 km)
MANIZALES         5.0703   -75.5138   (radio 15 km)
MEDELLIN          6.2476   -75.5658   (radio 35 km) ⭐ GRANDE
MONTERIA          8.7479   -75.8814   (radio 15 km)
MOSQUERA          4.7061   -74.2303   (radio 10 km)
NEIVA             2.9273   -75.2819   (radio 15 km)
PEREIRA           4.8087   -75.6906   (radio 15 km)
POPAYAN           2.4419   -76.6063   (radio 12 km)
ROVIRA            5.1019   -75.0289   (radio 8 km)
SANTA MARTA      11.2404   -74.2110   (radio 18 km)
SESQUILE          5.0550   -73.7878   (radio 6 km)
SINCELEJO         9.3047   -75.3978   (radio 12 km)
SOACHA            4.5793   -74.2167   (radio 12 km)
SOGAMOSO          5.7167   -72.9343   (radio 10 km)
TULUA             4.0892   -76.1953   (radio 10 km)
TUNJA             5.5353   -73.3678   (radio 12 km)
VALLEDUPAR       10.4631   -73.2532   (radio 18 km)
VILLAVICENCIO     4.1420   -73.6266   (radio 20 km)
VITERBO           5.0667   -75.8833   (radio 6 km)
ZIPAQUIRA         5.0214   -73.9967   (radio 10 km)
```

---

## 🎯 Checklist para evitar errores

Antes de importar Excel, verifica:

- [ ] **Latitudes válidas:** Entre 0.7° y 13.5° (rango de Colombia)
- [ ] **Longitudes válidas:** Entre -76° y -71° (rango de Colombia)
- [ ] **Formato correcto:** Decimales con PUNTO (4.7110) no coma (4,7110)
- [ ] **Ciudad existe:** Verifica que esté en la lista de 32 ciudades
- [ ] **Coordenadas cercanas:** Las coordenadas están dentro del radio de la ciudad

---

## 🧪 Cómo verificar coordenadas

### Opción 1: Google Maps
1. Abre [Google Maps](https://maps.google.com)
2. Busca la dirección exacta
3. Haz clic en el punto rojo → Muestra coordenadas
4. Copia lat, lng con PUNTO decimal

### Opción 2: Herramienta online
1. Ve a [LatLng.org](http://www.latlng.org)
2. Escribe la ciudad o dirección
3. Copia las coordenadas mostradas

### Opción 3: Excel
Usa esta fórmula para validar (si tienes Google API):
```excel
=GOOGLEMAPS(dirección, "latitude")
=GOOGLEMAPS(dirección, "longitude")
```

---

## 📊 Resultado después de corregir

### ANTES (Falla)
```
Registro Fila 3: CORONA - BOGOTA
Latitud: 47.067806 ❌
Longitud: -74.0544038 ❌
Resultado: ❌ ERROR - Coordenadas fuera del rango
```

### DESPUÉS (Éxito)
```
Registro Fila 3: CORONA - BOGOTA
Latitud: 4.7110 ✅
Longitud: -74.0721 ✅
Resultado: ✅ CREADO
```

---

## 📝 Logs detallados en consola

Cuando hay error geográfico, verás en el reporte:

```
Motivo: Coordenadas fuera del rango de la ciudad: 
❌ Las coordenadas están a 4715.14km del centro de BOGOTA, 
pero el radio permitido es de 45km. 
Verifica que la ciudad sea correcta.
```

**Decodificar el mensaje:**
- `4715.14km` = Distancia calculada ← Muy grande
- `centro de BOGOTA` = Ciudad donde intentó validar
- `45km` = Radio permitido de BOGOTA
- **Conclusión:** Las coordenadas NO pertenecen a Bogotá

---

## 🔄 Flujo de reimportación

```
1. Carga Excel original
   ↓
2. Algunos registros fallan (ej: 5 de 58)
   ↓
3. Ves reporte con detalles de error
   ↓
4. Descargas CSV de los 5 fallidos
   ↓
5. Corriges lat/lng en Excel o CSV
   ↓
6. Importas solo los 5 corregidos
   ↓
7. ✅ Se crean exitosamente
   ↓
8. Sistema ahora tiene 58 registros totales
```

---

## ❓ Preguntas frecuentes

### P: ¿Qué significa "radio permitido de 45km"?

**R:** Significa que ese elemento OOH puede estar a **hasta 45 km del centro de Bogotá**. Es un área de cobertura realista para una ciudad grande.

---

### P: ¿Por qué BOGOTA tiene radio 45km y SESQUILE tiene 6km?

**R:** BOGOTA es una megaciudad con metro área grande. SESQUILE es un municipio pequeño con cobertura limitada.

---

### P: ¿Puedo cambiar el radio permitido?

**R:** No automáticamente desde el frontend. Pero puedes:
1. Editar la BD directamente, O
2. Pedirle al equipo técnico que ajuste en `reset-database-clean.js`

---

### P: La dirección es correcta pero sale error geográfico

**R:** Revisa:
1. **¿Escribiste bien la ciudad?** (BOGOTA no BOGOTA_DC)
2. **¿El formato de decimales es correcto?** (4.7110 con punto, no 4,7110 con coma)
3. **¿Las coordenadas realmente pertenecen a esa ciudad?** (Verifica en Google Maps)

---

### P: ¿Qué pasa con los registros que se rechazaron?

**R:** Se **guardan en el CSV de fallidos**. Así puedes:
- Corregir solo los que fallaron
- Importar solo los corregidos
- El resto de registros (que sí se crearon) se mantienen

---

## 📌 Resumen ejecutivo

```
VALIDACIÓN GEOGRÁFICA = DISTANCIA ≤ RADIO PERMITIDO

Si: Distancia > Radio → ❌ Rechazado
Si: Distancia ≤ Radio → ✅ Aceptado

Solución: Verifica coordenadas en Google Maps
          Asegúrate que estén dentro del radio de la ciudad
          Usa decimales con PUNTO (4.7110) no coma (4,7110)
```

---

**Última actualización:** Febrero 5, 2026  
**Versión:** 1.0.0
