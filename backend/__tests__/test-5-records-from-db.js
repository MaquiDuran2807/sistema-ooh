#!/usr/bin/env node

/**
 * TEST MEJORADO: Crear registros consultando BD
 * Reutiliza imágenes y crea 5 registros con datos REALES
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const dbService = require('../services/dbService');

const BASE_URL = 'http://localhost:8080';
const DB_FILE = path.join(__dirname, '../ooh_data.db');
const TEST_IMAGES_DIR = path.join(__dirname, '../test-images-for-tests');

let db = null;

// Crear directorio de imágenes
function ensureTestImagesDir() {
  if (!fs.existsSync(TEST_IMAGES_DIR)) {
    fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
  }
}

// Crear una imagen PNG simple (1x1 píxel) y reutilizarla
function createReusableTestImages() {
  // PNG 1x1 píxel rojo
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  
  const imagePaths = [];
  for (let i = 1; i <= 3; i++) {
    const filename = path.join(TEST_IMAGES_DIR, `reusable-${i}.png`);
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, buffer);
    }
    imagePaths.push(filename);
  }
  
  return imagePaths;
}

// Cargar BD
async function loadDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    return true;
  }
  return false;
}

// Obtener ciudades aleatorias
function getRandomCities(count) {
  const stmt = db.prepare(`
    SELECT 
      c.id, c.nombre, c.latitud, c.longitud, c.radio_km,
      r.nombre as region
    FROM cities c
    JOIN regions r ON c.region_id = r.id
    ORDER BY RANDOM()
    LIMIT ?
  `);
  stmt.bind([count]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Obtener marcas aleatorias
function getRandomBrands(count) {
  const stmt = db.prepare(`
    SELECT id, nombre FROM brands
    ORDER BY RANDOM()
    LIMIT ?
  `);
  stmt.bind([count]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Obtener campaña de una marca
function getCampaignForBrand(brandId) {
  const stmt = db.prepare('SELECT id, nombre FROM campaigns WHERE brand_id = ? LIMIT 1');
  stmt.bind([brandId]);
  
  let campaign = null;
  if (stmt.step()) {
    campaign = stmt.getAsObject();
  }
  stmt.free();
  return campaign;
}

// Obtener cualquier campaña (fallback)
function getAnyCampaign() {
  const stmt = db.prepare('SELECT id, nombre FROM campaigns ORDER BY id LIMIT 1');
  let campaign = null;
  if (stmt.step()) {
    campaign = stmt.getAsObject();
  }
  stmt.free();
  return campaign;
}

// Obtener tipos OOH
function getOOHTypes(count) {
  const stmt = db.prepare(`
    SELECT id, nombre FROM ooh_types
    ORDER BY RANDOM()
    LIMIT ?
  `);
  stmt.bind([count]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Obtener proveedores
function getProviders(count) {
  const stmt = db.prepare(`
    SELECT id, nombre FROM providers
    ORDER BY RANDOM()
    LIMIT ?
  `);
  stmt.bind([count]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Generar coordenadas aleatorias dentro del rango
function generateCoordinates(city) {
  const radiusKm = city.radio_km || 10;
  const radiusDegrees = radiusKm / 111;
  
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusDegrees;
  
  const lat = city.latitud + distance * Math.cos(angle);
  const lng = city.longitud + distance * Math.sin(angle);
  
  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };
}

// Test function
async function runTests({ cleanup = true } = {}) {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║       TEST MEJORADO: 5 REGISTROS CON DATOS REALES DE BD       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Cargar BD
    if (!await loadDB()) {
      console.error('❌ No se pudo cargar la BD');
      process.exit(1);
    }

    // Crear imágenes reutilizables
    ensureTestImagesDir();
    const imagePaths = createReusableTestImages();
    console.log(`✅ Imágenes reutilizables creadas: ${imagePaths.length}\n`);

    // Obtener datos
    const cities = getRandomCities(10);
    const brands = getRandomBrands(10);
    const oohTypes = getOOHTypes(5);
    const providers = getProviders(3);

    console.log(`📊 Datos en BD:`);
    console.log(`   Ciudades: ${cities.length}`);
    console.log(`   Marcas: ${brands.length}`);
    console.log(`   Tipos OOH: ${oohTypes.length}`);
    console.log(`   Proveedores: ${providers.length}\n`);

    let successCount = 0;
    let failureCount = 0;
    const createdIds = [];

    // Crear 5 registros
    console.log('🚀 CREANDO 5 REGISTROS DE PRUEBA\n');

    for (let i = 0; i < 5; i++) {
      const city = cities[i % cities.length];
      const brand = brands[i % brands.length];
      const campaign = getCampaignForBrand(brand.id) || getAnyCampaign();
      const oohType = oohTypes[i % oohTypes.length];
      const provider = providers[i % providers.length];
      const coords = generateCoordinates(city);

      const testData = {
        brandId: brand.id,
        campaignId: campaign?.id,
        oohTypeId: oohType.id,
        providerId: provider.id,
        cityId: city.id,
        direccion: `TEST ADDRESS #${1000 + i * 100}`,
        latitud: coords.lat,
        longitud: coords.lng,
        fechaInicio: '2026-03-15',
        fechaFin: '2026-03-31'
      };

      console.log(`📍 REGISTRO ${i + 1}/5: ${brand.nombre} - ${city.nombre}`);

      try {
        const response = await request(BASE_URL)
          .post('/api/ooh/create')
          .field('brand_id', testData.brandId)
          .field('campaign_id', testData.campaignId)
          .field('ooh_type_id', testData.oohTypeId)
          .field('provider_id', testData.providerId)
          .field('city_id', testData.cityId)
          .field('direccion', testData.direccion)
          .field('latitud', testData.latitud.toString())
          .field('longitud', testData.longitud.toString())
          .field('fechaInicio', testData.fechaInicio)
          .field('fechaFin', testData.fechaFin)
          .attach('imagenes', imagePaths[0])
          .attach('imagenes', imagePaths[1])
          .attach('imagenes', imagePaths[2]);

        if (response.status === 201) {
          console.log(`   ✅ ID: ${response.body.data?.id}`);
          createdIds.push(response.body.data?.id);
          successCount++;
        } else {
          console.log(`   ❌ Error ${response.status}: ${response.body.error}`);
          failureCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failureCount++;
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    RESULTADOS                                  ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ ✅ Creados: ${successCount}/5`);
    console.log(`║ ❌ Errores: ${failureCount}/5`);
    if (successCount === 5) {
      console.log('║ 🎉 TODOS LOS REGISTROS CREADOS EXITOSAMENTE');
    }
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (cleanup && createdIds.length > 0) {
      await dbService.initDB();
      createdIds.forEach((id) => {
        try { dbService.deleteRecord(id); } catch (e) {}
      });
      console.log(`🧹 Limpieza: ${createdIds.length} registros eliminados\n`);
    }

    return { successCount, failureCount, createdIds };

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests().catch(() => process.exit(1));
}

describe('🧪 Script: 5 registros desde BD', () => {
  test('ejecuta sin errores', async () => {
    const result = await runTests();
    expect(result.failureCount).toBe(0);
    expect(result.successCount).toBe(5);
  }, 120000);
});

module.exports = { runTests, loadDB, getRandomCities, getRandomBrands, getOOHTypes, getProviders };
