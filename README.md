# OOH Advertising Management System

Sistema local de gestión de publicidad OOH con frontend React, backend Node.js/Express y base de datos SQLite en memoria (sql.js) respaldada en disco, más almacenamiento local de imágenes.

## 🚀 Características

- ✅ **Formulario React** con Context API para compartir estado
- ✅ **API Node.js/Express** con subida y validación de imágenes
- ✅ **SQLite (sql.js)** con tablas relacionales (`brands`, `campaigns`, `ooh_types`, `ooh_records`)
- ✅ **Imágenes hash** guardadas en `backend/local-images/`
- ✅ **Scripts de arranque** para levantar backend y frontend en consolas separadas

## 📋 Campos del Formulario

- **Marca**
- **Campaña**
- **Tipo OOH** (según catálogo `ooh_types`)
- **Dirección**
- **3 Imágenes** (máx 5MB c/u)
- **Fecha de Vigencia**

## 🏗️ Estructura del Proyecto

```
nuevo ooh/
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── local-images/        # Carpeta de imágenes guardadas (hash)
│   └── start-dev.bat        # Instala deps, migra CSV y corre en dev
├── frontend/
│   └── start-frontend.bat   # Levanta React en localhost:3000
└── start-all.bat            # Levanta backend + frontend y abre el navegador
```

## ⚙️ Requisitos

- Node.js 18+ (incluye npm)
- Windows (scripts `.bat`)

## 🔧 Cómo ejecutar en local

Opción rápida (dos consolas + navegador):

```bash
start-all.bat
```

Esto llama a `backend/start-dev.bat` y `frontend/start-frontend.bat`, y abre http://localhost:3000.

Ejecución manual:

1) Backend

```bash
cd backend
start-dev.bat
```

- Instala dependencias si faltan
- Migra el CSV inicial a SQLite (tablas `brands`, `campaigns`, `ooh_types`, `ooh_records`)
- Levanta el servidor en http://localhost:8080

2) Frontend

```bash
cd frontend
start-frontend.bat
```

- Levanta React en http://localhost:3000 apuntando al backend local

## 🧪 Tests

### Ejecutar todos los tests a la vez:

```bash
start-all-tests.bat
```

Esto ejecuta:
1. **Backend Tests** - Jest + Supertest (Node.js)
2. **Frontend Tests** - React Testing Library

### Tests Individuales

**Backend:**
```bash
cd backend
start-tests.bat          # Ejecuta tests y cierra
npm test -- --watch     # Modo watch (desarrollo)
```

**Frontend:**
```bash
cd frontend
npm test                 # Modo watch interactivo
npm run test             # Ejecuta tests y muestra cobertura
```

### Cobertura de Tests

Los tests incluyen:

- **Unitarios**: Componentes individuales (AddMarcaModal, OOHForm, OOHList)
- **Contexto**: AppContext global y funciones de estado
- **Integración**: Flujos completos (crear registro → guardar → ver en lista)
- **Snapshots**: Validar cambios de UI
- **User Interactions**: Emular clicks, inputs, uploads
- **API Mocking**: Simular respuestas del backend

### Archivos de Test

```
frontend/
├── src/
│   ├── __tests__/
│   │   └── App.integration.test.js        # Tests de flujo completo
│   ├── components/
│   │   └── __tests__/
│   │       ├── AddMarcaModal.test.js      # Modal de agregar marca
│   │       ├── OOHForm.test.js            # Formulario principal
│   │       └── OOHList.test.js            # Lista de registros
│   └── context/
│       └── __tests__/
│           └── AppContext.test.js         # Estado global
└── setupTests.js                           # Configuración Jest

backend/
├── __tests__/
│   ├── images.test.js                      # Tests de imágenes
│   └── database.test.js                    # Tests de base de datos (si existe)
```

### Comandos Útiles

```bash
# Ejecutar tests específicos
npm test -- AddMarcaModal

# Modo watch
npm test -- --watch

# Cobertura detallada
npm test -- --coverage

# Tests sin watch
npm test -- --watchAll=false

# Tests con patrón específico
npm test -- --testNamePattern="renders modal"
```

### Snapshots

Los tests generan snapshots del componente. Si cambias UI y los tests fallan:

```bash
# Revisar cambios
npm test -- -u    # Actualizar snapshots después de revisar

# Ver diff
npm test -- --updateSnapshot
```

## ✅ Validación de Tests

Todos los tests deben pasar antes de hacer cambios. Usa:

```bash
start-all-tests.bat
```

Si algún test falla:
1. Lee el mensaje de error
2. Abre el archivo test correspondiente
3. Verifica la lógica del componente
4. Corre test nuevamente

## ℹ️ Notas sobre ejecutables

- No se distribuye un `.exe` para `start-all`; el arranque es vía `start-all.bat`.
- Si necesitas un lanzador único, puedes crear un acceso directo al `.bat` o empaquetar con herramientas tipo `pkg`, pero no está incluido en este repo.

## 📡 API (principales)

- `POST /api/ooh/create` — crea registro OOH con 3 imágenes (valida tamaño y tipo)
- `GET /api/ooh/all` — lista registros con joins a catálogos
- `GET /api/ooh/:id` — detalle por ID

## 💾 Almacenamiento de datos e imágenes

- Base relacional SQLite en memoria con persistencia en archivo; se carga/migra desde CSV al iniciar.
- Imágenes guardadas localmente en `backend/local-images/` con nombres hash + extensión original.
- Catálogos (`ooh_types`, `brands`, `campaigns`) normalizan los registros en `ooh_records`.

## 🐛 Troubleshooting rápido

- Si no arranca el backend, borra `node_modules` y vuelve a ejecutar `backend/start-dev.bat`.
- Si no ves datos, revisa que el CSV fuente esté accesible y que la migración haya corrido (se ejecuta al iniciar el backend).
- Si el frontend no carga, confirma que el backend está en http://localhost:8080 y reinicia `start-frontend.bat`.
 - Si el frontend no carga, confirma que el backend está en http://localhost:8080 y reinicia `start-frontend.bat`.
 
## ▶️ Nuevos scripts de arranque

Se añadieron scripts para facilitar el arranque local. Uso rápido:

- **`start-all.bat`**: instala dependencias si es necesario (usa `npm ci` cuando exista `package-lock.json`), ejecuta la migración CSV del backend y levanta backend + frontend en ventanas separadas. Ejecutar desde la raíz:

```powershell
cd "c:\Users\migduran\Documents\nuevo ooh"
.\start-all.bat
```

- **`start-direct.bat`**: arranca backend y frontend directamente (no instala dependencias). Útil cuando ya instalaste `node_modules` en ambas carpetas:

```powershell
cd "c:\Users\migduran\Documents\nuevo ooh"
.\start-direct.bat
```

- **Arranque manual (rápido)**:

```powershell
cd backend
npm run dev

cd ../frontend
npm run dev   # o npm start
```

- **Solución rápida: `react-scripts` no encontrado**

Si ves "react-scripts no se reconoce", corrige la versión y reinstala:

```powershell
cd frontend
npm install react-scripts@5.0.1 --save
if (Test-Path package-lock.json) { npm ci } else { npm install }
npm run dev
```

Esto instala el paquete correcto y recrea `node_modules` para que `react-scripts` esté disponible.

Si prefieres que el script instale automáticamente dependencias cuando falta `node_modules`, puedo actualizar `start-direct.bat` o `start-all.bat` para hacerlo.

## 📄 Licencia

Proyecto disponible bajo licencia libre.
