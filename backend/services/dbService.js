const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

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

  // Crear tablas normalizadas
  const createTablesSQL = [
    // Tabla de marcas
    `CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      categoria TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Tabla de campañas
    `CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      brand_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
      UNIQUE(nombre, brand_id)
    )`,
    
    // Tabla de tipos de OOH
    `CREATE TABLE IF NOT EXISTS ooh_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Tabla de registros OOH
    `CREATE TABLE IF NOT EXISTS ooh_records (
      id TEXT PRIMARY KEY,
      brand_id INTEGER NOT NULL,
      anunciante TEXT DEFAULT 'ABI',
      campaign_id INTEGER NOT NULL,
      ooh_type_id INTEGER NOT NULL,
      ciudad TEXT NOT NULL,
      ciudad_dashboard TEXT,
      direccion TEXT NOT NULL,
      latitud REAL,
      longitud REAL,
      fecha_inicio TEXT,
      fecha_final TEXT,
      imagen_1 TEXT,
      imagen_2 TEXT,
      imagen_3 TEXT,
      region TEXT,
      proveedor TEXT DEFAULT 'APX',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (ooh_type_id) REFERENCES ooh_types(id)
    )`
  ];
  
  try {
    for (const sql of createTablesSQL) {
      db.run(sql);
    }
    saveDB();
    console.log('✅ Tablas normalizadas creadas (brands, campaigns, ooh_types, ooh_records)');
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.error('❌ Error creando tablas:', error);
      throw error;
    }
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

  const stmt = db.prepare(`
    INSERT INTO ooh_records 
    (id, brand_id, anunciante, campaign_id, ooh_type_id, ciudad, ciudad_dashboard, 
     direccion, latitud, longitud, fecha_inicio, fecha_final, imagen_1, imagen_2, imagen_3, region, proveedor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.bind([
    data.id,
    brandId,
    'ABI',
    campaignId,
    oohTypeId,
    normalizeText(data.ciudad),
    normalizeText(data.ciudad),
    normalizeText(data.direccion),
    parseFloat(data.latitud) || 0,
    parseFloat(data.longitud) || 0,
    data.fechaInicio || '',
    data.fechaFinal || '',
    img1,
    img2,
    img3,
    normalizeText(data.region || ''),
    normalizeText(data.proveedor || 'APX')
  ]);

  stmt.step();
  stmt.free();
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

  const stmt = db.prepare(`
    UPDATE ooh_records SET
      brand_id = ?, campaign_id = ?, ooh_type_id = ?, ciudad = ?, 
      direccion = ?, latitud = ?, longitud = ?, fecha_inicio = ?, fecha_final = ?,
      imagen_1 = ?, imagen_2 = ?, imagen_3 = ?, region = ?, proveedor = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.bind([
    brandId,
    campaignId,
    oohTypeId,
    normalizeText(data.ciudad),
    normalizeText(data.direccion),
    parseFloat(data.latitud) || 0,
    parseFloat(data.longitud) || 0,
    data.fechaInicio || '',
    fechaFinal,
    img1,
    img2,
    img3,
    normalizeText(data.region || ''),
    normalizeText(data.proveedor || 'APX'),
    id
  ]);

  stmt.step();
  stmt.free();
  saveDB();
  console.log('✅ Registro actualizado:', id);
};

// Obtener registro por ID
const getRecordById = (id) => {
  if (!db) return null;
  
  const stmt = db.prepare('SELECT * FROM ooh_records WHERE id = ?');
  stmt.bind([id]);
  
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  
  return result;
};

// Obtener todos los registros con filtros opcionales (con JOINs)
const getAllRecords = (filters = {}) => {
  if (!db) return [];

  let query = `
    SELECT 
      r.*, 
      b.nombre as marca, 
      b.categoria, 
      c.nombre as campana, 
      t.nombre as tipo_ooh
    FROM ooh_records r
    INNER JOIN brands b ON r.brand_id = b.id
    INNER JOIN campaigns c ON r.campaign_id = c.id
    INNER JOIN ooh_types t ON r.ooh_type_id = t.id
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
    query += ' AND UPPER(ciudad) = ?';
    params.push(String(filters.ciudad).toUpperCase());
  }

  if (filters.mes) {
    // Filtrar por mes (yyyy-MM)
    query += ' AND (DATE(fecha_inicio) >= ? AND DATE(fecha_inicio) <= ?)';
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
    results.push(stmt.getAsObject());
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

  const stmt = db.prepare(`
    SELECT r.*, b.nombre as marca, c.nombre as campana, t.nombre as tipo_ooh, b.categoria
    FROM ooh_records r
    INNER JOIN brands b ON r.brand_id = b.id
    INNER JOIN campaigns c ON r.campaign_id = c.id
    INNER JOIN ooh_types t ON r.ooh_type_id = t.id
    WHERE UPPER(r.direccion) = ? 
      AND r.fecha_inicio = ? 
      AND UPPER(b.nombre) = ? 
      AND UPPER(c.nombre) = ?
    LIMIT 1
  `);

  stmt.bind([
    String(direccion).toUpperCase(),
    fechaInicio,
    String(marca).toUpperCase(),
    String(campana).toUpperCase()
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

// Contar registros
const countRecords = () => {
  if (!db) return 0;

  const stmt = db.prepare('SELECT COUNT(*) as count FROM ooh_records');
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();

  return result.count || 0;
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
  countRecords,
  saveDB,
  // Nuevas funciones relacionales
  getAllBrands,
  getCampaignsByBrand,
  getAllOOHTypes,
  addBrand,
  addCampaign,
  addOOHType,
  getOrCreateBrand,
  getOrCreateCampaign,
  getOrCreateOOHType
};
