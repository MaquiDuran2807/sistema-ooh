#!/usr/bin/env node

/**
 * REPORTE FINAL DE INTEGRIDAD
 * Verifica que la base de datos esté limpia y correcta
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'ooh_data.db');

async function main() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_FILE);
  const db = new SQL.Database(buffer);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            REPORTE FINAL DE INTEGRIDAD DE BD                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. Regiones
  const regionsStmt = db.prepare('SELECT id, nombre FROM regions ORDER BY nombre');
  const regions = [];
  while (regionsStmt.step()) {
    regions.push(regionsStmt.getAsObject());
  }
  regionsStmt.free();

  console.log('📍 REGIONES (Deben ser exactamente 4):');
  if (regions.length === 4) {
    console.log('   ✅ Cantidad correcta: 4 regiones\n');
    regions.forEach((r, i) => console.log(`   ${i + 1}. ${r.nombre}`));
  } else {
    console.log(`   ❌ Error: Se esperaban 4, pero hay ${regions.length}\n`);
    regions.forEach((r, i) => console.log(`   ${i + 1}. ${r.nombre}`));
  }

  // 2. Ciudades por región
  console.log('\n\n🏙️  CIUDADES POR REGIÓN:');
  const citiesByRegion = {};
  let totalCities = 0;

  for (const region of regions) {
    const citiesStmt = db.prepare('SELECT COUNT(*) as count FROM cities WHERE region_id = ?');
    citiesStmt.bind([region.id]);
    citiesStmt.step();
    const result = citiesStmt.getAsObject();
    citiesStmt.free();

    citiesByRegion[region.nombre] = result.count;
    totalCities += result.count;
    console.log(`   ${region.nombre}: ${result.count} ciudades`);
  }

  console.log(`\n   Total de ciudades: ${totalCities}`);

  // 3. Ciudades sin duplicados
  console.log('\n\n🔍 VALIDACIÓN DE DUPLICADOS:');
  const allCitiesStmt = db.prepare('SELECT id, nombre FROM cities ORDER BY nombre');
  const allCities = [];
  while (allCitiesStmt.step()) {
    allCities.push(allCitiesStmt.getAsObject());
  }
  allCitiesStmt.free();

  const { normalizeCityName } = require('./utils/cityNormalizer');
  const normalizedMap = {};
  let duplicateCount = 0;

  for (const city of allCities) {
    const normalized = normalizeCityName(city.nombre);
    if (!normalizedMap[normalized]) {
      normalizedMap[normalized] = [];
    }
    normalizedMap[normalized].push(city);
  }

  for (const [normalized, cities] of Object.entries(normalizedMap)) {
    if (cities.length > 1) {
      duplicateCount++;
      console.log(`   ❌ DUPLICADO: "${normalized}"`);
      cities.forEach(c => console.log(`      - ${c.nombre}`));
    }
  }

  if (duplicateCount === 0) {
    console.log('   ✅ No hay duplicados. Base de datos limpia.');
  } else {
    console.log(`   ❌ Encontrados ${duplicateCount} grupo(s) de duplicados`);
  }

  // 4. Integridad referencial
  console.log('\n\n🔗 INTEGRIDAD REFERENCIAL:');

  // Ciudades sin región
  const orphanCitiesStmt = db.prepare('SELECT COUNT(*) as count FROM cities WHERE region_id NOT IN (SELECT id FROM regions)');
  orphanCitiesStmt.step();
  let orphanCount = orphanCitiesStmt.getAsObject().count;
  orphanCitiesStmt.free();
  console.log(`   Ciudades sin región válida: ${orphanCount} ${orphanCount === 0 ? '✅' : '❌'}`);

  // Direcciones sin ciudad
  const orphanAddressesStmt = db.prepare('SELECT COUNT(*) as count FROM addresses WHERE city_id NOT IN (SELECT id FROM cities)');
  orphanAddressesStmt.step();
  let orphanAddresses = orphanAddressesStmt.getAsObject().count;
  orphanAddressesStmt.free();
  console.log(`   Direcciones sin ciudad válida: ${orphanAddresses} ${orphanAddresses === 0 ? '✅' : '❌'}`);

  // Registros OOH sin dirección
  const orphanRecordsStmt = db.prepare('SELECT COUNT(*) as count FROM ooh_records WHERE address_id NOT IN (SELECT id FROM addresses)');
  orphanRecordsStmt.step();
  let orphanRecords = orphanRecordsStmt.getAsObject().count;
  orphanRecordsStmt.free();
  console.log(`   Registros OOH sin dirección válida: ${orphanRecords} ${orphanRecords === 0 ? '✅' : '❌'}`);

  // 5. Registros OOH
  console.log('\n\n📊 REGISTROS OOH:');
  const recordsStmt = db.prepare('SELECT COUNT(*) as count FROM ooh_records');
  recordsStmt.step();
  const recordCount = recordsStmt.getAsObject().count;
  recordsStmt.free();
  console.log(`   Total de registros: ${recordCount}`);

  // 6. Imágenes
  console.log('\n\n📸 IMÁGENES:');
  const imagesStmt = db.prepare('SELECT COUNT(*) as count FROM images');
  imagesStmt.step();
  const imageCount = imagesStmt.getAsObject().count;
  imagesStmt.free();
  console.log(`   Total de imágenes: ${imageCount}`);

  // Imágenes por registro
  const imagesPerRecordStmt = db.prepare('SELECT ooh_record_id, COUNT(*) as count FROM images GROUP BY ooh_record_id ORDER BY ooh_record_id');
  const imagesPerRecord = {};
  while (imagesPerRecordStmt.step()) {
    const row = imagesPerRecordStmt.getAsObject();
    imagesPerRecord[row.ooh_record_id] = row.count;
  }
  imagesPerRecordStmt.free();

  for (const [recordId, count] of Object.entries(imagesPerRecord)) {
    console.log(`   Registro ${recordId}: ${count} imagen(es)`);
  }

  // RESUMEN FINAL
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      RESUMEN FINAL                             ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  
  const isHealthy = 
    regions.length === 4 && 
    duplicateCount === 0 && 
    orphanCount === 0 && 
    orphanAddresses === 0 && 
    orphanRecords === 0;

  if (isHealthy) {
    console.log('║ ✅ BASE DE DATOS EN PERFECTO ESTADO                            ║');
    console.log('║                                                                ║');
    console.log('║ • 4 Regiones válidas                                           ║');
    console.log(`║ • ${totalCities} Ciudades sin duplicados                                      ║`);
    console.log('║ • 0 Huérfanos (regiones, ciudades, direcciones, registros)    ║');
    console.log('║ • Integridad referencial verificada                           ║');
  } else {
    console.log('║ ❌ PROBLEMAS DETECTADOS                                        ║');
    if (regions.length !== 4) console.log(`║ • Regiones: ${regions.length} (esperadas 4)                            ║`);
    if (duplicateCount > 0) console.log(`║ • Duplicados: ${duplicateCount} grupo(s)                            ║`);
    if (orphanCount > 0) console.log(`║ • Ciudades huérfanas: ${orphanCount}                           ║`);
    if (orphanAddresses > 0) console.log(`║ • Direcciones huérfanas: ${orphanAddresses}                       ║`);
    if (orphanRecords > 0) console.log(`║ • Registros huérfanos: ${orphanRecords}                         ║`);
  }

  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
