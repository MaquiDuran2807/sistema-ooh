# DIMENSIONES DEL REPORTE PPT - VAYAS

## Dimensiones del Slide
- **Ancho total**: 10 pulgadas (25.4 cm)
- **Alto total**: 7.5 pulgadas (19.05 cm)
- **Proporción**: 4:3 (estándar PowerPoint)

---

## SLIDE DE PORTADA

### Fondo
- Color: Azul ABI (#003366)
- Cubre: 100% del slide

### Elementos de Texto
1. **Título Principal**: "REPORTE DE VAYAS"
   - Posición: X=0.5", Y=2.0"
   - Tamaño: W=9.0"
   - Fuente: 44pt, Bold
   - Color: Blanco (#FFFFFF)
   - Alineación: Centro

2. **Mes**: "ENERO 2026" (ejemplo)
   - Posición: X=0.5", Y=3.2"
   - Tamaño: W=9.0"
   - Fuente: 24pt
   - Color: Oro ABI (#D4A574)
   - Alineación: Centro

3. **Total Registros**: "Total: X registros"
   - Posición: X=0.5", Y=4.2"
   - Tamaño: W=9.0"
   - Fuente: 18pt
   - Color: Blanco (#FFFFFF)
   - Alineación: Centro

---

## SLIDE DE CONTENIDO (por cada VAYA)

### Márgenes y Espaciado
- **Margen general**: 0.4"
- **Gap entre elementos**: 0.15"

### Barra Superior
- Posición: X=0, Y=0
- Tamaño: W=10.0" (100%), H=0.35"
- Color: Rojo ABI (#CC0000)

### Título (Dirección)
- Posición: X=0.4", Y=0.5"
- Tamaño: W=6.0"
- Fuente: 22pt, Bold
- Color: Azul ABI (#003366)
- Texto: MAYÚSCULAS

### Subtítulo (Ciudad)
- Posición: X=0.4", Y=1.0"
- Tamaño: W=6.0"
- Fuente: 14pt
- Color: Gris (#666666)
- Texto: MAYÚSCULAS

---

## LAYOUT DE IMÁGENES

### Configuración General
```
┌────────────────────────────────────────┐
│  [Barra Roja]                          │
│                                        │
│  DIRECCIÓN          [Ciudad]           │
│                                        │
│  ┌──────────┐  ┌──────────────────┐  │
│  │          │  │   Imagen 2       │  │
│  │ Imagen 1 │  │                  │  │
│  │  Grande  │  ├──────────────────┤  │
│  │          │  │   Imagen 3       │  │
│  └──────────┘  │                  │  │
│                └──────────────────┘  │
│                                        │
│  Vigencia: X - X                       │
│  REF: Proveedor                        │
└────────────────────────────────────────┘
```

### Imagen Grande (Izquierda)
- **Posición**: X=0.4", Y=1.5"
- **Tamaño**: W=4.0", H=4.0" (cuadrada)
- **Tipo**: Cover (mantiene proporción, rellena el área)
- **Formato**: JPG/PNG
- **Borde si no existe**: Gris claro (#EEEEEE) con línea (#CCCCCC)

### Imagen 2 (Arriba Derecha)
- **Posición**: X=4.55", Y=1.5"
  - Cálculo: 0.4 (margen) + 4.0 (imagen grande) + 0.15 (gap) = 4.55"
- **Tamaño**: W=4.6", H=1.9"
- **Tipo**: Cover (mantiene proporción, rellena el área)
- **Formato**: JPG/PNG

### Imagen 3 (Abajo Derecha)
- **Posición**: X=4.55", Y=3.55"
  - Cálculo: 1.5 (topY) + 1.9 (altura img2) + 0.15 (gap) = 3.55"
- **Tamaño**: W=4.6", H=1.9"
- **Tipo**: Cover (mantiene proporción, rellena el área)
- **Formato**: JPG/PNG

**NOTA**: Las 3 imágenes terminan aproximadamente a la misma altura Y:
- Imagen grande: 1.5 + 4.0 = 5.5"
- Imágenes derecha: 1.5 + 1.9 + 0.15 + 1.9 = 5.45"

---

## TEXTOS INFERIORES

### Vigencia
- **Posición**: X=0.4", Y=6.0"
- **Tamaño**: W=9.0"
- **Fuente**: 12pt, Bold
- **Color**: Rojo ABI (#CC0000)
- **Formato**: "Vigencia: 4 de enero de 2026 - 28 de febrero de 2026"
- **Alineación**: Izquierda

### REF: Proveedor
- **Posición**: X=0.4", Y=6.5"
- **Tamaño**: W=9.0"
- **Fuente**: 11pt
- **Color**: Gris oscuro (#333333)
- **Formato**: "REF: NOMBRE_PROVEEDOR"
- **Alineación**: Izquierda

**NOTA**: El texto más bajo (REF) termina en:
- Y=6.5" + 0.3" (altura aproximada del texto) = 6.8"
- Margen inferior disponible: 7.5 - 6.8 = 0.7" ✅ OK

---

## PALETA DE COLORES ABI

```
Rojo ABI:    #CC0000  (barra superior, vigencia)
Oro ABI:     #D4A574  (detalles, texto portada)
Azul ABI:    #003366  (fondo portada, títulos)
Blanco:      #FFFFFF  (texto sobre azul)
Gris claro:  #666666  (subtítulos)
Gris oscuro: #333333  (REF)
Placeholder: #EEEEEE  (fondo cuando falta imagen)
Borde:       #CCCCCC  (borde de placeholder)
```

---

## VERIFICACIÓN DE LÍMITES

### Slide Width: 10.0"
- Elemento más a la derecha: Imágenes pequeñas
  - X=4.55" + W=4.6" = 9.15" ✅ (dentro del límite)
  - Margen derecho: 10.0 - 9.15 = 0.85"

### Slide Height: 7.5"
- Elemento más abajo: REF texto
  - Y=6.5" + ~0.3" (altura texto) = 6.8" ✅ (dentro del límite)
  - Margen inferior: 7.5 - 6.8 = 0.7"

---

## NOTAS TÉCNICAS

### PptxGenJS
- Unidad de medida: **pulgadas** (inches)
- 1 pulgada = 2.54 cm
- Dimensiones por defecto: 10" x 7.5" (NO requiere configuración explícita)
- Coordenadas: (0,0) = esquina superior izquierda

### Manejo de Imágenes
- Ruta: Filesystem local (no HTTP URLs)
- Verificación: `fs.existsSync()` antes de agregar
- Fallback: Rectángulo gris con texto "NO DISPONIBLE"
- Propiedad `sizing`: `{ type: 'cover', w: X, h: Y }` para mantener aspecto

### Formatos de Fecha
- Entrada CSV: `yyyy-MM-dd` (ISO 8601)
- Salida PPT: "4 de enero de 2026" (español completo)
- Función: `formatDateToSpanish(isoDate)`

---

## ARCHIVO FUENTE
- **Ubicación**: `backend/controllers/oohController.js`
- **Función**: `generateReport(req, res)`
- **Líneas**: ~310-540
