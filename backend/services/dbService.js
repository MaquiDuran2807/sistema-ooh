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
    console.log('✅ Base de datos ya inicializada, reutilizando');
    return;
  }
  
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  // Cargar base existente o crear nueva
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    console.log('✅ Base de datos cargada desde:', DB_FILE);
  } else {
    db = new SQL.Database();
    console.log('🆕 Base de datos creada en memoria');
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
    
    // 10. Tabla de registros OOH - SEMI-NORMALIZADO (tiene FK pero también columnas desnormalizadas para compatibilidad)
    `CREATE TABLE IF NOT EXISTS ooh_records (
      id TEXT PRIMARY KEY,
      brand_id INTEGER,
      campaign_id INTEGER,
      ooh_type_id INTEGER,
      provider_id INTEGER,
      address_id INTEGER,
      city_id INTEGER,
      direccion TEXT NOT NULL,
      latitud REAL,
      longitud REAL,
      fecha_inicio TEXT,
      fecha_final TEXT,
      imagen_1 TEXT,
      imagen_2 TEXT,
      imagen_3 TEXT,
      region TEXT,
      anunciante TEXT DEFAULT 'ABI',
      categoria TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (ooh_type_id) REFERENCES ooh_types(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id),
      FOREIGN KEY (address_id) REFERENCES addresses(id),
      FOREIGN KEY (city_id) REFERENCES cities(id)
    )`,
    
    // 11. Tabla de imágenes con FK a ooh_records
    `CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ooh_record_id TEXT NOT NULL,
      ruta TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ooh_record_id) REFERENCES ooh_records(id) ON DELETE CASCADE,
      UNIQUE(ooh_record_id, orden)
    )`
  ];
  
  try {
    for (const sql of createTablesSQL) {
      db.run(sql);
    }
    
    // Cargar datos maestros completos
    await loadMasterData();
    
    saveDB();
    console.log('✅ Tablas normalizadas creadas (11 tablas: regions, categories, advertisers, brands, campaigns, ooh_types, providers, cities, addresses, ooh_records, images)');
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
    console.log('🗺️  Insertando regiones...');
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
    console.log(`✅ ${Object.keys(regionMap).length} regiones insertadas`);
    
    // 2. Insertar categorías
    console.log('📂 Insertando categorías...');
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
    console.log(`✅ ${Object.keys(categoryMap).length} categorías insertadas`);
    
    // 3. Insertar anunciantes
    console.log('📺 Insertando anunciantes...');
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
    console.log(`✅ ${Object.keys(advertiserMap).length} anunciantes insertados`);
    
    // 4. Insertar marcas
    console.log('🏷️  Insertando marcas...');
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
    console.log(`✅ ${Object.keys(brandMap).length} marcas insertadas`);
    
    // 5. Insertar tipos OOH
    console.log('📺 Insertando tipos OOH...');
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
    console.log(`✅ ${Object.keys(oohTypeMap).length} tipos OOH insertados`);
    
    // 6. Insertar proveedores
    console.log('🏢 Insertando proveedores...');
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
    console.log(`✅ ${Object.keys(providerMap).length} proveedores insertados`);
    
    // 6b. Insertar campañas
    console.log('📢 Insertando campañas...');
    console.log(`   Total de campañas a insertar: ${CAMPANAS.length}`);
    const campaignMap = {};
    const campaignStmt = db.prepare('INSERT OR IGNORE INTO campaigns (nombre, brand_id) VALUES (?, ?)');
    for (const camp of CAMPANAS) {
      const brandId = brandMap[camp.marca];
      if (brandId) {
        campaignStmt.bind([camp.nombre, brandId]);
        campaignStmt.step();
        campaignStmt.reset();
      } else {
        console.warn(`   ⚠️  Marca "${camp.marca}" no encontrada para campaña "${camp.nombre}"`);
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
    console.log(`✅ ${Object.keys(campaignMap).length} campañas insertadas`);
    
    // 7. Insertar ciudades
    console.log('🏙️  Insertando ciudades...');
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
    console.log(`✅ ${Object.keys(cityMap).length} ciudades insertadas`);
    
    console.log('✅ Todos los datos maestros cargados exitosamente');
    
  } catch (error) {
    console.error('❌ Error cargando datos maestros:', error.message);
    throw error;
  }
};

// Guardar cambios a disco
const saveDB = () => {
  if (!db) {
    console.warn('⚠️  DB no inicializada, no se puede guardar');
    return;
  }
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
    console.log(`💾 Base de datos guardada en: ${DB_FILE} (${buffer.length} bytes)`);
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
  
  console.log(`✅ Marca creada: ${normalized} (ID: ${newId})`);
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
  
  console.log(`✅ Campaña creada: ${normalized} para brand_id ${brandId} (ID: ${newId})`);
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
  
  console.log(`✅ Tipo OOH creado: ${normalized} (ID: ${newId})`);
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
  
  console.log(`✅ Proveedor creado: ${normalized} (ID: ${newId})`);
  return newId;
};

// Agregar nuevo registro
const addRecord = async (data) => {
  if (!db) await initDB();

  const normalizeText = (v) => String(v || '').trim().toUpperCase();
  const buildImagePath = (imagePath) => {
    if (!imagePath) return '';
    
    // Si ya es una ruta absoluta válida, retornarla
    if (path.isAbsolute(imagePath)) {
      const normalized = path.normalize(imagePath);
      if (fs.existsSync(normalized)) return normalized;
    }
    
    // Si es una URL de API, convertir a ruta local
    if (imagePath.startsWith('/api/images/')) {
      const relativePart = imagePath.replace(/^\/api\/images\//, '');
      const baseDir = path.join(__dirname, '../local-images');
      const candidate = path.join(baseDir, relativePart.replace(/\//g, '\\'));
      if (fs.existsSync(candidate)) return candidate;
    }
    
    // Si es una ruta relativa, buscar en local-images
    const clean = String(imagePath).replace(/^\/api\/images\//, '');
    const baseDir = path.join(__dirname, '../local-images');
    const candidate = path.join(baseDir, clean);
    if (fs.existsSync(candidate)) return candidate;
    
    // Búsqueda recursiva por nombre de archivo
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
      console.log(`✅ Ciudad encontrada en BD: ${data.ciudad} (ID: ${cityId})`);
    } else {
      console.error(`❌ Ciudad NO encontrada en BD: ${data.ciudad}`);
      console.log(`📍 Ciudades disponibles en BD: ${getAllCities().map(c => c.nombre).join(', ')}`);
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

  // Insertar ooh_record con solo FKs
  const stmt = db.prepare(`
    INSERT INTO ooh_records 
    (id, brand_id, campaign_id, ooh_type_id, provider_id, address_id,
     fecha_inicio, fecha_final)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.bind([
    data.id,
    brandId,
    campaignId,
    oohTypeId,
    providerId,
    addressId,
    data.fechaInicio || '',
    data.fechaFin || ''
  ]);

  stmt.step();
  stmt.free();
  
  // Insertar imágenes en la tabla images
  const imagenes = [img1, img2, img3].filter(img => img && img.trim() !== '');
  if (imagenes.length > 0) {
    const insertImg = db.prepare('INSERT INTO images (ooh_record_id, ruta, orden) VALUES (?, ?, ?)');
    imagenes.forEach((imgPath, idx) => {
      if (imgPath) {
        insertImg.bind([data.id, imgPath, idx + 1]);
        insertImg.step();
        insertImg.reset();
      }
    });
    insertImg.free();
  }
  
  saveDB();
  console.log('✅ Registro insertado:', data.id);
};

// Actualizar registro existente
const updateRecord = async (id, data) => {
  if (!db) await initDB();

  const normalizeText = (v) => String(v || '').trim().toUpperCase();
  const buildImagePath = (imagePath) => {
    if (!imagePath) return '';
    
    // Si ya es una ruta absoluta válida, retornarla
    if (path.isAbsolute(imagePath)) {
      const normalized = path.normalize(imagePath);
      if (fs.existsSync(normalized)) return normalized;
    }
    
    // Si es una URL de API, convertir a ruta local
    if (imagePath.startsWith('/api/images/')) {
      const relativePart = imagePath.replace(/^\/api\/images\//, '');
      const baseDir = path.join(__dirname, '../local-images');
      const candidate = path.join(baseDir, relativePart.replace(/\//g, '\\'));
      if (fs.existsSync(candidate)) return candidate;
    }
    
    // Si es una ruta relativa, buscar en local-images
    const clean = String(imagePath).replace(/^\/api\/images\//, '');
    const baseDir = path.join(__dirname, '../local-images');
    const candidate = path.join(baseDir, clean);
    if (fs.existsSync(candidate)) return candidate;
    
    // Búsqueda recursiva por nombre de archivo
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
      console.log(`✅ Ciudad encontrada en BD: ${data.ciudad} (ID: ${cityId})`);
    } else {
      console.error(`❌ Ciudad NO encontrada en BD: ${data.ciudad}`);
      console.log(`📍 Ciudades disponibles en BD: ${getAllCities().map(c => c.nombre).join(', ')}`);
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

  // Actualizar registro OOH (solo FK)
  const stmt = db.prepare(`
    UPDATE ooh_records SET
      brand_id = ?, campaign_id = ?, ooh_type_id = ?, address_id = ?, provider_id = ?,
      fecha_inicio = ?, fecha_final = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.bind([
    brandId,
    campaignId,
    oohTypeId,
    addressId,
    providerId,
    data.fechaInicio || '',
    fechaFinal,
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
    const insertImg = db.prepare('INSERT INTO images (ooh_record_id, ruta, orden) VALUES (?, ?, ?)');
    data.imagenes.forEach((imgPath, idx) => {
      if (imgPath) {
        insertImg.bind([id, buildImagePath(imgPath), idx + 1]);
        insertImg.step();
        insertImg.reset();
      }
    });
    insertImg.free();
  }
  
  saveDB();
  console.log('✅ Registro actualizado:', id);
};

// Obtener registro por ID
const getRecordById = (id) => {
  if (!db) return null;
  
  const stmt = db.prepare(`
    SELECT 
      r.*,
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

// Obtener todos los registros con filtros opcionales (con JOINs)
const getAllRecords = (filters = {}) => {
  if (!db) return [];

  let query = `
    SELECT 
      r.id,
      r.fecha_inicio,
      r.fecha_final,
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
      cat.nombre as categoria
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
    // Filtrar por mes (yyyy-MM)
    query += ' AND (DATE(r.fecha_inicio) >= ? AND DATE(r.fecha_inicio) <= ?)';
    const [year, month] = filters.mes.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    params.push(startDate, endDate);
  }

  query += ' ORDER BY r.created_at DESC';

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
  console.log('✅ Registro eliminado:', id);
  return true;
};

// Eliminar registro OOH completo (con imágenes)
const deleteOOHRecord = (id) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    console.log(`🗑️  Eliminando registro completo: ${id}`);

    // 1. Obtener las rutas de imágenes
    const imgStmt = db.prepare('SELECT ruta FROM images WHERE ooh_record_id = ?');
    imgStmt.bind([id]);
    
    const imagePaths = [];
    while (imgStmt.step()) {
      const img = imgStmt.getAsObject();
      imagePaths.push(img.ruta);
    }
    imgStmt.free();

    console.log(`   Imágenes a eliminar: ${imagePaths.length}`);

    // 2. Eliminar archivos del disco
    const fs = require('fs');
    let deletedFiles = 0;
    imagePaths.forEach(imagePath => {
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`   ✓ Archivo eliminado: ${imagePath}`);
          deletedFiles++;
        }
      } catch (err) {
        console.warn(`   ⚠️  No se pudo eliminar: ${imagePath}`, err.message);
      }
    });

    // 3. Eliminar imágenes de la BD
    const deleteImgsStmt = db.prepare('DELETE FROM images WHERE ooh_record_id = ?');
    deleteImgsStmt.bind([id]);
    deleteImgsStmt.step();
    deleteImgsStmt.free();

    console.log(`   Imágenes eliminadas de BD: ${imagePaths.length}`);

    // 4. Eliminar registro de la BD
    const deleteRecStmt = db.prepare('DELETE FROM ooh_records WHERE id = ?');
    deleteRecStmt.bind([id]);
    deleteRecStmt.step();
    deleteRecStmt.free();

    // 5. Guardar BD
    saveDB();

    console.log(`✅ Registro ${id} eliminado correctamente`);
    
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
const addCity = (nombre, region) => {
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
  
  // Insertar la ciudad
  const stmt = db.prepare(`
    INSERT INTO cities (nombre, region_id, latitud, longitud, radio_km)
    VALUES (?, ?, 0, 0, 15)
  `);
  stmt.bind([nombre.toUpperCase(), regionId]);
  stmt.step();
  stmt.free();
  
  saveDB();
  console.log(`✅ Ciudad insertada: ${nombre}`);
  
  // Retornar la ciudad creada
  return getCityByName(nombre);
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
  // Función para obtener la instancia de DB
  getDatabase: () => db
};
