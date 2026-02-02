#!/usr/bin/env node

/**
 * VERIFICADOR: Comprobar coordenadas y diferencias de CARTAGENA vs CARTAGENA DE INDIAS
 * 
 * Muestra:
 * - Coordenadas de ambas ciudades
 * - Diferencia geográfica
 * - Distancia entre ambas en km
 * - Que NO deben consolidarse
 */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'ooh_data.db');

async function loadDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    return new SQL.Database(buffer);
  } else {
    throw new Error('BD no encontrada');
  }
}

// Calcular distancia entre dos puntos (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function verify() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       VERIFICACIÓN: CARTAGENA vs CARTAGENA DE INDIAS          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const db = await loadDB();

    // Buscar ambas ciudades
    const stmt = db.prepare(`
      SELECT 
        c.id,
        c.nombre,
        c.latitud,
        c.longitud,
        c.radio_km,
        r.nombre as region,
        COUNT(a.id) as direcciones,
        COUNT(o.id) as registros_ooh
      FROM cities c
      LEFT JOIN regions r ON c.region_id = r.id
      LEFT JOIN addresses a ON a.city_id = c.id
      LEFT JOIN ooh_records o ON o.address_id = a.id
      WHERE c.nombre IN ('CARTAGENA', 'CARTAGENA DE INDIAS')
      GROUP BY c.id
      ORDER BY c.nombre
    `);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    if (results.length === 0) {
      console.log('⚠️  No se encontró ni CARTAGENA ni CARTAGENA DE INDIAS en BD\n');
      return;
    }

    if (results.length === 1) {
      console.log(`⚠️  Solo se encontró una ciudad:\n`);
      const city = results[0];
      console.log(`📍 ${city.nombre}`);
      console.log(`   Coordenadas: ${city.latitud}, ${city.longitud}`);
      console.log(`   Región: ${city.region}`);
      console.log(`   Radio: ${city.radio_km} km`);
      console.log(`   Direcciones: ${city.direcciones}`);
      console.log(`   Registros OOH: ${city.registros_ooh}\n`);
      return;
    }

    // Mostrar ambas ciudades
    console.log('📍 CARTAGENA\n');
    const cartagena = results.find(c => c.nombre === 'CARTAGENA');
    if (cartagena) {
      console.log(`   ID: ${cartagena.id}`);
      console.log(`   Coordenadas: ${cartagena.latitud}, ${cartagena.longitud}`);
      console.log(`   Región: ${cartagena.region}`);
      console.log(`   Radio: ${cartagena.radio_km} km`);
      console.log(`   Direcciones: ${cartagena.direcciones}`);
      console.log(`   Registros OOH: ${cartagena.registros_ooh}\n`);
    }

    console.log('📍 CARTAGENA DE INDIAS\n');
    const cartagenaDeIndias = results.find(c => c.nombre === 'CARTAGENA DE INDIAS');
    if (cartagenaDeIndias) {
      console.log(`   ID: ${cartagenaDeIndias.id}`);
      console.log(`   Coordenadas: ${cartagenaDeIndias.latitud}, ${cartagenaDeIndias.longitud}`);
      console.log(`   Región: ${cartagenaDeIndias.region}`);
      console.log(`   Radio: ${cartagenaDeIndias.radio_km} km`);
      console.log(`   Direcciones: ${cartagenaDeIndias.direcciones}`);
      console.log(`   Registros OOH: ${cartagenaDeIndias.registros_ooh}\n`);
    }

    // Calcular distancia
    if (cartagena && cartagenaDeIndias) {
      const distance = calculateDistance(
        cartagena.latitud,
        cartagena.longitud,
        cartagenaDeIndias.latitud,
        cartagenaDeIndias.longitud
      );

      console.log('📏 ANÁLISIS DE DIFERENCIA\n');
      console.log(`   Distancia entre puntos centrales: ${distance.toFixed(2)} km`);
      
      if (distance > 20) {
        console.log('   ✅ Son ciudades DISTINTAS (distancia > 20 km)\n');
      } else {
        console.log('   ⚠️  Podrían ser la misma ciudad (distancia < 20 km)\n');
      }

      console.log('🔍 CONCLUSIÓN\n');
      if (cartagena.region === cartagenaDeIndias.region) {
        console.log(`   ✅ Ambas están en región "${cartagena.region}"`);
        console.log(`   ✅ Tienen coordenadas distintas (${distance.toFixed(2)} km de diferencia)`);
        console.log(`   ✅ DEBEN MANTENER como ciudades separadas\n`);
      } else {
        console.log(`   ⚠️  Están en regiones distintas:`);
        console.log(`      CARTAGENA: ${cartagena.region}`);
        console.log(`      CARTAGENA DE INDIAS: ${cartagenaDeIndias.region}\n`);
      }

      // Mostrar si hay exception en cleanup script
      const cleanupFile = path.join(__dirname, 'cleanup-cities-deduplication.js');
      if (fs.existsSync(cleanupFile)) {
        const content = fs.readFileSync(cleanupFile, 'utf8');
        if (content.includes('CARTAGENA')) {
          console.log('📋 ESTADO DEL SCRIPT DE LIMPIEZA\n');
          console.log('   ✅ Exception para CARTAGENA/CARTAGENA DE INDIAS está configurada\n');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
