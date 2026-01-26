const fs = require('fs');
const path = require('path');
const request = require('supertest');

const TEST_DB = path.join(__dirname, '..', 'ooh_data.test.db');
process.env.NODE_ENV = 'test';
process.env.DB_FILE_PATH = TEST_DB;

console.log('\n🧪 Iniciando tests de imágenes...');
console.log(`   DB temporal: ${TEST_DB}`);

const { app, start } = require('../server');

const testBrandDir = path.join(__dirname, '..', 'local-images', 'TEST_BRAND');

const cleanTestArtifacts = () => {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  if (fs.existsSync(testBrandDir)) {
    fs.rmSync(testBrandDir, { recursive: true, force: true });
  }
};

describe('Imágenes OOH', () => {
  beforeAll(async () => {
    console.log('📋 [beforeAll] Limpiando artefactos de prueba...');
    cleanTestArtifacts();
    console.log('🚀 [beforeAll] Iniciando servidor...');
    await start();
    console.log('✅ [beforeAll] Servidor listo para tests\n');
  });

  afterAll(() => {
    console.log('\n🧹 [afterAll] Limpiando artefactos finales...');
    cleanTestArtifacts();
    console.log('✅ [afterAll] Tests completados\n');
  });

  let createdId = null;
  let initialImages = [];

  test('crea registro con 3 imágenes (hash en nombre)', async () => {
    console.log('\n📸 TEST: Crear registro con 3 imágenes');
    const res = await request(app)
      .post('/api/ooh/create')
      .field('marca', 'TEST BRAND')
      .field('categoria', 'TEST CAT')
      .field('proveedor', 'TEST PROV')
      .field('tipoOOH', 'VALLA')
      .field('campana', 'CAMP')
      .field('direccion', 'DIR 1')
      .field('ciudad', 'CITY')
      .field('region', 'REG')
      .field('latitud', '1')
      .field('longitud', '2')
      .field('fechaInicio', '2026-01-01')
      .field('fechaFin', '2026-01-31')
      .attach('imagenes', Buffer.from('image-one'), 'one.jpg')
      .attach('imagenes', Buffer.from('image-two'), 'two.jpg')
      .attach('imagenes', Buffer.from('image-three'), 'three.jpg');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imagenes).toHaveLength(3);
    const [img1, img2, img3] = res.body.data.imagenes;
    console.log('   ✅ Status 201 - Registro creado');
    console.log(`   📷 3 imágenes generadas con hash`);
    console.log(`      img1: ${img1.substring(img1.length-30)}`);
    console.log(`      img2: ${img2.substring(img2.length-30)}`);
    console.log(`      img3: ${img3.substring(img3.length-30)}`);
    expect(img1).toMatch(/TEST_BRAND/);
    expect(img1).toMatch(/_/); // contiene id_hash
    expect(img1).not.toBe(img2);
    expect(img2).not.toBe(img3);
    expect(img1).not.toBe(img3);
    createdId = res.body.data.id;
    initialImages = [img1, img2, img3];
    console.log(`   🆔 ID registro: ${createdId}`);
  });

  test('visualiza registro y mantiene 3 imágenes únicas', async () => {
    console.log('\n📋 TEST: Visualizar registro');
    const res = await request(app).get('/api/ooh/all');
    expect(res.status).toBe(200);
    console.log(`   ✅ Status 200 - ${res.body.data.length} registros encontrados`);
    const found = res.body.data.find(r => r.id === createdId);
    expect(found).toBeTruthy();
    console.log(`   ✅ Registro encontrado con ID: ${createdId}`);
    expect(found.imagen_1).toBe(initialImages[0]);
    expect(found.imagen_2).toBe(initialImages[1]);
    expect(found.imagen_3).toBe(initialImages[2]);
    console.log(`   ✅ Las 3 imágenes se preservaron correctamente`);
    expect(found.imagen_1).not.toBe(found.imagen_2);
  });

  test('edita solo una imagen y preserva las otras', async () => {
    console.log('\n✏️ TEST: Editar una imagen específica');
    const res = await request(app)
      .post('/api/ooh/create')
      .field('existingId', createdId)
      .field('marca', 'TEST BRAND')
      .field('categoria', 'TEST CAT')
      .field('proveedor', 'TEST PROV')
      .field('tipoOOH', 'VALLA')
      .field('campana', 'CAMP')
      .field('direccion', 'DIR 1')
      .field('ciudad', 'CITY')
      .field('region', 'REG')
      .field('latitud', '1')
      .field('longitud', '2')
      .field('fechaInicio', '2026-01-01')
      .field('fechaFin', '2026-01-31')
      .field('imageIndexes', '2') // reemplaza la segunda (slot 2 -> idx1)
      .attach('imagenes', Buffer.from('image-two-new'), 'two-new.jpg');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    console.log(`   ✅ Status 200 - Registro actualizado`);
    const [newImg1, newImg2, newImg3] = res.body.data.imagenes;
    console.log(`   📷 Imagen 1 (preservada): ${newImg1.substring(newImg1.length-30)}`);
    console.log(`   📷 Imagen 2 (NEW):        ${newImg2.substring(newImg2.length-30)}`);
    console.log(`   📷 Imagen 3 (preservada): ${newImg3.substring(newImg3.length-30)}`);
    expect(newImg1).toBe(initialImages[0]); // preserva
    expect(newImg3).toBe(initialImages[2]); // preserva
    expect(newImg2).not.toBe(initialImages[1]); // cambiada
  });
});
