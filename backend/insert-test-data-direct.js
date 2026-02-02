const path = require('path');
const fs = require('fs');

// Configurar base de datos
process.env.DB_FILE_PATH = path.join(__dirname, 'ooh_data.db');

const dbService = require('./services/dbService');
const { v4: uuidv4 } = require('uuid');

// Crear imagen de prueba simple (1x1 pixel PNG)
const createTestImage = (marca, numero, color) => {
  const pngBase64 = {
    red: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    green: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
    blue: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='
  };
  
  const buffer = Buffer.from(pngBase64[color] || pngBase64.red, 'base64');
  
  // Crear directorio si no existe
  const dir = path.join(__dirname, 'local-images', marca);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Guardar archivo
  const filename = path.join(dir, `test-${marca}-${numero}-${color}.png`);
  fs.writeFileSync(filename, buffer);
  
  return filename;
};

const registrosPrueba = [
  // VALLA 1 - CORONA - ENERO
  {
    marca: 'CORONA',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'VALLA',
    campana: 'VERANO 2026',
    ciudad: 'BOGOTA',
    region: 'BOGOTA D.C.',
    direccion: 'CARRERA 7 #100-50',
    latitud: 4.7110,
    longitud: -74.0721,
    fechaInicio: '2026-01-15',
    fechaFin: '2026-01-31',
    descripcion: '🔵 Valla CORONA - Zona Norte Bogotá'
  },
  
  // VALLA 2 - PILSEN - ENERO
  {
    marca: 'PILSEN',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'VALLA',
    campana: 'INICIO AÑO 2026',
    ciudad: 'MEDELLIN',
    region: 'ANTIOQUIA',
    direccion: 'CARRERA 49 #52-30',
    latitud: 6.2442,
    longitud: -75.5812,
    fechaInicio: '2026-01-20',
    fechaFin: '2026-01-31',
    descripcion: '🟡 Valla PILSEN - Poblado Medellín'
  },
  
  // PARADERO 1 - AGUILA - ENERO
  {
    marca: 'AGUILA',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'PARADERO',
    campana: 'MUNDIAL 2026',
    ciudad: 'CALI',
    region: 'VALLE DEL CAUCA',
    direccion: 'AVENIDA 5 NORTE #23-50',
    latitud: 3.4516,
    longitud: -76.5320,
    fechaInicio: '2026-01-10',
    fechaFin: '2026-01-31',
    descripcion: '🔴 Paradero AGUILA - Norte de Cali'
  },
  
  // PARADERO 2 - CLUB COLOMBIA - ENERO
  {
    marca: 'CLUB_COLOMBIA',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'PARADERO',
    campana: 'PREMIUM 2026',
    ciudad: 'BOGOTA',
    region: 'BOGOTA D.C.',
    direccion: 'CARRERA 15 #85-40',
    latitud: 4.6730,
    longitud: -74.0549,
    fechaInicio: '2026-01-25',
    fechaFin: '2026-02-28',
    descripcion: '🟤 Paradero CLUB COLOMBIA - Usaquén'
  },
  
  // VALLA 3 - POKER - FEBRERO
  {
    marca: 'POKER',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'VALLA',
    campana: 'FEBRERO CARNAVAL',
    ciudad: 'BARRANQUILLA',
    region: 'ATLÁNTICO',
    direccion: 'CALLE 72 #54-30',
    latitud: 10.9685,
    longitud: -74.7813,
    fechaInicio: '2026-02-01',
    fechaFin: '2026-02-28',
    descripcion: '🟢 Valla POKER - Carnaval Barranquilla'
  }
];

async function insertarDatosPrueba() {
  console.log('\n🚀 ================================');
  console.log('   INSERTANDO DATOS DE PRUEBA');
  console.log('   ================================\n');
  
  console.log('📋 Configuración:');
  console.log('   - 3 VALLAS: Corona, Pilsen, Poker');
  console.log('   - 2 PARADEROS: Águila, Club Colombia');
  console.log('   - Distribución temporal:');
  console.log('     • Enero: 4 registros');
  console.log('     • Febrero: 1 registro\n');
  
  try {
    // Inicializar base de datos
    await dbService.initDB();
    console.log('✅ Base de datos inicializada\n');
    
    let exitos = 0;
    let errores = 0;
    
    for (const registro of registrosPrueba) {
      try {
        console.log(`📸 Creando: ${registro.descripcion}`);
        console.log(`   Marca: ${registro.marca} | Tipo: ${registro.tipoOOH} | Ciudad: ${registro.ciudad}`);
        console.log(`   Fechas: ${registro.fechaInicio} → ${registro.fechaFin}`);
        
        // Crear ID único
        const id = uuidv4();
        
        // Crear imágenes de prueba
        const imagen1 = createTestImage(registro.marca, id.substring(0, 8), 'red');
        const imagen2 = createTestImage(registro.marca, id.substring(0, 8), 'green');
        const imagen3 = createTestImage(registro.marca, id.substring(0, 8), 'blue');
        
        // Preparar datos para la BD
        const data = {
          id,
          marca: registro.marca,
          categoria: registro.categoria,
          proveedor: registro.proveedor,
          tipoOOH: registro.tipoOOH,
          campana: registro.campana,
          direccion: registro.direccion,
          ciudad: registro.ciudad,
          region: registro.region,
          latitud: registro.latitud,
          longitud: registro.longitud,
          fechaInicio: registro.fechaInicio,
          fechaFin: registro.fechaFin,
          imagenes: [imagen1, imagen2, imagen3]
        };
        
        // Insertar en BD
        await dbService.addRecord(data);
        
        console.log(`   ✅ Registro creado exitosamente`);
        console.log(`      ID: ${id.substring(0, 13)}...`);
        console.log(`      Imágenes: ${imagen1.split(path.sep).pop()}, ${imagen2.split(path.sep).pop()}, ${imagen3.split(path.sep).pop()}\n`);
        
        exitos++;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        errores++;
      }
    }
    
    console.log('✅ ================================');
    console.log('   RESUMEN FINAL');
    console.log('   ================================');
    console.log(`   ✅ Exitosos: ${exitos}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📊 Total: ${registrosPrueba.length}\n`);
    
    if (exitos > 0) {
      console.log('🌐 Verifica los registros en:');
      console.log('   Frontend: http://localhost:3000');
      console.log('   Backend API: http://localhost:8080/api/ooh\n');
    }
    
  } catch (error) {
    console.log('\n❌ ERROR FATAL:');
    console.log(`   ${error.message}\n`);
    console.log(error.stack);
  }
}

// Ejecutar
insertarDatosPrueba()
  .then(() => {
    console.log('✅ Script completado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n❌ Error no controlado:');
    console.log(error);
    process.exit(1);
  });
