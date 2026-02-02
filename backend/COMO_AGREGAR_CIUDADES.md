# 📍 Cómo Agregar Ciudades o Pueblos

Este sistema valida que las coordenadas (latitud, longitud) correspondan a la ciudad indicada. Si necesitas agregar una nueva ciudad o pueblo, sigue estos pasos:

## 🎯 Pasos Rápidos

### 1. **Obtener las Coordenadas**

Ve a [Google Maps](https://maps.google.com):
1. Busca la ciudad o pueblo
2. Haz clic derecho en el **centro** de la ciudad
3. Selecciona **"¿Qué hay aquí?"**
4. Copia las coordenadas (aparecen abajo)
   - Ejemplo: `4.7110, -74.0721`
   - Primera coordenada = **Latitud**
   - Segunda coordenada = **Longitud**

> **💡 Tip**: En ciudades grandes, busca el centro histórico o la plaza principal.

### 2. **Definir el Radio de Validación**

El radio determina qué tan lejos del centro pueden estar las coordenadas. **Es mejor ser generoso** - el objetivo es evitar errores graves (como París para Bogotá), no ser restrictivo:

| Tamaño de Población | Radio Recomendado |
|---------------------|-------------------|
| 🏘️ Pueblos pequeños (< 50k hab) | 8-12 km |
| 🏙️ Ciudades medianas (50k-200k) | 15-20 km |
| 🌆 Ciudades grandes (200k-1M) | 25-35 km |
| 🌃 Áreas metropolitanas (> 1M) | 40-50 km |

**Ejemplos reales actualizados:**
- **Bogotá** (área metropolitana): 45 km - incluye Soacha, Chía, etc.
- **Medellín** (Valle de Aburrá): 35 km - incluye Envigado, Bello, Itagüí
- **Cali**: 30 km - ciudad grande en expansión
- **Barranquilla**: 28 km - área metropolitana costera
- **Bucaramanga**: 25 km - incluye Floridablanca, Girón, Piedecuesta
- Ciudades medianas: 15-20 km
- Pueblos: 8-12 km

> **💡 Filosofía**: Las ciudades crecen dinámicamente. Con que las coordenadas estén "cerca" de la ciudad correcta es suficiente. No necesitas ser exacto al milímetro.

### 3. **Agregar la Ciudad al Código**

Abre el archivo: `backend/utils/ciudadesCoordinates.js`

Busca el objeto `CIUDADES` y agrega tu ciudad siguiendo este formato:

```javascript
const CIUDADES = {
  // ... ciudades existentes ...
  
  // TU NUEVA CIUDAD
  NOMBRE_CIUDAD: {
    nombre: 'NOMBRE CIUDAD',
    latitud: 4.1234,      // Coordenada de Google Maps
    longitud: -75.5678,   // Coordenada de Google Maps
    radioKm: 10,          // Radio según tabla anterior
  },
};
```

## 📝 Ejemplos Completos

### Ejemplo 1: Agregar Tunja

```javascript
TUNJA: {
  nombre: 'TUNJA',
  latitud: 5.5353,
  longitud: -73.3678,
  radioKm: 10,  // Ciudad mediana
},
```

### Ejemplo 2: Agregar Girardot

```javascript
GIRARDOT: {
  nombre: 'GIRARDOT',
  latitud: 4.3017,
  longitud: -74.8039,
  radioKm: 10,  // Pueblo en crecimiento, ser generoso
},
```

### Ejemplo 3: Agregar Montería

```javascript
MONTERIA: {
  nombre: 'MONTERÍA',
  latitud: 8.7479,
  longitud: -75.8814,
  radioKm: 20,  // Ciudad mediana-grande
},
```

## ✅ Verificar que Funciona

Después de agregar la ciudad, puedes probarla:

### Opción 1: Crear un test rápido

```javascript
// En __tests__/geo-validation.test.js, agregar:

test('✅ ACEPTA coordenadas válidas para Tunja', async () => {
  const res = await request(app)
    .post('/api/ooh/create')
    .field('ciudad', 'TUNJA')
    .field('latitud', '5.5353')
    .field('longitud', '-73.3678')
    // ... otros campos ...
});
```

### Opción 2: Probar desde el frontend

1. Inicia el servidor
2. Crea un registro OOH
3. Selecciona la nueva ciudad
4. Ingresa coordenadas válidas (dentro del radio)
5. Intenta ingresar coordenadas inválidas (fuera del radio)

## 🔍 Cómo Validar el Radio Correcto

Si no estás seguro del radio apropiado:

1. Abre Google Maps
2. Busca la ciudad
3. Mide la distancia del centro al límite urbano más lejano
4. Agrega 2-3 km adicionales como margen
5. Ese es tu radio

**Herramienta online**: [FreeMapTools - Radius Around Point](https://www.freemaptools.com/radius-around-point.htm)

## ⚠️ Consideraciones Importantes

### Nombres de Ciudades

- Usa **MAYÚSCULAS** en el nombre
- Sin caracteres especiales en la key (usa `CUCUTA` no `CÚCUTA`)
- Puedes usar tildes en el campo `nombre`: `'CÚCUTA'`

### Ciudades con Nombres Similares

Si hay dos ciudades con el mismo nombre, agrégales un sufijo:

```javascript
PALMIRA_VALLE: {
  nombre: 'PALMIRA',
  latitud: 3.5394,
  longitud: -76.3036,
  radioKm: 8,
},
```

### Radio Muy Restrictivo vs Muy Permisivo

| ⚠️ Radio muy pequeño | ✅ Radio balanceado | ❌ Radio muy grande |
|---------------------|---------------------|---------------------|
| Rechaza zonas válidas | Acepta área urbana + crecimiento | Acepta ciudades vecinas |
| Usuarios frustrados | Validación efectiva y flexible | Validación inútil |
| < 8km en ciudades | 15-45km según tamaño | > 60km |

**Recomendación**: Es mejor pecar de permisivo que de restrictivo. El objetivo es evitar errores **graves** (como confundir países), no medir con precisión milimétrica.

## 🚀 Después de Agregar

1. **Reinicia el servidor** si está corriendo
2. **Ejecuta los tests** para verificar:
   ```bash
   npm test -- __tests__/geo-validation.test.js
   ```
3. **Documenta** en el README si es una ciudad muy importante

## 🤝 Preguntas Frecuentes

**P: ¿Puedo agregar un corregimiento o vereda?**  
R: Sí, usa un radio de 3-5 km.

**P: ¿Qué pasa si alguien ingresa coordenadas fuera del radio?**  
R: El sistema muestra un error indicando que las coordenadas están a X km del centro, y el usuario debe verificar la ciudad.

**P: ¿Puedo cambiar el radio de una ciudad existente?**  
R: Sí, edita el archivo y cambia el valor de `radioKm`.

**P: ¿Necesito actualizar algo más?**  
R: No. El sistema detecta automáticamente las ciudades agregadas al objeto `CIUDADES`.

## 📞 Soporte

Si tienes problemas agregando una ciudad, contacta al equipo de desarrollo.
