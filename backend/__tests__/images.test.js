const fs = require('fs');
const path = require('path');
const request = require('supertest');

const TEST_DB = path.join(__dirname, '..', 'ooh_data.test.db');
process.env.NODE_ENV = 'test';
process.env.DB_FILE_PATH = TEST_DB;

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
    cleanTestArtifacts();
    await start();
  });

  afterAll(() => {
    cleanTestArtifacts();
  });

  let createdId = null;
  let initialImages = [];

  test('crea registro con 3 imágenes (hash en nombre)', async () => {
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
    expect(img1).toMatch(/TEST_BRAND/);
    expect(img1).toMatch(/_/); // contiene id_hash
    expect(img1).not.toBe(img2);
    expect(img2).not.toBe(img3);
    expect(img1).not.toBe(img3);
    createdId = res.body.data.id;
    initialImages = [img1, img2, img3];
  });

  test('visualiza registro y mantiene 3 imágenes únicas', async () => {
    const res = await request(app).get('/api/ooh/all');
    expect(res.status).toBe(200);
    const found = res.body.data.find(r => r.id === createdId);
    expect(found).toBeTruthy();
    expect(found.imagen_1).toBe(initialImages[0]);
    expect(found.imagen_2).toBe(initialImages[1]);
    expect(found.imagen_3).toBe(initialImages[2]);
    expect(found.imagen_1).not.toBe(found.imagen_2);
  });

  test('edita solo una imagen y preserva las otras', async () => {
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
    const [newImg1, newImg2, newImg3] = res.body.data.imagenes;
    expect(newImg1).toBe(initialImages[0]); // preserva
    expect(newImg3).toBe(initialImages[2]); // preserva
    expect(newImg2).not.toBe(initialImages[1]); // cambiada
  });
});
