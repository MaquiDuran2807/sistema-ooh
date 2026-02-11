const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const fb = fs.readFileSync('./ooh_data.db');
  const db = new SQL.Database(fb);
  
  try {
    const r = db.exec("SELECT COUNT(*) as count FROM ooh_records WHERE DATE('now') BETWEEN DATE(fecha_inicio) AND DATE(fecha_final)");
    console.log('DATE() function works. Active records:', r[0].values[0][0]);
  } catch(e) {
    console.error('DATE() function error:', e.message);
  }
  
  // Test simple DATE
  try {
    const r2 = db.exec("SELECT DATE('2026-01-15') as test_date");
    console.log('DATE() result:', r2[0].values[0][0]);
  } catch(e) {
    console.error('Simple DATE() error:', e.message);
  }
})();
