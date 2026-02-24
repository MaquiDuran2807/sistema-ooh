/**
 * Test de integración: Verificar que las ciudades estén en la BD y sean accesibles
 * Ejecutar con: npm test -- cities-integration.test.js
 */

const request = require('supertest');
const dbService = require('../services/dbService');

// Inicializar BD antes de los tests
beforeAll(async () => {
  await dbService.initDB();
});

describe('Integración de Ciudades', () => {
  let testData = {};

  beforeAll(async () => {
    // Cargar IDs de ciudades principales para futuras pruebas
    const bogota = await dbService.getCityByName('BOGOTA');
    const medellin = await dbService.getCityByName('MEDELLIN');
    const cali = await dbService.getCityByName('CALI');
    const cartagena = await dbService.getCityByName('CARTAGENA');

    testData = {
      bogotaId: bogota?.id,
      medellinId: medellin?.id,
      caliId: cali?.id,
      cartagenaId: cartagena?.id,
      bogotaName: bogota?.nombre,
      medellinName: medellin?.nombre,
      caliName: cali?.nombre,
      cartagenaName: cartagena?.nombre
    };

    console.log('📊 Ciudades cargadas:\n');
    console.log(`   Bogotá - ID: ${testData.bogotaId}\n`);
    console.log(`   Medellín - ID: ${testData.medellinId}\n`);
    console.log(`   Cali - ID: ${testData.caliId}\n`);
    console.log(`   Cartagena - ID: ${testData.cartagenaId}\n`);
  });

  test('Verifica que las ciudades principales existen en la BD', () => {
    expect(testData.bogotaId).toBeDefined();
    expect(testData.medellinId).toBeDefined();
    expect(testData.caliId).toBeDefined();
    expect(testData.cartagenaId).toBeDefined();
    
    console.log('✅ Las 4 ciudades principales están en la BD');
  });

  test('🔍 Verifica integridad de ciudades y regiones', async () => {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       🏙️  ANÁLISIS DE CIUDADES Y REGIONES                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Obtener todas las ciudades y regiones
    const allCities = await dbService.getAllCities();
    const allRegions = await dbService.getAllRegions();

    console.log(`📊 Total de ciudades: ${allCities.length}`);
    console.log(`🗺️  Total de regiones: ${allRegions.length}\n`);

    // 0. Mostrar todas las ciudades con sus nombres
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  0️⃣  LISTADO COMPLETO DE CIUDADES                       │');
    console.log('└─────────────────────────────────────────────────────────┘\n');
    
    allCities.forEach((city, index) => {
      const hasUnderscore = city.nombre.includes('_') ? '⚠️ ' : '   ';
      const regionName = city.region || 'Sin región';
      console.log(`${hasUnderscore}${(index + 1).toString().padStart(2)}. ${city.nombre.padEnd(25)} (ID: ${city.id.toString().padStart(4)}) - ${regionName}`);
    });
    console.log('');

    // 1. Verificar ciudades duplicadas
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  1️⃣  VERIFICANDO CIUDADES DUPLICADAS                    │');
    console.log('└─────────────────────────────────────────────────────────┘');
    
    const cityNames = allCities.map(c => c.nombre.toUpperCase());
    const duplicates = cityNames.filter((name, index) => cityNames.indexOf(name) !== index);
    const uniqueDuplicates = [...new Set(duplicates)];

    if (uniqueDuplicates.length > 0) {
      console.log(`\n⚠️  Se encontraron ${uniqueDuplicates.length} ciudades duplicadas:\n`);
      uniqueDuplicates.forEach(name => {
        const count = cityNames.filter(n => n === name).length;
        const cities = allCities.filter(c => c.nombre.toUpperCase() === name);
        console.log(`   🔴 "${name}" aparece ${count} veces:`);
        cities.forEach(city => {
          console.log(`      - ID: ${city.id}, Region ID: ${city.region_id}`);
        });
      });
    } else {
      console.log('\n✅ No hay ciudades duplicadas\n');
    }

    expect(uniqueDuplicates.length).toBe(0);

    // 2. Verificar regiones sin ciudades
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  2️⃣  VERIFICANDO REGIONES SIN CIUDADES                  │');
    console.log('└─────────────────────────────────────────────────────────┘\n');

    const regionsWithoutCities = [];
    
    for (const region of allRegions) {
      const citiesInRegion = allCities.filter(c => c.region_id === region.id);
      if (citiesInRegion.length === 0) {
        regionsWithoutCities.push(region);
      }
    }

    if (regionsWithoutCities.length > 0) {
      console.log(`⚠️  Se encontraron ${regionsWithoutCities.length} regiones sin ciudades:\n`);
      regionsWithoutCities.forEach(region => {
        console.log(`   🔴 Región: "${region.nombre}" (ID: ${region.id})`);
      });
      console.log('');
    } else {
      console.log('✅ Todas las regiones tienen al menos una ciudad\n');
    }

    // 3. Distribución de ciudades por región
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  3️⃣  DISTRIBUCIÓN DE CIUDADES POR REGIÓN                │');
    console.log('└─────────────────────────────────────────────────────────┘\n');

    for (const region of allRegions) {
      const citiesInRegion = allCities.filter(c => c.region_id === region.id);
      const bar = '█'.repeat(Math.min(citiesInRegion.length, 30));
      console.log(`   ${region.nombre.padEnd(20)} │ ${bar} ${citiesInRegion.length}`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       ✅ ANÁLISIS COMPLETADO                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  });
});
