const http = require('http');
const fs = require('fs');
const path = require('path');

const API_HOST = 'localhost';
const API_PORT = 8080;
const API_PATH = '/api/ooh/create';

// Crear imagen de prueba simple (1x1 pixel PNG)
const createTestImage = (color) => {
  // PNG de 1x1 pixel en base64
  const pngBase64 = {
    red: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    green: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
    blue: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='
  };
  
  return Buffer.from(pngBase64[color] || pngBase64.red, 'base64');
};

const registrosPrueba = [
  // VALLAS - ENERO
  {
    marca: 'CORONA',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'VALLA',
    campana: 'VERANO 2026',
    ciudad: 'BOGOTA',
    region: 'BOGOTA D.C.',
    direccion: 'Carrera 7 #100-50',
    latitud: '4.7110',
    longitud: '-74.0721',
    fechaInicio: '2026-01-15',
    fechaFin: '2026-01-31',
    descripcion: 'Valla publicitaria Corona - Zona Norte Bogotá'
  },
  {
    marca: 'PILSEN',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'VALLA',
    campana: 'INICIO AÑO 2026',
    ciudad: 'MEDELLIN',
    region: 'ANTIOQUIA',
    direccion: 'Carrera 49 #52-30',
    latitud: '6.2442',
    longitud: '-75.5812',
    fechaInicio: '2026-01-20',
    fechaFin: '2026-01-31',
    descripcion: 'Valla Pilsen - Poblado Medellín'
  },
  
  // PARADEROS - ENERO
  {
    marca: 'AGUILA',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'PARADERO',
    campana: 'MUNDIAL 2026',
    ciudad: 'CALI',
    region: 'VALLE DEL CAUCA',
    direccion: 'Avenida 5 Norte #23-50',
    latitud: '3.4516',
    longitud: '-76.5320',
    fechaInicio: '2026-01-10',
    fechaFin: '2026-01-31',
    descripcion: 'Paradero Aguila - Norte de Cali'
  },
  {
    marca: 'CLUB_COLOMBIA',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'PARADERO',
    campana: 'PREMIUM 2026',
    ciudad: 'BOGOTA',
    region: 'BOGOTA D.C.',
    direccion: 'Carrera 15 #85-40',
    latitud: '4.6730',
    longitud: '-74.0549',
    fechaInicio: '2026-01-25',
    fechaFin: '2026-02-28',
    descripcion: 'Paradero Club Colombia - Zona Usaquén'
  },
  
  // VALLA - FEBRERO
  {
    marca: 'POKER',
    categoria: 'CERVEZA',
    proveedor: 'APX',
    tipoOOH: 'VALLA',
    campana: 'FEBRERO CARNAVAL',
    ciudad: 'BARRANQUILLA',
    region: 'ATLÁNTICO',
    direccion: 'Calle 72 #54-30',
    latitud: '10.9685',
    longitud: '-74.7813',
    fechaInicio: '2026-02-01',
    fechaFin: '2026-02-28',
    descripcion: 'Valla Poker - Carnaval de Barranquilla'
  }
];

async function crearRegistro(registro, index) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}`;
    let body = '';
    
    // Agregar campos del registro
    Object.keys(registro).forEach(key => {
      if (key !== 'descripcion') {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        body += `${registro[key]}\r\n`;
      }
    });
    
    // Agregar 3 imágenes de prueba
    const colors = ['red', 'green', 'blue'];
    for (let i = 0; i < 3; i++) {
      const imageBuffer = createTestImage(colors[i]);
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="imagenes"; filename="test-${registro.marca}-${i + 1}.png"\r\n`;
      body += `Content-Type: image/png\r\n\r\n`;
      body += imageBuffer.toString('binary');
      body += '\r\n';
    }
    
    body += `--${boundary}--\r\n`;
    
    const bodyBuffer = Buffer.from(body, 'binary');
    
    console.log(`\n📸 Creando: ${registro.descripcion}`);
    console.log(`   Marca: ${registro.marca} | Tipo: ${registro.tipoOOH} | Ciudad: ${registro.ciudad}`);
    console.log(`   Fechas: ${registro.fechaInicio} a ${registro.fechaFin}`);
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log(`   ✅ Registro creado exitosamente (ID: ${response.data.id.substring(0, 8)}...)`);
            resolve(true);
          } else {
            console.log(`   ❌ Error: ${response.error}`);
            resolve(false);
          }
        } catch (error) {
          console.log(`   ❌ Error al parsear respuesta: ${error.message}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error de conexión: ${error.message}`);
      resolve(false);
    });
    
    req.write(bodyBuffer);
    req.end();
  });
}

async function insertarDatosPrueba() {
  console.log('\n🚀 ================================');
  console.log('   INSERTANDO DATOS DE PRUEBA');
  console.log('   ================================\n');
  
  console.log('📋 Registros a crear:');
  console.log('   - 3 VALLAS (Corona, Pilsen, Poker)');
  console.log('   - 2 PARADEROS (Águila, Club Colombia)');
  console.log('   - Fechas: 2 en enero, 1 en febrero\n');
  
  let exitos = 0;
  let errores = 0;
  
  for (let i = 0; i < registrosPrueba.length; i++) {
    const resultado = await crearRegistro(registrosPrueba[i], i);
    if (resultado) {
      exitos++;
    } else {
      errores++;
    }
    
    // Pequeña pausa entre registros
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ ================================');
  console.log('   RESUMEN');
  console.log('   ================================');
  console.log(`   ✅ Exitosos: ${exitos}`);
  console.log(`   ❌ Errores: ${errores}`);
  console.log(`   📊 Total: ${registrosPrueba.length}`);
  console.log('\n🌐 Verifica los registros en: http://localhost:3000\n');
}

// Verificar que el servidor esté corriendo
async function verificarServidor() {
  return new Promise((resolve) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/health',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      console.log('\n❌ ERROR: El servidor backend no está corriendo');
      console.log('   Por favor inicia el servidor con: npm run dev');
      console.log('   O ejecuta: node server.js\n');
      resolve(false);
    });
    
    req.end();
  });
}

// Ejecutar
(async () => {
  const servidorActivo = await verificarServidor();
  if (servidorActivo) {
    await insertarDatosPrueba();
  }
  process.exit(0);
})();
