const dbService = require('./services/dbService');
const { CIUDADES } = require('./utils/ciudadesCoordinates');

async function updateCitiesFromFile() {
  try {
    console.log('🔄 Inicializando base de datos...');
    await dbService.initDB();
    
    console.log('📍 Obteniendo todas las ciudades de la BD...');
    const dbCities = await dbService.getAllCities();
    
    if (!dbCities || dbCities.length === 0) {
      console.log('⚠️  No se encontraron ciudades en la base de datos');
      return;
    }
    
    console.log(`✅ Se encontraron ${dbCities.length} ciudades en BD\n`);
    
    // Crear mapa de búsqueda normalizado
    const ciudadesMap = {};
    Object.values(CIUDADES).forEach(ciudad => {
      const key = ciudad.nombre.toUpperCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      ciudadesMap[key] = ciudad;
    });
    
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    
    for (let i = 0; i < dbCities.length; i++) {
      const dbCity = dbCities[i];
      const progress = `[${i + 1}/${dbCities.length}]`;
      
      // Normalizar nombre de ciudad para búsqueda
      const normalizedName = dbCity.nombre.toUpperCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      console.log(`${progress} 🔍 Procesando: ${dbCity.nombre} (${dbCity.region || 'Sin región'})`);
      
      // Intentar diferentes variaciones del nombre
      let coordsData = ciudadesMap[normalizedName];
      
      // Intentar sin DC si es Bogotá
      if (!coordsData && normalizedName.includes('DC')) {
        coordsData = ciudadesMap[normalizedName.replace('DC', '').replace(/\./g, '')];
      }
      
      // Intentar solo Bogotá
      if (!coordsData && normalizedName.includes('BOGOTA')) {
        coordsData = ciudadesMap['BOGOTA'];
      }
      
      if (coordsData) {
        const newLat = parseFloat(coordsData.latitud).toFixed(6);
        const newLon = parseFloat(coordsData.longitud).toFixed(6);
        const newRadio = coordsData.radioKm || 5;
        
        const currentLat = parseFloat(dbCity.latitud || 0).toFixed(6);
        const currentLon = parseFloat(dbCity.longitud || 0).toFixed(6);
        const currentRadio = dbCity.radio_km || 5;
        
        if (currentLat === newLat && currentLon === newLon && currentRadio === newRadio) {
          console.log(`   ℹ️  Ya tiene coordenadas correctas: (${newLat}, ${newLon}, ${newRadio}km)`);
          skipped++;
        } else {
          // Actualizar en BD
          const region = dbCity.region || 'ANTIOQUIA'; // Usar región actual o default
          
          await dbService.updateCity(
            dbCity.id,
            dbCity.nombre,
            region,
            newLat,
            newLon,
            newRadio
          );
          
          console.log(`   ✅ Actualizado:`);
          console.log(`      Antes: (${currentLat}, ${currentLon}, ${currentRadio}km)`);
          console.log(`      Ahora: (${newLat}, ${newLon}, ${newRadio}km)`);
          console.log(`      ${coordsData.nombre}`);
          updated++;
        }
      } else {
        console.log(`   ⚠️  No se encontró en archivo de coordenadas: ${dbCity.nombre}`);
        notFound++;
      }
      
      console.log(''); // Línea en blanco
    }
    
    console.log('═'.repeat(60));
    console.log('📊 RESUMEN DE ACTUALIZACIÓN:');
    console.log('═'.repeat(60));
    console.log(`✅ Actualizadas: ${updated}`);
    console.log(`ℹ️  Sin cambios: ${skipped}`);
    console.log(`⚠️  No encontradas en archivo: ${notFound}`);
    console.log(`📍 Total procesadas: ${dbCities.length}`);
    console.log('═'.repeat(60));
    
    if (notFound > 0) {
      console.log('\n💡 Sugerencia: Puedes agregar las ciudades faltantes en:');
      console.log('   backend/utils/ciudadesCoordinates.js');
      console.log('   O actualizarlas manualmente usando el mapa interactivo.\n');
    }
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar script
console.log('╔═════════════════════════════════════════════════════════════════╗');
console.log('║   🗺️  ACTUALIZACIÓN DE COORDENADAS DESDE ARCHIVO LOCAL        ║');
console.log('╚═════════════════════════════════════════════════════════════════╝\n');

updateCitiesFromFile()
  .then(() => {
    console.log('✨ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
