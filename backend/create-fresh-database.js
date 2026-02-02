/**
 * Script para crear la base de datos completamente desde cero
 * Ejecutar: node create-fresh-database.js
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

// Coordenadas de ciudades colombianas (centro aproximado)
const CIUDADES_COORDENADAS = {
  'ARMENIA': { lat: 4.5339, lng: -75.6811, radio: 12 },
  'BARRANQUILLA': { lat: 10.9685, lng: -74.7813, radio: 25 },
  'BELLO': { lat: 6.3370, lng: -75.5547, radio: 10 },
  'BOGOTA DC': { lat: 4.7110, lng: -74.0721, radio: 45 },
  'BUCARAMANGA': { lat: 7.1254, lng: -73.1198, radio: 20 },
  'CALI': { lat: 3.4516, lng: -76.5320, radio: 30 },
  'CARTAGENA DE INDIAS': { lat: 10.3910, lng: -75.4794, radio: 20 },
  'CORDOBA': { lat: 8.7479, lng: -75.8195, radio: 15 },
  'CUCUTA': { lat: 7.8939, lng: -72.5078, radio: 18 },
  'DUITAMA': { lat: 5.8267, lng: -73.0338, radio: 8 },
  'IBAGUE': { lat: 4.4389, lng: -75.2322, radio: 15 },
  'ITAGUI': { lat: 6.1849, lng: -75.5994, radio: 10 },
  'LA MESA': { lat: 4.6333, lng: -74.4667, radio: 8 },
  'MANIZALES': { lat: 5.0703, lng: -75.5138, radio: 15 },
  'MEDELLIN': { lat: 6.2476, lng: -75.5658, radio: 35 },
  'MONTERÍA': { lat: 8.7479, lng: -75.8814, radio: 15 },
  'MOSQUERA': { lat: 4.7061, lng: -74.2303, radio: 10 },
  'NEIVA': { lat: 2.9273, lng: -75.2819, radio: 15 },
  'PEREIRA': { lat: 4.8087, lng: -75.6906, radio: 15 },
  'POPAYAN': { lat: 2.4419, lng: -76.6063, radio: 12 },
  'ROVIRA': { lat: 5.1019, lng: -75.0289, radio: 8 },
  'SANTA MARTA': { lat: 11.2404, lng: -74.2110, radio: 18 },
  'SESQUILE': { lat: 5.0550, lng: -73.7878, radio: 6 },
  'SINCELEJO': { lat: 9.3047, lng: -75.3978, radio: 12 },
  'SOACHA': { lat: 4.5793, lng: -74.2167, radio: 12 },
  'SOGAMOSO': { lat: 5.7167, lng: -72.9343, radio: 10 },
  'TULUA': { lat: 4.0892, lng: -76.1953, radio: 10 },
  'TUNJA': { lat: 5.5353, lng: -73.3678, radio: 12 },
  'VALLEDUPAR': { lat: 10.4631, lng: -73.2532, radio: 18 },
  'VILLAVICENCIO': { lat: 4.1420, lng: -73.6266, radio: 20 },
  'VITERBO': { lat: 5.0667, lng: -75.8833, radio: 6 },
  'ZIPAQUIRA': { lat: 5.0214, lng: -73.9967, radio: 10 }
};

// Regiones
const REGIONES = [
  { nombre: 'CO Norte' },
  { nombre: 'CO Sur' },
  { nombre: 'CO Centro' },
  { nombre: 'CO Andes' }
];

// Marcas con sus categorías
const MARCAS = [
  { nombre: 'AGUILA', categoria: 'CERVEZAS' },
  { nombre: 'BBC', categoria: 'CERVEZAS' },
  { nombre: 'CBM', categoria: 'CERVEZAS' },
  { nombre: 'CFC', categoria: 'CERVEZAS' },
  { nombre: 'CLUB COLOMBIA', categoria: 'CERVEZAS' },
  { nombre: 'COLA & POLA', categoria: 'CERVEZAS' },
  { nombre: 'CORONA', categoria: 'CERVEZAS' },
  { nombre: 'COSTEÑA', categoria: 'CERVEZAS' },
  { nombre: 'MICHELOB', categoria: 'CERVEZAS' },
  { nombre: 'PILSEN', categoria: 'CERVEZAS' },
  { nombre: 'POKER', categoria: 'CERVEZAS' },
  { nombre: 'PONY MALTA', categoria: 'NABS' },
  { nombre: 'REDDS', categoria: 'CERVEZAS' },
  { nombre: 'STELLA ARTOIS', categoria: 'CERVEZAS' },
  { nombre: 'TADA', categoria: 'CERVEZAS' }
];

// Campañas con su marca
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
  { nombre: 'MES DE LOS AMIGOS', marca: 'POKER' },
  { nombre: 'MICHELOB TIME', marca: 'MICHELOB' },
  { nombre: 'MID TIER CITIES', marca: 'STELLA ARTOIS' },
  { nombre: 'MOCCA', marca: 'CLUB COLOMBIA' },
  { nombre: 'NATURAL', marca: 'CORONA' },
  { nombre: 'NEW TAGLINE', marca: 'TADA' },
  { nombre: 'NEW VBI', marca: 'COLA & POLA' },
  { nombre: 'PERFECT SERVE', marca: 'STELLA ARTOIS' },
  { nombre: 'PIENSA X2', marca: 'CBM' },
  { nombre: 'PILOTO CENTRO', marca: 'COSTEÑA' },
  { nombre: 'PRECIO', marca: 'COSTEÑA' },
  { nombre: 'REDDS CITRUS', marca: 'REDDS' },
  { nombre: 'RENOVACION', marca: 'POKER' },
  { nombre: 'ROCK AL PARQUE', marca: 'POKER' },
  { nombre: 'SABOR DEL CARIBE', marca: 'AGUILA' },
  { nombre: 'SABOR SUPERIOR', marca: 'MICHELOB' },
  { nombre: 'SONIDOS EN LA CUMBRE', marca: 'BBC' },
  { nombre: 'SUNSET SESSION', marca: 'CORONA' },
  { nombre: 'SUPERIORITY EQUITY', marca: 'MICHELOB' },
  { nombre: 'TADA PIDAN DOMICILIO', marca: 'TADA' },
  { nombre: 'TRIGO', marca: 'CLUB COLOMBIA' },
  { nombre: 'ULTRA', marca: 'MICHELOB' },
  { nombre: 'ULTRA FIFA', marca: 'MICHELOB' }
];

// Ciudades con región
const CIUDADES = [
  { nombre: 'ARMENIA', region: 'CO Andes' },
  { nombre: 'BARRANQUILLA', region: 'CO Norte' },
  { nombre: 'BELLO', region: 'CO Andes' },
  { nombre: 'BOGOTA DC', region: 'CO Centro' },
  { nombre: 'BUCARAMANGA', region: 'CO Andes' },
  { nombre: 'CALI', region: 'CO Sur' },
  { nombre: 'CARTAGENA DE INDIAS', region: 'CO Norte' },
  { nombre: 'CORDOBA', region: 'CO Norte' },
  { nombre: 'CUCUTA', region: 'CO Norte' },
  { nombre: 'DUITAMA', region: 'CO Andes' },
  { nombre: 'IBAGUE', region: 'CO Andes' },
  { nombre: 'ITAGUI', region: 'CO Andes' },
  { nombre: 'LA MESA', region: 'CO Centro' },
  { nombre: 'MANIZALES', region: 'CO Andes' },
  { nombre: 'MEDELLIN', region: 'CO Andes' },
  { nombre: 'MONTERÍA', region: 'CO Norte' },
  { nombre: 'MOSQUERA', region: 'CO Centro' },
  { nombre: 'NEIVA', region: 'CO Sur' },
  { nombre: 'PEREIRA', region: 'CO Andes' },
  { nombre: 'POPAYAN', region: 'CO Sur' },
  { nombre: 'ROVIRA', region: 'CO Andes' },
  { nombre: 'SANTA MARTA', region: 'CO Norte' },
  { nombre: 'SESQUILE', region: 'CO Centro' },
  { nombre: 'SINCELEJO', region: 'CO Norte' },
  { nombre: 'SOACHA', region: 'CO Centro' },
  { nombre: 'SOGAMOSO', region: 'CO Andes' },
  { nombre: 'TULUA', region: 'CO Sur' },
  { nombre: 'TUNJA', region: 'CO Andes' },
  { nombre: 'VALLEDUPAR', region: 'CO Norte' },
  { nombre: 'VILLAVICENCIO', region: 'CO Centro' },
  { nombre: 'VITERBO', region: 'CO Andes' },
  { nombre: 'ZIPAQUIRA', region: 'CO Centro' }
];

// Tipos de OOH
const TIPOS_OOH = [
  { nombre: 'VALLA' },
  { nombre: 'VALLA DIGITAL' },
  { nombre: 'MUPPY' },
  { nombre: 'CAJITAS DE LUZ' },
  { nombre: 'VALLAS MOTORIZADAS' }
];

async function createDatabase() {
  try {
    console.log('🆕 Creando nueva base de datos...\n');
    
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    // Crear tablas
    console.log('📋 Creando estructura de tablas...');
    
    // Tabla de regiones
    db.run(`CREATE TABLE regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla de categorías
    db.run(`CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla de anunciantes
    db.run(`CREATE TABLE advertisers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla de marcas
    db.run(`CREATE TABLE brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      advertiser_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (advertiser_id) REFERENCES advertisers(id)
    )`);
    
    // Tabla de campañas
    db.run(`CREATE TABLE campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      brand_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
      UNIQUE(nombre, brand_id)
    )`);
    
    // Tabla de tipos de OOH
    db.run(`CREATE TABLE ooh_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla de imágenes
    db.run(`CREATE TABLE images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ooh_record_id TEXT NOT NULL,
      ruta TEXT NOT NULL,
      orden INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ooh_record_id) REFERENCES ooh_records(id) ON DELETE CASCADE,
      UNIQUE(ooh_record_id, orden)
    )`);
    
    // Tabla de ciudades
    db.run(`CREATE TABLE cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      radio_km REAL NOT NULL,
      region TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla de registros OOH
    db.run(`CREATE TABLE ooh_records (
      id TEXT PRIMARY KEY,
      brand_id INTEGER NOT NULL,
      anunciante TEXT DEFAULT 'ABI',
      campaign_id INTEGER NOT NULL,
      ooh_type_id INTEGER NOT NULL,
      city_id INTEGER NOT NULL,
      direccion TEXT NOT NULL,
      latitud REAL,
      longitud REAL,
      fecha_inicio TEXT,
      fecha_final TEXT,
      region TEXT,
      proveedor TEXT DEFAULT 'APX',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (ooh_type_id) REFERENCES ooh_types(id),
      FOREIGN KEY (city_id) REFERENCES cities(id)
    )`);
    
    console.log('✅ Tablas creadas\n');
    
    // Insertar regiones
    console.log('🗺️  Insertando regiones...');
    const regionStmt = db.prepare('INSERT INTO regions (nombre) VALUES (?)');
    for (const region of REGIONES) {
      regionStmt.bind([region.nombre]);
      regionStmt.step();
      regionStmt.reset();
    }
    regionStmt.free();
    console.log(`✅ ${REGIONES.length} regiones insertadas\n`);
    
    // Insertar marcas
    console.log('🏷️  Insertando marcas...');
    const brandStmt = db.prepare('INSERT INTO brands (nombre, categoria) VALUES (?, ?)');
    for (const marca of MARCAS) {
      brandStmt.bind([marca.nombre, marca.categoria]);
      brandStmt.step();
      brandStmt.reset();
    }
    brandStmt.free();
    console.log(`✅ ${MARCAS.length} marcas insertadas\n`);
    
    // Insertar tipos de OOH
    console.log('📺 Insertando tipos de OOH...');
    const oohTypeStmt = db.prepare('INSERT INTO ooh_types (nombre) VALUES (?)');
    for (const tipo of TIPOS_OOH) {
      oohTypeStmt.bind([tipo.nombre]);
      oohTypeStmt.step();
      oohTypeStmt.reset();
    }
    oohTypeStmt.free();
    console.log(`✅ ${TIPOS_OOH.length} tipos de OOH insertados\n`);
    
    // Insertar ciudades
    console.log('🏙️  Insertando ciudades con coordenadas...');
    const cityStmt = db.prepare('INSERT INTO cities (nombre, latitud, longitud, radio_km, region) VALUES (?, ?, ?, ?, ?)');
    let ciudadesInsertadas = 0;
    for (const ciudad of CIUDADES) {
      const coords = CIUDADES_COORDENADAS[ciudad.nombre];
      if (coords) {
        cityStmt.bind([ciudad.nombre, coords.lat, coords.lng, coords.radio, ciudad.region]);
        cityStmt.step();
        cityStmt.reset();
        ciudadesInsertadas++;
      } else {
        console.warn(`⚠️  No se encontraron coordenadas para: ${ciudad.nombre}`);
      }
    }
    cityStmt.free();
    console.log(`✅ ${ciudadesInsertadas} ciudades insertadas\n`);
    
    // Insertar campañas
    console.log('📋 Insertando campañas...');
    const campaignStmt = db.prepare('INSERT INTO campaigns (nombre, brand_id) VALUES (?, ?)');
    let campanasInsertadas = 0;
    for (const campana of CAMPANAS) {
      // Buscar el brand_id
      const brandQuery = db.prepare('SELECT id FROM brands WHERE nombre = ?');
      brandQuery.bind([campana.marca]);
      if (brandQuery.step()) {
        const brand_id = brandQuery.getAsObject().id;
        campaignStmt.bind([campana.nombre, brand_id]);
        campaignStmt.step();
        campaignStmt.reset();
        campanasInsertadas++;
      } else {
        console.warn(`⚠️  Marca no encontrada para campaña: ${campana.nombre} (${campana.marca})`);
      }
      brandQuery.free();
    }
    campaignStmt.free();
    console.log(`✅ ${campanasInsertadas} campañas insertadas\n`);
    
    // Guardar base de datos
    const data = db.export();
    const dbPath = path.join(__dirname, 'ooh_data.db');
    fs.writeFileSync(dbPath, Buffer.from(data));
    
    console.log('💾 Base de datos guardada en:', dbPath);
    console.log('   Tamaño:', fs.statSync(dbPath).size, 'bytes\n');
    
    // Resumen
    const countQueries = {
      regiones: 'SELECT COUNT(*) as total FROM regions',
      marcas: 'SELECT COUNT(*) as total FROM brands',
      campanas: 'SELECT COUNT(*) as total FROM campaigns',
      tipos: 'SELECT COUNT(*) as total FROM ooh_types',
      ciudades: 'SELECT COUNT(*) as total FROM cities'
    };
    
    console.log('📊 RESUMEN DE LA BASE DE DATOS:\n');
    for (const [key, query] of Object.entries(countQueries)) {
      const stmt = db.prepare(query);
      stmt.step();
      const total = stmt.getAsObject().total;
      stmt.free();
      console.log(`   ${key.charAt(0).toUpperCase() + key.slice(1)}: ${total}`);
    }
    
    console.log('\n✅ Base de datos creada exitosamente!');
    console.log('\n📝 Siguiente paso: migrar los registros del CSV con:');
    console.log('   node migrate-csv-direct.js\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

createDatabase();
