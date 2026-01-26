# 👥 Para el Equipo - Instrucciones Finales

## 📋 Cómo Trabajar Con Este Proyecto

### 1️⃣ Primer Día - Setup Inicial

```bash
# Paso 1: Descargar/Clonar el proyecto
cd nuevo ooh

# Paso 2: Ejecutar el sistema
start-all.bat

# Paso 3: Abrir http://localhost:3000 (se abre automáticamente)

# Paso 4: Crear un registro de prueba
# - Rellena formulario
# - Sube 3 imágenes
# - Guarda
# - Verifica en "Ver Registros"

# Paso 5: Leer documentación rápida
# Abre QUICK_START.md (2 minutos)
```

**Resultado esperado:** App funcionando, registro creado, documentación leída

---

### 2️⃣ Entendiendo la Arquitectura

```bash
# Abre README.md y lee secciones:
# - Características
# - Estructura del Proyecto
# - API (principales)
# - Almacenamiento de datos

# Tiempo: 10 minutos
```

**Resultado esperado:** Entiendes qué hace cada componente

---

### 3️⃣ Viendo el Estado Global

```bash
# Con el sistema ejecutando (start-all.bat):

# 1. Ve a http://localhost:3000
# 2. Haz clic en botón 🐛 Debug (esquina inferior derecha)
# 3. Ve pestaña "Context Global"
# 4. Verás:
#    - Brands (marcas): número
#    - OOH Types (tipos): número
#    - Records (registros): número
#    - Loading: true/false

# Este es el estado global que todos los componentes comparten
```

**Resultado esperado:** Entiendes cómo funciona el state global

---

### 4️⃣ Viendo los Tests

```bash
# Opción 1: Ejecutar todos
start-all-tests.bat

# Opción 2: Ejecutar interactivo (frontend)
cd frontend
npm test
# Presiona 'a' para todos los tests

# Opción 3: Ejecutar test específico
npm test AddMarcaModal
```

**Resultado esperado:** 38+ tests pasan ✓

**Para entender:**
```bash
# Abre TESTS_GUIDE.md y lee:
# - Qué prueba cada test
# - Cómo leer resultados
# - Cómo escribir nuevos tests

# Tiempo: 15 minutos
```

---

### 5️⃣ Haciendo Cambios (IMPORTANTE)

#### ANTES de hacer cambios:

```bash
# 1. Ejecuta tests
start-all-tests.bat

# Resultado: 38 passed ✓
```

#### HACIENDO cambios:

```bash
# 1. Modifica el código
# 2. Si es un cambio importante, agrega un test
# 3. Guarda el archivo
```

#### DESPUÉS de cambios:

```bash
# 1. Ejecuta tests nuevamente
start-all-tests.bat

# 2. Si todos pasan (38+ passed ✓):
#    → Tu cambio es SEGURO
#
# 3. Si algún test falla:
#    → Lee el error
#    → Revisa tu cambio
#    → Ajusta el código
#    → Corre tests nuevamente
```

**Golden Rule:** 
```
SIN TEST FALLIDO = CAMBIO SEGURO
CON TEST FALLIDO = NO HACER COMMIT
```

---

### 6️⃣ Debugging Cuando Algo Falla

```bash
# Paso 1: Lee DEBUG_GUIDE.md
# Paso 2: Abre 🐛 Debug Panel
# Paso 3: Verifica Context Global
# Paso 4: Abre DevTools (F12) → Console
# Paso 5: Busca errores rojos
```

**Ejemplo:**
```
Usuario dice: "El modal está vacío"

Qué hacer:
1. Abre Debug Panel
2. Ve a Context Global
3. Si Brands: 0 → El problema es cargar datos
4. Si Brands: 15 → El problema es mostrar en UI
5. Abre Console y busca logs de error
```

---

### 7️⃣ Commit & Push (Git Workflow)

```bash
# 1. Haz cambios
# 2. Corre tests: start-all-tests.bat
# 3. Si pasan todos:

git status                  # Ver cambios
git add .                   # Agregar cambios
git commit -m "Descripción del cambio"
git push

# 4. Si tests fallan:
# NO hacer commit, arreglar primero
```

**Buen commit message:**
```
✅ Agrega validación de email en formulario

- Valida formato de email
- Muestra error si es inválido
- Test AddMarcaModal valida esto
- 38+ tests pasan ✓
```

---

### 8️⃣ Checklist para Nuevas Features

```
Cuando implementes una nueva feature:

ANTES:
- [ ] Revisa que tests actuales pasan: start-all-tests.bat

DURANTE:
- [ ] Escribe el código
- [ ] Escribe un test para la nueva feature
- [ ] Verifica que el test falla (rojo)
- [ ] Implementa la feature
- [ ] Verifica que el test pasa (verde)

DESPUÉS:
- [ ] Todos los tests pasan: start-all-tests.bat
- [ ] Documentación actualizada (si es relevante)
- [ ] Código sin errores de ESLint
- [ ] Haces commit

✓ LISTO PARA PUSH
```

---

### 9️⃣ Si Necesitas Ayuda

**¿Cómo ejecuto esto?**
→ QUICK_START.md (2 minutos)

**¿Algo no funciona?**
→ DEBUG_GUIDE.md (5 minutos)

**¿Cómo escribo un test?**
→ TESTS_GUIDE.md (15 minutos)

**¿Necesito validar el sistema?**
→ VALIDATION.md (20 minutos)

**¿Quiero ver qué cambió?**
→ CHANGELOG.md (10 minutos)

**¿Necesito entender todo?**
→ INDEX.md (índice de documentación)

---

## 📚 Documentación por Rol

### 👨‍💻 Frontend Developer

**Archivos importantes:**
- `frontend/src/context/AppContext.js` - Estado global
- `frontend/src/components/` - Componentes
- `README.md` - Cómo funciona todo
- `TESTS_GUIDE.md` - Cómo escribir tests

**Comando diario:**
```bash
cd frontend
npm test -- --watch    # Tests en modo watch mientras desarrollas
```

### 🔧 Backend Developer

**Archivos importantes:**
- `backend/server.js` - API
- `backend/services/dbService.js` - Lógica BD
- `README.md` - API endpoints
- `backend/__tests__/` - Tests

**Comando diario:**
```bash
cd backend
npm test -- --watch    # Tests en modo watch
```

### 🧪 QA/Tester

**Archivos importantes:**
- `VALIDATION.md` - Qué probar
- `QUICK_START.md` - Cómo ejecutar
- `DEBUG_GUIDE.md` - Cómo debuggear

**Comando:**
```bash
start-all-tests.bat    # Ejecutar todos los tests
```

### 📖 DevOps/Deployment

**Archivos importantes:**
- `README.md` - Setup
- `CHANGELOG.md` - Qué cambió
- `backend/start-dev.bat` - Backend setup
- `frontend/start-frontend.bat` - Frontend setup

---

## 🎯 Daily Standup Template

```
CADA MAÑANA:

1. ¿Qué hice ayer?
   - Describirlo en 1-2 líneas

2. ¿Qué hago hoy?
   - Describirlo en 1-2 líneas

3. ¿Tengo blockers?
   - Sí/No
   - Si sí → leer DEBUG_GUIDE.md

4. ¿Tests pasan?
   - start-all-tests.bat
   - Reportar resultado
```

---

## 🚨 Emergencias

### "Nada funciona"

```bash
# 1. Actualiza dependencias
cd frontend && npm install
cd backend && npm install

# 2. Limpia node_modules
rm -r frontend/node_modules
rm -r backend/node_modules

# 3. Reinstala
npm install

# 4. Corre tests
start-all-tests.bat
```

### "Un test falla"

```bash
# 1. Lee el error completo
start-all-tests.bat

# 2. Abre el archivo test mencionado
# Ej: src/components/__tests__/AddMarcaModal.test.js

# 3. Lee el test que falla
# 4. Revisa el componente correspondiente
# 5. Ajusta el código o el test
# 6. Corre nuevamente
```

### "Quiero rollback"

```bash
# 1. Git status (ver cambios)
git status

# 2. Revertir cambios no commiteados
git checkout -- .

# 3. Si commiteaste:
git revert HEAD
git push

# 4. Corre tests para validar
start-all-tests.bat
```

---

## 💡 Best Practices

### ✅ HACER:

```javascript
// 1. Usar Context API en lugar de props
const { brands } = useApp();

// 2. Escribir tests para cambios importantes
npm test -- --watch

// 3. Validar antes de commit
start-all-tests.bat

// 4. Leer documentación cuando tengas dudas
// ↑ Ahorras horas de debugging

// 5. Usar Debug Panel para debuggear
// Botón 🐛 Debug en esquina inferior derecha
```

### ❌ NO HACER:

```javascript
// 1. Props drilling
<Component brands={brands} types={types} records={records} />
// → Usa useApp() en lugar

// 2. console.log para debuggear
console.log(data);  // Mala práctica
// → Usa Debug Panel en lugar

// 3. Hacer cambios sin tests
// → Siempre escribe test para cambios

// 4. Ignorar advertencias de ESLint
// → Arregla todos los warnings

// 5. Hacer commit sin ejecutar tests
// → SIEMPRE: start-all-tests.bat
```

---

## 🎓 Onboarding Rápido (30 minutos)

```
Día 1 - Onboarding (30 minutos total)

00:00 - Descargar proyecto (1 min)
01:00 - Ejecutar start-all.bat (2 min)
03:00 - Leer QUICK_START.md (2 min)
05:00 - Crear un registro de prueba (5 min)
10:00 - Leer README.md (10 min)
20:00 - Ver Debug Panel (5 min)
25:00 - Ejecutar tests: start-all-tests.bat (3 min)
28:00 - Hacer una pregunta (2 min)
30:00 - ¡LISTO! Ya entiendes el sistema
```

---

## 📞 Contacto / Soporte

**¿Pregunta sobre setup?**
→ Lee QUICK_START.md

**¿Pregunta sobre features?**
→ Lee README.md

**¿Pregunta sobre debugging?**
→ Lee DEBUG_GUIDE.md

**¿Pregunta sobre tests?**
→ Lee TESTS_GUIDE.md

**¿Pregunta técnica específica?**
→ Revisa CHANGELOG.md para ver qué cambió

---

## ✨ Resumen

```
DIARIO:
1. start-all-tests.bat (validar)
2. Hacer cambios
3. Escribir test (si es importante)
4. start-all-tests.bat (validar nuevamente)
5. Git commit
6. Git push

SEMANAL:
1. Revisar CHANGELOG.md
2. Actualizar documentación si cambió algo
3. Hacer backup o pull remote

MENSUAL:
1. Revisar cobertura de tests
2. Hacer refactoring si es necesario
3. Planear próximas features
```

---

**¡Bienvenido al equipo! 🚀**

Lee la documentación, ejecuta los comandos, y ¡a programar!

Cualquier duda, aquí estamos para apoyarte.

---

Enero 23, 2026
