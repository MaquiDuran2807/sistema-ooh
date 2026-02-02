const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'ooh_data.db');

async function checkRecords() {
  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_FILE);
    const db = new SQL.Database(buffer);
    
    console.log('\n📊 REGISTROS EN BASE DE DATOS:\n');
    
    const result = db.exec(`
      SELECT 
        r.id,
        b.nombre as marca,
        c.nombre as campana,
        ot.nombre as tipo_ooh,
        a.descripcion as direccion,
        ci.nombre as ciudad,
        r.fecha_inicio,
        r.fecha_final
      FROM ooh_records r
      LEFT JOIN brands b ON r.brand_id = b.id
      LEFT JOIN campaigns c ON r.campaign_id = c.id
      LEFT JOIN ooh_types ot ON r.ooh_type_id = ot.id
      LEFT JOIN addresses a ON r.address_id = a.id
      LEFT JOIN cities ci ON a.city_id = ci.id
      ORDER BY r.created_at DESC
    `);
    
    if (result.length > 0 && result[0].values.length > 0) {
      const rows = result[0].values;
      rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row[1]} - ${row[5]} (${row[3]})`);
        console.log(`   Campaña: ${row[2]}`);
        console.log(`   Dirección: ${row[4]}`);
        console.log(`   Fechas: ${row[6]} a ${row[7]}`);
        console.log(`   ID: ${row[0]}\n`);
      });
      console.log(`Total: ${rows.length} registros\n`);
    } else {
      console.log('❌ No hay registros en la base de datos\n');
    }
    
    db.close();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRecords();
