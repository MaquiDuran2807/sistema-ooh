const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function cleanupRegions() {
  const DB_FILE = path.join(__dirname, 'ooh_data.db');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_FILE);
  const db = new SQL.Database(buffer);
  
  console.log('\n🔍 REGIONES ACTUALES:\n');
  
  const result = db.exec('SELECT id, nombre FROM regions ORDER BY nombre');
  if (result.length > 0) {
    result[0].values.forEach(row => {
      console.log(`  ID: ${row[0]} - ${row[1]}`);
    });
  }
  
  // Listar ciudades y sus regiones
  console.log('\n🏙️  CIUDADES Y REGIONES:\n');
  const cityResult = db.exec(`
    SELECT c.nombre as ciudad, r.nombre as region 
    FROM cities c 
    LEFT JOIN regions r ON c.region_id = r.id 
    ORDER BY r.nombre, c.nombre
  `);
  
  if (cityResult.length > 0) {
    cityResult[0].values.forEach(row => {
      console.log(`  ${row[0]} → ${row[1]}`);
    });
  }
  
  db.close();
}

cleanupRegions();
