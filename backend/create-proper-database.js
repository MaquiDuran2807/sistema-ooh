#!/usr/bin/env node

/**
 * Script para crear la base de datos con el esquema correcto
 * Ejecutar: node create-proper-database.js
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'ooh_data.db');

// Coordenadas de ciudades colombianas
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

// Regiones SOLO ESTAS 4
const REGIONES = [
  { nombre: 'CO Norte' },
  { nombre: 'CO Centro' },
  { nombre: 'CO Andes' },
  { nombre: 'CO Sur' }
];

// Marcas con sus categorías
const MARCAS = [
  { nombre: 'AGUILA', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'BBC', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'CLUB COLOMBIA', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'CORONA', categoria: 'CERVEZAS', anunciante: 'ABInBEV' },
  { nombre: 'MICHELOB', categoria: 'CERVEZAS', anunciante: 'ABInBEV' },
  { nombre: 'PILSEN', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'POKER', categoria: 'CERVEZAS', anunciante: 'ABI' },
  { nombre: 'PONY MALTA', categoria: 'NABS', anunciante: 'ABI' },
  { nombre: 'STELLA ARTOIS', categoria: 'CERVEZAS', anunciante: 'ABInBEV' },
  { nombre: 'CFC', categoria: 'CERVEZAS', anunciante: 'BAVARIA' }
];

// Tipos de OOH
const TIPOS_OOH = [
  'VALLA',
  'POSTER',
  'PISO',
  'FASCIA',
  'DIGITAL'
];

// Proveedores
const PROVEEDORES = [
  'APX',
  'MEDIA TOTAL',
  'PUBLICIDAD'
];

// Campañas
const CAMPANAS = [
  { nombre: '127', marca: 'AGUILA' },
  { nombre: 'FRANCHISE', marca: 'AGUILA' },
  { nombre: '100 YEARS', marca: 'CORONA' },
  { nombre: '2 BOT FRIAS', marca: 'AGUILA' },
  { nombre: '20 JULIO', marca: 'CLUB COLOMBIA' },
  { nombre: 'AGUILA IMPERIAL', marca: 'AGUILA' },
  { nombre: 'AON 100 YEARS', marca: 'CORONA' },
  { nombre: 'AON ENERGIA NUTRITIVA', marca: 'PONY MALTA' },
  { nombre: 'AON NATURAL', marca: 'CORONA' },
  { nombre: 'BACANA', marca: 'CLUB COLOMBIA' },
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
  { nombre: 'LIGHT BEER', marca: 'MICHELOB' },
  { nombre: 'LIGHT PREMIUM', marca: 'AGUILA' },
  { nombre: 'LIDER CERVEZAS', marca: 'PILSEN' },
  { nombre: 'MADRID', marca: 'BBC' },
  { nombre: 'MICHELOB ULTRA', marca: 'MICHELOB' },
  { nombre: 'NATURAL', marca: 'CORONA' },
  { nombre: 'NUTRICION', marca: 'PONY MALTA' },
  { nombre: 'ORIGINAL', marca: 'STELLA ARTOIS' },
  { nombre: 'PONY LECHE CALIENTE', marca: 'PONY MALTA' },
  { nombre: 'POKER NEGRA', marca: 'POKER' },
  { nombre: 'POKER PREMIUM', marca: 'POKER' },
  { nombre: 'PREMIUM', marca: 'PILSEN' },
  { nombre: 'REBAJADA', marca: 'PILSEN' },
  { nombre: 'ROJA', marca: 'POKER' },
  { nombre: 'SALUD Y VIDA', marca: 'PONY MALTA' },
  { nombre: 'STELLA BOTELLA', marca: 'STELLA ARTOIS' },
  { nombre: 'STELLA IMPERIAL', marca: 'STELLA ARTOIS' },
  { nombre: 'SUPER PREMIUM', marca: 'STELLA ARTOIS' },
  { nombre: 'THE ORIGINAL', marca: 'STELLA ARTOIS' },
  { nombre: 'TONALIDAD OSCURA', marca: 'CLUB COLOMBIA' },
  { nombre: 'TOP SELLER', marca: 'CFC' },
  { nombre: 'TRADICIONAL', marca: 'PILSEN' },
  { nombre: 'VENTA MASIVA', marca: 'CLUB COLOMBIA' },
  { nombre: 'VER FUTBOL', marca: 'AGUILA' },
  { nombre: 'VIRADA PREMIUM', marca: 'PILSEN' },
  { nombre: 'WORLD CLASS', marca: 'BBC' }
];

async function createDatabase() {
  try {
    console.log('\n╔═════════════════════════════════════════════════╗');
    console.log('║  🆕 CREAR BD CON ESQUEMA CORRECTO            ║');
    console.log('╚═════════════════════════════════════════════════╝\n');
    
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    console.log('📋 Creando estructura de tablas...');
    
    // Tabla REGIONES
    db.run(`CREATE TABLE regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla CATEGORÍAS
    db.run(`CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla ANUNCIANTES
    db.run(`CREATE TABLE advertisers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla MARCAS
    db.run(`CREATE TABLE brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      advertiser_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (advertiser_id) REFERENCES advertisers(id)
    )`);
    
    // Tabla CAMPAÑAS
    db.run(`CREATE TABLE campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      brand_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
      UNIQUE(nombre, brand_id)
    )`);
    
    // Tabla TIPOS DE OOH
    db.run(`CREATE TABLE ooh_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla PROVEEDORES
    db.run(`CREATE TABLE providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla CIUDADES
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
    
    // Tabla DIRECCIONES
    db.run(`CREATE TABLE addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER NOT NULL,
      descripcion TEXT,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
    )`);
    
    // Tabla REGISTROS OOH
    db.run(`CREATE TABLE ooh_records (
      id TEXT PRIMARY KEY,
      brand_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      ooh_type_id INTEGER NOT NULL,
      address_id INTEGER NOT NULL,
      provider_id INTEGER NOT NULL,
      fecha_inicio TEXT,
      fecha_final TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (ooh_type_id) REFERENCES ooh_types(id),
      FOREIGN KEY (address_id) REFERENCES addresses(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )`);
    
    // Tabla IMÁGENES
    db.run(`CREATE TABLE images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ooh_record_id TEXT NOT NULL,
      ruta TEXT NOT NULL,
      orden INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ooh_record_id) REFERENCES ooh_records(id) ON DELETE CASCADE,
      UNIQUE(ooh_record_id, orden)
    )`);
    
    console.log('✅ Tablas creadas\n');
    
    // Insertar REGIONES
    console.log('🗺️  Insertando regiones...');
    const regionStmt = db.prepare('INSERT INTO regions (nombre) VALUES (?)');
    for (const region of REGIONES) {
      regionStmt.bind([region.nombre]);
      regionStmt.step();
      regionStmt.reset();
    }
    regionStmt.free();
    console.log(`✅ ${REGIONES.length} regiones insertadas\n`);
    
    // Insertar CATEGORÍAS
    console.log('📂 Insertando categorías...');
    const categoriesSet = new Set(MARCAS.map(m => m.categoria));
    const categoryStmt = db.prepare('INSERT INTO categories (nombre) VALUES (?)');
    for (const cat of categoriesSet) {
      categoryStmt.bind([cat]);
      categoryStmt.step();
      categoryStmt.reset();
    }
    categoryStmt.free();
    console.log(`✅ ${categoriesSet.size} categorías insertadas\n`);
    
    // Insertar ANUNCIANTES
    console.log('🏢 Insertando anunciantes...');
    const advertiserSet = new Set(MARCAS.map(m => m.anunciante));
    const advertiserStmt = db.prepare('INSERT INTO advertisers (nombre) VALUES (?)');
    for (const adv of advertiserSet) {
      advertiserStmt.bind([adv]);
      advertiserStmt.step();
      advertiserStmt.reset();
    }
    advertiserStmt.free();
    console.log(`✅ ${advertiserSet.size} anunciantes insertados\n`);
    
    // Crear mapeo de categorías y anunciantes
    const categories = db.exec('SELECT id, nombre FROM categories');
    const categoryMap = {};
    if (categories.length > 0) {
      for (const row of categories[0].values) {
        categoryMap[row[1]] = row[0];
      }
    }
    
    const advertisers = db.exec('SELECT id, nombre FROM advertisers');
    const advertiserMap = {};
    if (advertisers.length > 0) {
      for (const row of advertisers[0].values) {
        advertiserMap[row[1]] = row[0];
      }
    }
    
    // Insertar MARCAS
    console.log('🏷️  Insertando marcas...');
    const brandStmt = db.prepare('INSERT INTO brands (nombre, category_id, advertiser_id) VALUES (?, ?, ?)');
    for (const marca of MARCAS) {
      const categoryId = categoryMap[marca.categoria];
      const advertiserId = advertiserMap[marca.anunciante];
      brandStmt.bind([marca.nombre, categoryId, advertiserId]);
      brandStmt.step();
      brandStmt.reset();
    }
    brandStmt.free();
    console.log(`✅ ${MARCAS.length} marcas insertadas\n`);
    
    // Crear mapeo de marcas
    const brands = db.exec('SELECT id, nombre FROM brands');
    const brandMap = {};
    if (brands.length > 0) {
      for (const row of brands[0].values) {
        brandMap[row[1]] = row[0];
      }
    }
    
    // Insertar CAMPAÑAS
    console.log('📺 Insertando campañas...');
    const campaignStmt = db.prepare('INSERT INTO campaigns (nombre, brand_id) VALUES (?, ?)');
    for (const campaign of CAMPANAS) {
      const brandId = brandMap[campaign.marca];
      if (brandId) {
        campaignStmt.bind([campaign.nombre, brandId]);
        campaignStmt.step();
        campaignStmt.reset();
      }
    }
    campaignStmt.free();
    console.log(`✅ ${CAMPANAS.length} campañas insertadas\n`);
    
    // Insertar TIPOS DE OOH
    console.log('🎯 Insertando tipos de OOH...');
    const oohTypeStmt = db.prepare('INSERT INTO ooh_types (nombre) VALUES (?)');
    for (const tipo of TIPOS_OOH) {
      oohTypeStmt.bind([tipo]);
      oohTypeStmt.step();
      oohTypeStmt.reset();
    }
    oohTypeStmt.free();
    console.log(`✅ ${TIPOS_OOH.length} tipos de OOH insertados\n`);
    
    // Insertar PROVEEDORES
    console.log('🚚 Insertando proveedores...');
    const providerStmt = db.prepare('INSERT INTO providers (nombre) VALUES (?)');
    for (const provider of PROVEEDORES) {
      providerStmt.bind([provider]);
      providerStmt.step();
      providerStmt.reset();
    }
    providerStmt.free();
    console.log(`✅ ${PROVEEDORES.length} proveedores insertados\n`);
    
    // Crear mapeo de regiones
    const regions = db.exec('SELECT id, nombre FROM regions');
    const regionMap = {};
    if (regions.length > 0) {
      for (const row of regions[0].values) {
        regionMap[row[1]] = row[0];
      }
    }
    
    // Insertar CIUDADES
    console.log('🏙️  Insertando ciudades...');
    const cityStmt = db.prepare('INSERT INTO cities (nombre, region_id, latitud, longitud, radio_km) VALUES (?, ?, ?, ?, ?)');
    let cityCount = 0;
    for (const [nombre, coords] of Object.entries(CIUDADES_COORDENADAS)) {
      const regionId = regionMap[coords.region];
      if (regionId) {
        cityStmt.bind([nombre, regionId, coords.lat, coords.lng, coords.radio]);
        cityStmt.step();
        cityStmt.reset();
        cityCount++;
      }
    }
    cityStmt.free();
    console.log(`✅ ${cityCount} ciudades insertadas\n`);
    
    // Guardar BD
    console.log('💾 Guardando base de datos...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
    
    const stats = fs.statSync(DB_FILE);
    console.log(`✅ Base de datos guardada en: ${DB_FILE}`);
    console.log(`   Tamaño: ${stats.size} bytes\n`);
    
    console.log('📊 RESUMEN DE LA BASE DE DATOS:\n');
    console.log(`   Regiones: ${REGIONES.length}`);
    console.log(`   Anunciantes: ${advertiserSet.size}`);
    console.log(`   Categorías: ${categoriesSet.size}`);
    console.log(`   Marcas: ${MARCAS.length}`);
    console.log(`   Campañas: ${CAMPANAS.length}`);
    console.log(`   Tipos OOH: ${TIPOS_OOH.length}`);
    console.log(`   Proveedores: ${PROVEEDORES.length}`);
    console.log(`   Ciudades: ${cityCount}\n`);
    
    console.log('╔═════════════════════════════════════════════════╗');
    console.log('║  ✅ Base de datos creada exitosamente!         ║');
    console.log('╚═════════════════════════════════════════════════╝\n');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error creando la base de datos:');
    console.error(error.message);
    process.exit(1);
  }
}

createDatabase();
