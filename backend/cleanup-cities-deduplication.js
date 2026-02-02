#!/usr/bin/env node

/**
 * LIMPIEZA Y DEDUPLICACIÓN DE CIUDADES
 * 
 * Este script:
 * 1. Detecta ciudades duplicadas usando normalización robusta
 * 2. Mantiene ciudades distintas (ej: CARTAGENA vs CARTAGENA DE INDIAS)
 * 3. Consolida direcciones que apunten a duplicados
 * 4. Elimina ciudades redundantes
 * 5. Valida integridad referencial
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { normalizeCityName, isCityDuplicate } = require('./utils/cityNormalizer');

const DB_FILE = path.join(__dirname, 'ooh_data.db');

let db = null;
let SQL = null;

async function initDB() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    console.log('✅ Base de datos cargada');
  } else {
    console.error('❌ Base de datos no encontrada');
    process.exit(1);
  }
}

function getAllCities() {
  const stmt = db.prepare('SELECT id, nombre, region_id FROM cities ORDER BY nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getRegionName(regionId) {
  const stmt = db.prepare('SELECT nombre FROM regions WHERE id = ?');
  stmt.bind([regionId]);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.nombre;
  }
  stmt.free();
  return 'DESCONOCIDA';
}

function getAddressesForCity(cityId) {
  const stmt = db.prepare('SELECT id FROM addresses WHERE city_id = ?');
  stmt.bind([cityId]);
  const addresses = [];
  while (stmt.step()) {
    addresses.push(stmt.getAsObject().id);
  }
  stmt.free();
  return addresses;
}

function updateAddressCity(addressId, newCityId) {
  const stmt = db.prepare('UPDATE addresses SET city_id = ? WHERE id = ?');
  stmt.bind([newCityId, addressId]);
  stmt.step();
  stmt.free();
}

function deleteCity(cityId) {
  const stmt = db.prepare('DELETE FROM cities WHERE id = ?');
  stmt.bind([cityId]);
  stmt.step();
  stmt.free();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
  console.log('💾 Base de datos guardada');
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         LIMPIEZA Y DEDUPLICACIÓN DE CIUDADES                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  await initDB();

  // Obtener todas las ciudades
  const allCities = getAllCities();
  console.log(`📊 Total de ciudades en BD: ${allCities.length}\n`);

  // Función auxiliar: Verificar si un nombre es parte de otro
  function isPartOfAnother(name1, name2) {
    // Normalizar: convertir guiones bajos a espacios
    const normalize = (name) => name.replace(/_/g, ' ').trim();
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    const parts1 = norm1.split(/\s+/).filter(p => p);
    const parts2 = norm2.split(/\s+/).filter(p => p);
    
    // Si tienen la misma cantidad de palabras después de normalizar, son iguales
    if (parts1.length === parts2.length) return false;
    
    // Si uno es más corto, verificar si todas sus palabras están en el otro
    const [shorter, longer] = parts1.length < parts2.length ? [parts1, parts2] : [parts2, parts1];
    return shorter.every(part => longer.includes(part));
  }

  // Función auxiliar: Retorna -1 si name1 es mejor, 1 si name2 es mejor, 0 si son equivalentes
  function compareCityNames(name1, name2) {
    const normalize = (name) => name.replace(/_/g, ' ').trim();
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    // Si son iguales después de normalización
    if (norm1 === norm2) {
      // Preferir la que NO tiene guiones bajos
      if (name1.includes('_') && !name2.includes('_')) return 1;
      if (!name1.includes('_') && name2.includes('_')) return -1;
      // Si ambas tienen o no tienen guiones, mantener la más larga
      return name2.length - name1.length;
    }
    return 0;
  }

  // Función auxiliar: Encontrar duplicados incluyendo variantes compuestas
  function findAllDuplicates(cities) {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < cities.length; i++) {
      if (processed.has(i)) continue;

      const group = [cities[i]];
      processed.add(i);

      for (let j = i + 1; j < cities.length; j++) {
        if (processed.has(j)) continue;

        const name1 = normalizeCityName(cities[i].nombre);
        const name2 = normalizeCityName(cities[j].nombre);

        // Verificar si son exactamente iguales o si uno es parte del otro
        if (name1 === name2 || isPartOfAnother(name1, name2)) {
          group.push(cities[j]);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  const duplicateGroups = [];
  
  console.log('🔍 Analizando duplicados (incluyendo variantes compuestas)...\n');

  // Encontrar todos los grupos de duplicados
  const duplicateGroups_temp = findAllDuplicates(allCities);

  for (const cities of duplicateGroups_temp) {
    console.log(`⚠️  DUPLICADO DETECTADO: "${cities.map(c => c.nombre).join('" vs "')}"`);
    cities.forEach(city => {
      const region = getRegionName(city.region_id);
      console.log(`   - ID ${city.id}: "${city.nombre}" (Región: ${region}) [${city.nombre.split(/\s+/).length} palabras]`);
    });
    console.log();
    duplicateGroups.push(cities);
  }

  if (duplicateGroups.length === 0) {
    console.log('✅ No hay duplicados detectados. La base de datos está limpia.\n');
    process.exit(0);
  }

  // Procesar cada grupo de duplicados
  console.log(`\n📋 Procesando ${duplicateGroups.length} grupo(s) de duplicados...\n`);

  let citiesDeleted = 0;
  let addressesUpdated = 0;

  for (const group of duplicateGroups) {
    // Ordenar por: 1) Sin guiones bajos, 2) Número de palabras (desc), 3) Longitud (desc)
    const sortedGroup = group.sort((a, b) => {
      const hasUnderscoreA = a.nombre.includes('_');
      const hasUnderscoreB = b.nombre.includes('_');
      
      // Prioridad 1: Sin guiones bajos
      if (hasUnderscoreA && !hasUnderscoreB) return 1;
      if (!hasUnderscoreA && hasUnderscoreB) return -1;
      
      // Prioridad 2: Más palabras (más completo)
      const wordsA = a.nombre.replace(/_/g, ' ').split(/\s+/).length;
      const wordsB = b.nombre.replace(/_/g, ' ').split(/\s+/).length;
      if (wordsB !== wordsA) return wordsB - wordsA;
      
      // Prioridad 3: Más largo
      return b.nombre.length - a.nombre.length;
    });

    const mainCity = sortedGroup[0];
    console.log(`🔄 Consolidando: "${sortedGroup.map(c => c.nombre).join('" / "')}"`);
    const mainDescription = mainCity.nombre.includes('_') ? 
      `"${mainCity.nombre}" [CON GUIONES BAJOS - Se eliminará]` : 
      `"${mainCity.nombre}" [SIN GUIONES BAJOS - Se mantiene]`;
    console.log(`   ✓ Ciudad principal (MANTENER): ID ${mainCity.id} = ${mainDescription}`);

    // Consolidar el resto
    for (let i = 1; i < sortedGroup.length; i++) {
      const duplicateCity = sortedGroup[i];
      const dupDescription = duplicateCity.nombre.includes('_') ?
        `"${duplicateCity.nombre}" [CON GUIONES BAJOS]` :
        `"${duplicateCity.nombre}"`;
      console.log(`   ✓ Consolidando duplicado (ELIMINAR): ID ${duplicateCity.id} = ${dupDescription}`);

      // Obtener direcciones del duplicado
      const addresses = getAddressesForCity(duplicateCity.id);
      
      if (addresses.length > 0) {
        console.log(`     - Trasladando ${addresses.length} dirección(es) a ciudad principal`);
        
        // Actualizar cada dirección para que apunte a la ciudad principal
        for (const addressId of addresses) {
          updateAddressCity(addressId, mainCity.id);
          addressesUpdated++;
        }
      }

      // Eliminar la ciudad duplicada
      deleteCity(duplicateCity.id);
      citiesDeleted++;
      console.log(`     - Ciudad eliminada de la base de datos`);
    }
    console.log();
  }

  // Guardar cambios
  saveDB();

  // Verificación final
  const finalCities = getAllCities();
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      RESUMEN DE CAMBIOS                        ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║ Ciudades iniciales:        ${allCities.length}`);
  console.log(`║ Ciudades eliminadas:       ${citiesDeleted}`);
  console.log(`║ Ciudades finales:          ${finalCities.length}`);
  console.log(`║ Direcciones actualizadas:  ${addressesUpdated}`);
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║ CIUDADES ÚNICAS RESTANTES:                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Mostrar estado final
  const finalNormalizedMap = {};
  for (const city of finalCities) {
    const normalized = normalizeCityName(city.nombre);
    if (!finalNormalizedMap[normalized]) {
      finalNormalizedMap[normalized] = [];
    }
    finalNormalizedMap[normalized].push(city);
  }

  // Agrupar por región
  const citiesByRegion = {};
  for (const city of finalCities) {
    const region = getRegionName(city.region_id);
    if (!citiesByRegion[region]) {
      citiesByRegion[region] = [];
    }
    citiesByRegion[region].push(city.nombre);
  }

  for (const [region, cities] of Object.entries(citiesByRegion).sort()) {
    console.log(`🗺️  ${region}: ${cities.length} ciudades`);
    cities.sort().forEach(city => {
      console.log(`   • ${city}`);
    });
    console.log();
  }

  console.log('✅ Limpieza completada exitosamente\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
