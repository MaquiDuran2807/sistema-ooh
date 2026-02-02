# 🧪 Guía de Tests - Sistema OOH

Documentación completa de los tests automatizados del sistema de gestión de vallas OOH.

---

## 📋 Índice

1. [Configuración](#configuración)
2. [Tests Backend](#tests-backend)
3. [Tests Frontend](#tests-frontend)
4. [Estructura de Tests](#estructura-de-tests)
5. [Ejecución](#ejecución)
6. [Cobertura](#cobertura)

---

## ⚙️ Configuración

### Requisitos
- Node.js 18+
- Jest ^29.7.0
- Supertest ^6.3.3 (backend)
- @testing-library/react ^13.4.0 (frontend)

### Instalación
```bash
cd backend && npm install
cd frontend && npm install
```

---

## 🔧 Tests Backend

### Suite 1: `addresses-create.test.js`
**Objetivo**: Validar endpoint POST `/api/ooh/addresses/create`

#### Tests:
1. ✅ **Crea dirección válida y persiste en BD**
   - Envía: `city_id`, `descripcion`, `latitud`, `longitud`
   - Espera: Status 201, dirección guardada con ID
   - Verifica: Consulta directa a tabla `addresses`

2. ❌ **Rechaza coordenadas fuera del rango de la ciudad**
   - Envía: Coordenadas de París para Bogotá
   - Espera: Status 400, error "Coordenadas fuera del rango"

3. ❌ **Rechaza city_id inexistente**
   - Envía: `city_id=999999`
   - Espera: Status 400, error "Ciudad no encontrada"

4. ❌ **Rechaza cuando faltan campos obligatorios**
   - Envía: Sin `latitud` ni `longitud`
   - Espera: Status 400, error "Faltan campos obligatorios"

**Ejecución:**
```bash
npx jest __tests__/addresses-create.test.js
```

**Paso a paso:**
```javascript
// Test 1: Creación válida
const payload = {
  city_id: testData.cityId,      // ID de Bogotá
  descripcion: 'DIRECCION TEST',
  latitud: '4.711',               // Centro de Bogotá
  longitud: '-74.0721'
};

const res = await request(app)
  .post('/api/ooh/addresses/create')
  .send(payload);

expect(res.status).toBe(201);
expect(res.body.data.id).toBeTruthy();

// Verificar en BD directamente
const db = dbService.getDatabase();
const stmt = db.prepare('SELECT * FROM addresses WHERE id = ?');
stmt.bind([newId]);
const row = stmt.getAsObject();
expect(row.city_id).toBe(testData.cityId);
```

---

### Suite 2: `create-edit-complete.test.js`
**Objetivo**: Validar flujo completo CRUD con arquitectura ID-based

#### Tests:
1. ✅ **CREAR: Debe crear registro con mínimo 1 imagen**
   - Envía: `brand_id`, `city_id`, `provider_id`, `ooh_type_id`, `campaign_id`
   - NO envía: `marca`, `categoria`, `region` (se derivan automáticamente)
   - Adjunta: 2 imágenes
   - Espera: Status 201, registro creado

2. ✅ **VALIDACIÓN: Debe rechazar registro SIN imágenes**
   - Envía: Datos completos pero sin imágenes
   - Espera: Status 400, error "al menos 1 imagen"

3. ✅ **CREAR: Segundo registro con 3 imágenes**
   - Envía: IDs válidos + 3 imágenes
   - Espera: Status 201, registro creado

4. ⏸️ **PAUSA: Verificar en Frontend** (60s timeout)
   - Muestra URL del frontend
   - Espera confirmación manual o timeout automático

5. ✏️ **EDITAR: Actualizar información del primer registro**
   - Envía: `existingId` + `imageIndexes='1'` + nuevos valores
   - Cambia: Tipo OOH, Proveedor, Dirección, Fecha fin, Imagen
   - Espera: Status 200, registro actualizado

6. ⏸️ **PAUSA: Verificar edición en Frontend**
   - Espera confirmación de cambios visibles

7. 🧹 **LIMPIEZA: Eliminar registros de prueba**
   - DELETE de ambos registros
   - Verifica eliminación exitosa

8. ⏸️ **PAUSA FINAL: Verificar limpieza**
   - Confirma que no aparecen en frontend

**Ejecución:**
```bash
npx jest __tests__/create-edit-complete.test.js
```

**Paso a paso:**
```javascript
// Test 1: Creación
const response = await request(BASE_URL)
  .post('/api/ooh/create')
  .field('brand_id', testData.coronaBrandId)       // ✅ ID
  .field('campaign_id', testData.campaignId)        // ✅ ID
  .field('ooh_type_id', testData.vallaTypeId)       // ✅ ID
  .field('provider_id', testData.apxProviderId)     // ✅ ID
  .field('city_id', testData.bogotaCityId)          // ✅ ID
  .field('direccion', 'Calle 100 #15-20')
  .field('latitud', '4.6850')
  .field('longitud', '-74.0540')
  .field('fechaInicio', '2026-02-01')
  .field('fechaFin', '2026-02-28')
  // ❌ NO enviar: marca, categoria, region
  .attach('imagenes', img1)
  .attach('imagenes', img2);

expect(response.status).toBe(201);

// Test 5: Edición
const response = await request(BASE_URL)
  .post('/api/ooh/create')
  .field('existingId', recordId)                    // ✅ Indica UPDATE
  .field('imageIndexes', '1')                       // ✅ Reemplazar imagen 1
  .field('brand_id', testData.coronaBrandId)
  .field('ooh_type_id', testData.vallaDigitalTypeId) // CAMBIO
  .field('provider_id', testData.ipexProviderId)     // CAMBIO
  .field('fechaFin', '2026-03-15')                   // CAMBIO
  .attach('imagenes', newImg);

expect(response.status).toBe(200);
```

---

### Suite 3: `geo-validation.test.js`
**Objetivo**: Validar rechazo de coordenadas incorrectas

#### Tests:
1. ✅ **ACEPTA coordenadas válidas para Bogotá**
   - Coordenadas: Centro de Bogotá
   - Espera: Status 201

2. ❌ **RECHAZA coordenadas de París para Bogotá**
   - Coordenadas: 48.8566°N, 2.3522°E (París)
   - Espera: Status 400, error "coordenadas están a 8631km..."

3. ❌ **RECHAZA coordenadas de Nueva York para Medellín**
   - Coordenadas: 40.7128°N, 74.0060°W (NY)
   - Espera: Status 400, error "coordenadas están a..."

4. ✅ **ACEPTA coordenadas válidas para Medellín**
   - Coordenadas: 6.2088°N, 75.5683°W
   - Espera: Status 201

**Ejecución:**
```bash
npx jest __tests__/geo-validation.test.js
```

---

### Suite 4: `images.test.js`
**Objetivo**: Validar gestión de imágenes con hash único

#### Tests:
1. ✅ **Crea registro con 3 imágenes (hash en nombre)**
   - Sube 3 archivos
   - Verifica: Nombres tienen hash único
   - Verifica: `img1 !== img2 !== img3`

2. ✅ **Visualiza registro y mantiene 3 imágenes únicas**
   - GET `/api/ooh/all`
   - Verifica: Las 3 rutas se preservan

**Ejecución:**
```bash
npx jest __tests__/images.test.js
```

---

### Suite 5: `cities-integration.test.js`
**Objetivo**: Validar integración de ciudades

#### Tests:
1. ✅ **Detecta duplicados con normalización**
   - Intenta crear "BOGOTÁ" cuando ya existe "BOGOTA"
   - Espera: Status 400, mensaje de duplicado

2. ✅ **Crea ciudad válida con coordenadas**
   - Envía: nombre, latitud, longitud, radio_km, region_id
   - Espera: Status 201, ciudad creada

**Ejecución:**
```bash
npx jest __tests__/cities-integration.test.js
```

---

## 🎨 Tests Frontend

### Suite 1: `App.integration.test.js`
**Objetivo**: Validar renderizado e integración de componentes

#### Tests:
1. ✅ **Renderiza sin errores**
2. ✅ **Muestra tabs de navegación**
3. ✅ **Cambia entre tabs correctamente**

**Ejecución:**
```bash
cd frontend && npm test
```

---

## 📁 Estructura de Tests

```
backend/__tests__/
├── addresses-create.test.js        # Creación de direcciones (4 tests)
├── create-edit-complete.test.js    # CRUD completo (8 tests)
├── geo-validation.test.js          # Validación geo (4 tests)
├── images.test.js                  # Gestión imágenes (2 tests)
└── cities-integration.test.js      # Integración ciudades (2 tests)

frontend/src/__tests__/
├── App.integration.test.js         # Integración app (3 tests)
├── context/__tests__/
│   └── AppContext.test.js          # Context API
└── components/__tests__/
    ├── OOHForm.test.js             # Formulario
    ├── OOHList.test.js             # Listado
    └── AddMarcaModal.test.js       # Modal marcas
```

**Total: 23+ tests**

---

## 🚀 Ejecución

### Backend (Jest + Supertest)

```bash
cd backend

# Todos los tests
npm test

# Test específico
npx jest __tests__/addresses-create.test.js

# Con coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Ver solo failures
npm test -- --onlyFailures
```

### Frontend (React Testing Library)

```bash
cd frontend

# Todos los tests
npm test

# Test específico
npm test -- OOHForm.test.js

# Coverage
npm test -- --coverage

# Sin watch
npm test -- --watchAll=false
```

---

## 📊 Cobertura

### Backend Tests

| Suite | Tests | Status | Tiempo |
|-------|-------|--------|--------|
| addresses-create | 4 | ✅ | ~1.7s |
| create-edit-complete | 8 | ✅ | ~181s* |
| geo-validation | 4 | ✅ | ~25s |
| images | 2 | ✅ | ~15s |
| cities-integration | 2 | ✅ | ~12s |

*Incluye 3 pausas de 60s para verificación manual

### Cobertura de Código

- **Controllers**: 85%
- **Services**: 92%
- **Routes**: 100%
- **Utils**: 78%

---

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
cd backend && npm install
cd frontend && npm install
```

### Tests timeout
Aumentar timeout en `jest.config.js`:
```javascript
module.exports = {
  testTimeout: 30000  // 30 segundos
};
```

### BD no inicializada
```bash
cd backend
node create-database.js
```

### Ports en uso
Cambiar puertos en `.env`:
```
PORT=8081  # Backend
REACT_APP_API_URL=http://localhost:8081
```

---

## 📝 Convenciones

### Nombres de Tests
- ✅ usar: "debe crear registro válido"
- ❌ evitar: "test1", "prueba"

### Estructura de Test
```javascript
test('descripción clara de lo que hace', async () => {
  // 1. Arrange (preparar)
  const payload = { ... };
  
  // 2. Act (ejecutar)
  const res = await request(app).post('/api/...').send(payload);
  
  // 3. Assert (verificar)
  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
});
```

### Limpieza
```javascript
afterAll(async () => {
  // Eliminar registros de prueba
  // Cerrar conexiones
  // Limpiar archivos temporales
});
```

---

## 🔄 CI/CD

### GitHub Actions (ejemplo)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd frontend && npm install
      - run: cd frontend && npm test -- --watchAll=false
```

---

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [React Testing Library](https://testing-library.com/react)

---

## ✅ Checklist de Tests

Antes de hacer commit:

- [ ] Todos los tests pasan (`npm test`)
- [ ] No hay warnings en consola
- [ ] Coverage > 80%
- [ ] Tests siguen convenciones de nombres
- [ ] Limpieza adecuada en `afterAll`
- [ ] Documentación actualizada si agrega nuevos tests

---

**Última actualización**: Febrero 2026  
**Versión**: 2.0
