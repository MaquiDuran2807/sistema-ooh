const fs = require('fs');
const path = require('path');
const request = require('supertest');
const dbService = require('../services/dbService');

process.env.NODE_ENV = 'test';

console.log('\n🌍 Iniciando test de validación geográfica...');
console.log('   Usando BD principal para tests');

const { app, start } = require('../server');

const cleanTestArtifacts = () => {
  console.log('📋 Usando BD principal - sin limpieza necesaria');
};

describe('🌍 Validación Geográfica de Coordenadas', () => {
  let testData = {};

  beforeAll(async () => {
    console.log('\n📋 [beforeAll] Limpiando artefactos de prueba...');
    cleanTestArtifacts();
    console.log('🚀 [beforeAll] Iniciando servidor...');
    await start();
    console.log('✅ [beforeAll] Servidor listo para tests\n');

    // Obtener IDs de base de datos
    console.log('📊 [beforeAll] Cargando datos maestros...');
    
    // Marcas (ID-based)
    const coronaBrand = await dbService.getBrandByName('CORONA');
    const pilsenBrand = await dbService.getBrandByName('PILSEN');
    
    // Ciudades (ID-based) - ajustar nombres según base de datos
    const bogotaCity = await dbService.getCityByName('BOGOTA');
    const medellinCity = await dbService.getCityByName('MEDELLIN');
    const cartagenaCity = await dbService.getCityByName('CARTAGENA');
    
    // Proveedores (ID-based)
    const apxProvider = await dbService.getProviderByName('APX');
    
    // Tipos OOH (ID-based)
    const vallaType = await dbService.getOOHTypeByName('VALLA');
    
    // Campañas (ID-based) - usar campaña existente
    const testCampaign = await dbService.getCampaignByName('100 YEARS');

    testData = {
      coronaBrandId: coronaBrand?.id,
      pilsenBrandId: pilsenBrand?.id,
      bogotaCityId: bogotaCity?.id,
      medellinCityId: medellinCity?.id,
      cartagenaCityId: cartagenaCity?.id,
      apxProviderId: apxProvider?.id,
      vallaTypeId: vallaType?.id,
      testCampaignId: testCampaign?.id
    };

    console.log('✅ Datos maestros cargados\n');
  });

  afterAll(() => {
    console.log('\n🧹 [afterAll] Limpiando artefactos finales...');
    cleanTestArtifacts();
    console.log('✅ [afterAll] Tests completados\n');
  });

  test('✅ ACEPTA coordenadas válidas para Bogotá', async () => {
    console.log('\n✅ TEST: Coordenadas válidas para Bogotá');
    
    const res = await request(app)
      .post('/api/ooh/create')
      // ID-based fields (required)
      .field('brand_id', testData.coronaBrandId)
      .field('city_id', testData.bogotaCityId)
      .field('provider_id', testData.apxProviderId)
      .field('ooh_type_id', testData.vallaTypeId)
      .field('campaign_id', testData.testCampaignId)
      // Auto-derived fields (NOT sent - will be computed from relationships)
      // categoria: auto-derived from brand_id
      // region: auto-derived from city_id
      .field('direccion', 'Carrera 7 #100')
      .field('latitud', '4.7110')
      .field('longitud', '-74.0721')
      .field('fechaInicio', '2026-01-15')
      .field('fechaFin', '2026-03-15')
      .attach('imagenes', Buffer.from('imagen-1-data'), 'img1.jpg')
      .attach('imagenes', Buffer.from('imagen-2-data'), 'img2.jpg')
      .attach('imagenes', Buffer.from('imagen-3-data'), 'img3.jpg');

    console.log(`   Status: ${res.status}`);
    expect(res.status).toBe(201);
    console.log(`   ✅ Coordenadas de Bogotá aceptadas correctamente`);
  });

  test('❌ RECHAZA coordenadas de París para Bogotá', async () => {
    console.log('\n❌ TEST: Coordenadas de París para Bogotá (debe rechazar)');
    
    // París: 48.8566° N, 2.3522° E
    const res = await request(app)
      .post('/api/ooh/create')
      // ID-based fields (required)
      .field('brand_id', testData.coronaBrandId)
      .field('city_id', testData.bogotaCityId)
      .field('provider_id', testData.apxProviderId)
      .field('ooh_type_id', testData.vallaTypeId)
      .field('campaign_id', testData.testCampaignId)
      // Auto-derived fields (NOT sent)
      .field('direccion', 'Carrera 7 #100')
      .field('latitud', '48.8566')
      .field('longitud', '2.3522')
      .field('fechaInicio', '2026-01-15')
      .field('fechaFin', '2026-03-15')
      .attach('imagenes', Buffer.from('imagen-1-data'), 'img1.jpg')
      .attach('imagenes', Buffer.from('imagen-2-data'), 'img2.jpg')
      .attach('imagenes', Buffer.from('imagen-3-data'), 'img3.jpg');

    console.log(`   Status: ${res.status}`);
    console.log(`   Error: ${res.body.error}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('coordenadas están a');
    console.log(`   ✅ Coordenadas de París fueron rechazadas correctamente`);
  });

  test('❌ RECHAZA coordenadas de Nueva York para Medellín', async () => {
    console.log('\n❌ TEST: Coordenadas de Nueva York para Medellín (debe rechazar)');
    
    // Nueva York: 40.7128° N, 74.0060° W
    const res = await request(app)
      .post('/api/ooh/create')
      // ID-based fields (required)
      .field('brand_id', testData.coronaBrandId)
      .field('city_id', testData.medellinCityId)
      .field('provider_id', testData.apxProviderId)
      .field('ooh_type_id', testData.vallaTypeId)
      .field('campaign_id', testData.testCampaignId)
      // Auto-derived fields (NOT sent)
      .field('direccion', 'Carrera 7 #100')
      .field('latitud', '40.7128')
      .field('longitud', '-74.0060')
      .field('fechaInicio', '2026-01-15')
      .field('fechaFin', '2026-03-15')
      .attach('imagenes', Buffer.from('imagen-1-data'), 'img1.jpg')
      .attach('imagenes', Buffer.from('imagen-2-data'), 'img2.jpg')
      .attach('imagenes', Buffer.from('imagen-3-data'), 'img3.jpg');

    console.log(`   Status: ${res.status}`);
    console.log(`   Error: ${res.body.error}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('coordenadas están a');
    console.log(`   ✅ Coordenadas de Nueva York fueron rechazadas correctamente`);
  });

  test('✅ ACEPTA coordenadas válidas para Medellín', async () => {
    console.log('\n✅ TEST: Coordenadas válidas para Medellín');
    
    // Medellín centro: 6.2442° N, 75.5812° W
    const res = await request(app)
      .post('/api/ooh/create')
      // ID-based fields (required)
      .field('brand_id', testData.pilsenBrandId)
      .field('city_id', testData.medellinCityId)
      .field('provider_id', testData.apxProviderId)
      .field('ooh_type_id', testData.vallaTypeId)
      .field('campaign_id', testData.testCampaignId)
      // Auto-derived fields (NOT sent)
      .field('direccion', 'Carrera 49 #50')
      .field('latitud', '6.2442')
      .field('longitud', '-75.5812')
      .field('fechaInicio', '2026-01-15')
      .field('fechaFin', '2026-03-15')
      .attach('imagenes', Buffer.from('imagen-1-data'), 'img1.jpg')
      .attach('imagenes', Buffer.from('imagen-2-data'), 'img2.jpg')
      .attach('imagenes', Buffer.from('imagen-3-data'), 'img3.jpg');

    console.log(`   Status: ${res.status}`);
    expect(res.status).toBe(201);
    console.log(`   ✅ Coordenadas de Medellín aceptadas correctamente`);
  });

  test('✅ ACEPTA coordenadas válidas para Cartagena', async () => {
    console.log('\n✅ TEST: Coordenadas válidas para Cartagena');
    
    // Cartagena: 10.3910° N, 75.5136° W
    const res = await request(app)
      .post('/api/ooh/create')
      // ID-based fields (required)
      .field('brand_id', testData.coronaBrandId)
      .field('city_id', testData.cartagenaCityId)
      .field('provider_id', testData.apxProviderId)
      .field('ooh_type_id', testData.vallaTypeId)
      .field('campaign_id', testData.testCampaignId)
      // Auto-derived fields (NOT sent)
      .field('direccion', 'Centro Histórico')
      .field('latitud', '10.3910')
      .field('longitud', '-75.5136')
      .field('fechaInicio', '2026-01-15')
      .field('fechaFin', '2026-03-15')
      .attach('imagenes', Buffer.from('imagen-1-data'), 'img1.jpg')
      .attach('imagenes', Buffer.from('imagen-2-data'), 'img2.jpg')
      .attach('imagenes', Buffer.from('imagen-3-data'), 'img3.jpg');

    console.log(`   Status: ${res.status}`);
    expect(res.status).toBe(201);
    console.log(`   ✅ Coordenadas de Cartagena aceptadas correctamente`);
  });

  test('❌ RECHAZA ciudad no reconocida', async () => {
    console.log('\n❌ TEST: Ciudad no reconocida (debe rechazar)');
    
    const res = await request(app)
      .post('/api/ooh/create')
      // ID-based fields (required) - city_id será inválido
      .field('brand_id', testData.coronaBrandId)
      .field('city_id', '99999')
      .field('provider_id', testData.apxProviderId)
      .field('ooh_type_id', testData.vallaTypeId)
      .field('campaign_id', testData.testCampaignId)
      // Auto-derived fields (NOT sent)
      .field('direccion', 'Carrera 7 #100')
      .field('latitud', '4.7110')
      .field('longitud', '-74.0721')
      .field('fechaInicio', '2026-01-15')
      .field('fechaFin', '2026-03-15')
      .attach('imagenes', Buffer.from('imagen-1-data'), 'img1.jpg')
      .attach('imagenes', Buffer.from('imagen-2-data'), 'img2.jpg')
      .attach('imagenes', Buffer.from('imagen-3-data'), 'img3.jpg');

    console.log(`   Status: ${res.status}`);
    console.log(`   Error: ${res.body.error}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no encontrada'); // Cambiar de 'no reconocida' a 'no encontrada'
    console.log(`   ✅ Ciudad no reconocida fue rechazada correctamente`);
  });

  test('❌ RECHAZA latitud inválida', async () => {
    console.log('\n❌ TEST: Latitud inválida (debe rechazar)');
    
    const res = await request(app)
      .post('/api/ooh/create')
      // ID-based fields (required)
      .field('brand_id', testData.coronaBrandId)
      .field('city_id', testData.bogotaCityId)
      .field('provider_id', testData.apxProviderId)
      .field('ooh_type_id', testData.vallaTypeId)
      .field('campaign_id', testData.testCampaignId)
      // Auto-derived fields (NOT sent)
      .field('direccion', 'Carrera 7 #100')
      .field('latitud', '95.0000')
      .field('longitud', '-74.0721')
      .field('fechaInicio', '2026-01-15')
      .field('fechaFin', '2026-03-15')
      .attach('imagenes', Buffer.from('imagen-1-data'), 'img1.jpg')
      .attach('imagenes', Buffer.from('imagen-2-data'), 'img2.jpg')
      .attach('imagenes', Buffer.from('imagen-3-data'), 'img3.jpg');

    console.log(`   Status: ${res.status}`);
    console.log(`   Error: ${res.body.error}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Latitud debe estar entre');
    console.log(`   ✅ Latitud inválida fue rechazada correctamente`);
  });
});
