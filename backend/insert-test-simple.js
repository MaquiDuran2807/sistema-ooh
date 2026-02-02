const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, 'ooh_data.db');

// Crear imagen de prueba simple
const createTestImage = (marca, id, numero) => {
  const colors = ['red', 'green', 'blue'];
  const pngBase64 = {
    red: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    green: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
    blue: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='
  };
  
  const color = colors[numero - 1] || 'red';
  const buffer = Buffer.from(pngBase64[color], 'base64');
  
  // Crear directorio si no existe
  const dir = path.join(__dirname, 'local-images', marca);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Guardar archivo
  const filename = path.join(dir, `${id}-${numero}.png`);
  fs.writeFileSync(filename, buffer);
  
  return filename;
};

async function insertTestData() {
  console.log('\n🚀 INSERTANDO DATOS DE PRUEBA\n');
  
  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_FILE);
    const db = new SQL.Database(buffer);
    
    // Datos de prueba
    const records = [
      { marca: 'CORONA', ciudad: 'BOGOTA', tipoOOH: 'VALLA', campana: 'VERANO 2026', direccion: 'Carrera 7 #100-50', lat: 4.7110, lng: -74.0721, fechaInicio: '2026-01-15', fechaFin: '2026-01-31' },
      { marca: 'PILSEN', ciudad: 'MEDELLIN', tipoOOH: 'VALLA', campana: 'INICIO 2026', direccion: 'Carrera 49 #52-30', lat: 6.2442, lng: -75.5812, fechaInicio: '2026-01-20', fechaFin: '2026-01-31' },
      { marca: 'AGUILA', ciudad: 'CALI', tipoOOH: 'PARADERO', campana: 'MUNDIAL 2026', direccion: 'Avenida 5 Norte #23-50', lat: 3.4516, lng: -76.5320, fechaInicio: '2026-01-10', fechaFin: '2026-01-31' },
      { marca: 'CLUB_COLOMBIA', ciudad: 'BOGOTA', tipoOOH: 'PARADERO', campana: 'PREMIUM 2026', direccion: 'Carrera 15 #85-40', lat: 4.6730, lng: -74.0549, fechaInicio: '2026-01-25', fechaFin: '2026-02-28' },
      { marca: 'POKER', ciudad: 'BARRANQUILLA', tipoOOH: 'VALLA', campana: 'CARNAVAL 2026', direccion: 'Calle 72 #54-30', lat: 10.9685, lng: -74.7813, fechaInicio: '2026-02-01', fechaFin: '2026-02-28' }
    ];
    
    let success = 0;
    
    for (const rec of records) {
      try {
        const id = uuidv4();
        
        console.log(`📸 ${rec.marca} - ${rec.ciudad} (${rec.tipoOOH})`);
        
        // Obtener IDs de entidades relacionadas
        const brandStmt = db.prepare('SELECT id FROM brands WHERE nombre = ?');
        brandStmt.bind([rec.marca]);
        let brandId = null;
        if (brandStmt.step()) {
          brandId = brandStmt.getAsObject().id;
        }
        brandStmt.free();
        
        if (!brandId) {
          console.log(`   ⚠️  Marca ${rec.marca} no encontrada, saltando...`);
          continue;
        }
        
        // Obtener o crear campaña
        let campaignStmt = db.prepare('SELECT id FROM campaigns WHERE nombre = ? AND brand_id = ?');
        campaignStmt.bind([rec.campana, brandId]);
        let campaignId = null;
        if (campaignStmt.step()) {
          campaignId = campaignStmt.getAsObject().id;
        }
        campaignStmt.free();
        
        if (!campaignId) {
          const insertCampaign = db.prepare('INSERT INTO campaigns (nombre, brand_id) VALUES (?, ?)');
          insertCampaign.bind([rec.campana, brandId]);
          insertCampaign.step();
          insertCampaign.free();
          campaignId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
        }
        
        // Obtener tipo OOH
        const oohTypeStmt = db.prepare('SELECT id FROM ooh_types WHERE nombre = ?');
        oohTypeStmt.bind([rec.tipoOOH]);
        let oohTypeId = null;
        if (oohTypeStmt.step()) {
          oohTypeId = oohTypeStmt.getAsObject().id;
        }
        oohTypeStmt.free();
        
        if (!oohTypeId) {
          const insertOohType = db.prepare('INSERT INTO ooh_types (nombre) VALUES (?)');
          insertOohType.bind([rec.tipoOOH]);
          insertOohType.step();
          insertOohType.free();
          oohTypeId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
        }
        
        // Obtener ciudad
        const cityStmt = db.prepare('SELECT id FROM cities WHERE nombre = ?');
        cityStmt.bind([rec.ciudad]);
        let cityId = null;
        if (cityStmt.step()) {
          cityId = cityStmt.getAsObject().id;
        }
        cityStmt.free();
        
        if (!cityId) {
          console.log(`   ⚠️  Ciudad ${rec.ciudad} no encontrada, saltando...`);
          continue;
        }
        
        // Crear dirección
        const insertAddr = db.prepare('INSERT INTO addresses (city_id, descripcion, latitud, longitud) VALUES (?, ?, ?, ?)');
        insertAddr.bind([cityId, rec.direccion, rec.lat, rec.lng]);
        insertAddr.step();
        insertAddr.free();
        const addressId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
        
        // Obtener proveedor
        const providerStmt = db.prepare('SELECT id FROM providers WHERE nombre = ?');
        providerStmt.bind(['APX']);
        let providerId = null;
        if (providerStmt.step()) {
          providerId = providerStmt.getAsObject().id;
        }
        providerStmt.free();
        
        // Insertar registro OOH (solo FK, schema normalizado)
        const insertRecord = db.prepare(`
          INSERT INTO ooh_records 
          (id, brand_id, campaign_id, ooh_type_id, address_id, provider_id, fecha_inicio, fecha_final)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertRecord.bind([id, brandId, campaignId, oohTypeId, addressId, providerId, rec.fechaInicio, rec.fechaFin]);
        insertRecord.step();
        insertRecord.free();
        
        // Crear y guardar imágenes
        for (let i = 1; i <= 3; i++) {
          const imgPath = createTestImage(rec.marca, id.substring(0, 8), i);
          const insertImage = db.prepare('INSERT INTO images (ooh_record_id, ruta, orden) VALUES (?, ?, ?)');
          insertImage.bind([id, imgPath, i]);
          insertImage.step();
          insertImage.free();
        }
        
        console.log(`   ✅ Registro creado (ID: ${id.substring(0, 13)}...)`);
        success++;
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Guardar BD
    const data = db.export();
    fs.writeFileSync(DB_FILE, data);
    db.close();
    
    console.log(`\n✅ Completado: ${success}/${records.length} registros insertados\n`);
    console.log('🌐 Verifica en: http://localhost:3000\n');
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
    console.log(error.stack);
  }
}

insertTestData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
