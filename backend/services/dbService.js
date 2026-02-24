const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { CIUDADES } = require('../utils/ciudadesCoordinates');
const { findDuplicate, normalizeCityName } = require('../utils/cityNormalizer');

const DB_FILE = process.env.DB_FILE_PATH || path.join(__dirname, '../ooh_data.db');

let db = null;
let SQL = null;

// Inicializar sql.js
const initDB = async () => {
  // Si ya está inicializado, reutilizar
  if (db) {
    // console.log('✅ Base de datos ya inicializada, reutilizando');
    return;
  }
  
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  // Cargar base existente o crear nueva
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    // console.log('✅ Base de datos cargada desde:', DB_FILE);
  } else {
    db = new SQL.Database();
    // console.log('🆕 Base de datos creada en memoria');
  }

  // Crear tablas normalizadas - ESQUEMA PRÁCTICO SEMI-NORMALIZADO
  const createTablesSQL = [
    // 1. Tabla de regiones
    `CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // 2. Tabla de categorías
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // 3. Tabla de anunciantes
    `CREATE TABLE IF NOT EXISTS advertisers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // 4. Tabla de marcas con FK a categories y advertisers
    `CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      category_id INTEGER,
      advertiser_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (advertiser_id) REFERENCES advertisers(id)
    )`,
    
    // 5. Tabla de campañas
    `CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      brand_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
      UNIQUE(nombre, brand_id)
    )`,
    
    // 6. Tabla de tipos de OOH
    `CREATE TABLE IF NOT EXISTS ooh_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // 7. Tabla de proveedores
    `CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // 8. Tabla de ciudades con FK a regions
    `CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      region_id INTEGER NOT NULL,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      radio_km REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    )`,
    
    // 9. Tabla de direcciones con FK a cities
    `CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER NOT NULL,
      descripcion TEXT,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
    )`,
    
    // 10. Tabla de registros OOH - NORMALIZADO (solo FKs, sin columnas redundantes)
    `CREATE TABLE IF NOT EXISTS ooh_records (
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
    )`,
    
    // 11. Tabla de estados OOH
    `CREATE TABLE IF NOT EXISTS ooh_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // 12. Tabla de imágenes con FK a ooh_records
    `CREATE TABLE IF NOT EXISTS images (
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
    )`
  ];
  
  try {
    for (const sql of createTablesSQL) {
      db.run(sql);
    }

    // Migración ligera: agregar columnas faltantes en ooh_records
    try {
      const info = db.exec('PRAGMA table_info(ooh_records)');
      const columns = info[0] ? info[0].values.map(row => row[1]) : [];

      const ensureColumn = (name, type) => {
        if (!columns.includes(name)) {
          db.run(`ALTER TABLE ooh_records ADD COLUMN ${name} ${type}`);
          // console.log(`✅ Columna ${name} agregada a ooh_records`);
        }
      };

      ensureColumn('checked', 'INTEGER DEFAULT 0');
      ensureColumn('review_required', 'INTEGER DEFAULT 0');
      ensureColumn('review_reason', 'TEXT');
      ensureColumn('synced_to_bigquery', 'DATETIME');
      ensureColumn('bq_sync_status', 'TEXT DEFAULT "pending"');
      ensureColumn('last_bigquery_sync', 'DATETIME');
      ensureColumn('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    } catch (migError) {
      // console.warn('⚠️ No se pudo verificar/agregar columnas en ooh_records:', migError.message);
    }

    // Migración ligera: agregar columnas faltantes en images
    try {
      const infoImg = db.exec('PRAGMA table_info(images)');
      const imgColumns = infoImg[0] ? infoImg[0].values.map(row => row[1]) : [];

      const ensureImageColumn = (name, type) => {
        if (!imgColumns.includes(name)) {
          db.run(`ALTER TABLE images ADD COLUMN ${name} ${type}`);
          // console.log(`✅ Columna ${name} agregada a images`);
        }
      };

      ensureImageColumn('role', "TEXT DEFAULT 'gallery'");
      ensureImageColumn('slot', 'INTEGER');
      ensureImageColumn('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

      // Backfill: marcar primeras 3 imágenes como principales si role está vacío
      db.run("UPDATE images SET role = 'primary', slot = orden WHERE (role IS NULL OR role = '') AND orden <= 3");
    } catch (migError) {
      // console.warn('⚠️ No se pudo verificar/agregar columnas en images:', migError.message);
    }
    
    // Cargar datos maestros completos
    await loadMasterData();
    
    saveDB();
    // console.log('✅ Tablas normalizadas creadas (12 tablas: regions, categories, advertisers, brands, campaigns, ooh_types, providers, cities, addresses, ooh_records, ooh_states, images)');
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.error('❌ Error creando tablas:', error);
      throw error;
    }
  }
};

// Cargar todos los datos maestros en la base de datos
const loadMasterData = async () => {
  if (!db) return;
  
  try {
    // Definición de datos maestros con estructura normalizada
    const REGIONES = [
      { nombre: 'CO Norte' },
      { nombre: 'CO Sur' },
      { nombre: 'CO Centro' },
      { nombre: 'CO Andes' }
    ];
    
    const CATEGORIAS = [
      { nombre: 'CERVEZAS' },
      { nombre: 'NABS' }
    ];
    
    const ANUNCIANTES = [
      { nombre: 'ABI' }
    ];
    
    const MARCAS = [
      { nombre: 'AGUILA', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'BBC', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'CBM', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'CFC', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'CLUB COLOMBIA', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'CORONA', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'MICHELOB', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'PILSEN', categoria: 'CERVEZAS', anunciante: 'ABI' },
      { nombre: 'PONY MALTA', categoria: 'NABS', anunciante: 'ABI' }
    ];
    
    const TIPOS_OOH = [
      { nombre: 'VALLA' },
      { nombre: 'VALLA DIGITAL' },
      { nombre: 'MUPPY' }
    ];
    
    const PROVEEDORES = [
      { nombre: 'APX' }
    ];
    
    // Campañas de prueba/maestro
    const CAMPANAS = [
      { nombre: '100 YEARS', marca: 'CLUB_COLOMBIA' },
      { nombre: 'AGUILA IMPERIAL', marca: 'AGUILA' },
      { nombre: 'AON 100 YEARS', marca: 'CLUB_COLOMBIA' },
      { nombre: 'TEST SUMMER 2026', marca: 'CORONA' },
      { nombre: 'VERANO 2026', marca: 'PILSEN' }
    ];

    // Convertir CIUDADES a formato para DB
    const CIUDADES_COORDS = {};
    Object.entries(CIUDADES).forEach(([key, value]) => {
      CIUDADES_COORDS[key] = {
        region: value.region,
        lat: value.latitud,
        lng: value.longitud,
        radio: value.radioKm
      };
    });
    
    // 1. Insertar regiones
    // console.log('🗺️  Insertando regiones...');
    const regionMap = {};
    const regionStmt = db.prepare('INSERT OR IGNORE INTO regions (nombre) VALUES (?)');
    for (const region of REGIONES) {
      regionStmt.bind([region.nombre]);
      regionStmt.step();
      regionStmt.reset();
    }
    regionStmt.free();
    
    // Recuperar IDs de regiones
    const selectRegiones = db.prepare('SELECT id, nombre FROM regions');
    while (selectRegiones.step()) {
      const row = selectRegiones.getAsObject();
      regionMap[row.nombre] = row.id;
    }
    selectRegiones.free();
    // console.log(`✅ ${Object.keys(regionMap).length} regiones insertadas`);
    
    // 2. Insertar categorías
    // console.log('📂 Insertando categorías...');
    const categoryMap = {};
    const categoryStmt = db.prepare('INSERT OR IGNORE INTO categories (nombre) VALUES (?)');
    for (const cat of CATEGORIAS) {
      categoryStmt.bind([cat.nombre]);
      categoryStmt.step();
      categoryStmt.reset();
    }
    categoryStmt.free();
    
    // Recuperar IDs de categorías
    const selectCategories = db.prepare('SELECT id, nombre FROM categories');
    while (selectCategories.step()) {
      const row = selectCategories.getAsObject();
      categoryMap[row.nombre] = row.id;
    }
    selectCategories.free();
    // console.log(`✅ ${Object.keys(categoryMap).length} categorías insertadas`);
    
    // 3. Insertar anunciantes
    // console.log('📺 Insertando anunciantes...');
    const advertiserMap = {};
    const advertiserStmt = db.prepare('INSERT OR IGNORE INTO advertisers (nombre) VALUES (?)');
    for (const adv of ANUNCIANTES) {
      advertiserStmt.bind([adv.nombre]);
      advertiserStmt.step();
      advertiserStmt.reset();
    }
    advertiserStmt.free();
    
    // Recuperar IDs de anunciantes
    const selectAdvertisers = db.prepare('SELECT id, nombre FROM advertisers');
    while (selectAdvertisers.step()) {
      const row = selectAdvertisers.getAsObject();
      advertiserMap[row.nombre] = row.id;
    }
    selectAdvertisers.free();
    // console.log(`✅ ${Object.keys(advertiserMap).length} anunciantes insertados`);
    
    // 4. Insertar marcas
    // console.log('🏷️  Insertando marcas...');
    const brandMap = {};
    const brandStmt = db.prepare('INSERT OR IGNORE INTO brands (nombre, category_id, advertiser_id) VALUES (?, ?, ?)');
    for (const marca of MARCAS) {
      const catId = categoryMap[marca.categoria] || 1;
      const advId = advertiserMap[marca.anunciante] || 1;
      brandStmt.bind([marca.nombre, catId, advId]);
      brandStmt.step();
      brandStmt.reset();
    }
    brandStmt.free();
    
    // Recuperar IDs de marcas
    const selectBrands = db.prepare('SELECT id, nombre FROM brands');
    while (selectBrands.step()) {
      const row = selectBrands.getAsObject();
      brandMap[row.nombre] = row.id;
    }
    selectBrands.free();
    // console.log(`✅ ${Object.keys(brandMap).length} marcas insertadas`);
    
    // 5. Insertar tipos OOH
    // console.log('📺 Insertando tipos OOH...');
    const oohTypeMap = {};
    const oohTypeStmt = db.prepare('INSERT OR IGNORE INTO ooh_types (nombre) VALUES (?)');
    for (const tipo of TIPOS_OOH) {
      oohTypeStmt.bind([tipo.nombre]);
      oohTypeStmt.step();
      oohTypeStmt.reset();
    }
    oohTypeStmt.free();
    
    // Recuperar IDs de tipos OOH
    const selectOohTypes = db.prepare('SELECT id, nombre FROM ooh_types');
    while (selectOohTypes.step()) {
      const row = selectOohTypes.getAsObject();
      oohTypeMap[row.nombre] = row.id;
    }
    selectOohTypes.free();
    // console.log(`✅ ${Object.keys(oohTypeMap).length} tipos OOH insertados`);
    
    // 6. Insertar proveedores
    // console.log('🏢 Insertando proveedores...');
    const providerMap = {};
    const providerStmt = db.prepare('INSERT OR IGNORE INTO providers (nombre) VALUES (?)');
    for (const prov of PROVEEDORES) {
      providerStmt.bind([prov.nombre]);
      providerStmt.step();
      providerStmt.reset();
    }
    providerStmt.free();
    
    // Recuperar IDs de proveedores
    const selectProviders = db.prepare('SELECT id, nombre FROM providers');
    while (selectProviders.step()) {
      const row = selectProviders.getAsObject();
      providerMap[row.nombre] = row.id;
    }
    selectProviders.free();
    // console.log(`✅ ${Object.keys(providerMap).length} proveedores insertados`);
    
    // 6b. Insertar campañas
    // console.log('📢 Insertando campañas...');
    // console.log(`   Total de campañas a insertar: ${CAMPANAS.length}`);
    const campaignMap = {};
    const campaignStmt = db.prepare('INSERT OR IGNORE INTO campaigns (nombre, brand_id) VALUES (?, ?)');
    for (const camp of CAMPANAS) {
      const brandId = brandMap[camp.marca];
      if (brandId) {
        campaignStmt.bind([camp.nombre, brandId]);
        campaignStmt.step();
        campaignStmt.reset();
      } else {
        // console.warn(`   ⚠️  Marca "${camp.marca}" no encontrada para campaña "${camp.nombre}"`);
      }
    }
    campaignStmt.free();
    
    // Recuperar IDs de campañas
    const selectCampaigns = db.prepare('SELECT id, nombre FROM campaigns');
    while (selectCampaigns.step()) {
      const row = selectCampaigns.getAsObject();
      campaignMap[row.nombre] = row.id;
    }
    selectCampaigns.free();
    // console.log(`✅ ${Object.keys(campaignMap).length} campañas insertadas`);
    
    // 7. Insertar ciudades
    // console.log('🏙️  Insertando ciudades...');
    const cityMap = {};
    const cityStmt = db.prepare('INSERT OR IGNORE INTO cities (nombre, region_id, latitud, longitud, radio_km) VALUES (?, ?, ?, ?, ?)');
    for (const [nombre, datos] of Object.entries(CIUDADES_COORDS)) {
      const regionId = regionMap[datos.region] || 1;
      cityStmt.bind([nombre, regionId, datos.lat, datos.lng, datos.radio]);
      cityStmt.step();
      cityStmt.reset();
    }
    cityStmt.free();
    
    // Recuperar IDs de ciudades
    const selectCities = db.prepare('SELECT id, nombre FROM cities');
    while (selectCities.step()) {
      const row = selectCities.getAsObject();
      cityMap[row.nombre] = row.id;
    }
    selectCities.free();
    // console.log(`✅ ${Object.keys(cityMap).length} ciudades insertadas`);
    
    // 8. Insertar estados OOH por defecto
    // console.log('📊 Insertando estados OOH...');
    const ESTADOS = [
      { nombre: 'ACTIVO', descripcion: 'Registro activo y vigente' },
      { nombre: 'INACTIVO', descripcion: 'Registro inactivo' },
      { nombre: 'PENDIENTE', descripcion: 'Pendiente de verificación' },
      { nombre: 'ARCHIVADO', descripcion: 'Registro archivado' }
    ];
    const stateStmt = db.prepare('INSERT OR IGNORE INTO ooh_states (nombre, descripcion) VALUES (?, ?)');
    for (const estado of ESTADOS) {
      stateStmt.bind([estado.nombre, estado.descripcion]);
      stateStmt.step();
      stateStmt.reset();
    }
    stateStmt.free();
    
    // Recuperar IDs de estados
    const selectStates = db.prepare('SELECT id, nombre FROM ooh_states');
    const stateMap = {};
    while (selectStates.step()) {
      const row = selectStates.getAsObject();
      stateMap[row.nombre] = row.id;
    }
    selectStates.free();
    // console.log(`✅ ${Object.keys(stateMap).length} estados insertados`);
    
    // console.log('✅ Todos los datos maestros cargados exitosamente');
    
  } catch (error) {
    console.error('❌ Error cargando datos maestros:', error.message);
    throw error;
  }
};

// Guardar cambios a disco
const saveDB = () => {
  if (!db) {
    // console.warn('⚠️  DB no inicializada, no se puede guardar');
    return;
  }
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
    // console.log(`💾 Base de datos guardada en: ${DB_FILE} (${buffer.length} bytes)`);
  } catch (error) {
    console.error('❌ Error guardando BD:', error);
  }
};

// Funciones auxiliares para manejo de entidades relacionales
const getOrCreateBrand = async (brandName, categoria) => {
  if (!db) await initDB();
  const normalized = String(brandName || '').trim().toUpperCase();
  
  let stmt = db.prepare('SELECT id FROM brands WHERE UPPER(nombre) = ?');
  stmt.bind([normalized]);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.id;
  }
  stmt.free();
  
  // Crear nueva marca
  stmt = db.prepare('INSERT INTO brands (nombre, categoria) VALUES (?, ?)');
  stmt.bind([normalized, String(categoria || '').trim().toUpperCase()]);
  stmt.step();
  stmt.free();
  
  // Obtener ID insertado
  stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const newId = stmt.getAsObject().id;
  stmt.free();
  
  // console.log(`✅ Marca creada: ${normalized} (ID: ${newId})`);
  return newId;
};

const getOrCreateCampaign = async (campaignName, brandId) => {
  if (!db) await initDB();
  const normalized = String(campaignName || '').trim().toUpperCase();
  
  let stmt = db.prepare('SELECT id FROM campaigns WHERE UPPER(nombre) = ? AND brand_id = ?');
  stmt.bind([normalized, brandId]);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.id;
  }
  stmt.free();
  
  // Crear nueva campaña
  stmt = db.prepare('INSERT INTO campaigns (nombre, brand_id) VALUES (?, ?)');
  stmt.bind([normalized, brandId]);
  stmt.step();
  stmt.free();
  
  stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const newId = stmt.getAsObject().id;
  stmt.free();
  
  // console.log(`✅ Campaña creada: ${normalized} para brand_id ${brandId} (ID: ${newId})`);
  return newId;
};

const getOrCreateOOHType = async (typeName) => {
  if (!db) await initDB();
  const normalized = String(typeName || '').trim().toUpperCase();
  
  let stmt = db.prepare('SELECT id FROM ooh_types WHERE UPPER(nombre) = ?');
  stmt.bind([normalized]);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.id;
  }
  stmt.free();
  
  // Crear nuevo tipo
  stmt = db.prepare('INSERT INTO ooh_types (nombre) VALUES (?)');
  stmt.bind([normalized]);
  stmt.step();
  stmt.free();
  
  stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const newId = stmt.getAsObject().id;
  stmt.free();
  
  // console.log(`✅ Tipo OOH creado: ${normalized} (ID: ${newId})`);
  return newId;
};

const getOrCreateProvider = async (providerName) => {
  if (!db) await initDB();
  const normalized = String(providerName || 'APX').trim().toUpperCase();
  
  let stmt = db.prepare('SELECT id FROM providers WHERE UPPER(nombre) = ?');
  stmt.bind([normalized]);
  
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result.id;
  }
  stmt.free();
  
  // Crear nuevo proveedor
  stmt = db.prepare('INSERT INTO providers (nombre) VALUES (?)');
  stmt.bind([normalized]);
  stmt.step();
  stmt.free();
  
  stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const newId = stmt.getAsObject().id;
  stmt.free();
  
  // console.log(`✅ Proveedor creado: ${normalized} (ID: ${newId})`);
  return newId;
};

// Agregar nuevo registro
const addRecord = async (data) => {
  if (!db) await initDB();

  const normalizeText = (v) => String(v || '').trim().toUpperCase();
  const buildImagePath = (imagePath) => {
    if (!imagePath) return '';
    
    // ✅ SI es una URL (GCS o HTTP), retornarla tal cual (nunca convertir URLs a rutas locales)
    if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      // console.log(`✅ URL de GCS detectada, guardando tal cual: ${imagePath.substring(0, 80)}...`);
      return imagePath;
    }
    
    // Si es una ruta absoluta válida, retornarla (para compatibilidad con local-images antiguo)
    if (path.isAbsolute(imagePath)) {
      const normalized = path.normalize(imagePath);
      if (fs.existsSync(normalized)) return normalized;
    }
    
    // Si es una URL de API, convertir a ruta local SOLO para compatibilidad backwards
    if (imagePath.startsWith('/api/images/')) {
      const relativePart = imagePath.replace(/^\/api\/images\//, '');
      const baseDir = path.join(__dirname, '../local-images');
      const candidate = path.join(baseDir, relativePart.replace(/\//g, '\\'));
      if (fs.existsSync(candidate)) return candidate;
    }
    
    // Si es una ruta relativa, buscar en local-images (compatibilidad backwards)
    const clean = String(imagePath).replace(/^\/api\/images\//, '');
    const baseDir = path.join(__dirname, '../local-images');
    const candidate = path.join(baseDir, clean);
    if (fs.existsSync(candidate)) return candidate;
    
    // Búsqueda recursiva por nombre de archivo (compatibilidad backwards)
    const filename = path.basename(clean);
    const stack = [baseDir];
    while (stack.length) {
      const current = stack.pop();
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          const p = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(p);
          else if (entry.isFile() && entry.name === filename) return p;
        }
      } catch (e) {}
    }
    
    return candidate;
  };

  const img1 = data.imagenes && data.imagenes.length > 0 ? buildImagePath(data.imagenes[0]) : '';
  const img2 = data.imagenes && data.imagenes.length > 1 ? buildImagePath(data.imagenes[1]) : '';
  const img3 = data.imagenes && data.imagenes.length > 2 ? buildImagePath(data.imagenes[2]) : '';

  // Obtener o crear IDs de entidades relacionales
  const brandId = await getOrCreateBrand(data.marca, data.categoria);
  const campaignId = await getOrCreateCampaign(data.campana, brandId);
  const oohTypeId = await getOrCreateOOHType(data.tipoOOH);
  const providerId = await getOrCreateProvider(data.proveedor || 'APX');
  
  // Obtener city_id desde el nombre de la ciudad
  let cityId = null;
  if (data.ciudad) {
    const city = getCityByName(data.ciudad);
    if (city) {
      cityId = city.id;
      // console.log(`✅ Ciudad encontrada en BD: ${data.ciudad} (ID: ${cityId})`);
    } else {
      console.error(`❌ Ciudad NO encontrada en BD: ${data.ciudad}`);
      // console.log(`📍 Ciudades disponibles en BD: ${getAllCities().map(c => c.nombre).join(', ')}`);
      throw new Error(`Ciudad "${data.ciudad}" no existe en la base de datos. Por favor, usa una ciudad válida.`);
    }
  } else {
    console.error('❌ No se especificó ciudad');
    throw new Error('Ciudad requerida para crear registro');
  }

  // Primero crear o buscar el address_id
  let addressId;
  const existingAddr = db.exec(`
    SELECT id FROM addresses 
    WHERE descripcion = ? AND city_id = ?
  `, [normalizeText(data.direccion), cityId]);
  
  if (existingAddr.length > 0 && existingAddr[0].values.length > 0) {
    addressId = existingAddr[0].values[0][0];
  } else {
    // Crear nueva dirección
    addressId = Date.now();
    const addrStmt = db.prepare(`
      INSERT INTO addresses (id, city_id, descripcion, latitud, longitud)
      VALUES (?, ?, ?, ?, ?)
    `);
    addrStmt.bind([
      addressId,
      cityId,
      normalizeText(data.direccion),
      parseFloat(data.latitud) || 0,
      parseFloat(data.longitud) || 0
    ]);
    addrStmt.step();
    addrStmt.free();
  }

  // Insertar ooh_record con solo FKs (sin columnas redundantes)
  const stmt = db.prepare(`
    INSERT INTO ooh_records 
    (id, brand_id, campaign_id, ooh_type_id, provider_id, address_id,
     checked, review_required, review_reason, fecha_inicio, fecha_final)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.bind([
    data.id,
    brandId,
    campaignId,
    oohTypeId,
    providerId,
    addressId,
    data.checked ? 1 : 0,
    data.review_required ? 1 : 0,
    data.review_reason || null,
    data.fechaInicio || '',
    data.fechaFin || ''
  ]);

  stmt.step();
  stmt.free();
  
  // Insertar imágenes en la tabla images
  const imagenes = Array.isArray(data.imagenes) && data.imagenes.length > 0
    ? data.imagenes
    : [img1, img2, img3].filter(img => img && img.trim() !== '');

  if (imagenes.length > 0) {
    const insertImg = db.prepare('INSERT INTO images (ooh_record_id, ruta, orden, role, slot) VALUES (?, ?, ?, ?, ?)');
    imagenes.forEach((imgPath, idx) => {
      if (imgPath) {
        const isPrimary = idx < 3;
        insertImg.bind([data.id, imgPath, idx + 1, isPrimary ? 'primary' : 'gallery', isPrimary ? idx + 1 : null]);
        insertImg.step();
        insertImg.reset();
      }
    });
    insertImg.free();
  }
  
  saveDB();
  // console.log('✅ Registro insertado:', data.id);
};

// Actualizar registro existente
const updateRecord = async (id, data) => {
  if (!db) await initDB();

  const normalizeText = (v) => String(v || '').trim().toUpperCase();
  const buildImagePath = (imagePath) => {
    if (!imagePath) return '';
    
    // ✅ SI es una URL (GCS o HTTP), retornarla tal cual (nunca convertir URLs a rutas locales)
    if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      // console.log(`✅ URL de GCS detectada, guardando tal cual: ${imagePath.substring(0, 80)}...`);
      return imagePath;
    }
    
    // Si es una ruta absoluta válida, retornarla (para compatibilidad con local-images antiguo)
    if (path.isAbsolute(imagePath)) {
      const normalized = path.normalize(imagePath);
      if (fs.existsSync(normalized)) return normalized;
    }
    
    // Si es una URL de API, convertir a ruta local SOLO para compatibilidad backwards
    if (imagePath.startsWith('/api/images/')) {
      const relativePart = imagePath.replace(/^\/api\/images\//, '');
      const baseDir = path.join(__dirname, '../local-images');
      const candidate = path.join(baseDir, relativePart.replace(/\//g, '\\'));
      if (fs.existsSync(candidate)) return candidate;
    }
    
    // Si es una ruta relativa, buscar en local-images (compatibilidad backwards)
    const clean = String(imagePath).replace(/^\/api\/images\//, '');
    const baseDir = path.join(__dirname, '../local-images');
    const candidate = path.join(baseDir, clean);
    if (fs.existsSync(candidate)) return candidate;
    
    // Búsqueda recursiva por nombre de archivo (compatibilidad backwards)
    const filename = path.basename(clean);
    const stack = [baseDir];
    while (stack.length) {
      const current = stack.pop();
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          const p = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(p);
          else if (entry.isFile() && entry.name === filename) return p;
        }
      } catch (e) {}
    }
    
    return candidate;
  };

  // Si no se proveen imágenes, recuperar las existentes
  let img1 = img2 = img3 = '';
  if (!data.imagenes || data.imagenes.length === 0) {
    const existing = getRecordById(id);
    if (existing) {
      img1 = existing.imagen_1 || '';
      img2 = existing.imagen_2 || '';
      img3 = existing.imagen_3 || '';
    }
  } else {
    img1 = data.imagenes.length > 0 ? buildImagePath(data.imagenes[0]) : '';
    img2 = data.imagenes.length > 1 ? buildImagePath(data.imagenes[1]) : '';
    img3 = data.imagenes.length > 2 ? buildImagePath(data.imagenes[2]) : '';
  }

  // Preservar fecha final si no se proporciona
  let fechaFinal = data.fechaFin || data.fechaFinal || '';
  if (!fechaFinal) {
    const existing = getRecordById(id);
    if (existing && existing.fecha_final) {
      fechaFinal = existing.fecha_final;
    }
  }

  // Obtener o crear IDs de entidades relacionales
  const brandId = await getOrCreateBrand(data.marca, data.categoria);
  const campaignId = await getOrCreateCampaign(data.campana, brandId);
  const oohTypeId = await getOrCreateOOHType(data.tipoOOH);
  const providerId = await getOrCreateProvider(data.proveedor || 'APX');
  
  // Obtener city_id desde el nombre de la ciudad
  let cityId = null;
  if (data.ciudad) {
    const city = getCityByName(data.ciudad);
    if (city) {
      cityId = city.id;
      // console.log(`✅ Ciudad encontrada en BD: ${data.ciudad} (ID: ${cityId})`);
    } else {
      console.error(`❌ Ciudad NO encontrada en BD: ${data.ciudad}`);
      // console.log(`📍 Ciudades disponibles en BD: ${getAllCities().map(c => c.nombre).join(', ')}`);
      throw new Error(`Ciudad "${data.ciudad}" no existe en la base de datos. Por favor, usa una ciudad válida.`);
    }
  } else {
    console.error('❌ No se especificó ciudad');
    throw new Error('Ciudad requerida para crear registro');
  }

  // Obtener o actualizar address
  const existing = getRecordById(id);
  let addressId = existing ? existing.address_id : null;
  
  if (addressId) {
    // Actualizar dirección existente
    const updateAddr = db.prepare(`
      UPDATE addresses SET
        city_id = ?, descripcion = ?, latitud = ?, longitud = ?
      WHERE id = ?
    `);
    updateAddr.bind([
      cityId,
      normalizeText(data.direccion),
      parseFloat(data.latitud) || 0,
      parseFloat(data.longitud) || 0,
      addressId
    ]);
    updateAddr.step();
    updateAddr.free();
  } else {
    // Crear nueva dirección
    const insertAddr = db.prepare(`
      INSERT INTO addresses (city_id, descripcion, latitud, longitud)
      VALUES (?, ?, ?, ?)
    `);
    insertAddr.bind([
      cityId,
      normalizeText(data.direccion),
      parseFloat(data.latitud) || 0,
      parseFloat(data.longitud) || 0
    ]);
    insertAddr.step();
    insertAddr.free();
    addressId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  }

  // Actualizar registro OOH (sin columnas redundantes)
  // IMPORTANTE: Marcar como pendiente de sincronización si hay cambios en imágenes
  const hasPendingChanges = data.imagenes && data.imagenes.length > 0;
  
  const stmt = db.prepare(`
    UPDATE ooh_records SET
      brand_id = ?, campaign_id = ?, ooh_type_id = ?, address_id = ?, provider_id = ?,
      checked = ?, fecha_inicio = ?, fecha_final = ?,
      bq_sync_status = ?, synced_to_bigquery = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.bind([
    brandId,
    campaignId,
    oohTypeId,
    addressId,
    providerId,
    typeof data.checked === 'undefined' ? (existing ? existing.checked : 0) : (data.checked ? 1 : 0),
    data.fechaInicio || '',
    fechaFinal,
    hasPendingChanges ? 'pending' : existing?.bq_sync_status || 'pending', // Marcar como pending si hay nuevas imágenes
    hasPendingChanges ? null : existing?.synced_to_bigquery, // Limpiar timestamp si hay cambios
    id
  ]);

  stmt.step();
  stmt.free();
  
  // Actualizar imágenes si se proveyeron nuevas
  if (data.imagenes && data.imagenes.length > 0) {
    // Eliminar imágenes antiguas
    const deleteImgs = db.prepare('DELETE FROM images WHERE ooh_record_id = ?');
    deleteImgs.bind([id]);
    deleteImgs.step();
    deleteImgs.free();
    
    // Insertar nuevas imágenes
    const insertImg = db.prepare('INSERT INTO images (ooh_record_id, ruta, orden, role, slot) VALUES (?, ?, ?, ?, ?)');
    data.imagenes.forEach((imgPath, idx) => {
      if (imgPath) {
        const isPrimary = idx < 3;
        insertImg.bind([id, buildImagePath(imgPath), idx + 1, isPrimary ? 'primary' : 'gallery', isPrimary ? idx + 1 : null]);
        insertImg.step();
        insertImg.reset();
      }
    });
    insertImg.free();
  }
  
  saveDB();
  // console.log('✅ Registro actualizado:', id);
};

// Obtener registro por ID
const getRecordById = (id) => {
  if (!db) return null;
  
  const stmt = db.prepare(`
    SELECT 
      r.*,
      addr.city_id as city_id,
      city.region_id as region_id,
      b.category_id as category_id,
      b.nombre as marca,
      c.nombre as campana,
      t.nombre as tipo_ooh,
      prov.nombre as proveedor,
      addr.descripcion as direccion,
      addr.latitud,
      addr.longitud,
      city.nombre as ciudad,
      region.nombre as ciudad_region,
      cat.nombre as categoria,
      adv.nombre as anunciante
    FROM ooh_records r
    LEFT JOIN brands b ON r.brand_id = b.id
    LEFT JOIN campaigns c ON r.campaign_id = c.id
    LEFT JOIN ooh_types t ON r.ooh_type_id = t.id
    LEFT JOIN providers prov ON r.provider_id = prov.id
    LEFT JOIN addresses addr ON r.address_id = addr.id
    LEFT JOIN cities city ON addr.city_id = city.id
    LEFT JOIN regions region ON city.region_id = region.id
    LEFT JOIN categories cat ON b.category_id = cat.id
    LEFT JOIN advertisers adv ON b.advertiser_id = adv.id
    WHERE r.id = ?
  `);
  stmt.bind([id]);
  
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
    
    // Obtener imágenes
    const imgStmt = db.prepare('SELECT ruta, orden FROM images WHERE ooh_record_id = ? ORDER BY orden');
    imgStmt.bind([id]);
    
    const images = [];
    while (imgStmt.step()) {
      const img = imgStmt.getAsObject();
      images.push(img.ruta);
    }
    imgStmt.free();
    
    // Agregar imágenes al resultado
    result.imagen_1 = images[0] || null;
    result.imagen_2 = images[1] || null;
    result.imagen_3 = images[2] || null;
    result.images = images;
  }
  stmt.free();
  
  return result;
};

// Obtener todas las imágenes de un registro
const getRecordImages = (recordId) => {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT id, ruta, orden, role, slot, created_at
    FROM images
    WHERE ooh_record_id = ?
    ORDER BY orden
  `);
  stmt.bind([recordId]);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Agregar múltiples imágenes a un registro (role=gallery por defecto)
const addRecordImages = (recordId, imageUrls = []) => {
  if (!db || !recordId || imageUrls.length === 0) return [];

  // Obtener el máximo orden actual
  const maxStmt = db.prepare('SELECT COALESCE(MAX(orden), 0) as maxOrden FROM images WHERE ooh_record_id = ?');
  maxStmt.bind([recordId]);
  maxStmt.step();
  let maxOrden = maxStmt.getAsObject().maxOrden || 0;
  maxStmt.free();

  // Generar órdenes aleatorios para las imágenes de galería
  const insertImg = db.prepare('INSERT INTO images (ooh_record_id, ruta, orden, role, slot) VALUES (?, ?, ?, ?, ?)');
  imageUrls.forEach((url, idx) => {
    // Orden aleatorio entre 100 y 999 para distinguirlas de las primary (1-3)
    const randomOrden = Math.floor(Math.random() * 900) + 100 + maxOrden;
    console.log(`📋 [DB] Asignando orden aleatorio ${randomOrden} a imagen de galería`);
    insertImg.bind([recordId, url, randomOrden, 'gallery', null]);
    insertImg.step();
    insertImg.reset();
    maxOrden = randomOrden; // Actualizar para evitar duplicados
  });
  insertImg.free();
  saveDB();
  return getRecordImages(recordId);
};

// Agregar imágenes con slots (posiciones) predefinidos
const addRecordImagesWithSlots = (recordId, imageUrls = [], slots = []) => {
  if (!db || !recordId || imageUrls.length === 0) return [];
  if (slots.length !== imageUrls.length) {
    console.error('❌ [addRecordImagesWithSlots] Número de slots no coincide con número de URLs');
    return [];
  }

  console.log('📝 [addRecordImagesWithSlots] Agregando imágenes con slots:', { recordId, count: imageUrls.length });

  const maxStmt = db.prepare('SELECT COALESCE(MAX(orden), 0) as maxOrden FROM images WHERE ooh_record_id = ?');
  maxStmt.bind([recordId]);
  maxStmt.step();
  const maxOrden = maxStmt.getAsObject().maxOrden || 0;
  maxStmt.free();

  const insertImg = db.prepare('INSERT INTO images (ooh_record_id, ruta, orden, role, slot) VALUES (?, ?, ?, ?, ?)');
  imageUrls.forEach((url, idx) => {
    const orden = maxOrden + idx + 1;
    const slot = parseInt(slots[idx]);
    console.log(`  ✅ Imagen ${idx + 1}: slot=${slot}, orden=${orden}`);
    insertImg.bind([recordId, url, orden, 'primary', slot]);
    insertImg.step();
    insertImg.reset();
  });
  insertImg.free();

  saveDB();
  console.log('✅ [addRecordImagesWithSlots] Imágenes agregadas y sincronizadas');
  return getRecordImages(recordId);
};

// Actualizar roles/slots de imágenes y sincronizar imagen_1..3
const setRecordImageRoles = (recordId, selections = []) => {
  if (!db || !recordId) return;

  // Limpiar roles actuales
  const resetStmt = db.prepare(`
    UPDATE images
    SET role = 'gallery', slot = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE ooh_record_id = ?
  `);
  resetStmt.bind([recordId]);
  resetStmt.step();
  resetStmt.free();

  // Asignar nuevos roles
  const updateStmt = db.prepare(`
    UPDATE images
    SET role = 'primary', slot = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND ooh_record_id = ?
  `);

  selections.forEach(({ id, slot }) => {
    updateStmt.bind([slot, id, recordId]);
    updateStmt.step();
    updateStmt.reset();
  });
  updateStmt.free();

  saveDB();
};

// Obtener todos los registros con filtros opcionales (con JOINs)
const getAllRecords = (filters = {}) => {
  if (!db) return [];

  let query = `
    SELECT 
      r.id,
      r.fecha_inicio,
      r.fecha_final,
      r.checked,
      r.review_required,
      r.review_reason,
      r.estado_id,
      r.brand_id,
      r.campaign_id,
      r.ooh_type_id,
      r.provider_id,
      addr.city_id as city_id,
      b.category_id as category_id,
      city.region_id as region_id,
      r.created_at,
      r.updated_at,
      b.nombre as marca, 
      c.nombre as campana, 
      t.nombre as tipo_ooh,
      city.nombre as ciudad,
      region.nombre as ciudad_region,
      prov.nombre as proveedor,
      addr.descripcion as direccion,
      addr.latitud,
      addr.longitud,
      adv.nombre as anunciante,
      cat.nombre as categoria,
      est.nombre as estado,
      est.descripcion as estado_descripcion
    FROM ooh_records r
    LEFT JOIN brands b ON r.brand_id = b.id
    LEFT JOIN campaigns c ON r.campaign_id = c.id
    LEFT JOIN ooh_types t ON r.ooh_type_id = t.id
    LEFT JOIN providers prov ON r.provider_id = prov.id
    LEFT JOIN addresses addr ON r.address_id = addr.id
    LEFT JOIN cities city ON addr.city_id = city.id
    LEFT JOIN regions region ON city.region_id = region.id
    LEFT JOIN categories cat ON b.category_id = cat.id
    LEFT JOIN advertisers adv ON b.advertiser_id = adv.id
    LEFT JOIN ooh_states est ON r.estado_id = est.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.marca) {
    query += ' AND UPPER(b.nombre) = ?';
    params.push(String(filters.marca).toUpperCase());
  }

  if (filters.tipoOOH) {
    query += ' AND UPPER(t.nombre) = ?';
    params.push(String(filters.tipoOOH).toUpperCase());
  }

  if (filters.campana) {
    query += ' AND UPPER(c.nombre) = ?';
    params.push(String(filters.campana).toUpperCase());
  }

  if (filters.ciudad) {
    query += ' AND UPPER(city.nombre) = ?';
    params.push(String(filters.ciudad).toUpperCase());
  }

  if (filters.mes) {
    // Filtrar por mes (yyyy-MM) si inicio o fin cae en el mes
    // sql.js doesn't support strftime, so we use SUBSTR for ISO format dates (YYYY-MM-DD)
    const mes = String(filters.mes).trim();
    query += " AND (SUBSTR(r.fecha_inicio, 1, 7) = ? OR SUBSTR(IFNULL(r.fecha_final, r.fecha_inicio), 1, 7) = ?)";
    params.push(mes, mes);
  }

  if (filters.ano && !filters.mes) {
    // Filtrar por año (yyyy) si inicio o fin cae en el año
    // sql.js doesn't support strftime, so we use SUBSTR for ISO format dates (YYYY-MM-DD)
    const year = String(filters.ano).trim();
    query += " AND (SUBSTR(r.fecha_inicio, 1, 4) = ? OR SUBSTR(IFNULL(r.fecha_final, r.fecha_inicio), 1, 4) = ?)";
    params.push(year, year);
  }

  query += ` ORDER BY 
    CASE 
      WHEN DATE('now') BETWEEN DATE(r.fecha_inicio) AND DATE(r.fecha_final) THEN 0
      ELSE 1
    END,
    DATE(r.fecha_inicio) DESC,
    r.created_at DESC`;

  const stmt = db.prepare(query);
  stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    const record = stmt.getAsObject();
    
    // Obtener imágenes asociadas al registro
    const imgStmt = db.prepare('SELECT ruta, orden FROM images WHERE ooh_record_id = ? ORDER BY orden');
    imgStmt.bind([record.id]);
    
    const images = [];
    while (imgStmt.step()) {
      const img = imgStmt.getAsObject();
      images.push(img.ruta);
    }
    imgStmt.free();
    
    // Agregar imágenes al registro (compatibilidad con frontend que espera imagen_1, imagen_2, imagen_3)
    record.imagen_1 = images[0] || null;
    record.imagen_2 = images[1] || null;
    record.imagen_3 = images[2] || null;
    record.images = images; // Array completo de imágenes
    
    results.push(record);
  }
  stmt.free();

  return results;
};

// Obtener todas las marcas
const getAllBrands = () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM brands ORDER BY nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Obtener campañas de una marca
const getCampaignsByBrand = (brandId) => {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM campaigns WHERE brand_id = ? ORDER BY nombre');
  stmt.bind([brandId]);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Obtener todas las campañas
const getAllCampaigns = () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM campaigns ORDER BY nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Obtener todos los tipos de OOH
const getAllOOHTypes = () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM ooh_types ORDER BY nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Agregar marca
const addBrand = async (nombre, categoria) => {
  if (!db) await initDB();
  return await getOrCreateBrand(nombre, categoria);
};

// Agregar campaña
const addCampaign = async (nombre, brandId) => {
  if (!db) await initDB();
  return await getOrCreateCampaign(nombre, brandId);
};

// Agregar tipo de OOH
const addOOHType = async (nombre) => {
  if (!db) await initDB();
  return await getOrCreateOOHType(nombre);
};

// Agregar proveedor
const addProvider = async (nombre) => {
  if (!db) await initDB();
  return await getOrCreateProvider(nombre);
};

// Buscar registros existentes por dirección, fecha, marca, campaña
const findExisting = async (direccion, fechaInicio, marca, campana) => {
  if (!db) await initDB();

  // Query con JOIN a addresses para obtener direccion
  const stmt = db.prepare(`
    SELECT r.*, b.nombre as brand_name, c.nombre as campaign_name, t.nombre as ooh_type_name, addr.descripcion as direccion
    FROM ooh_records r
    LEFT JOIN brands b ON r.brand_id = b.id
    LEFT JOIN campaigns c ON r.campaign_id = c.id
    LEFT JOIN ooh_types t ON r.ooh_type_id = t.id
    LEFT JOIN addresses addr ON r.address_id = addr.id
    WHERE UPPER(addr.descripcion) = ? 
      AND r.fecha_inicio = ? 
      AND UPPER(addr.descripcion) LIKE ?
    LIMIT 1
  `);

  stmt.bind([
    String(direccion).toUpperCase(),
    fechaInicio,
    `%${String(marca).toUpperCase()}%`
  ]);

  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();

  return result;
};

// Buscar registros por patrón
const findExistingById = async (id) => {
  if (!db) await initDB();
  return getRecordById(id);
};

// Eliminar registro
const deleteRecord = (id) => {
  if (!db) return false;

  const stmt = db.prepare('DELETE FROM ooh_records WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  stmt.free();
  saveDB();
  // console.log('✅ Registro eliminado:', id);
  return true;
};

// Eliminar registro OOH completo (con imágenes)
const deleteOOHRecord = (id) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    // console.log(`🗑️  Eliminando registro completo: ${id}`);

    // 1. Obtener las rutas de imágenes
    const imgStmt = db.prepare('SELECT ruta FROM images WHERE ooh_record_id = ?');
    imgStmt.bind([id]);
    
    const imagePaths = [];
    while (imgStmt.step()) {
      const img = imgStmt.getAsObject();
      imagePaths.push(img.ruta);
    }
    imgStmt.free();

    // console.log(`   Imágenes a eliminar: ${imagePaths.length}`);

    // 2. Eliminar archivos del disco
    const fs = require('fs');
    let deletedFiles = 0;
    imagePaths.forEach(imagePath => {
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          // console.log(`   ✓ Archivo eliminado: ${imagePath}`);
          deletedFiles++;
        }
      } catch (err) {
        // console.warn(`   ⚠️  No se pudo eliminar: ${imagePath}`, err.message);
      }
    });

    // 3. Eliminar imágenes de la BD
    const deleteImgsStmt = db.prepare('DELETE FROM images WHERE ooh_record_id = ?');
    deleteImgsStmt.bind([id]);
    deleteImgsStmt.step();
    deleteImgsStmt.free();

    // console.log(`   Imágenes eliminadas de BD: ${imagePaths.length}`);

    // 4. Eliminar registro de la BD
    const deleteRecStmt = db.prepare('DELETE FROM ooh_records WHERE id = ?');
    deleteRecStmt.bind([id]);
    deleteRecStmt.step();
    deleteRecStmt.free();

    // 5. Guardar BD
    saveDB();

    // console.log(`✅ Registro ${id} eliminado correctamente`);
    
    return { 
      success: true, 
      message: 'Registro eliminado correctamente',
      deletedId: id,
      filesDeleted: deletedFiles,
      imagesDeleted: imagePaths.length
    };

  } catch (error) {
    console.error('❌ Error eliminando registro:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Obtener todas las ciudades desde la BD
const getAllCities = () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT c.id, c.nombre, c.latitud, c.longitud, c.radio_km, r.nombre as region, c.region_id FROM cities c LEFT JOIN regions r ON c.region_id = r.id ORDER BY r.nombre, c.nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Obtener todas las regiones
const getAllRegions = () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT id, nombre FROM regions ORDER BY nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Obtener ciudades por región
const getCitiesByRegion = (region) => {
  if (!db) return [];
  const stmt = db.prepare('SELECT c.id, c.nombre, c.latitud, c.longitud, c.radio_km, r.nombre as region FROM cities c LEFT JOIN regions r ON c.region_id = r.id WHERE r.nombre = ? ORDER BY c.nombre');
  stmt.bind([region]);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Obtener ciudad por nombre
const getCityByName = (nombre) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM cities WHERE UPPER(nombre) = ?');
  stmt.bind([String(nombre).toUpperCase()]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

// Contar registros
const countRecords = () => {
  if (!db) return 0;

  const stmt = db.prepare('SELECT COUNT(*) as count FROM ooh_records');
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();

  return result.count || 0;
};

/**
 * Valida si una ciudad ya existe considerando variaciones de nombres
 * @param {string} cityName - Nombre de la ciudad a validar
 * @returns {Object} {isValid: boolean, duplicate: Object|null, message: string}
 */
const validateCityName = (cityName) => {
  if (!cityName || typeof cityName !== 'string') {
    return {
      isValid: false,
      duplicate: null,
      message: '❌ Nombre de ciudad inválido o vacío'
    };
  }

  const allCities = getAllCities();
  const validation = findDuplicate(allCities, cityName);

  return {
    isValid: !validation.found,
    duplicate: validation.duplicate,
    message: validation.message,
    normalized: normalizeCityName(cityName)
  };
};

/**
 * Obtiene todas las variaciones de un nombre de ciudad para debugging
 * @param {string} cityName - Nombre de la ciudad
 * @returns {Object} Objeto con las diferentes variaciones
 */
const getCityNameVariations = (cityName) => {
  return {
    original: cityName,
    normalized: normalizeCityName(cityName),
    uppercase: cityName.toUpperCase(),
    trimmed: cityName.trim(),
    message: '📋 Variaciones del nombre: original, normalized (comparación), uppercase, trimmed'
  };
};

// Crear nueva ciudad en BD
const addCity = (nombre, region, latitud = null, longitud = null, radio = null) => {
  if (!db) return null;
  
  // Obtener el ID de la región
  const regionStmt = db.prepare('SELECT id FROM regions WHERE UPPER(nombre) = ?');
  regionStmt.bind([region.toUpperCase()]);
  let regionId = null;
  if (regionStmt.step()) {
    const regionResult = regionStmt.getAsObject();
    regionId = regionResult.id;
  }
  regionStmt.free();
  
  if (!regionId) {
    throw new Error(`Región "${region}" no encontrada en la base de datos`);
  }
  
  // Usar valores por defecto si no se proporcionan coordenadas
  const LAT = latitud !== null && latitud !== undefined ? parseFloat(latitud) : 0;
  const LON = longitud !== null && longitud !== undefined ? parseFloat(longitud) : 0;
  const RADIO = radio !== null && radio !== undefined ? parseFloat(radio) : 5;
  
  // Insertar la ciudad
  const stmt = db.prepare(`
    INSERT INTO cities (nombre, region_id, latitud, longitud, radio_km)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.bind([nombre.toUpperCase(), regionId, LAT, LON, RADIO]);
  stmt.step();
  stmt.free();
  
  saveDB();
  
  // Retornar la ciudad creada
  return getCityByName(nombre);
};

const updateCity = (id, nombre, region, latitud, longitud, radio) => {
  if (!db) return null;
  
  // Obtener el ID de la región
  const regionStmt = db.prepare('SELECT id FROM regions WHERE UPPER(nombre) = ?');
  regionStmt.bind([region.toUpperCase()]);
  let regionId = null;
  if (regionStmt.step()) {
    const regionResult = regionStmt.getAsObject();
    regionId = regionResult.id;
  }
  regionStmt.free();
  
  if (!regionId) {
    throw new Error(`Región "${region}" no encontrada en la base de datos`);
  }
  
  // Validar valores de coordenadas
  const LAT = parseFloat(latitud);
  const LON = parseFloat(longitud);
  const RADIO = parseFloat(radio);
  
  // Actualizar la ciudad
  const stmt = db.prepare(`
    UPDATE cities 
    SET nombre = ?, region_id = ?, latitud = ?, longitud = ?, radio_km = ?
    WHERE id = ?
  `);
  stmt.bind([nombre.toUpperCase(), regionId, LAT, LON, RADIO, id]);
  stmt.step();
  stmt.free();
  
  saveDB();
  
  // Retornar la ciudad actualizada
  return getCityById(id);
};

// Obtener marca por nombre (para mapeo frontend)
const getBrandByName = (nombre) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM brands WHERE UPPER(nombre) = ?');
  stmt.bind([String(nombre).toUpperCase()]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

// Obtener tipo OOH por nombre (para mapeo frontend)
const getOOHTypeByName = (nombre) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM ooh_types WHERE UPPER(nombre) = ?');
  stmt.bind([String(nombre).toUpperCase()]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

// Obtener todos los proveedores
const getAllProviders = () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM providers ORDER BY nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

// Obtener proveedor por nombre (para mapeo frontend)
const getProviderByName = (nombre) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM providers WHERE UPPER(nombre) = ?');
  stmt.bind([String(nombre).toUpperCase()]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

// Obtener campaña por nombre (para mapeo frontend)
const getCampaignByName = (nombre) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM campaigns WHERE UPPER(nombre) = ?');
  stmt.bind([String(nombre).toUpperCase()]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

// ============================================
// MÉTODOS *ById (para el controller)
// ============================================

const getBrandById = (id) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM brands WHERE id = ?');
  stmt.bind([id]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const getCampaignById = (id) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  stmt.bind([id]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const getOOHTypeById = (id) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM ooh_types WHERE id = ?');
  stmt.bind([id]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const getProviderById = (id) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM providers WHERE id = ?');
  stmt.bind([id]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const getCityById = (id) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM cities WHERE id = ?');
  stmt.bind([id]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

// ============================================
// 📊 ESTADOS OOH - Funciones de estados
// ============================================

const getAllOOHStates = () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM ooh_states ORDER BY nombre');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

const getOOHStateById = (stateId) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM ooh_states WHERE id = ?');
  stmt.bind([stateId]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const getOOHStateByName = (nombre) => {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM ooh_states WHERE nombre = ?');
  stmt.bind([nombre.toUpperCase()]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const addOOHState = async (nombre, descripcion = '') => {
  if (!db) await initDB();
  
  // Buscar si ya existe
  const existing = getOOHStateByName(nombre);
  if (existing) {
    return existing.id;
  }
  
  // Crear nuevo estado
  try {
    const insertSQL = `INSERT INTO ooh_states (nombre, descripcion) VALUES (?, ?)`;
    db.run(insertSQL, [nombre.toUpperCase(), descripcion]);
    
    // Obtener el ID del último insertado
    const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
    lastIdStmt.step();
    const newId = lastIdStmt.getAsObject().id;
    lastIdStmt.free();
    
    await saveDB();
    // console.log(`✅ Estado OOH creado: "${nombre}" con ID: ${newId}`);
    return newId;
  } catch (error) {
    console.error(`❌ Error creando estado OOH "${nombre}":`, error);
    throw error;
  }
};


// ==================== FUNCIONES DE GEOCODIFICACIÓN ====================

// Cache en memoria para coordenadas ya buscadas
const geocodeCache = {};

// Función para obtener coordenadas automáticamente por nombre de ciudad
const getCoordinates = async (cityName, region = null) => {
  try {
    const cacheKey = `${cityName}_${region || 'defaultRegion'}`.toUpperCase();
    
    // Verificar si ya está en caché
    if (geocodeCache[cacheKey]) {
      return geocodeCache[cacheKey];
    }

    // Importar node-geocoder
    const NodeGeocoder = require('node-geocoder');
    
    // Configurar geocoder con OpenStreetMap (Nominatim) - gratuito, sin API key
    const options = {
      provider: 'openstreetmap',
      timeout: 5000,
      retryOnTimeout: true,
      minWaitingTime: 1000
    };
    
    const geocoder = NodeGeocoder(options);
    
    // Compilar búsqueda con nombre de ciudad y región
    let searchQuery = cityName;
    if (region && !region.includes('CO')) {
      searchQuery += ', ' + region;
    } else if (region) {
      searchQuery += ', Colombia';  // Si es región de Colombia
    } else {
      searchQuery += ', Colombia';  // Default a Colombia
    }

    // Buscar coordenadas
    const results = await geocoder.geocode(searchQuery);
    
    if (results && results.length > 0) {
      const result = results[0];  // Tomar el primer resultado
      const coordinates = {
        latitude: parseFloat(result.latitude.toFixed(4)),
        longitude: parseFloat(result.longitude.toFixed(4)),
        source: 'nominatim',
        confidence: 'high'
      };
      
      // Cachear resultado
      geocodeCache[cacheKey] = coordinates;
      
      return coordinates;
    }
    
    return null;
    
  } catch (error) {
    console.error(`⚠️ [GEOCODE] Error buscando coordenadas para "${cityName}":`, error.message);
    return null;
  }
};

// Limpiar caché de geocodificación (útil para testing)
const clearGeocodeCache = () => {
  Object.keys(geocodeCache).forEach(key => delete geocodeCache[key]);
};

module.exports = {
  initDB,
  addRecord,
  updateRecord,
  getRecordById,
  getAllRecords,
  findExisting,
  findExistingById,
  deleteRecord,
  deleteOOHRecord,
  countRecords,
  saveDB,
  // Funciones relacionales
  getAllBrands,
  getBrandByName,
  getBrandById,
  getAllCampaigns,
  getCampaignByName,
  getCampaignById,
  getCampaignsByBrand,
  getAllOOHTypes,
  getOOHTypeByName,
  getOOHTypeById,
  addBrand,
  addCampaign,
  addOOHType,
  addProvider,
  getOrCreateBrand,
  getOrCreateCampaign,
  getOrCreateOOHType,
  getOrCreateProvider,
  // Funciones de proveedores
  getAllProviders,
  getProviderByName,
  getProviderById,
  // Funciones de ciudades
  getAllCities,
  getAllRegions,
  getCitiesByRegion,
  getCityByName,
  getCityById,
  validateCityName,
  getCityNameVariations,
  addCity,
  updateCity,
  // Funciones de estados OOH
  getAllOOHStates,
  getOOHStateById,
  getOOHStateByName,
  addOOHState,
  // Funciones de imágenes
  getRecordImages,
  addRecordImages,
  addRecordImagesWithSlots,
  setRecordImageRoles,
  // Funciones de geocodificación
  getCoordinates,
  clearGeocodeCache,
  // Función para obtener la instancia de DB
  getDatabase: () => db
};
