// 🔧 Script para crear tabla de estados y agregarla a ooh_records
const dbService = require('./services/dbService');

async function setupStates() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 CONFIGURADOR DE TABLA DE ESTADOS OOH             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('🔧 [SETUP STATES] Inicializando base de datos...\n');
  
  try {
    // Inicializar la BD primero
    await dbService.initDB();
    console.log('✅ Base de datos inicializada');
    
    const db = dbService.getDatabase();
    
    if (!db) {
      throw new Error('No se pudo obtener la instancia de la BD');
    }
    
    // Crear tabla de estados
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ooh_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.run(createTableSQL);
    console.log('✅ Tabla ooh_states creada/verificada');
    
    // Insertar estados comunes
    const defaultStates = [
      { nombre: 'ACTIVO', descripcion: 'OOH activo y visible' },
      { nombre: 'BONIFICADO', descripcion: 'OOH en período de bonificación' },
      { nombre: 'CONSUMO', descripcion: 'OOH en período de consumo' },
      { nombre: 'MANTENIMIENTO', descripcion: 'OOH en mantenimiento' },
      { nombre: 'PAUSADO', descripcion: 'OOH pausado temporalmente' },
      { nombre: 'INACTIVO', descripcion: 'OOH inactivo' }
    ];
    
    console.log('\n📋 Insertando estados...');
    for (const state of defaultStates) {
      try {
        const insertSQL = `INSERT INTO ooh_states (nombre, descripcion) VALUES (?, ?)`;
        db.run(insertSQL, [state.nombre, state.descripcion]);
        console.log(`  ✅ Estado creado: ${state.nombre}`);
      } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          console.log(`  ⏭️ Estado ya existe: ${state.nombre}`);
        } else {
          console.log(`  ⚠️ Error con estado ${state.nombre}: ${err.message}`);
        }
      }
    }
    
    // Agregar columna estado_id a ooh_records si no existe
    console.log('\n📝 Verificando columna estado_id en ooh_records...');
    
    try {
      db.run(`
        ALTER TABLE ooh_records 
        ADD COLUMN estado_id INTEGER 
        REFERENCES ooh_states(id)
      `);
      console.log('✅ Columna estado_id agregada a ooh_records');
    } catch (err) {
      if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
        console.log('⏭️ Columna estado_id ya existe en ooh_records');
      } else {
        console.log(`  ⚠️ Error agregando columna: ${err.message}`);
      }
    }
    
    // Guardar cambios
    await dbService.saveDB();
    
    console.log('\n📊 Estados disponibles:');
    const selectSQL = `SELECT id, nombre, descripcion FROM ooh_states ORDER BY id`;
    const selectStmt = db.prepare(selectSQL);
    while (selectStmt.step()) {
      const row = selectStmt.getAsObject();
      console.log(`  ${row.id}. ${row.nombre} - ${row.descripcion}`);
    }
    selectStmt.free();
    
    console.log('\n✅ Tabla de estados configurada exitosamente!\n');
    
  } catch (error) {
    console.error('❌ Error creando tabla de estados:', error);
    process.exit(1);
  }
}

// Ejecutar
setupStates()
  .then(() => {
    console.log('👋 Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
