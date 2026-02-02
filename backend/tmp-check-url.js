const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('ooh_data.db'));
  const r = db.exec('SELECT ruta FROM images LIMIT 1');
  if (!r.length) {
    console.log('NO IMAGE');
    return;
  }
  const ruta = r[0].values[0][0];
  console.log('RUTA:', ruta);
  let val = String(ruta);
  val = val.replace(/\\\\/g, '\\');
  const match = val.match(/local-images[\\/]/i);
  let rel = '';
  if (match) {
    const start = val.indexOf(match[0]) + match[0].length;
    rel = val.substring(start).replace(/\\/g, '/');
  }
  const url = match ? `http://localhost:8080/api/images/${rel}` : val;
  console.log('URL:', url);
})();
