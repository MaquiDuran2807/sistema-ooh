# 📋 Cómo Usar el Generador de Reportes PPT

## 🚀 Desde la Aplicación (AUTOMÁTICO)

### 1. Abrir el Generador
Haz clic en el botón verde **"📄 Generar Reporte PPT"** en la lista de registros.

### 2. Configurar el Reporte
Se abre un modal con opciones:

#### 📅 **Mes del Reporte**
- Selector de mes (YYYY-MM)
- Por defecto: mes actual
- Filtra VAYAS por fecha de inicio o fin dentro del mes seleccionado

#### 🎨 **Método de Generación**

##### **Opción 1: Con Archivo Base** (RECOMENDADO) ✅
- ✅ Usa `REPORTE FACTURACIÓN BASE.pptx` como plantilla
- ✅ Preserva diseño y formato original
- ✅ Agrega slides de VAYAS al final
- ⚠️ **Requiere:** `pip install python-pptx`

##### **Opción 2: Desde Cero**
- ✅ No requiere Python
- ✅ Solo usa Node.js (PptxGenJS)
- ⚠️ No usa el archivo base (crea todo desde cero)

### 3. Generar y Descargar
- Clic en **"📥 Generar y Descargar"**
- El backend procesa automáticamente
- El archivo `.pptx` se descarga al terminar

---

## 🔧 Flujo Técnico (Detrás de Escena)

### **Método 1: Con Archivo Base**

```
Frontend (OOHList.js)
    ↓ Click "Generar"
    ↓ Envía: GET /api/ooh/report/ppt?month=2026-01&useBase=true
    ↓
Backend (oohController.js)
    ↓ Detecta useBase=true
    ↓ Prepara datos JSON
    ↓ Ejecuta: spawn('python', ['generate_ppt_from_base.py', 'data.json'])
    ↓
Python (generate_ppt_from_base.py)
    ↓ Carga: REPORTE FACTURACIÓN BASE.pptx
    ↓ Agrega slides por cada VAYA
    ↓ Guarda: temp_output.pptx
    ↓
Backend
    ↓ Lee archivo generado
    ↓ Envía como Buffer
    ↓
Frontend
    ↓ Recibe Blob
    ↓ Descarga: reporte_vayas_2026-01.pptx
```

### **Método 2: Desde Cero**

```
Frontend
    ↓ Envía: GET /api/ooh/report/ppt?month=2026-01&useBase=false
    ↓
Backend (oohController.js)
    ↓ Detecta useBase=false
    ↓ Usa PptxGenJS directamente
    ↓ Crea slides desde cero
    ↓ Genera Buffer
    ↓ Envía con res.end(buffer)
    ↓
Frontend
    ↓ Descarga: reporte_vayas_2026-01.pptx
```

---

## ⚙️ Instalación de Python (Solo para Método 1)

### Windows

```bash
# 1. Verificar si Python está instalado
python --version
# o
python3 --version

# 2. Instalar python-pptx
pip install python-pptx

# 3. Verificar instalación
python -c "from pptx import Presentation; print('✅ OK')"
```

### Si Python NO está instalado

**Descargar:** https://www.python.org/downloads/

Durante la instalación:
- ✅ Marcar "Add Python to PATH"
- Instalar versión 3.8 o superior

---

## ❓ Preguntas Frecuentes

### ¿Tengo que ejecutar Python manualmente?
**NO.** El backend ejecuta el script Python automáticamente cuando:
- Eliges "Con Archivo Base"
- Haces clic en "Generar y Descargar"

### ¿Qué pasa si no tengo Python instalado?
Dos opciones:
1. **Instalar Python** (5 minutos) para usar el archivo base
2. **Usar "Desde Cero"** - funciona sin Python

### ¿Cómo sé si funcionó?
**Logs en consola del backend:**
```
📊 Generando PPT con 2 registros de VAYA para 2026-01
   Método: Con archivo base (Python)
✅ Archivo base cargado (1 slides existentes)
✅ Slide 1: PLAZA DE BOLIVAR (ROVIRA)
✅ Slide 2: CALLE 45 (BOGOTA DC)
✅ Archivo generado: temp_output.pptx
```

**Frontend:**
- Aparece mensaje: "✅ Reporte PPT descargado correctamente"
- Archivo `.pptx` en carpeta de Descargas

### ¿Qué imágenes incluye?
Cada slide de VAYA tiene 3 imágenes:
1. **Grande (izquierda):** 4" x 4"
2. **Pequeña 1 (arriba derecha):** 4.6" x 1.9"
3. **Pequeña 2 (abajo derecha):** 4.6" x 1.9"

Usa las rutas del CSV convertidas a filesystem local.

### Error: "Python script failed"
**Solución:**
1. Verificar Python: `python --version`
2. Instalar librería: `pip install python-pptx`
3. Verificar archivo base existe: `backend/REPORTE FACTURACIÓN BASE.pptx`
4. **Alternativa:** Usar método "Desde Cero"

### Error: "Imágenes no aparecen"
**Verificar rutas:**
```bash
cd backend
node test_image_paths.js
```

Debe mostrar:
```
✅ Convirtiendo ruta: /api/images/...
   Existe: true
```

Si muestra `Existe: false`:
- Verificar que las imágenes existen en `backend/images/...`
- Revisar permisos de carpeta

---

## 🎯 Recomendaciones

### Para Producción
✅ Usar **"Con Archivo Base"** (Python)
- Mantiene diseño corporativo
- Mejor calidad visual
- Más profesional

### Para Testing/Desarrollo
✅ Usar **"Desde Cero"** (PptxGenJS)
- No requiere dependencias extra
- Más rápido de configurar
- Funciona siempre

---

## 📊 Contenido del Reporte

### Slide de Portada
- Título: "REPORTE DE VAYAS"
- Mes: "ENERO 2026"
- Total de registros
- Fondo azul ABI (#003366)

### Slides de VAYAS (uno por registro)
- **Título:** Dirección (MAYÚSCULAS)
- **Subtítulo:** Ciudad
- **Imagen grande:** 4"x4" (izquierda)
- **2 imágenes pequeñas:** 4.6"x1.9" (derecha, apiladas)
- **Vigencia:** "4 de enero de 2026 - 28 de febrero de 2026"
- **REF:** Nombre del proveedor

---

## 🔍 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| No descarga nada | Revisar consola del navegador (F12) |
| Error "python-pptx" | `pip install python-pptx` |
| Imágenes no cargan | Ejecutar `test_image_paths.js` |
| Python no existe | Usar método "Desde Cero" |
| Timeout | Aumentar timeout en frontend (línea ~128) |

---

## 📁 Archivos Relevantes

```
frontend/src/components/
├── OOHList.js        # Modal de configuración (líneas ~100-180)
└── OOHList.css       # Estilos del modal (líneas ~685-830)

backend/
├── controllers/
│   └── oohController.js              # Lógica de generación (líneas ~335-530)
├── generate_ppt_from_base.py         # Script Python
└── REPORTE FACTURACIÓN BASE.pptx     # Plantilla
```

---

## ✅ Checklist Final

Antes de usar por primera vez:

- [ ] Python instalado (`python --version`)
- [ ] python-pptx instalado (`pip install python-pptx`)
- [ ] Archivo base existe (`backend/REPORTE FACTURACIÓN BASE.pptx`)
- [ ] Imágenes verificadas (`node backend/test_image_paths.js`)
- [ ] Backend corriendo (`npm run dev`)
- [ ] Frontend corriendo (`npm start`)
- [ ] Probar descarga de reporte

¡Listo para usar! 🎉
