# Generación de Reportes PPT - VAYAS

## 🎯 Dos Métodos Disponibles

### **Método 1: Con Archivo Base (RECOMENDADO)** ✅

**Ventajas:**
- Usa el archivo `REPORTE FACTURACIÓN BASE.pptx` como plantilla
- Preserva el diseño, tema y formato original
- Agrega slides de VAYAS al final del archivo base

**Requisitos:**
```bash
pip install python-pptx
```

**Uso:**
```javascript
// Frontend
const response = await axios.get('/api/ooh/report/ppt', {
  params: { 
    month: '2026-01',
    useBase: 'true'  // ← Usar archivo base
  }
});
```

**Proceso:**
1. Carga `REPORTE FACTURACIÓN BASE.pptx`
2. Agrega un slide por cada VAYA con:
   - Dirección (título)
   - Ciudad (subtítulo)
   - 3 imágenes (1 grande + 2 pequeñas)
   - Vigencia (fechas en español)
   - REF: Proveedor
3. Guarda el resultado

---

### **Método 2: Desde Cero (PptxGenJS)** 

**Ventajas:**
- No requiere Python
- Solo usa Node.js
- Totalmente programático

**Limitaciones:**
- No puede usar archivo base existente
- Crea slides desde cero

**Uso:**
```javascript
// Frontend (por defecto si useBase no está)
const response = await axios.get('/api/ooh/report/ppt', {
  params: { 
    month: '2026-01'
    // Sin useBase, usa PptxGenJS
  }
});
```

---

## 🛠️ Instalación

### Opción 1: Con Python (archivo base)

```bash
# Backend
cd backend
pip install python-pptx

# Verificar instalación
python -c "from pptx import Presentation; print('✅ python-pptx instalado')"
```

### Opción 2: Solo Node.js

Ya está instalado con `npm install` (pptxgenjs en package.json)

---

## 📝 Estructura de Archivos

```
backend/
├── controllers/
│   └── oohController.js          # Lógica de generación
├── generate_ppt_from_base.py     # Script Python (Método 1)
├── test_image_paths.js            # Test de rutas de imágenes
└── REPORTE FACTURACIÓN BASE.pptx  # Plantilla base
```

---

## 🐛 Solución de Problemas

### Problema: Imágenes no aparecen

**Causa:** Rutas incorrectas desde controlador hacia /images

**Solución aplicada:**
```javascript
// En oohController.js
const getLocalImagePath = (apiPath) => {
  const cleanPath = apiPath.replace(/^\/api\//, '');
  // __dirname es backend/controllers, subir un nivel
  const fullPath = path.join(__dirname, '..', cleanPath);
  return fullPath;
};
```

**Test:**
```bash
cd backend
node test_image_paths.js
```

Debería mostrar:
```
✅ /api/images/MARCA/CAMPANA/...
   Local: C:\...\backend\images\MARCA\CAMPANA\...
   Existe: true
```

---

### Problema: Python no encuentra python-pptx

**Error:**
```
ERROR: python-pptx no instalado
```

**Solución:**
```bash
pip install python-pptx

# O con pip3
pip3 install python-pptx

# Verificar
python -c "import pptx; print(pptx.__version__)"
```

---

### Problema: "Python script failed"

**Verificar:**
1. Python está en PATH:
   ```bash
   python --version
   # O
   python3 --version
   ```

2. El script existe:
   ```bash
   ls backend/generate_ppt_from_base.py
   ```

3. Ejecutar manualmente:
   ```bash
   cd backend
   python generate_ppt_from_base.py temp_data.json
   ```

---

## 📊 Dimensiones del Slide

Ambos métodos usan:
- **Tamaño**: 10" x 7.5" (4:3)
- **Imagen grande**: 4.0" x 4.0" (izquierda)
- **Imágenes pequeñas**: 4.6" x 1.9" cada una (derecha, apiladas)
- **Márgenes**: 0.4"
- **Gap**: 0.15"

Ver detalles completos en: `DIMENSIONES_PPT.md`

---

## 🎨 Colores ABI

```javascript
const COLOR_ROJO = '#CC0000';  // Barra superior, vigencia
const COLOR_ORO = '#D4A574';   // Detalles
const COLOR_AZUL = '#003366';  // Títulos, fondo portada
```

---

## ✅ Checklist de Verificación

- [ ] python-pptx instalado (para Método 1)
- [ ] Archivo base existe: `backend/REPORTE FACTURACIÓN BASE.pptx`
- [ ] Rutas de imágenes verificadas con `test_image_paths.js`
- [ ] Frontend configurado con `useBase: 'true'`
- [ ] Backend reiniciado después de cambios

---

## 📞 Testing

### Test Completo (Método 1)

```bash
# 1. Verificar Python
python --version

# 2. Verificar python-pptx
python -c "from pptx import Presentation; print('OK')"

# 3. Test de rutas de imágenes
cd backend
node test_image_paths.js

# 4. Iniciar servidor
npm run dev

# 5. Desde navegador o Postman
GET http://localhost:8080/api/ooh/report/ppt?month=2026-01&useBase=true
```

### Test Rápido (Método 2 - Sin Python)

```bash
# Sin useBase, usa PptxGenJS por defecto
GET http://localhost:8080/api/ooh/report/ppt?month=2026-01
```

---

## 🔄 Actualización del Frontend

El botón "Descargar Reporte PPT" ahora usa `useBase=true` por defecto:

```jsx
// OOHList.js línea ~110
const response = await axios.get('/api/ooh/report/ppt', {
  params: { 
    month: currentMonth,
    useBase: 'true'  // ← Activo por defecto
  },
  responseType: 'blob'
});
```

Para cambiar al Método 2, simplemente quitar o cambiar a `'false'`.
