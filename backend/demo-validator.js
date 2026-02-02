#!/usr/bin/env node

/**
 * DEMOSTRACIÓN DEL VALIDADOR
 * Muestra cómo funciona en casos reales
 */

const dbService = require('./services/dbService');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║       DEMOSTRACIÓN: VALIDADOR ROBUSTO DE CIUDADES              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Inicializar DB
(async () => {
  await dbService.initDB();

  const testCases = [
    // Casos que debería rechazar (duplicados)
    { 
      ciudad: 'BOGOTA',
      esperado: 'rechazar',
      razon: 'Duplicado exacto de ciudad existente'
    },
    { 
      ciudad: 'Bogotá',
      esperado: 'rechazar',
      razon: 'Variación con tilde'
    },
    { 
      ciudad: 'bogota',
      esperado: 'rechazar',
      razon: 'Variación con minúsculas'
    },
    { 
      ciudad: 'MEDELLIN',
      esperado: 'rechazar',
      razon: 'Duplicado exacto'
    },
    { 
      ciudad: 'Medellín',
      esperado: 'rechazar',
      razon: 'Variación con tilde'
    },
    { 
      ciudad: 'CARTAGENA',
      esperado: 'rechazar',
      razon: 'Duplicado exacto'
    },

    // Casos que debería permitir (ciudades distintas)
    { 
      ciudad: 'CARTAGENA DE INDIAS',
      esperado: 'permitir',
      razon: 'Ciudad diferente a CARTAGENA'
    },
    { 
      ciudad: 'Cartagena de Indias',
      esperado: 'permitir',
      razon: 'Variación de ciudad diferente'
    },
    { 
      ciudad: 'SANTA MARTA',
      esperado: 'permitir',
      razon: 'Ciudad válida'
    },
    { 
      ciudad: 'NUEVA CIUDAD PRUEBA',
      esperado: 'permitir',
      razon: 'Ciudad que no existe en BD'
    }
  ];

  console.log('📋 CASOS DE PRUEBA:\n');

  let rechazados = 0;
  let permitidos = 0;
  let correctos = 0;

  for (const test of testCases) {
    const validation = dbService.validateCityName(test.ciudad);
    const resultado = validation.isValid ? '✅ PERMITIDO' : '❌ RECHAZADO';
    const esCorrect = 
      (validation.isValid && test.esperado === 'permitir') ||
      (!validation.isValid && test.esperado === 'rechazar');

    console.log(`${esCorrect ? '✓' : '✗'} Prueba: "${test.ciudad}"`);
    console.log(`  Resultado: ${resultado}`);
    console.log(`  Normalizado: "${validation.normalized}"`);
    if (!validation.isValid && validation.duplicate) {
      console.log(`  Conflicto: "${validation.duplicate.nombre}" (${validation.duplicate.region})`);
    }
    console.log(`  Razón: ${test.razon}`);
    console.log();

    if (validation.isValid) {
      permitidos++;
    } else {
      rechazados++;
    }
    if (esCorrect) {
      correctos++;
    }
  }

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      RESULTADOS                               ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║ Total pruebas:     ${testCases.length}`);
  console.log(`║ Rechazadas:        ${rechazados}`);
  console.log(`║ Permitidas:        ${permitidos}`);
  console.log(`║ Correctas:         ${correctos}/${testCases.length}`);
  console.log('╠════════════════════════════════════════════════════════════════╣');
  
  if (correctos === testCases.length) {
    console.log('║ ✅ VALIDADOR FUNCIONANDO CORRECTAMENTE                         ║');
  } else {
    console.log(`║ ❌ ${testCases.length - correctos} PRUEBAS FALLARON                                  ║`);
  }
  
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Mostrar ciudades actuales
  console.log('📍 CIUDADES EN BD (Para referencia):\n');
  const cities = dbService.getAllCities();
  const citiesByRegion = {};
  
  for (const city of cities) {
    if (!citiesByRegion[city.region]) {
      citiesByRegion[city.region] = [];
    }
    citiesByRegion[city.region].push(city.nombre);
  }

  for (const [region, ciudades] of Object.entries(citiesByRegion).sort()) {
    console.log(`${region}:`);
    ciudades.sort().forEach(c => console.log(`  • ${c}`));
    console.log();
  }

  console.log('\n✅ Demostración completada\n');
})();
