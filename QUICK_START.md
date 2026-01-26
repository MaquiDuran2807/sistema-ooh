# 🚀 Quick Start - OOH System

## ⚡ En 3 Pasos

### 1️⃣ Instala Node.js (si no lo tienes)
[Descarga aquí](https://nodejs.org/) - Versión LTS

### 2️⃣ Ejecuta el sistema
```bash
start-all.bat
```

¡Eso es! Se abrirá automáticamente en http://localhost:3000

### 3️⃣ Crea un registro
1. Rellena el formulario con datos
2. Sube hasta 3 imágenes
3. Haz clic en "Guardar"
4. Ve a "Ver Registros" para verlo listado

---

## 🧪 Tests (Validación)

Ejecuta todos los tests:
```bash
start-all-tests.bat
```

Debería mostrar: **38 passed ✓**

---

## 🐛 Debug

Busca el botón **🐛 Debug** en la esquina inferior derecha.

Verás:
- Marcas cargadas desde servidor
- Tipos OOH disponibles
- Registros actuales

---

## 📁 Archivos Principales

```
nuevo ooh/
├── start-all.bat                   ← 👈 EJECUTA ESTO
├── start-all-tests.bat             ← O ESTO para tests
├── README.md                        ← Documentación
├── DEBUG_GUIDE.md                   ← Cómo debuggear
├── TESTS_GUIDE.md                   ← Guía de tests
├── SUMMARY.md                       ← Resumen completo
│
├── backend/
│   ├── start-dev.bat
│   ├── server.js
│   └── services/dbService.js        ← Lógica BD
│
└── frontend/
    ├── start-frontend.bat
    ├── src/
    │   ├── App.js
    │   ├── context/AppContext.js     ← Estado global
    │   └── components/
    │       ├── OOHForm.js            ← Formulario
    │       ├── OOHList.js            ← Lista
    │       ├── AddMarcaModal.js
    │       ├── DebugPanel.js          ← 🐛 Debug
    │       └── __tests__/             ← Tests
```

---

## ❓ Preguntas Comunes

**¿Cómo veo el estado global?**
→ Haz clic en 🐛 Debug → "Context Global"

**¿Cómo creo una marca nueva?**
→ En el formulario, haz clic en "Agregar Nueva Marca"

**¿Las imágenes se guardan?**
→ Sí, en `backend/local-images/`

**¿Dónde están los registros?**
→ En SQLite en memoria (con persistencia en disco)

**¿Cómo sé si todo funciona?**
→ Ejecuta `start-all-tests.bat` (debe mostrar 38 passed ✓)

---

## 🔗 URLs

| Servicio | URL | Puerto |
|----------|-----|--------|
| Frontend | http://localhost:3000 | 3000 |
| Backend | http://localhost:8080 | 8080 |
| API Marcas | http://localhost:8080/api/ooh/brands/all | 8080 |
| API Tipos | http://localhost:8080/api/ooh/ooh-types/all | 8080 |
| API Registros | http://localhost:8080/api/ooh/all | 8080 |

---

## 🛠️ Troubleshooting

**"Node.js not found"**
→ Instala Node.js desde https://nodejs.org/

**"Port 3000 already in use"**
→ Cierra otra app en ese puerto, o ejecuta:
```bash
netstat -ano | find ":3000"
taskkill /PID <PID> /F
```

**"API connection error"**
→ Verifica que backend está en otra ventana (start-dev.bat)

**"Imágenes no se cargan"**
→ Abre DevTools (F12) → Network → Mira si /api/images devuelve error

---

## 📚 Documentación Completa

- [README.md](README.md) - Información general
- [DEBUG_GUIDE.md](DEBUG_GUIDE.md) - Cómo debuggear
- [TESTS_GUIDE.md](TESTS_GUIDE.md) - Guía de tests
- [SUMMARY.md](SUMMARY.md) - Resumen técnico

---

## ✨ Features

✅ Formulario con Context API global
✅ Subida de imágenes (hasta 3)
✅ Base de datos SQLite
✅ Modal de detalles
✅ Debugging integrado (🐛 Debug)
✅ 38+ tests automatizados
✅ Documentación completa

---

**¡Ya está todo listo! Solo ejecuta `start-all.bat` y comienza! 🎯**
