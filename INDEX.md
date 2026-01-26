# 📚 Documentación - OOH System

## 🎯 Comienza Aquí

**Primer contacto?** → Lee [QUICK_START.md](QUICK_START.md) (2 minutos)

**¿Quieres detalles?** → Lee [README.md](README.md) (5 minutos)

---

## 📖 Documentos Disponibles

### 🚀 [QUICK_START.md](QUICK_START.md)
**Tiempo: 2 minutos**

Lo esencial para ejecutar el sistema:
- Cómo instalar Node.js
- Cómo ejecutar `start-all.bat`
- URLs y troubleshooting rápido
- Preguntas comunes

👉 **Comienza aquí si es tu primer día**

---

### 📘 [README.md](README.md)
**Tiempo: 10 minutos**

Información general:
- Características del sistema
- Estructura del proyecto
- Requisitos
- Cómo ejecutar (3 opciones)
- Tests (dónde, cómo, qué hacen)
- API endpoints
- Almacenamiento de datos

👉 **Lee esto después de QUICK_START**

---

### 🐛 [DEBUG_GUIDE.md](DEBUG_GUIDE.md)
**Tiempo: 5 minutos**

Cómo debuggear la aplicación:
- Debug Panel (🐛 Debug button)
- Debug inline en modales
- Console del navegador
- React DevTools
- Pasos para debuggear un problema
- Comandos útiles
- Información sobre endpoints

👉 **Lee esto si algo no funciona como esperas**

---

### 🧪 [TESTS_GUIDE.md](TESTS_GUIDE.md)
**Tiempo: 15 minutos**

Todo sobre tests:
- Estado global (Context API)
- Estructura de tests (38+)
- Qué prueba cada test
- Cómo leer resultados
- Snapshots
- Mocks
- Emulación de user interactions
- Próximas mejoras

👉 **Lee esto si vas a hacer cambios o si quieres confiar en tests**

---

### 📊 [SUMMARY.md](SUMMARY.md)
**Tiempo: 10 minutos**

Resumen técnico completo:
- Estado general ✅ 100% funcional
- Lo que se implementó
- Estado del código
- Checklist pre-deployment
- Próximas mejoras opcionales

👉 **Lee esto para validar que todo está ok**

---

## 🗺️ Mapa Mental

```
USUARIO FINAL
    ↓
¿Cómo ejecuto? → QUICK_START.md
    ↓
¿Qué hace el sistema? → README.md
    ↓
¿Algo no funciona? → DEBUG_GUIDE.md
    ↓
¿Cómo hago tests? → TESTS_GUIDE.md
    ↓
¿Qué se implementó? → SUMMARY.md
```

---

## 📱 Acceso Rápido a Características

### Ejecutar el sistema
```bash
start-all.bat                # Everything
cd backend && start-dev.bat  # Solo backend
cd frontend && start-frontend.bat  # Solo frontend
```

### Tests
```bash
start-all-tests.bat          # Todo
npm test (frontend)          # Solo frontend
npm test (backend)           # Solo backend
```

### Debugging
1. Abre http://localhost:3000
2. Haz clic en 🐛 Debug (esquina inferior derecha)
3. Inspecciona state en tiempo real

### Ver documentación
- Abre cualquiera de los archivos `.md` en el editor
- O mira en GitHub/GitLab web interface

---

## 🎯 Rutas Recomendadas

### Ruta 1: Solo Ejecutar (5 minutos)
```
QUICK_START.md → start-all.bat → Usa la app
```

### Ruta 2: Ejecutar + Entender (20 minutos)
```
QUICK_START.md → README.md → start-all.bat → Crea un registro
```

### Ruta 3: Completa (45 minutos)
```
QUICK_START.md → README.md → DEBUG_GUIDE.md → TESTS_GUIDE.md → start-all-tests.bat → SUMMARY.md
```

### Ruta 4: Desarrollo (Continuo)
```
TESTS_GUIDE.md (como base) + DEBUG_GUIDE.md (cuando necesites debuggear) + cambios de código
```

---

## 🔍 Índice de Tópicos

### Setup y Ejecución
- [QUICK_START.md](QUICK_START.md) - Instalación rápida
- [README.md](README.md#-cómo-ejecutar-en-local) - 3 formas de ejecutar

### Debugging
- [DEBUG_GUIDE.md](DEBUG_GUIDE.md) - Guía completa de debug
- [DebugPanel.js](frontend/src/components/DebugPanel.js) - Código del panel

### Testing
- [TESTS_GUIDE.md](TESTS_GUIDE.md) - Guía completa
- [start-all-tests.bat](start-all-tests.bat) - Script de tests

### Contexto Global
- [AppContext.js](frontend/src/context/AppContext.js) - Estado global
- [TESTS_GUIDE.md](TESTS_GUIDE.md#1-estado-global-context-api) - Cómo funciona

### Componentes
- [OOHForm.js](frontend/src/components/OOHForm.js) - Formulario
- [OOHList.js](frontend/src/components/OOHList.js) - Lista
- [AddMarcaModal.js](frontend/src/components/AddMarcaModal.js) - Modal
- [DebugPanel.js](frontend/src/components/DebugPanel.js) - Debug

### Backend
- [server.js](backend/server.js) - Servidor Node/Express
- [dbService.js](backend/services/dbService.js) - Lógica BD

---

## ❓ Busco Información Sobre...

### "¿Cómo creo un registro?"
→ [QUICK_START.md](QUICK_START.md) paso 3

### "¿Cómo veo el estado global?"
→ [DEBUG_GUIDE.md](DEBUG_GUIDE.md#2-debug-modal-integrado)

### "¿Cómo escribo un test?"
→ [TESTS_GUIDE.md](TESTS_GUIDE.md#4-qué-prueban-los-tests)

### "¿Dónde se guardan las imágenes?"
→ [README.md](README.md#-almacenamiento-de-datos-e-imágenes)

### "¿Cuál es la estructura del proyecto?"
→ [README.md](README.md#-estructura-del-proyecto)

### "¿Qué APIs hay disponibles?"
→ [README.md](README.md#-api-principales)

### "¿Cómo debuggear si algo falla?"
→ [DEBUG_GUIDE.md](DEBUG_GUIDE.md)

### "¿Están todos los tests pasando?"
→ [TESTS_GUIDE.md](TESTS_GUIDE.md#-checklist-pre-deploy)

### "¿Qué se implementó en total?"
→ [SUMMARY.md](SUMMARY.md#-lo-que-se-implementó)

---

## 🚨 Emergencias

**"Nada funciona"**
1. Lee [QUICK_START.md](QUICK_START.md#troubleshooting)
2. Ejecuta `start-all-tests.bat`
3. Si fallan, lee [TESTS_GUIDE.md](TESTS_GUIDE.md)

**"El sistema fue modificado y algo broke"**
1. Abre [TESTS_GUIDE.md](TESTS_GUIDE.md#-checklist-pre-deploy)
2. Sigue el checklist
3. Si un test falla, lee la descripción en [TESTS_GUIDE.md](TESTS_GUIDE.md#4-qué-prueban-los-tests)

**"No veo los datos cargados"**
1. Lee [DEBUG_GUIDE.md](DEBUG_GUIDE.md#ejemplo-el-modal-se-abre-pero-está-vacío)
2. Abre el Debug Panel
3. Verifica Context Global

---

## 📞 Soporte

Si después de leer la documentación aún tienes dudas:

1. Busca el tópico en el índice arriba ⬆️
2. Abre el documento recomendado
3. Si sigue sin funcionar, ejecuta `start-all-tests.bat` para validar el estado del sistema

---

**¡La documentación está completa y actualizada! 📚**

Última actualización: Enero 23, 2026
