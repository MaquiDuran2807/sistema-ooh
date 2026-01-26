# 🧪 Guía Completa de Tests

## Resumen Ejecutivo

✅ **Estado Global**: Implementado con Context API (AppContext.js)
- Brands, OohTypes, Records centralizados
- Funciones: fetchBrands, fetchOohTypes, createBrand, createOohType, saveRecord

✅ **Tests Automatizados**: React Testing Library + Jest
- Unitarios: Cada componente probado aisladamente
- Integración: Flujos completos de usuario
- Snapshots: Validar cambios de UI

✅ **Ejecución**: `start-all-tests.bat` dispara todo

---

## 1. Estado Global (Context API)

### ¿Qué usa el estado global?

Todos los componentes principales leen del contexto:

```javascript
// En OOHForm.js
const { fetchBrands, fetchOohTypes, createBrand, createOohType, saveRecord } = useApp();

// En OOHList.js
const { records, fetchRecords } = useApp();

// En AddMarcaModal.js
const { fetchBrands } = useApp();

// En DebugPanel.js
const appContext = useApp();  // Lee todo el contexto
```

### Estado disponible

```typescript
{
  brands: Array<{id, nombre, categoria}>,
  oohTypes: Array<{id, nombre}>,
  records: Array<{id, marca, campana, ...}>,
  loading: boolean,
  
  // Funciones
  fetchBrands: () => Promise<Array>,
  fetchOohTypes: () => Promise<Array>,
  fetchRecords: () => Promise<Array>,
  createBrand: (data) => Promise<{id, ...}>,
  createOohType: (data) => Promise<{id, ...}>,
  saveRecord: (data) => Promise<{id, ...}>
}
```

---

## 2. Estructura de Tests

### Frontend Tests

```
src/
├── __tests__/
│   └── App.integration.test.js         # Flujos completos
├── components/
│   └── __tests__/
│       ├── AddMarcaModal.test.js       # 10 tests
│       ├── OOHForm.test.js             # 12 tests
│       └── OOHList.test.js             # 7 tests
└── context/
    └── __tests__/
        └── AppContext.test.js           # 9 tests
```

**Total: 38+ tests del frontend**

### Backend Tests

```
backend/
└── __tests__/
    └── images.test.js                   # Tests de imágenes (existentes)
```

---

## 3. Ejecución de Tests

### Opción 1: Todos los tests a la vez (RECOMENDADO)

```bash
start-all-tests.bat
```

Ejecuta:
1. Backend tests (Node.js/Jest)
2. Frontend tests (React Testing Library)
3. Muestra resumen y cobertura

### Opción 2: Tests específicos

**Backend:**
```bash
cd backend
npm test                    # Ejecuta todos
npm test -- --watch        # Modo watch
npm test -- images         # Solo tests de imágenes
```

**Frontend:**
```bash
cd frontend
npm test                    # Modo watch (interactivo)
npm run test                # Ejecuta y cierra (con cobertura)
npm test -- AddMarcaModal   # Solo tests de AddMarcaModal
```

---

## 4. Qué Prueban los Tests

### AddMarcaModal.test.js (10 tests)

✅ Renderiza cuando isOpen=true
✅ No renderiza cuando isOpen=false
✅ Muestra contador de marcas desde servidor
✅ Permite ingresar nombre de marca
✅ Permite seleccionar categoría
✅ Valida que nombre es obligatorio
✅ Valida que categoría es obligatoria
✅ Llama onAdd con datos correctos
✅ Cierra modal después de enviar
✅ Limpia formulario al cancelar

### OOHForm.test.js (12 tests)

✅ Renderiza todos los campos
✅ Carga marcas al montar
✅ Carga tipos OOH al montar
✅ Permite ingresar datos
✅ Permite subir imágenes
✅ Valida campos requeridos
✅ Muestra preview de imagen
✅ Abre modal de Agregar Marca
✅ Abre modal de Agregar Ciudad
✅ Snapshot de formulario
✅ Llama onSuccess después de guardar
✅ Integración completa

### OOHList.test.js (7 tests)

✅ Renderiza el componente
✅ Muestra estado de carga
✅ Carga registros desde servidor
✅ Abre modal de detalles
✅ Filtra por marca
✅ Filtra por dirección
✅ Snapshot de lista

### AppContext.test.js (9 tests)

✅ Proporciona estado global
✅ Inicializa con arrays vacíos
✅ fetchBrands actualiza contexto
✅ fetchOohTypes actualiza contexto
✅ Proporciona createBrand
✅ Proporciona createOohType
✅ Proporciona saveRecord
✅ Estado loading funciona
✅ Contexto accesible en todos los hijos

### App.integration.test.js (10+ tests)

✅ Renderiza app con pestañas
✅ Pestaña de formulario por defecto
✅ Cambia de pestaña al hacer click
✅ Carga marcas en el mount
✅ Carga tipos OOH en el mount
✅ Flujo completo: crear marca → crear registro → ver en lista
✅ Debug panel muestra estado
✅ Cierra debug panel correctamente
✅ Snapshot de app completa
✅ Maneja errores de API

---

## 5. Cómo Leer Resultados de Tests

### Salida Exitosa

```
PASS  src/components/__tests__/AddMarcaModal.test.js
  AddMarcaModal
    ✓ renders modal when isOpen is true (45ms)
    ✓ does not render modal when isOpen is false (10ms)
    ✓ displays brand count when modal opens (120ms)
    ✓ allows user to input brand name (95ms)
    ...
  10 passed, 0 failed (850ms)

PASS  src/context/__tests__/AppContext.test.js
  AppContext - Global State
    ✓ provides global state to components (50ms)
    ✓ initializes with empty arrays (15ms)
    ...
  9 passed, 0 failed (600ms)

=============================== COVERAGE ================================
File              | % Stmts | % Branch | % Funcs | % Lines
------------------|---------|----------|---------|----------
All files         |   75.2  |   68.5   |   80.1  |   74.8
```

### Si Falla un Test

```
FAIL  src/components/__tests__/AddMarcaModal.test.js
  AddMarcaModal
    ✓ renders modal when isOpen is true
    ✗ does not render modal when isOpen is false
      Expected: undefined
      Received: HTMLElement

  Test Suites: 1 failed, 3 passed
  Tests:       1 failed, 37 passed, 38 total
```

**Pasos para arreglar:**
1. Lee el mensaje de error
2. Abre el archivo test (línea indicada)
3. Lee la lógica del componente
4. Ajusta el componente o el test
5. Corre nuevamente

---

## 6. Snapshots

Los snapshots capturan la salida HTML del componente para detectar cambios no deseados.

### Primer Snapshot

```bash
npm test -- -u
```

Esto crea archivos `.snap` con la salida actual.

### Revisar Cambios

Si cambias el componente y un test de snapshot falla:

```bash
npm test AddMarcaModal
```

Git mostrará el diff. Si los cambios son OK:

```bash
npm test -- -u
```

Esto actualiza el snapshot.

---

## 7. Mocks

Los tests mockean axios para no hacer requests reales:

```javascript
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ 
    data: { id: 1, marca: 'CORONA' } 
  })),
  get: jest.fn(() => Promise.resolve({ 
    data: [
      { id: 1, nombre: 'CORONA', categoria: 'CERVEZAS' }
    ]
  }))
}));
```

Esto permite tests rápidos sin depender del backend.

---

## 8. Emulación de User Interactions

Los tests emula lo que hace el usuario:

```javascript
// Abrir modal
await user.click(screen.getByText('Agregar Marca'));

// Escribir en campo
await user.type(input, 'CORONA');

// Seleccionar opción
await user.selectOptions(select, 'CERVEZAS');

// Subir archivo
await user.upload(fileInput, file);

// Hacer submit
await user.click(submitBtn);
```

Esto valida que los componentes funcionan como espera el usuario.

---

## 9. Próximas Mejoras

- [ ] Tests E2E con Cypress/Playwright (flujos completos en navegador real)
- [ ] Tests de rendimiento (Lighthouse, Web Vitals)
- [ ] Cobertura al 90%+ (actualmente ~75%)
- [ ] Tests de accesibilidad (ARIA labels, keyboard navigation)
- [ ] CI/CD pipeline (ejecutar tests en cada push)

---

## 10. Comandos Rápidos

```bash
# Todos los tests
start-all-tests.bat

# Solo frontend
cd frontend && npm test

# Modo watch
npm test -- --watch

# Con cobertura
npm test -- --coverage

# Un test específico
npm test -- AddMarcaModal

# Actualizar snapshots
npm test -- -u

# Tests del backend
cd backend && npm test
```

---

## ✅ Checklist Pre-Deploy

- [ ] Todos los tests pasan: `start-all-tests.bat`
- [ ] Cobertura > 70%
- [ ] Sin snapshots pendientes
- [ ] Sin warnings de ESLint
- [ ] Backend arranca: `backend/start-dev.bat`
- [ ] Frontend arranca: `frontend/start-frontend.bat`
- [ ] Puedo crear un registro desde cero
- [ ] Puedo ver registros en la lista
- [ ] Modal de detalles muestra datos correctos

---

**¡Los tests son tu red de seguridad para cambios futuros! 🎯**
