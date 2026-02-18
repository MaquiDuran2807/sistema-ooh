const dbService = require('./services/dbService');
const nodeGeocoder = require('node-geocoder');

const geocoder = nodeGeocoder({
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
  // Configuración para cumplir con políticas de OpenStreetMap
  timeout: 10000,
  osmServer: 'https://nominatim.openstreetmap.org',
  apiKey: '', // No se requiere
  email: 'your-email@example.com', // Recomendado incluir email
  extraHeaders: {
    'User-Agent': 'OOH-Colombia-App/1.0 (contact: your-email@example.com)', // REQUERIDO por OSM
  }
});

// Función para esperar entre llamadas
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateCityCoordinates() {
  try {
    console.log('🔄 Inicializando base de datos...');
    await dbService.initDB();
    
    console.log('📍 Obteniendo todas las ciudades...');
    const cities = await dbService.getAllCities();
    
    if (!cities || cities.length === 0) {
      console.log('⚠️  No se encontraron ciudades en la base de datos');
      return;
    }
    
    console.log(`✅ Se encontraron ${cities.length} ciudades para actualizar\n`);
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const progress = `[${i + 1}/${cities.length}]`;
      
      try {
        // Construir query de búsqueda mejorada
        // Normalizar nombre de región para búsqueda más específica
        const regionMap = {
          'CO ANDES': 'Antioquia',
          'CO CENTRO': 'Cundinamarca',
          'CO NORTE': 'Atlántico'
        };
        
        const regionName = city.region ? regionMap[city.region.toUpperCase()] || city.region : '';
        
        // Buscar con ciudad y departamento
        const searchQuery = regionName
          ? `${city.nombre}, ${regionName}, Colombia`
          : `${city.nombre}, Colombia`;
        
        console.log(`${progress} 🔍 Buscando: ${searchQuery}`);
        
        // Geocodificar con OpenStreetMap
        const results = await geocoder.geocode(searchQuery);
        
        if (results && results.length > 0) {
          const result = results[0];
          const newLat = parseFloat(result.latitude).toFixed(6);
          const newLon = parseFloat(result.longitude).toFixed(6);
          
          // Comparar con coordenadas actuales
          const currentLat = parseFloat(city.latitud || 0).toFixed(6);
          const currentLon = parseFloat(city.longitud || 0).toFixed(6);
          
          if (currentLat === newLat && currentLon === newLon) {
            console.log(`   ℹ️  Coordenadas ya son correctas (${newLat}, ${newLon})`);
            skipped++;
          } else {
            // Actualizar en BD
            const radio = city.radio_km || 5; // Usar radio existente o 5km por defecto
            
            await dbService.updateCity(
              city.id,
              city.nombre,
              regionName || 'ANTIOQUIA', // Usar región actual o Antioquia por defecto
              newLat,
              newLon,
              radio
            );
            
            console.log(`   ✅ Actualizado: (${currentLat}, ${currentLon}) → (${newLat}, ${newLon})`);
            console.log(`   📍 ${result.formattedAddress || searchQuery}`);
            updated++;
          }
        } else {
          console.log(`   ❌ No se encontraron resultados para: ${searchQuery}`);
          failed++;
        }
        
        // Esperar 2 segundos entre llamadas para respetar límites de API de OSM
        if (i < cities.length - 1) {
          await sleep(2000);
        }
        
      } catch (error) {
        console.error(`   ❌ Error procesando ${city.nombre}:`, error.message);
        failed++;
        // Continuar con la siguiente ciudad, esperar un poco más en caso de rate limit
        await sleep(3000);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ACTUALIZACIÓN:');
    console.log('='.repeat(60));
    console.log(`✅ Actualizadas: ${updated}`);
    console.log(`ℹ️  Sin cambios: ${skipped}`);
    console.log(`❌ Fallidas: ${failed}`);
    console.log(`📍 Total procesadas: ${cities.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar script
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   🗺️  ACTUALIZACIÓN MASIVA DE COORDENADAS DE CIUDADES   ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

updateCityCoordinates()
  .then(() => {
    console.log('\n✨ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
