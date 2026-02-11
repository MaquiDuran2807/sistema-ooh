const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const filebuffer = fs.readFileSync('./ooh_data.db');
  const db = new SQL.Database(filebuffer);
  
  // Count records for 2026-01
  const result = db.exec("SELECT COUNT(*) as total FROM ooh_records WHERE SUBSTR(fecha_inicio, 1, 7) = '2026-01' OR SUBSTR(fecha_final, 1, 7) = '2026-01'");
  console.log('Registros for 2026-01:', result[0].values[0][0]);
  
  // Show all dates to understand the data
  const dates = db.exec("SELECT SUBSTR(fecha_inicio, 1, 7) as mes_inicio, SUBSTR(fecha_final, 1, 7) as mes_final, COUNT(*) as count FROM ooh_records GROUP BY mes_inicio, mes_final");
  console.log('\nBreakdown por mes:');
  dates[0].columns.forEach((col, i) => process.stdout.write(col + '\t'));
  console.log();
  dates[0].values.forEach(row => {
    row.forEach(val => process.stdout.write(val + '\t'));
    console.log();
  });
  
  // Also check all records
  const allRecs = db.exec("SELECT COUNT(*) FROM ooh_records");
  console.log('\nTotal records in DB:', allRecs[0].values[0][0]);
})();
