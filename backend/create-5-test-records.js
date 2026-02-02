#!/usr/bin/env node

/**
 * CREAR 5 REGISTROS DE PRUEBA DESDE BD
 * 
 * Este script:
 * 1. Consulta la BD para obtener ciudades, marcas, campañas reales
 * 2. Crea 3 imágenes de prueba UNA SOLA VEZ
 * 3. Reutiliza esas 3 imágenes para crear 5 registros diferentes
 * 4. Cada registro usa datos REALES de la BD
 * 5. Muestra confirmación de cada registro creado
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'http://localhost:8080';
const DB_FILE = path.join(__dirname, 'ooh_data.db');
const IMAGES_DIR = path.join(__dirname, 'test-images-reusable');

let db = null;

async function loadDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    return true;
  }
  return false;
}

// Crear directorio para imágenes
function ensureImagesDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

// Crear 3 imágenes de prueba (PNG 1x1)
function createTestImages() {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  
  const imagePaths = [];
  for (let i = 1; i <= 3; i++) {
    const filename = path.join(IMAGES_DIR, `test-image-${i}.png`);
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, buffer);
    }
    imagePaths.push(filename);
  }
  
  console.log(`✅ ${imagePaths.length} imágenes de prueba creadas (reutilizables)`);
  return imagePaths;
}

// Obtener ciudades reales
function getCities(limit = 10) {
  const stmt = db.prepare(`
    SELECT 
      c.id,
      c.nombre,
      c.latitud,
      c.longitud,
      c.radio_km,
      r.id as region_id,
      r.nombre as region
    FROM cities c
    JOIN regions r ON c.region_id = r.id
    ORDER BY RANDOM()
    LIMIT ?
  `);
  stmt.bind([limit]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Obtener marcas
function getBrands(limit = 10) {
  const stmt = db.prepare(`
    SELECT id, nombre FROM brands
    ORDER BY RANDOM()
    LIMIT ?
  `);
  stmt.bind([limit]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Obtener campañas de una marca
function getCampaignsByBrand(brandId) {
  const stmt = db.prepare('SELECT id, nombre FROM campaigns WHERE brand_id = ? LIMIT 1');
  stmt.bind([brandId]);
  
  let campaign = null;
  if (stmt.step()) {
    campaign = stmt.getAsObject();
  }
  stmt.free();
  return campaign;
}

// Obtener tipos OOH
function getOOHTypes() {
  const stmt = db.prepare('SELECT id, nombre FROM ooh_types ORDER BY RANDOM() LIMIT 5');
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Obtener proveedores
function getProviders() {
  const stmt = db.prepare('SELECT id, nombre FROM providers ORDER BY RANDOM() LIMIT 3');
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Generar coordenadas aleatorias válidas para una ciudad
function generateRandomCoordinates(city) {
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

async function createTestRecords() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║       CREAR 5 REGISTROS DE PRUEBA - DATOS REALES DE BD         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (!await loadDB()) {
      console.error('❌ No se pudo cargar la BD');
      process.exit(1);
    }

    // Crear imágenes (UNA SOLA VEZ)
    ensureImagesDir();
    const imagePaths = createTestImages();
    console.log(`📁 Directorio: ${IMAGES_DIR}\n`);

    // Obtener datos reales de BD
    const cities = getCities(10);
    const brands = getBrands(10);
    const oohTypes = getOOHTypes();
    const providers = getProviders();

    console.log(`📊 Datos disponibles en BD:`);
    console.log(`   Ciudades: ${cities.length}`);
    console.log(`   Marcas: ${brands.length}`);
    console.log(`   Tipos OOH: ${oohTypes.length}`);
    console.log(`   Proveedores: ${providers.length}\n`);

    if (!cities.length || !brands.length) {
      console.error('❌ Datos maestros insuficientes en BD');
      process.exit(1);
    }

    // Crear 5 registros
    console.log('🚀 CREANDO 5 REGISTROS DE PRUEBA\n');
    
    let successCount = 0;
    let failureCount = 0;
    const createdRecords = [];

    for (let i = 0; i < 5; i++) {
      const city = cities[i % cities.length];
      const brand = brands[i % brands.length];
      const campaign = getCampaignsByBrand(brand.id);
      const oohType = oohTypes[i % oohTypes.length];
      const provider = providers[i % providers.length];
      const coords = generateRandomCoordinates(city);

      // Construir número de dirección único
      const addressNumber = Math.floor(Math.random() * 9000) + 100;

      const testData = {
        marca: brand.nombre,
        categoria: 'CERVEZAS',
        proveedor: provider.nombre,
        tipoOOH: oohType.nombre,
        campana: campaign?.nombre || `CAMPAÑA TEST ${i + 1}`,
        direccion: `CALLE TEST #${addressNumber} APT ${i + 1}`,
        ciudad: city.nombre,
        region: city.region,
        latitud: coords.lat,
        longitud: coords.lng,
        fechaInicio: '2026-03-01',
        fechaFin: '2026-03-31'
      };

      console.log(`\n📍 REGISTRO ${i + 1}/5`);
      console.log(`   Ciudad: ${city.nombre} (${city.region})`);
      console.log(`   Marca: ${brand.nombre}`);
      console.log(`   Coordenadas: ${coords.lat}, ${coords.lng}`);
      console.log(`   Dirección: ${testData.direccion}`);

      try {
        const response = await request(API_URL)
          .post('/api/ooh/create')
          .field('marca', testData.marca)
          .field('categoria', testData.categoria)
          .field('proveedor', testData.proveedor)
          .field('tipoOOH', testData.tipoOOH)
          .field('campana', testData.campana)
          .field('direccion', testData.direccion)
          .field('ciudad', testData.ciudad)
          .field('region', testData.region)
          .field('latitud', testData.latitud.toString())
          .field('longitud', testData.longitud.toString())
          .field('fechaInicio', testData.fechaInicio)
          .field('fechaFin', testData.fechaFin)
          .attach('imagenes', imagePaths[0])
          .attach('imagenes', imagePaths[1])
          .attach('imagenes', imagePaths[2]);

        if (response.status === 201) {
          console.log(`   ✅ CREADO EXITOSAMENTE`);
          console.log(`   ID: ${response.body.data?.id}`);
          createdRecords.push(response.body.data?.id);
          successCount++;
        } else {
          console.log(`   ❌ ERROR ${response.status}: ${response.body.error || response.body.message}`);
          failureCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error de conexión: ${error.message}`);
        failureCount++;
      }
    }

    // Resumen
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    RESUMEN DE CREACIÓN                         ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ ✅ Creados: ${successCount}/5`);
    console.log(`║ ❌ Errores: ${failureCount}/5`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (createdRecords.length > 0) {
      console.log('📋 REGISTROS CREADOS:\n');
      createdRecords.forEach((id, idx) => {
        console.log(`   ${idx + 1}. ${id}`);
      });
      console.log();
    }

    // Verificar integridad (opcional - requiere servidor)
    if (createdRecords.length > 0) {
      console.log('🔍 VERIFICANDO REGISTROS CREADOS\n');
      
      for (let i = 0; i < createdRecords.length; i++) {
        const id = createdRecords[i];
        try {
          const response = await request(API_URL).get(`/api/ooh/${id}`);
          
          if (response.status === 200) {
            const record = response.body.data;
            console.log(`   ✅ Registro ${i + 1}: ${record.ciudad_region || record.ciudad}`);
            console.log(`      Imágenes: ${record.imagenes?.length || 0}`);
          }
        } catch (error) {
          // Ignorar errores de verificación
        }
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestRecords();
