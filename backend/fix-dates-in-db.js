// 🔧 Script para corregir fechas mal parseadas en la base de datos
// Las fechas están como "46023-01-01" cuando deberían ser "2025-01-01"

const dbService = require('./services/dbService');

// Convertir fecha serial de Excel a formato ISO
function excelSerialToDate(serial) {
  if (typeof serial === 'string' && serial.includes('-')) {
    // Si ya tiene guiones, podría ser una fecha mal formateada
    const parts = serial.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      
      // Si el año es > 10000, probablemente es un serial convertido a string
      if (year > 10000) {
        return excelSerialToDate(year);
      }
    }
  }
  
  if (typeof serial === 'number' || (typeof serial === 'string' && !isNaN(parseFloat(serial)))) {
    const serialNum = typeof serial === 'number' ? serial : parseFloat(serial);
    
    // Excel almacena fechas como número de días desde 1900-01-01
    const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + serialNum * msPerDay);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

async function fixDates() {
  console.log('\n🔧 [FIX DATES] Iniciando corrección de fechas...\n');
  
  try {
    const db = dbService.getDatabase();
    
    // Obtener todos los registros
    const selectStmt = db.prepare('SELECT id, fecha_inicio, fecha_final FROM ooh_records');
    const records = [];
    
    while (selectStmt.step()) {
      records.push(selectStmt.getAsObject());
    }
    selectStmt.free();
    
    console.log(`📊 Total registros a revisar: ${records.length}\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const record of records) {
      const { id, fecha_inicio, fecha_final } = record;
      
      // Extraer el año de la fecha actual
      const yearMatch = fecha_inicio ? fecha_inicio.match(/^(\d+)-/) : null;
      const currentYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
      
      // Si el año es mayor a 10000, es probable que sea un serial mal parseado
      if (currentYear && currentYear > 10000) {
        console.log(`🔍 Registro ID: ${id}`);
        console.log(`   Fecha inicio actual: ${fecha_inicio}`);
        console.log(`   Fecha fin actual: ${fecha_final}`);
        
        // Intentar convertir
        const newFechaInicio = excelSerialToDate(currentYear);
        const newFechaFinal = fecha_final ? excelSerialToDate(fecha_final.split('-')[0]) : null;
        
        if (newFechaInicio) {
          console.log(`   ✅ Nueva fecha inicio: ${newFechaInicio}`);
          console.log(`   ✅ Nueva fecha fin: ${newFechaFinal || 'N/A'}`);
          
          // Actualizar en BD
          const updateStmt = db.prepare(`
            UPDATE ooh_records 
            SET fecha_inicio = ?, fecha_final = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);
          updateStmt.run([newFechaInicio, newFechaFinal || fecha_final, id]);
          updateStmt.free();
          
          fixedCount++;
          console.log(`   ✓ Actualizado\n`);
        } else {
          console.log(`   ❌ No se pudo convertir\n`);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }
    
    // Guardar cambios
    await dbService.saveDB();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   Total registros: ${records.length}`);
    console.log(`   ✅ Corregidos: ${fixedCount}`);
    console.log(`   ⏭️  Sin cambios: ${skippedCount}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ Proceso completado exitosamente!\n');
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    process.exit(1);
  }
}

// Ejecutar
console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🔧 CORRECTOR DE FECHAS MAL PARSEADAS EN BASE DATOS  ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

fixDates()
  .then(() => {
    console.log('👋 Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
