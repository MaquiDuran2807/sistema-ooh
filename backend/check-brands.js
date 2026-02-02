const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkBrands() {
  const DB_FILE = path.join(__dirname, 'ooh_data.db');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_FILE);
  const db = new SQL.Database(buffer);
  
  const result = db.exec('SELECT nombre FROM brands ORDER BY nombre');
  
  console.log('\n🏷️ MARCAS EN BD:\n');
  if (result.length > 0) {
    result[0].values.forEach(row => {
      console.log(`  • ${row[0]}`);
    });
  }
  
  db.close();
}

checkBrands();
