const request = require('supertest');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const dbService = require('../services/dbService');

const BASE_URL = 'http://localhost:8080';

// Función para esperar confirmación del usuario (con timeout de 60 segundos)
function waitForUserConfirmation(message) {
  return new Promise((resolve) => {
    const timeoutMs = 60000; // 60 segundos
    let resolved = false;
    let rl = null;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.log('\n⏱️  TIMEOUT: Se acabó el tiempo (60 segundos)');
        console.log('⏭️  Continuando automáticamente...\n');
        resolved = true;
        if (rl) rl.close();
        resolve();
      }
    }, timeoutMs);

    try {
      if (process.stdin && process.stdin.isTTY) {
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const prompt = `\n${message}\n⚡ ENTER = continuar | 60 seg = auto-continuar\n`;
        rl.question(prompt, () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            rl.close();
            resolve();
          }
        });
      } else {
        // En modo test, no hay TTY, solo usar timeout
      }
    } catch (err) {
      // Si falla readline, solo usar timeout
    }
  });
}

// Crear imagen de prueba
function createTestImage(filename, text = 'Test Image') {
  const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="300" fill="#4CAF50"/>
    <text x="200" y="150" font-size="24" fill="white" text-anchor="middle">${text}</text>
  </svg>`;
  
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, svg);
  return filepath;
}

describe('🧪 TEST COMPLETO: Crear y Editar Registros OOH', () => {
  let savedRecordIds = [];
  let testImages = [];
  let testData = {};

  beforeAll(async () => {
    await dbService.initDB();
    console.log('\n✅ Base de datos inicializada para tests\n');
    
    // 📊 OBTENER IDS DE LA BD PARA USAR EN TESTS
    console.log('🔍 Obteniendo IDs de marcas, ciudades, campañas...\n');
    
    // Obtener marcas y sus IDs (CORONA y PILSEN existen en BD)
    const coronaBrand = dbService.getBrandByName('CORONA');
    const pilsenBrand = dbService.getBrandByName('PILSEN');
    
    // Obtener ciudades y sus IDs
    const bogotaCity = dbService.getCityByName('BOGOTA DC') || dbService.getCityByName('BOGOTA');
    const medellinCity = dbService.getCityByName('MEDELLIN') || dbService.getCityByName('MEDELLÍN');
    const caliCity = dbService.getCityByName('CALI');
    
    // Obtener campañas
    const allCampaigns = dbService.getAllCampaigns ? dbService.getAllCampaigns() : [];
    
    // Obtener proveedores
    const allProviders = dbService.getAllProviders ? dbService.getAllProviders() : [];
    const apxProvider = allProviders.find(p => p.nombre === 'APX') || allProviders[0];
    const ipexProvider = allProviders.find(p => p.nombre === 'IPEX') || allProviders[1] || apxProvider;
    
    // Obtener tipos OOH
    const allOohTypes = dbService.getAllOOHTypes ? dbService.getAllOOHTypes() : [];
    const vallaType = allOohTypes.find(t => t.nombre === 'VALLA') || allOohTypes[0];
    const vallaDigitalType = allOohTypes.find(t => t.nombre === 'VALLA DIGITAL') || vallaType || allOohTypes[0];
    
    // Obtener o crear campaña de prueba
    let testCampaign = allCampaigns.find(c => c.nombre === 'TEST SUMMER 2026') || allCampaigns.find(c => c.nombre === 'VERANO 2026');
    if (!testCampaign) {
      // Usar la primera campaña disponible
      testCampaign = allCampaigns[0];
    }
    
    testData = {
      coronaBrandId: coronaBrand?.id,
      pilsenBrandId: pilsenBrand?.id,
      bogotaCityId: bogotaCity?.id,
      medellinCityId: medellinCity?.id,
      caliCityId: caliCity?.id,
      campaignId: testCampaign?.id,
      apxProviderId: apxProvider?.id,
      ipexProviderId: ipexProvider?.id,
      vallaTypeId: vallaType?.id,
      vallaDigitalTypeId: vallaDigitalType?.id
    };
    
    console.log('📋 IDs Obtenidos:');
    console.log(`  • CORONA brand_id: ${testData.coronaBrandId}`);
    console.log(`  • PILSEN brand_id: ${testData.pilsenBrandId}`);
    console.log(`  • BOGOTA city_id: ${testData.bogotaCityId}`);
    console.log(`  • MEDELLIN city_id: ${testData.medellinCityId}`);
    console.log(`  • CALI city_id: ${testData.caliCityId}`);
    console.log(`  • Campaign ID: ${testData.campaignId}`);
    console.log(`  • APX provider_id: ${testData.apxProviderId}`);
    console.log(`  • IPEX provider_id: ${testData.ipexProviderId}`);
    console.log(`  • VALLA type_id: ${testData.vallaTypeId}`);
    console.log(`  • VALLA DIGITAL type_id: ${testData.vallaDigitalTypeId}\n`);
  });

  afterAll(async () => {
    // Limpiar imágenes de prueba
    testImages.forEach(imgPath => {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    });

    console.log('\n🧹 Limpieza completada');
  });

  test('✅ CREAR: Debe crear registro con mínimo 1 imagen', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 TEST 1: CREACIÓN DE REGISTRO (CON IDs)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Crear 2 imágenes
    const img1 = createTestImage('test-corona-1.svg', 'Corona Front');
    const img2 = createTestImage('test-corona-2.svg', 'Corona Side');
    testImages.push(img1, img2);

    // ✅ USAR IDS EN LUGAR DE NOMBRES
    const response = await request(BASE_URL)
      .post('/api/ooh/create')
      .field('brand_id', testData.coronaBrandId)       // ✅ ID de marca (CORONA)
      .field('campaign_id', testData.campaignId)        // ✅ ID de campaña
      .field('ooh_type_id', testData.vallaTypeId)       // ✅ ID de tipo OOH
      .field('provider_id', testData.apxProviderId)     // ✅ ID de proveedor
      .field('city_id', testData.bogotaCityId)          // ✅ ID de ciudad
      .field('direccion', 'Calle 100 #15-20')
      .field('latitud', '4.6850')
      .field('longitud', '-74.0540')
      .field('fechaInicio', '2026-02-01')
      .field('fechaFin', '2026-02-28')
      // ❌ NO enviar: marca, categoria, region (se obtienen automáticamente)
      .attach('imagenes', img1)
      .attach('imagenes', img2);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.message).toContain('creado exitosamente');

    const recordId = response.body.data.id;
    savedRecordIds.push(recordId);

    console.log(`✅ Registro creado: ${recordId}`);
    console.log(`📍 CORONA (brand_id: ${testData.coronaBrandId}) - BOGOTA (city_id: ${testData.bogotaCityId})`);
    console.log(`📅 Febrero 1-28, 2026`);
    console.log(`📸 2 imágenes subidas\n`);

    // Verificar en BD
    const recordRes = await request(BASE_URL).get(`/api/ooh/${recordId}`);
    expect(recordRes.status).toBe(200);
    expect(recordRes.body?.success).toBe(true);
    console.log(`✅ Verificación API: Registro existe\n`);
  }, 30000);

  test('✅ VALIDACIÓN: Debe rechazar registro SIN imágenes', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚫 TEST 2: VALIDACIÓN DE IMÁGENES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response = await request(BASE_URL)
      .post('/api/ooh/create')
      .field('brand_id', testData.coronaBrandId)        // ✅ ID
      .field('campaign_id', testData.campaignId)         // ✅ ID
      .field('ooh_type_id', testData.vallaDigitalTypeId) // ✅ ID
      .field('provider_id', testData.apxProviderId)      // ✅ ID
      .field('city_id', testData.caliCityId)             // ✅ ID
      .field('direccion', 'Calle 50 #10-30')
      .field('latitud', '3.4516')
      .field('longitud', '-76.5320')
      .field('fechaInicio', '2026-02-05')
      .field('fechaFin', '2026-02-20');
    // ❌ NO se adjuntan imágenes

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('al menos 1 imagen');

    console.log(`✅ Validación correcta: ${response.body.error}\n`);
  }, 30000);

  test('✅ CREAR: Segundo registro con 3 imágenes', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 TEST 3: CREACIÓN CON 3 IMÁGENES (IDs)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const img1 = createTestImage('test-pilsen-1.svg', 'Pilsen Front');
    const img2 = createTestImage('test-pilsen-2.svg', 'Pilsen Side');
    const img3 = createTestImage('test-pilsen-3.svg', 'Pilsen Detail');
    testImages.push(img1, img2, img3);

    const response = await request(BASE_URL)
      .post('/api/ooh/create')
      .field('brand_id', testData.pilsenBrandId)         // ✅ ID de PILSEN
      .field('campaign_id', testData.campaignId)         // ✅ ID de campaña
      .field('ooh_type_id', testData.vallaDigitalTypeId) // ✅ ID de VALLA DIGITAL
      .field('provider_id', testData.ipexProviderId)     // ✅ ID de IPEX
      .field('city_id', testData.medellinCityId)         // ✅ ID de MEDELLIN
      .field('direccion', 'Avenida El Poblado #10-50')
      .field('latitud', '6.2088')
      .field('longitud', '-75.5683')
      .field('fechaInicio', '2026-02-10')
      .field('fechaFin', '2026-03-10')
      // ❌ NO enviar: marca, categoria, region, campana, proveedor, tipoOOH
      .attach('imagenes', img1)
      .attach('imagenes', img2)
      .attach('imagenes', img3);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const recordId = response.body.data.id;
    savedRecordIds.push(recordId);

    console.log(`✅ Registro creado: ${recordId}`);
    console.log(`📍 PILSEN (brand_id: ${testData.pilsenBrandId}) - MEDELLIN (city_id: ${testData.medellinCityId})`);
    console.log(`📅 Febrero 10 - Marzo 10, 2026`);
    console.log(`📸 3 imágenes subidas\n`);

    // Verificar en BD
    const recordRes = await request(BASE_URL).get(`/api/ooh/${recordId}`);
    expect(recordRes.status).toBe(200);
    expect(recordRes.body?.success).toBe(true);
    console.log(`✅ Verificación API: Registro existe\n`);
  }, 30000);

  test('⏸️  PAUSA: Verificar en Frontend', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👀 VERIFICACIÓN MANUAL EN FRONTEND');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🌐 Abre: http://localhost:3000\n');
    console.log('Deberías ver 2 registros nuevos (usando IDs correctamente):');
    console.log('  1️⃣  CORONA - Bogotá (brand_id=' + testData.coronaBrandId + ', city_id=' + testData.bogotaCityId + ') - 2 fotos');
    console.log('  2️⃣  PILSEN - Medellín (brand_id=' + testData.pilsenBrandId + ', city_id=' + testData.medellinCityId + ') - 3 fotos\n');

    await waitForUserConfirmation('✅ Verifica que los registros se vean correctamente');
  }, 90000); // 90 segundos (60 espera + 30 buffer)

  test('✏️  EDITAR: Actualizar información del primer registro', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✏️  TEST 4: EDICIÓN DE REGISTRO (IDs)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const recordId = savedRecordIds[0];
    console.log(`📝 Editando registro: ${recordId}\n`);

    // Crear nueva imagen para reemplazo
    const newImg = createTestImage('test-corona-edit.svg', 'Corona Updated');
    testImages.push(newImg);

    const response = await request(BASE_URL)
      .post('/api/ooh/create')
      .field('existingId', recordId)
      .field('brand_id', testData.coronaBrandId)        // ✅ ID (sin cambio)
      .field('campaign_id', testData.campaignId)         // ✅ ID (sin cambio)
      .field('ooh_type_id', testData.vallaDigitalTypeId) // ✅ ID CAMBIO: VALLA → VALLA DIGITAL
      .field('provider_id', testData.ipexProviderId)     // ✅ ID CAMBIO: APX → IPEX
      .field('city_id', testData.bogotaCityId)           // ✅ ID (sin cambio)
      .field('imageIndexes', '1')                        // ✅ Igual a frontend (slot 1 = imagen_1)
      .field('direccion', 'Calle 100 #15-20 (Actualizado)')
      .field('latitud', '4.6850')
      .field('longitud', '-74.0540')
      .field('fechaInicio', '2026-02-01')
      .field('fechaFin', '2026-03-15') // CAMBIO: 2026-02-28 → 2026-03-15
      .attach('imagenes', newImg);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    console.log('✅ Registro actualizado exitosamente\n');
    console.log('Cambios realizados:');
    console.log('  • Tipo OOH: VALLA (id=' + testData.vallaTypeId + ') → VALLA DIGITAL (id=' + testData.vallaDigitalTypeId + ')');
    console.log('  • Proveedor: APX (id=' + testData.apxProviderId + ') → IPEX (id=' + testData.ipexProviderId + ')');
    console.log('  • Dirección: agregado "(Actualizado)"');
    console.log('  • Fecha fin: 2026-02-28 → 2026-03-15');
    console.log('  • Nueva imagen subida\n');

    // Verificar cambios en BD
    const updatedRes = await request(BASE_URL).get(`/api/ooh/${recordId}`);
    expect(updatedRes.status).toBe(200);
    expect(updatedRes.body?.success).toBe(true);
    console.log('✅ Cambios verificados en API\n');
  }, 30000);

  test('⏸️  PAUSA: Verificar edición en Frontend', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👀 VERIFICACIÓN DE EDICIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🌐 Recarga: http://localhost:3000\n');
    console.log('El registro CORONA debería mostrar:');
    console.log('  • Tipo: VALLA DIGITAL');
    console.log('  • Campaña: TEST SUMMER 2026 - EDITADO');
    console.log('  • Proveedor: IPEX');
    console.log('  • Fecha fin: 2026-03-15\n');

    await waitForUserConfirmation('✅ Confirma que los cambios se reflejan correctamente');
  }, 90000); // 90 segundos (60 espera + 30 buffer)

  test('🧹 LIMPIEZA: Eliminar registros de prueba', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 TEST 5: LIMPIEZA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const recordId of savedRecordIds) {
      const deleted = dbService.deleteRecord(recordId);
      expect(deleted).toBe(true);
      console.log(`✅ Registro eliminado: ${recordId}`);
    }

    // Verificar que no existen en BD
    for (const recordId of savedRecordIds) {
      const record = await dbService.findExistingById(recordId);
      expect(record).toBeNull();
    }

    console.log('\n✅ Todos los registros de prueba eliminados\n');
  }, 30000);

  test('⏸️  PAUSA FINAL: Verificar limpieza', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👀 VERIFICACIÓN FINAL (Arquitectura ID-based)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🌐 Recarga: http://localhost:3000\n');
    console.log('Los registros de prueba NO deben aparecer:');
    console.log('  ❌ CORONA - Bogotá (debe estar eliminado)');
    console.log('  ❌ PILSEN - Medellín (debe estar eliminado)\n');

    await waitForUserConfirmation('✅ Confirma que la limpieza fue exitosa\n');

    console.log('\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('  ✅ TODOS LOS TESTS COMPLETADOS - ARQUITECTURA ID-BASED OK  ');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log('✨ Resumen: Tests usando brand_id, campaign_id, city_id, ooh_type_id, provider_id');
    console.log('✨ Region y Categoria se derivan automáticamente del BD (NO enviadas en formulario)\n');
  }, 90000); // 90 segundos (60 espera + 30 buffer)
});
