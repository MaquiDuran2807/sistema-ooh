const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const data = fs.readFileSync(path.join(__dirname, 'ooh_data.db'));
  const db = new SQL.Database(data);

  let stmt = db.prepare('SELECT id, nombre FROM campaigns LIMIT 20');
  console.log('\n📋 All Campaigns:');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log(`   - ${row.nombre} (id=${row.id})`);
  }
  stmt.free();

  stmt = db.prepare('SELECT id, nombre FROM ooh_types');
  console.log('\n📋 All OOH Types:');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log(`   - ${row.nombre} (id=${row.id})`);
  }
  stmt.free();

  stmt = db.prepare('SELECT id, nombre FROM brands LIMIT 15');
  console.log('\n📋 All Brands:');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log(`   - ${row.nombre} (id=${row.id})`);
  }
  stmt.free();
}

main();
