const dbService = require('./services/dbService');

/**
 * Script para eliminar ciudades duplicadas de la base de datos
 * Detecta ciudades con nombres muy similares y muestra opciones para eliminar
 */

async function removeDuplicateCities() {
  try {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   🗑️  ELIMINACIÓN DE CIUDADES DUPLICADAS                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    await dbService.initDB();
    
    const allCities = await dbService.getAllCities();
    
    if (!allCities || allCities.length === 0) {
      console.log('⚠️  No se encontraron ciudades en la BD');
      return;
    }
    
    console.log(`📍 Total de ciudades en BD: ${allCities.length}\n`);
    
    // Normalizar nombres para comparación
    const normalizeForComparison = (str) => {
      return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/\s+/g, '') // Remover espacios
        .replace(/DC|D\.C\./g, ''); // Remover DC
    };
    
    // Agrupar ciudades por nombre normalizado
    const cityGroups = {};
    allCities.forEach(city => {
      const normalized = normalizeForComparison(city.nombre);
      if (!cityGroups[normalized]) {
        cityGroups[normalized] = [];
      }
      cityGroups[normalized].push(city);
    });
    
    // Encontrar duplicados
    const duplicates = Object.entries(cityGroups).filter(([_, cities]) => cities.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No se encontraron ciudades duplicadas\n');
      return;
    }
    
    console.log(`⚠️  Se encontraron ${duplicates.length} grupos de ciudades duplicadas:\n`);
    console.log('═'.repeat(80));
    
    const citiesToDelete = [];
    
    duplicates.forEach(([normalizedName, cities], index) => {
      console.log(`\n🔍 Grupo ${index + 1}: "${normalizedName}"\n`);
      
      cities.forEach((city, idx) => {
        console.log(`   [${idx + 1}] ID: ${city.id}`);
        console.log(`       Nombre: ${city.nombre}`);
        console.log(`       Región: ${city.region || 'Sin región'}`);
        console.log(`       Coordenadas: (${city.latitud}, ${city.longitud})`);
        console.log(`       Radio: ${city.radio_km || 5} km`);
        
        // Detectar cuál es probablemente el incorrecto
        if (city.nombre === 'BOGOTA' && city.region === 'CO Norte') {
          console.log(`       ⚠️  DUPLICADO DETECTADO - Region incorrecta`);
          citiesToDelete.push(city);
        } else if (city.nombre === 'CARTAGENA' && city.region === 'CO Norte') {
          console.log(`       ⚠️  DUPLICADO DETECTADO - Ya existe "CARTAGENA DE INDIAS"`);
          citiesToDelete.push(city);
        } else if (city.nombre === 'MONTERIA' && !city.nombre.includes('Í')) {
          console.log(`       ⚠️  DUPLICADO DETECTADO - Versión sin tilde (preferir MONTERÍA)`);
          citiesToDelete.push(city);
        }
        console.log('');
      });
    });
    
    if (citiesToDelete.length === 0) {
      console.log('\n⚠️  Se encontraron duplicados pero no se pudo determinar cuáles eliminar automáticamente.');
      console.log('    Por favor, elimínalos manualmente usando el frontend.\n');
      return;
    }
    
    console.log('═'.repeat(80));
    console.log(`\n🗑️  Se eliminarán ${citiesToDelete.length} ciudades duplicadas:\n`);
    
    const db = dbService.getDatabase();
    const deleteStmt = db.prepare('DELETE FROM cities WHERE id = ?');
    
    citiesToDelete.forEach(city => {
      console.log(`   ❌ Eliminando: ${city.nombre} (ID: ${city.id}, Región: ${city.region})`);
      deleteStmt.bind([city.id]);
      deleteStmt.step();
      deleteStmt.reset();
    });
    
    deleteStmt.free();
    dbService.saveDB();
    
    console.log(`\n✅ Se eliminaron ${citiesToDelete.length} ciudades duplicadas exitosamente\n`);
    
    // Verificar resultado
    const updatedCities = await dbService.getAllCities();
    console.log(`📊 Total de ciudades después de limpieza: ${updatedCities.length}\n`);
    
    console.log('═'.repeat(80));
    console.log('✨ Limpieza completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
removeDuplicateCities()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
