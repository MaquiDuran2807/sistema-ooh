const request = require('supertest');
const dbService = require('../services/dbService');

process.env.NODE_ENV = 'test';

console.log('\n🧪 Iniciando tests de creación de direcciones...');
console.log('   Usando BD principal para tests');

const { app, start } = require('../server');

describe('📍 Crear direcciones (addresses/create)', () => {
  let testData = {};
  const createdAddressIds = [];

  beforeAll(async () => {
    console.log('\n🚀 [beforeAll] Iniciando servidor...');
    await start();
    console.log('✅ [beforeAll] Servidor listo para tests\n');

    const bogotaCity = dbService.getCityByName('BOGOTA') || dbService.getCityByName('BOGOTA DC');

    if (!bogotaCity) {
      throw new Error('No se encontró ciudad de prueba (BOGOTA/BOGOTA DC) en la BD');
    }

    testData = {
      cityId: bogotaCity.id,
      cityName: bogotaCity.nombre,
      cityLat: bogotaCity.latitud,
      cityLng: bogotaCity.longitud
    };
  });

  afterAll(async () => {
    if (createdAddressIds.length === 0) return;

    const db = dbService.getDatabase();
    const stmt = db.prepare('DELETE FROM addresses WHERE id = ?');

    createdAddressIds.forEach((id) => {
      stmt.run([id]);
      stmt.reset();
    });

    stmt.free();
    await dbService.saveDB();
    console.log('🧹 [afterAll] Direcciones de prueba eliminadas');
  });

  test('✅ crea dirección válida y persiste en BD', async () => {
    const payload = {
      city_id: testData.cityId,
      descripcion: 'DIRECCION TEST AUTOMATICA #1',
      latitud: String(testData.cityLat),
      longitud: String(testData.cityLng)
    };

    const res = await request(app)
      .post('/api/ooh/addresses/create')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();
    expect(res.body.data.city_id).toBe(testData.cityId);
    expect(res.body.data.descripcion).toBe(payload.descripcion);

    const newId = res.body.data.id;
    expect(newId).toBeTruthy();
    createdAddressIds.push(newId);

    const db = dbService.getDatabase();
    const stmt = db.prepare('SELECT id, city_id, descripcion, latitud, longitud FROM addresses WHERE id = ?');
    stmt.bind([newId]);

    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();

    expect(row).toBeTruthy();
    expect(row.city_id).toBe(testData.cityId);
    expect(row.descripcion).toBe(payload.descripcion);
  });

  test('❌ rechaza coordenadas fuera del rango de la ciudad', async () => {
    const res = await request(app)
      .post('/api/ooh/addresses/create')
      .send({
        city_id: testData.cityId,
        descripcion: 'DIRECCION TEST FUERA DE RANGO',
        latitud: '48.8566',
        longitud: '2.3522'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Coordenadas fuera del rango');
  });

  test('❌ rechaza city_id inexistente', async () => {
    const res = await request(app)
      .post('/api/ooh/addresses/create')
      .send({
        city_id: 999999,
        descripcion: 'DIRECCION TEST CITY ID INVALIDO',
        latitud: '4.7110',
        longitud: '-74.0721'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Ciudad no encontrada');
  });

  test('❌ rechaza cuando faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/ooh/addresses/create')
      .send({
        city_id: testData.cityId,
        descripcion: 'DIRECCION SIN COORDENADAS'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Faltan campos obligatorios');
  });
});
