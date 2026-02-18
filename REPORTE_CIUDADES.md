# 📍 Reporte de Coordenadas de Ciudades

**Fecha de generación:** 12/2/2026, 11:17:39 a. m.  
**Total de ciudades:** 35

---

## ✅ Ciudades con Coordenadas Correctas

Las siguientes ciudades ya tienen coordenadas validadas del archivo `ciudadesCoordinates.js`:

| Ciudad | Región | Coordenadas | Radio (km) | Estado |
|--------|--------|-------------|-----------|--------|
| ARMENIA | CO Andes | 4.5339, -75.7314 | 15 | ✅ |
| BELLO | CO Andes | 6.3386, -75.5458 | 12 | ✅ |
| IBAGUE | CO Andes | 4.4381, -75.2322 | 18 | ✅ |
| ITAGUI | CO Andes | 6.1676, -75.5857 | 12 | ✅ |
| MANIZALES | CO Andes | 5.0688, -75.5046 | 15 | ✅ |
| MEDELLIN | CO Andes | 6.2442, -75.5812 | 35 | ✅ |
| PEREIRA | CO Andes | 4.8133, -75.6961 | 18 | ✅ |
| ROVIRA | CO Andes | 5.1019, -75.0289 | 8 | ✅ |
| VITERBO | CO Andes | 4.9597, -75.8197 | 10 | ✅ |
| DUITAMA | CO Centro | 5.8122, -73.0384 | 12 | ✅ |
| MOSQUERA | CO Centro | 4.7424, -74.3531 | 12 | ✅ |
| SESQUILE | CO Centro | 5.0275, -73.7964 | 10 | ✅ |
| SOACHA | CO Centro | 4.5769, -74.2289 | 12 | ✅ |
| SOGAMOSO | CO Centro | 5.7297, -72.9275 | 12 | ✅ |
| TUNJA | CO Centro | 5.5353, -73.3678 | 12 | ✅ |
| VILLAVICENCIO | CO Centro | 4.1431, -73.6292 | 18 | ✅ |
| ZIPAQUIRA | CO Centro | 5.1697, -73.8067 | 12 | ✅ |
| BARRANQUILLA | CO Norte | 10.9639, -74.7964 | 28 | ✅ |
| BUCARAMANGA | CO Norte | 7.1254, -73.1198 | 25 | ✅ |
| CARTAGENA DE INDIAS | CO Norte | 10.391, -75.5136 | 22 | ✅ |
| CORDOBA | CO Norte | 8.7844, -76.1197 | 10 | ✅ |
| CUCUTA | CO Norte | 7.8935, -72.508 | 20 | ✅ |
| MONTERIA | CO Norte | 8.7479, -75.8814 | 20 | ✅ |
| MONTERÍA | CO Norte | 8.7479, -75.8814 | 20 | ✅ |
| SINCELEJO | CO Norte | 9.3047, -75.3977 | 15 | ✅ |
| VALLEDUPAR | CO Norte | 10.4608, -73.2533 | 18 | ✅ |
| CALI | CO Sur | 3.4372, -76.5197 | 30 | ✅ |
| NEIVA | CO Sur | 2.9271, -75.2898 | 15 | ✅ |
| POPAYAN | CO Sur | 2.4448, -76.6133 | 15 | ✅ |
| TULUA | CO Sur | 4.3186, -76.1956 | 12 | ✅ |

---

## ⚠️ Ciudades que Requieren Actualización Manual

Las siguientes ciudades **NO** se encontraron en el archivo `ciudadesCoordinates.js` y pueden tener coordenadas incorrectas:

| Ciudad | Región | Coordenadas Actuales | Radio Actual (km) | Acción Requerida |
|--------|--------|---------------------|-------------------|------------------|
| BOGOTA DC | CO Centro | 4.643151, -74.039789 | 45 | Actualizar a BOGOTÁ D.C. con coordenadas: 4.7110, -74.0721, radio 45km |
| LA MESA | CO Centro | 2.257474, -75.823132 | 8 | Agregar coordenadas: 4.6333, -74.4667, radio 10km |
| BOGOTA | CO Norte | 4.711, -74.0721 | 45 | Verificar si es duplicado de BOGOTÁ D.C. o ciudad diferente |
| CARTAGENA | CO Norte | 8.28619, -72.810755 | 22 | Actualizar a CARTAGENA DE INDIAS (ya existe): 10.3910, -75.5136, radio 22km |
| SANTA MARTA | CO Norte | 11.2404, -74.211 | 18 | Agregar coordenadas: 11.2446, -74.1997, radio 20km |

---

## 📝 Instrucciones para Actualización Manual

### Opción 1: Usar el mapa interactivo en la aplicación

1. En el frontend, abre el modal de ciudades
2. Busca la ciudad (ej: "bogota dc")
3. El fuzzy matcher te sugerirá la ciudad existente
4. Selecciónala para entrar en **modo actualización**
5. Arrastra el marcador en el mapa a la ubicación correcta
6. Ajusta el radio si es necesario
7. Clic en "✏️ Actualizar Ciudad"

### Opción 2: Actualizar el archivo de coordenadas

Edita `backend/utils/ciudadesCoordinates.js` y agrega las entradas faltantes:

```javascript
// Para LA MESA
LA_MESA_CUNDINAMARCA: {
  nombre: 'LA MESA',
  latitud: 4.6333,
  longitud: -74.4667,
  radioKm: 10,
  region: 'Centro',
},

// Para SANTA MARTA
SANTA_MARTA: {
  nombre: 'SANTA MARTA',
  latitud: 11.2446,
  longitud: -74.1997,
  radioKm: 20,
  region: 'Norte',
},
```

Luego ejecuta:
```bash
node backend/update-cities-from-file.js
```

### Opción 3: Actualizar directamente en la BD

Usa el endpoint PUT de la API:

```javascript
// Ejemplo para actualizar BOGOTA DC
fetch('http://localhost:8080/api/ooh/cities/10', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'BOGOTÁ D.C.',
    region: 'CO Centro',
    latitud: 4.7110,
    longitud: -74.0721,
    radio: 45
  })
});
```

---

## 🔍 Resumen de Cambios Recientes

- ✅ Radio por defecto reducido de 15km a 5km
- ✅ Mapa ahora es editable en modo actualización
- ✅ Fuzzy matching implementado para evitar duplicados
- ✅ Sugerencias automáticas al escribir nombre de ciudad
- ✅ Modo actualización vs. creación automático

---

## 📊 Estadísticas

- **Total de ciudades:** 35
- **Ciudades correctas:** 30
- **Requieren atención:** 5
- **Ciudades por región:**
  - **CO Norte:** 12 ciudades
  - **CO Centro:** 10 ciudades
  - **CO Andes:** 9 ciudades
  - **CO Sur:** 4 ciudades

---

*Reporte generado automáticamente por `generate-cities-report.js`*
