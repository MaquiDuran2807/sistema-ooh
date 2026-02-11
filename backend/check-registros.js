const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'ooh_data.db');
const db = new Database(dbPath);

console.log('📊 VERIFICACIÓN DE REGISTROS EN BD\n');

// Total registros
const totalStmt = db.prepare('SELECT COUNT(*) as total FROM ooh_records');
const totalResult = totalStmt.get();
console.log(`✅ Total registros: ${totalResult.total}`);

// Registros por mes (primeros 10 meses encontrados)
const monthStmt = db.prepare(`
  SELECT 
    strftime('%Y-%m', fecha_inicio) as mes,
    COUNT(*) as cantidad
  FROM ooh_records
  WHERE fecha_inicio IS NOT NULL
  GROUP BY strftime('%Y-%m', fecha_inicio)
  ORDER BY mes DESC
  LIMIT 10
`);
console.log('\n📅 Registros por mes:');
const meses = monthStmt.all();
meses.forEach(m => {
  console.log(`   ${m.mes}: ${m.cantidad} registros`);
});

// Registros sin dirección
const noAddressStmt = db.prepare('SELECT COUNT(*) as total FROM ooh_records WHERE address_id IS NULL');
const noAddressResult = noAddressStmt.get();
console.log(`\n⚠️  Registros sin dirección: ${noAddressResult.total}`);

// Registros sin coordenadas
const noCoordStmt = db.prepare(`
  SELECT COUNT(*) as total 
  FROM ooh_records r
  LEFT JOIN addresses a ON r.address_id = a.id
  WHERE a.latitud IS NULL OR a.longitud IS NULL
`);
const noCoordResult = noCoordStmt.get();
console.log(`⚠️  Registros sin coordenadas: ${noCoordResult.total}`);

// Muestra registro de enero 2026
const eneStmt = db.prepare(`
  SELECT r.id, r.marca, r.fecha_inicio, a.descripcion, a.latitud, a.longitud
  FROM ooh_records r
  LEFT JOIN addresses a ON r.address_id = a.id
  WHERE strftime('%Y-%m', r.fecha_inicio) = '2026-01'
  LIMIT 5
`);
console.log('\n🔍 Muestra de registros en 2026-01:');
const eneRegistros = eneStmt.all();
if (eneRegistros.length > 0) {
  eneRegistros.forEach((r, i) => {
    console.log(`   ${i+1}. ${r.marca} - ${r.fecha_inicio} - ${r.descripcion}`);
  });
  console.log(`   ... y ${totalResult.total - 5} más`);
} else {
  console.log('   ❌ No hay registros en 2026-01');
}

db.close();
