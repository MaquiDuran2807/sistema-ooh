const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'ooh_data.db');

async function checkImages() {
  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_FILE);
    const db = new SQL.Database(buffer);
    
    console.log('\n📊 IMÁGENES EN BASE DE DATOS:\n');
    
    const result = db.exec(`
      SELECT 
        i.ooh_record_id,
        b.nombre as marca,
        COUNT(i.id) as total_imagenes,
        GROUP_CONCAT(i.orden) as ordenes
      FROM images i
      JOIN ooh_records r ON i.ooh_record_id = r.id
      JOIN brands b ON r.brand_id = b.id
      GROUP BY i.ooh_record_id, b.nombre
    `);
    
    if (result.length > 0 && result[0].values.length > 0) {
      result[0].values.forEach(row => {
        console.log(`${row[1]}: ${row[2]} imágenes (orden: ${row[3]})`);
      });
    } else {
      console.log('❌ No hay imágenes en la base de datos\n');
    }
    
    db.close();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkImages();
