#!/usr/bin/env node

/**
 * VALIDACIÓN RÁPIDA: Estado actual de BD y instrucciones
 */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'backend/ooh_data.db');

async function loadDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    return new SQL.Database(buffer);
  }
  return null;
}

async function validate() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              VALIDACIÓN RÁPIDA - ESTADO DE BD                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const db = await loadDB();
    if (!db) {
      console.log('❌ BD no encontrada en backend/ooh_data.db\n');
      return;
    }

    // Contar regiones
    const regStmt = db.prepare('SELECT COUNT(*) as count FROM regions');
    regStmt.step();
    const regionCount = regStmt.getAsObject().count;
    regStmt.free();

    // Contar ciudades
    const cityStmt = db.prepare('SELECT COUNT(*) as count FROM cities');
    cityStmt.step();
    const cityCount = cityStmt.getAsObject().count;
    cityStmt.free();

    // Contar ciudades huérfanas
    const orphanStmt = db.prepare(`
      SELECT COUNT(*) as count FROM cities 
      WHERE region_id IS NULL OR region_id NOT IN (SELECT id FROM regions)
    `);
    orphanStmt.step();
    const orphanCount = orphanStmt.getAsObject().count;
    orphanStmt.free();

    // Contar registros OOH
    const oohStmt = db.prepare('SELECT COUNT(*) as count FROM ooh_records');
    oohStmt.step();
    const oohCount = oohStmt.getAsObject().count;
    oohStmt.free();

    console.log('📊 ESTADO DE BD:\n');
    console.log(`   Regiones: ${regionCount} ${regionCount === 4 ? '✅' : '❌'}`);
    console.log(`   Ciudades: ${cityCount} (sin duplicados)`);
    console.log(`   Ciudades huérfanas: ${orphanCount} ${orphanCount === 0 ? '✅' : '❌'}`);
    console.log(`   Registros OOH: ${oohCount}\n`);

    if (regionCount === 4 && orphanCount === 0) {
      console.log('✅ BD ESTÁ EN PERFECTO ESTADO\n');
    } else {
      console.log('⚠️  BD necesita limpieza\n');
      console.log('   Ejecutar:');
      if (orphanCount > 0) {
        console.log('   1. node backend/cleanup-orphan-cities.js');
      }
      console.log('   2. node backend/cleanup-empty-regions.js\n');
    }

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📖 INSTRUCCIONES DE PRÓXIMOS PASOS:\n');
    console.log('1️⃣  GENERAR TEST DATA CORRECTAMENTE:');
    console.log('   $ node backend/generate-test-data.js\n');
    console.log('2️⃣  EJECUTAR TESTS MEJORADOS:');
    console.log('   $ npm test -- improved-create-test.test.js\n');
    console.log('3️⃣  VERIFICAR INTEGRIDAD DESPUÉS:');
    console.log('   $ node backend/integrity-report.js\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📚 SCRIPTS DISPONIBLES:\n');
    console.log('   ✅ generate-test-data.js');
    console.log('      → Genera test data consultando BD (MÉTODO CORRECTO)\n');
    console.log('   ✅ improved-create-test.test.js');
    console.log('      → Test mejorado con datos REALES de BD\n');
    console.log('   ✅ integrity-report.js');
    console.log('      → Reporte de integridad y validación\n');
    console.log('   ✅ verify-cartagena.js');
    console.log('      → Verifica CARTAGENA DE INDIAS vs CARTAGENA\n');

    console.log('📖 DOCUMENTACIÓN:\n');
    console.log('   ✅ backend/CLEANUP_AND_TESTING_GUIDE.md');
    console.log('   ✅ COMPLETION_SUMMARY.md\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

validate();
