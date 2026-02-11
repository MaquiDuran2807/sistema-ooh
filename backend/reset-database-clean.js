#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 * SCRIPT PARA RESETEAR LA BASE DE DATOS LIMPIA
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Este script elimina TODOS los datos y crea una base de datos nueva
 * con solo los catálogos básicos (sin registros OOH de prueba).
 * 
 * ESTRUCTURA RELACIONAL COMPLETA:
 * 1. regions (4 regiones fijas)
 * 2. categories (CERVEZAS, NABS)
 * 3. advertisers (ABI, ABInBEV, BAVARIA)
 * 4. brands (marcas con category_id y advertiser_id)
 * 5. campaigns (campañas con brand_id)
 * 6. ooh_types (tipos de elementos OOH)
 * 7. providers (proveedores de espacios)
 * 8. cities (ciudades con coordenadas y region_id)
 * 9. addresses (direcciones con coordenadas y city_id)
 * 10. ooh_records (registros principales con FKs a todo)
 * 11. images (imágenes vinculadas a ooh_records)
 * 
 * USO:
 *   node reset-database-clean.js
 * 
 * RESULTADO:
 *   - ooh_data.db con solo catálogos
 *   - 0 registros OOH
 *   - 0 direcciones
 *   - 0 imágenes
 *   - Listo para importar datos desde Excel
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'ooh_data.db');
const DB_BACKUP = path.join(__dirname, 'ooh_data.backup.' + Date.now() + '.db');

// ═══════════════════════════════════════════════════════════════════
// DATOS DE CATÁLOGOS
// ═══════════════════════════════════════════════════════════════════

// 4 REGIONES FIJAS
const REGIONES = [
  { nombre: 'CO Norte' },
  { nombre: 'CO Centro' },
  { nombre: 'CO Andes' },
  { nombre: 'CO Sur' }
];

// COORDENADAS DE 32 CIUDADES COLOMBIANAS
const CIUDADES_COORDENADAS = {
  'ARMENIA': { lat: 4.5339, lng: -75.6811, radio: 12, region: 'CO Andes' },
  'BARRANQUILLA': { lat: 10.9685, lng: -74.7813, radio: 25, region: 'CO Norte' },
  'BELLO': { lat: 6.3370, lng: -75.5547, radio: 10, region: 'CO Andes' },
  'BOGOTA DC': { lat: 4.7110, lng: -74.0721, radio: 45, region: 'CO Centro' },
  'BUCARAMANGA': { lat: 7.1254, lng: -73.1198, radio: 20, region: 'CO Norte' },
  'CALI': { lat: 3.4516, lng: -76.5320, radio: 30, region: 'CO Sur' },
  'CARTAGENA DE INDIAS': { lat: 10.3910, lng: -75.4794, radio: 20, region: 'CO Norte' },
  'CORDOBA': { lat: 8.7479, lng: -75.8195, radio: 15, region: 'CO Norte' },
  'CUCUTA': { lat: 7.8939, lng: -72.5078, radio: 18, region: 'CO Norte' },
  'DUITAMA': { lat: 5.8267, lng: -73.0338, radio: 8, region: 'CO Centro' },
  'IBAGUE': { lat: 4.4389, lng: -75.2322, radio: 15, region: 'CO Andes' },
  'ITAGUI': { lat: 6.1849, lng: -75.5994, radio: 10, region: 'CO Andes' },
  'LA MESA': { lat: 4.6333, lng: -74.4667, radio: 8, region: 'CO Centro' },
  'MANIZALES': { lat: 5.0703, lng: -75.5138, radio: 15, region: 'CO Andes' },
  'MEDELLIN': { lat: 6.2476, lng: -75.5658, radio: 35, region: 'CO Andes' },
  'MONTERÍA': { lat: 8.7479, lng: -75.8814, radio: 15, region: 'CO Norte' },
  'MOSQUERA': { lat: 4.7061, lng: -74.2303, radio: 10, region: 'CO Centro' },
  'NEIVA': { lat: 2.9273, lng: -75.2819, radio: 15, region: 'CO Sur' },
  'PEREIRA': { lat: 4.8087, lng: -75.6906, radio: 15, region: 'CO Andes' },
  'POPAYAN': { lat: 2.4419, lng: -76.6063, radio: 12, region: 'CO Sur' },
  'ROVIRA': { lat: 5.1019, lng: -75.0289, radio: 8, region: 'CO Andes' },
  'SANTA MARTA': { lat: 11.2404, lng: -74.2110, radio: 18, region: 'CO Norte' },
  'SESQUILE': { lat: 5.0550, lng: -73.7878, radio: 6, region: 'CO Centro' },
  'SINCELEJO': { lat: 9.3047, lng: -75.3978, radio: 12, region: 'CO Norte' },
  'SOACHA': { lat: 4.5793, lng: -74.2167, radio: 12, region: 'CO Centro' },
  'SOGAMOSO': { lat: 5.7167, lng: -72.9343, radio: 10, region: 'CO Centro' },
  'TULUA': { lat: 4.0892, lng: -76.1953, radio: 10, region: 'CO Sur' },
  'TUNJA': { lat: 5.5353, lng: -73.3678, radio: 12, region: 'CO Centro' },
  'VALLEDUPAR': { lat: 10.4631, lng: -73.2532, radio: 18, region: 'CO Norte' },
  'VILLAVICENCIO': { lat: 4.1420, lng: -73.6266, radio: 20, region: 'CO Centro' },
  'VITERBO': { lat: 5.0667, lng: -75.8833, radio: 6, region: 'CO Andes' },
  'ZIPAQUIRA': { lat: 5.0214, lng: -73.9967, radio: 10, region: 'CO Centro' }
};

// 15 MARCAS CON SUS CATEGORÍAS Y ANUNCIANTES
const MARCAS = [
  { nombre: 'AGUILA', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'BBC', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'CBM', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'CFC', categoria: 'CERVEZAS', anunciante: 'BAVARIA' },
  { nombre: 'CLUB COLOMBIA', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'COLA & POLA', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'CORONA', categoria: 'CERVEZAS', anunciante: 'ABInBEV' },
  { nombre: 'COSTEÑA', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'MICHELOB', categoria: 'CERVEZAS', anunciante: 'ABInBEV' },
  { nombre: 'PILSEN', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'POKER', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'PONY MALTA', categoria: 'NABS', anunciante: 'ABI' },
  { nombre: 'REDDS', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'STELLA ARTOIS', categoria: 'CERVEZAS', anunciante: 'ABInBEV' },
  { nombre: 'TADA', categoria: 'CERVEZAS', anunciante: 'ABI' }
];

// 80+ CAMPAÑAS ASOCIADAS A MARCAS
const CAMPANAS = [
  { nombre: '127', marca: 'AGUILA' },
  { nombre: 'FRANCHISE', marca: 'AGUILA' },
  { nombre: '100 YEARS', marca: 'CORONA' },
  { nombre: '2 BOT FRIAS', marca: 'AGUILA' },
  { nombre: '20 JULIO', marca: 'CLUB COLOMBIA' },
  { nombre: '473', marca: 'CLUB COLOMBIA' },
  { nombre: '7 DE AGOSTO', marca: 'CLUB COLOMBIA' },
  { nombre: 'AGUILA IMPERIAL', marca: 'AGUILA' },
  { nombre: 'AON 100 YEARS', marca: 'CORONA' },
  { nombre: 'AON ENERGIA NUTRITIVA', marca: 'PONY MALTA' },
  { nombre: 'AON NATURAL', marca: 'CORONA' },
  { nombre: 'BACANA', marca: 'COSTEÑA' },
  { nombre: 'BEER', marca: 'CORONA' },
  { nombre: 'BIG PROMO', marca: 'AGUILA' },
  { nombre: 'COPA AMERICA', marca: 'PONY MALTA' },
  { nombre: 'CORDILLERA', marca: 'CLUB COLOMBIA' },
  { nombre: 'CRAVING CAPS', marca: 'PONY MALTA' },
  { nombre: 'ENERGIA NUTRITIVA', marca: 'PONY MALTA' },
  { nombre: 'ENERGÍA NUTRITIVA', marca: 'PONY MALTA' },
  { nombre: 'EQUITY', marca: 'PONY MALTA' },
  { nombre: 'FERIA DE FLORES', marca: 'PILSEN' },
  { nombre: 'FERIAS Y FIESTAS', marca: 'AGUILA' },
  { nombre: 'FIESTAS DEL MAR', marca: 'AGUILA' },
  { nombre: 'LIGHT', marca: 'AGUILA' },
  { nombre: 'LIGHT - LDACs PLATFORM', marca: 'AGUILA' },
  { nombre: 'LIGHT BEER', marca: 'MICHELOB' },
  { nombre: 'MICHELOB ULTRA', marca: 'MICHELOB' },
  { nombre: 'ORIGINAL', marca: 'POKER' },
  { nombre: 'PILSEN ROJA', marca: 'PILSEN' },
  { nombre: 'POKER LIMON', marca: 'POKER' },
  { nombre: 'ROJA', marca: 'AGUILA' },
  { nombre: 'STELLA', marca: 'STELLA ARTOIS' },
  { nombre: 'ULTRA', marca: 'MICHELOB' }
];

// 5 TIPOS DE ELEMENTOS OOH
const TIPOS_OOH = [
  'VALLA',
  'POSTER',
  'PISO',
  'FASCIA',
  'DIGITAL'
];

// ESTADOS OOH
const ESTADOS_OOH = [
  'ACTIVO',
  'ARRIENDO',
  'PRODUCCION',
  'BONIFICADO',
  'CONSUMO',
  'INACTIVO'
];

// 3 PROVEEDORES
const PROVEEDORES = [
  'APX',
  'MEDIA TOTAL',
  'PUBLICIDAD'
];

// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

async function resetDatabase() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                  RESETEO DE BASE DE DATOS                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // PASO 1: Hacer backup de la BD actual si existe
    if (fs.existsSync(DB_FILE)) {
      console.log('📦 PASO 1: Respaldo de la base de datos actual\n');
      fs.copyFileSync(DB_FILE, DB_BACKUP);
      console.log(`   ✅ Backup creado: ${path.basename(DB_BACKUP)}`);
      console.log(`   📂 Ubicación: ${DB_BACKUP}\n`);
    } else {
      console.log('📦 PASO 1: No hay base de datos previa\n');
    }
    
    // PASO 2: Crear nueva base de datos
    console.log('🆕 PASO 2: Creando nueva base de datos SQLite\n');
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    console.log('   ✅ Base de datos en memoria inicializada\n');
    
    // PASO 3: Crear estructura de tablas
    console.log('🏗️  PASO 3: Creando estructura de tablas\n');
    
    console.log('   📋 Creando tabla: regions');
    db.run(`CREATE TABLE regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('   📋 Creando tabla: categories');
    db.run(`CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('   📋 Creando tabla: advertisers');
    db.run(`CREATE TABLE advertisers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('   📋 Creando tabla: brands');
    db.run(`CREATE TABLE brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      advertiser_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (advertiser_id) REFERENCES advertisers(id)
    )`);
    
    console.log('   📋 Creando tabla: campaigns');
    db.run(`CREATE TABLE campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      brand_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
      UNIQUE(nombre, brand_id)
    )`);
    
    console.log('   📋 Creando tabla: ooh_types');
    db.run(`CREATE TABLE ooh_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,      descripcion TEXT,      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('   📋 Creando tabla: providers');
    db.run(`CREATE TABLE providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('   📋 Creando tabla: ooh_states');
    db.run(`CREATE TABLE ooh_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('   📋 Creando tabla: cities');
    db.run(`CREATE TABLE cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      region_id INTEGER NOT NULL,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      radio_km REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    )`);
    
    console.log('   📋 Creando tabla: addresses');
    db.run(`CREATE TABLE addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER NOT NULL,
      descripcion TEXT,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
    )`);
    
    console.log('   📋 Creando tabla: ooh_records');
    db.run(`CREATE TABLE ooh_records (
      id TEXT PRIMARY KEY,
      brand_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      ooh_type_id INTEGER NOT NULL,
      provider_id INTEGER NOT NULL,
      address_id INTEGER NOT NULL,
      estado_id INTEGER DEFAULT 1,
      checked INTEGER DEFAULT 0,
      review_required INTEGER DEFAULT 0,
      review_reason TEXT,
      fecha_inicio TEXT NOT NULL,
      fecha_final TEXT,
      synced_to_bigquery DATETIME,
      bq_sync_status TEXT DEFAULT 'pending',
      last_bigquery_sync DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (ooh_type_id) REFERENCES ooh_types(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id),
      FOREIGN KEY (address_id) REFERENCES addresses(id),
      FOREIGN KEY (estado_id) REFERENCES ooh_states(id)
    )`);
    
    console.log('   📋 Creando tabla: images');
    db.run(`CREATE TABLE images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ooh_record_id TEXT NOT NULL,
      ruta TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 1,
      role TEXT DEFAULT 'gallery',
      slot INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ooh_record_id) REFERENCES ooh_records(id) ON DELETE CASCADE,
      UNIQUE(ooh_record_id, orden)
    )`);
    
    console.log('\n   ✅ 12 tablas creadas exitosamente\n');
    
    // PASO 4: Insertar REGIONES
    console.log('🗺️  PASO 4: Insertando REGIONES\n');
    const regionStmt = db.prepare('INSERT INTO regions (nombre) VALUES (?)');
    for (const region of REGIONES) {
      regionStmt.bind([region.nombre]);
      regionStmt.step();
      regionStmt.reset();
      console.log(`   ✅ ${region.nombre}`);
    }
    regionStmt.free();
    console.log(`\n   Total: ${REGIONES.length} regiones\n`);
    
    // PASO 5: Insertar CATEGORÍAS
    console.log('📂 PASO 5: Insertando CATEGORÍAS\n');
    const categoriesSet = new Set(MARCAS.map(m => m.categoria));
    const categoryStmt = db.prepare('INSERT INTO categories (nombre) VALUES (?)');
    for (const cat of categoriesSet) {
      categoryStmt.bind([cat]);
      categoryStmt.step();
      categoryStmt.reset();
      console.log(`   ✅ ${cat}`);
    }
    categoryStmt.free();
    console.log(`\n   Total: ${categoriesSet.size} categorías\n`);
    
    // PASO 6: Insertar ANUNCIANTES
    console.log('🏢 PASO 6: Insertando ANUNCIANTES\n');
    const advertiserSet = new Set(MARCAS.map(m => m.anunciante));
    const advertiserStmt = db.prepare('INSERT INTO advertisers (nombre) VALUES (?)');
    for (const adv of advertiserSet) {
      advertiserStmt.bind([adv]);
      advertiserStmt.step();
      advertiserStmt.reset();
      console.log(`   ✅ ${adv}`);
    }
    advertiserStmt.free();
    console.log(`\n   Total: ${advertiserSet.size} anunciantes\n`);
    
    // PASO 7: Crear mapas de IDs
    console.log('🔗 PASO 7: Creando mapas de relaciones\n');
    
    const categories = db.exec('SELECT id, nombre FROM categories');
    const categoryMap = {};
    if (categories.length > 0) {
      for (const row of categories[0].values) {
        categoryMap[row[1]] = row[0];
      }
    }
    console.log(`   ✅ Mapa de categorías: ${Object.keys(categoryMap).length} entradas`);
    
    const advertisers = db.exec('SELECT id, nombre FROM advertisers');
    const advertiserMap = {};
    if (advertisers.length > 0) {
      for (const row of advertisers[0].values) {
        advertiserMap[row[1]] = row[0];
      }
    }
    console.log(`   ✅ Mapa de anunciantes: ${Object.keys(advertiserMap).length} entradas`);
    
    const regions = db.exec('SELECT id, nombre FROM regions');
    const regionMap = {};
    if (regions.length > 0) {
      for (const row of regions[0].values) {
        regionMap[row[1]] = row[0];
      }
    }
    console.log(`   ✅ Mapa de regiones: ${Object.keys(regionMap).length} entradas\n`);
    
    // PASO 8: Insertar MARCAS
    console.log('🏷️  PASO 8: Insertando MARCAS\n');
    const brandStmt = db.prepare('INSERT INTO brands (nombre, category_id, advertiser_id) VALUES (?, ?, ?)');
    for (const marca of MARCAS) {
      const categoryId = categoryMap[marca.categoria];
      const advertiserId = advertiserMap[marca.anunciante];
      brandStmt.bind([marca.nombre, categoryId, advertiserId]);
      brandStmt.step();
      brandStmt.reset();
      console.log(`   ✅ ${marca.nombre} (${marca.categoria} - ${marca.anunciante})`);
    }
    brandStmt.free();
    console.log(`\n   Total: ${MARCAS.length} marcas\n`);
    
    // PASO 9: Crear mapa de marcas e insertar CAMPAÑAS
    console.log('📺 PASO 9: Insertando CAMPAÑAS\n');
    const brands = db.exec('SELECT id, nombre FROM brands');
    const brandMap = {};
    if (brands.length > 0) {
      for (const row of brands[0].values) {
        brandMap[row[1]] = row[0];
      }
    }
    
    const campaignStmt = db.prepare('INSERT INTO campaigns (nombre, brand_id) VALUES (?, ?)');
    let campaignCount = 0;
    for (const campaign of CAMPANAS) {
      const brandId = brandMap[campaign.marca];
      if (brandId) {
        campaignStmt.bind([campaign.nombre, brandId]);
        campaignStmt.step();
        campaignStmt.reset();
        campaignCount++;
        if (campaignCount <= 10) {
          console.log(`   ✅ ${campaign.nombre} (${campaign.marca})`);
        }
      }
    }
    campaignStmt.free();
    if (campaignCount > 10) {
      console.log(`   ... y ${campaignCount - 10} campañas más`);
    }
    console.log(`\n   Total: ${campaignCount} campañas\n`);
    
    // PASO 10: Insertar TIPOS DE OOH
    console.log('🎯 PASO 10: Insertando TIPOS DE OOH\n');
    const oohTypeStmt = db.prepare('INSERT INTO ooh_types (nombre) VALUES (?)');
    for (const tipo of TIPOS_OOH) {
      oohTypeStmt.bind([tipo]);
      oohTypeStmt.step();
      oohTypeStmt.reset();
      console.log(`   ✅ ${tipo}`);
    }
    oohTypeStmt.free();
    console.log(`\n   Total: ${TIPOS_OOH.length} tipos\n`);
    
    // PASO 10.5: Insertar ESTADOS OOH
    console.log('🟢 PASO 10.5: Insertando ESTADOS OOH\n');
    const estadoMap = {
      'ACTIVO': 'Registro activo y vigente',
      'ARRIENDO': 'Disponible en arriendo',
      'PRODUCCION': 'En producción',
      'BONIFICADO': 'Bonificado por campaña',
      'CONSUMO': 'En consumo',
      'INACTIVO': 'Registro inactivo'
    };
    const oohStateStmt = db.prepare('INSERT INTO ooh_states (nombre, descripcion) VALUES (?, ?)');
    for (const estado of ESTADOS_OOH) {
      oohStateStmt.bind([estado, estadoMap[estado] || '']);
      oohStateStmt.step();
      oohStateStmt.reset();
      console.log(`   ✅ ${estado}`);
    }
    oohStateStmt.free();
    console.log(`\n   Total: ${ESTADOS_OOH.length} estados\n`);
    
    // PASO 11: Insertar PROVEEDORES
    console.log('🚚 PASO 11: Insertando PROVEEDORES\n');
    const providerStmt = db.prepare('INSERT INTO providers (nombre) VALUES (?)');
    for (const provider of PROVEEDORES) {
      providerStmt.bind([provider]);
      providerStmt.step();
      providerStmt.reset();
      console.log(`   ✅ ${provider}`);
    }
    providerStmt.free();
    console.log(`\n   Total: ${PROVEEDORES.length} proveedores\n`);
    
    // PASO 12: Insertar CIUDADES
    console.log('🏙️  PASO 12: Insertando CIUDADES CON COORDENADAS\n');
    const cityStmt = db.prepare('INSERT INTO cities (nombre, region_id, latitud, longitud, radio_km) VALUES (?, ?, ?, ?, ?)');
    let cityCount = 0;
    for (const [nombre, coords] of Object.entries(CIUDADES_COORDENADAS)) {
      const regionId = regionMap[coords.region];
      if (regionId) {
        cityStmt.bind([nombre, regionId, coords.lat, coords.lng, coords.radio]);
        cityStmt.step();
        cityStmt.reset();
        cityCount++;
        if (cityCount <= 10) {
          console.log(`   ✅ ${nombre} → ${coords.region} (${coords.lat}, ${coords.lng})`);
        }
      }
    }
    cityStmt.free();
    if (cityCount > 10) {
      console.log(`   ... y ${cityCount - 10} ciudades más`);
    }
    console.log(`\n   Total: ${cityCount} ciudades\n`);
    
    // PASO 13: Guardar base de datos
    console.log('💾 PASO 13: Guardando base de datos en disco\n');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
    
    const stats = fs.statSync(DB_FILE);
    console.log(`   ✅ Archivo creado: ${path.basename(DB_FILE)}`);
    console.log(`   📂 Ubicación: ${DB_FILE}`);
    console.log(`   📊 Tamaño: ${(stats.size / 1024).toFixed(2)} KB\n`);
    
    // PASO 14: Verificación final
    console.log('✓ PASO 14: Verificación de integridad\n');
    
    const verification = {
      regiones: db.exec('SELECT COUNT(*) as total FROM regions')[0].values[0][0],
      categorias: db.exec('SELECT COUNT(*) as total FROM categories')[0].values[0][0],
      anunciantes: db.exec('SELECT COUNT(*) as total FROM advertisers')[0].values[0][0],
      marcas: db.exec('SELECT COUNT(*) as total FROM brands')[0].values[0][0],
      campañas: db.exec('SELECT COUNT(*) as total FROM campaigns')[0].values[0][0],
      tipos_ooh: db.exec('SELECT COUNT(*) as total FROM ooh_types')[0].values[0][0],
      estados_ooh: db.exec('SELECT COUNT(*) as total FROM ooh_states')[0].values[0][0],
      proveedores: db.exec('SELECT COUNT(*) as total FROM providers')[0].values[0][0],
      ciudades: db.exec('SELECT COUNT(*) as total FROM cities')[0].values[0][0],
      direcciones: db.exec('SELECT COUNT(*) as total FROM addresses')[0].values[0][0],
      registros_ooh: db.exec('SELECT COUNT(*) as total FROM ooh_records')[0].values[0][0],
      imagenes: db.exec('SELECT COUNT(*) as total FROM images')[0].values[0][0]
    };
    
    console.log('   ╔═══════════════════════════════════════╗');
    console.log('   ║  CONTENIDO DE LA BASE DE DATOS        ║');
    console.log('   ╠═══════════════════════════════════════╣');
    console.log(`   ║  Regiones:        ${String(verification.regiones).padStart(4)} ✅        ║`);
    console.log(`   ║  Categorías:      ${String(verification.categorias).padStart(4)} ✅        ║`);
    console.log(`   ║  Anunciantes:     ${String(verification.anunciantes).padStart(4)} ✅        ║`);
    console.log(`   ║  Marcas:          ${String(verification.marcas).padStart(4)} ✅        ║`);
    console.log(`   ║  Campañas:        ${String(verification.campañas).padStart(4)} ✅        ║`);
    console.log(`   ║  Tipos OOH:       ${String(verification.tipos_ooh).padStart(4)} ✅        ║`);
    console.log(`   ║  Estados OOH:     ${String(verification.estados_ooh).padStart(4)} ✅        ║`);
    console.log(`   ║  Proveedores:     ${String(verification.proveedores).padStart(4)} ✅        ║`);
    console.log(`   ║  Ciudades:        ${String(verification.ciudades).padStart(4)} ✅        ║`);
    console.log('   ╠═══════════════════════════════════════╣');
    console.log(`   ║  Direcciones:     ${String(verification.direcciones).padStart(4)} (vacío) ║`);
    console.log(`   ║  Registros OOH:   ${String(verification.registros_ooh).padStart(4)} (vacío) ║`);
    console.log(`   ║  Imágenes:        ${String(verification.imagenes).padStart(4)} (vacío) ║`);
    console.log('   ╚═══════════════════════════════════════╝\n');
    
    db.close();
    
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ PROCESO COMPLETADO                           ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log('║                                                                   ║');
    console.log('║  La base de datos ha sido reseteada exitosamente.                ║');
    console.log('║  Solo contiene catálogos, sin registros de prueba.               ║');
    console.log('║                                                                   ║');
    console.log('║  📌 SIGUIENTE PASO:                                               ║');
    console.log('║     Importa tus datos reales desde Excel usando el frontend      ║');
    console.log('║                                                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL RESETEO:\n');
    console.error('   ' + error.message);
    console.error('\n   Stack trace:');
    console.error('   ' + error.stack);
    
    if (fs.existsSync(DB_BACKUP)) {
      console.log('\n⚠️  Puedes restaurar el backup con:');
      console.log(`   copy "${DB_BACKUP}" "${DB_FILE}"\n`);
    }
    
    process.exit(1);
  }
}

// Ejecutar
resetDatabase();
