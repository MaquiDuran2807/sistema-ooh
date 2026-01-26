# 🐛 Guía de Debug - OOH System

## ¿Cómo ver el estado global y contexto?

Ahora tienes varias formas de debuggear la aplicación:

### 1. **Debug Panel (Nuevo)**
- Busca el botón rojo **🐛 Debug** en la esquina inferior derecha
- Haz clic para abrir el panel flotante
- Tienes 3 pestañas:
  - **Context Global**: Ver el estado de brands, oohTypes, records en tiempo real
  - **LocalStorage**: Ver datos guardados en el navegador
  - **Window**: Ver configuración de la API y prueba endpoints

**Ejemplo de lo que ves:**
```
Context Global
📦 Brands: 15
📋 OOH Types: 5
📍 Records: 3
⏳ Loading: false
```

### 2. **Debug Modal Integrado**
Cuando abres el modal de "Agregar Nueva Marca":
- Verás un botón **🔍 Debug** junto a "Marcas existentes"
- Haz clic para ver el estado ACTUAL del modal
- Muestra:
  - `nuevaMarca`: Lo que escribes en el campo
  - `nuevaCategoria`: Categoría seleccionada
  - `nuevasCampanas`: Campañas ingresadas
  - `brandsCount`: Cantidad de marcas desde el servidor

**Ejemplo:**
```
Estado del Modal:
nuevaMarca: "CORONA"
nuevaCategoria: "CERVEZAS"
nuevasCampanas: "VERANO 2025"
brandsCount: 15
```

### 3. **Console del Navegador**
Abre las DevTools con **F12** o **Ctrl+Shift+I** y ve a la pestaña **Console**

Verás logs como:
```
🔵 AddMarcaModal: Cargando datos porque isOpen=true
📊 AddMarcaModal recibió brands: 15 Array(15)
✅ Marcas descargadas del API: 15 items
```

### 4. **React DevTools (Recomendado)**
Descarga la extensión **React Developer Tools** en Chrome/Firefox

Permite:
- Inspeccionar componentes en tiempo real
- Ver el estado (useState, Context) de cada componente
- Ver re-renders en tiempo real
- Hacer cambios al estado para probar

## Pasos para Debuggear un Problema

### Ejemplo: "El modal se abre pero está vacío"

1. **Abre el Debug Panel** → pestña **Context Global**
   - Verifica que `Brands: X` sea > 0
   - Si es 0, el problema es que no cargaron las marcas

2. **Abre el modal de Agregar Marca**
   - Haz clic en el botón **🔍 Debug** en el modal
   - Mira si `brandsCount: 15` (o similar)
   - Si muestra 0, las marcas no se cargaron

3. **Abre Console (F12)**
   - Busca el log "📊 AddMarcaModal recibió brands"
   - Si no aparece, significa que `fetchBrands()` no se ejecutó
   - Si aparece con Array(15), significa que SÍ se cargaron

4. **Inspecciona el input**
   - En DevTools → Elements
   - Busca `<input type="text"`
   - Mira si tiene atributo `value="algo"`
   - Si está vacío `value=""`, el problema es que el estado no se está bindea correctamente

## Información Útil

### URLs importantes:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Test API: Usa el botón "🔗 Test API /api/ooh/all" en Debug Panel

### Endpoints del backend:
```
GET  http://localhost:8080/api/ooh/all
GET  http://localhost:8080/api/ooh/brands/all
GET  http://localhost:8080/api/ooh/ooh-types/all
POST http://localhost:8080/api/ooh/create
```

### Qué verificar si algo no funciona:

1. **¿El Backend está corriendo?**
   - Ejecuta `start-dev.bat` desde `backend/`
   - Deberías ver "✅ Server running on port 8080"

2. **¿El Frontend está corriendo?**
   - Ejecuta `start-frontend.bat` desde `frontend/`
   - Deberías ver "✅ Webpack compiled successfully"

3. **¿Hay errores en Console?**
   - Abre DevTools (F12) → Console
   - Busca líneas rojas (❌ errors)
   - Busca amarillas (⚠️ warnings)

4. **¿La API responde?**
   - En Debug Panel → tab **Window**
   - Haz clic en "🔗 Test API /api/ooh/all"
   - Abre Console
   - Deberías ver "✅ API Test: {data...}" o "❌ API Error"

## Comandos Útiles en Console

```javascript
// Ver contenido del contexto
useApp() // (solo funciona si ejecutas desde dentro de un componente)

// Ver LocalStorage
localStorage

// Ver una variable específica
localStorage.getItem('key')

// Limpiar LocalStorage
localStorage.clear()

// Hacer request manual a la API
fetch('http://localhost:8080/api/ooh/all')
  .then(r => r.json())
  .then(d => console.log('Data:', d))
```

## Reporte de Bug Template

Si encuentras un problema, incluye:

1. **¿Qué esperabas que sucediera?**
2. **¿Qué sucedió realmente?**
3. **Captura de Debug Panel** (Context Global tab)
4. **Captura de Console** (F12)
5. **Pasos para reproducir**

---

**¡Happy debugging! 🚀**
