const dbService = require('./services/dbService');
const fs = require('fs');
const path = require('path');

async function generateReport() {
  try {
    await dbService.initDB();
    
    const cities = await dbService.getAllCities();
    
    if (!cities || cities.length === 0) {
      console.log('No se encontraron ciudades');
      return;
    }
    
    // Ordenar por región y nombre
    cities.sort((a, b) => {
      const regionCompare = (a.region || '').localeCompare(b.region || '');
      if (regionCompare !== 0) return regionCompare;
      return a.nombre.localeCompare(b.nombre);
    });
    
    let markdown = `# 📍 Reporte de Coordenadas de Ciudades

**Fecha de generación:** ${new Date().toLocaleString('es-CO')}  
**Total de ciudades:** ${cities.length}

---

## ✅ Ciudades con Coordenadas Correctas

Las siguientes ciudades ya tienen coordenadas validadas del archivo \`ciudadesCoordinates.js\`:

| Ciudad | Región | Coordenadas | Radio (km) | Estado |
|--------|--------|-------------|-----------|--------|
`;

    let correctCities = [];
    let missingCities = [];
    
    // Ciudades que no se encontraron en el archivo
    const notFoundNames = ['BOGOTA DC', 'LA MESA', 'BOGOTA', 'CARTAGENA', 'SANTA MARTA'];
    
    cities.forEach(city => {
      const row = `| ${city.nombre} | ${city.region || 'Sin región'} | ${city.latitud}, ${city.longitud} | ${city.radio_km || 5} | `;
      
      if (notFoundNames.includes(city.nombre)) {
        missingCities.push({ ...city, row });
      } else {
        correctCities.push({ ...city, row });
      }
    });
    
    // Agregar ciudades correctas
    correctCities.forEach(city => {
      markdown += `${city.row}✅ |\n`;
    });
    
    markdown += `\n---

## ⚠️ Ciudades que Requieren Actualización Manual

Las siguientes ciudades **NO** se encontraron en el archivo \`ciudadesCoordinates.js\` y pueden tener coordenadas incorrectas:

| Ciudad | Región | Coordenadas Actuales | Radio Actual (km) | Acción Requerida |
|--------|--------|---------------------|-------------------|------------------|
`;

    missingCities.forEach(city => {
      let notes = '';
      
      if (city.nombre === 'BOGOTA DC') {
        notes = 'Actualizar a BOGOTÁ D.C. con coordenadas: 4.7110, -74.0721, radio 45km';
      } else if (city.nombre === 'BOGOTA' && city.region === 'CO Norte') {
        notes = 'Verificar si es duplicado de BOGOTÁ D.C. o ciudad diferente';
      } else if (city.nombre === 'CARTAGENA' && city.region === 'CO Norte') {
        notes = 'Actualizar a CARTAGENA DE INDIAS (ya existe): 10.3910, -75.5136, radio 22km';
      } else if (city.nombre === 'LA MESA' && city.region === 'CO Centro') {
        notes = 'Agregar coordenadas: 4.6333, -74.4667, radio 10km';
      } else if (city.nombre === 'SANTA MARTA') {
        notes = 'Agregar coordenadas: 11.2446, -74.1997, radio 20km';
      }
      
      markdown += `| ${city.nombre} | ${city.region || 'Sin región'} | ${city.latitud}, ${city.longitud} | ${city.radio_km || 5} | ${notes} |\n`;
    });
    
    markdown += `\n---

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

Edita \`backend/utils/ciudadesCoordinates.js\` y agrega las entradas faltantes:

\`\`\`javascript
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
\`\`\`

Luego ejecuta:
\`\`\`bash
node backend/update-cities-from-file.js
\`\`\`

### Opción 3: Actualizar directamente en la BD

Usa el endpoint PUT de la API:

\`\`\`javascript
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
\`\`\`

---

## 🔍 Resumen de Cambios Recientes

- ✅ Radio por defecto reducido de 15km a 5km
- ✅ Mapa ahora es editable en modo actualización
- ✅ Fuzzy matching implementado para evitar duplicados
- ✅ Sugerencias automáticas al escribir nombre de ciudad
- ✅ Modo actualización vs. creación automático

---

## 📊 Estadísticas

- **Total de ciudades:** ${cities.length}
- **Ciudades correctas:** ${correctCities.length}
- **Requieren atención:** ${missingCities.length}
- **Ciudades por región:**
`;

    // Contar por región
    const regionCounts = {};
    cities.forEach(city => {
      const region = city.region || 'Sin región';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    
    Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
      markdown += `  - **${region}:** ${count} ciudades\n`;
    });
    
    markdown += `\n---

*Reporte generado automáticamente por \`generate-cities-report.js\`*
`;

    // Guardar archivo
    const outputPath = path.join(__dirname, '..', 'REPORTE_CIUDADES.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    
    console.log('✅ Reporte generado exitosamente:');
    console.log(`   ${outputPath}`);
    console.log(`\n📊 Resumen:`);
    console.log(`   - Ciudades correctas: ${correctCities.length}`);
    console.log(`   - Requieren atención: ${missingCities.length}`);
    console.log(`   - Total: ${cities.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateReport()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
