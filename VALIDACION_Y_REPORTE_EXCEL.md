# Validación de Datos y Reporte de Registros Fallidos

## 📋 Descripción General

El sistema ahora valida datos críticos antes de crear registros OOH desde Excel. Los registros que no cumplan con los requisitos mínimos se omiten automáticamente y se genera un reporte detallado con la opción de descargar los registros fallidos en formato CSV.

## ✅ Datos Críticos Requeridos

Para que un registro sea válido y pueda crearse en la base de datos, DEBE tener los siguientes campos:

1. **Marca** - Nombre de la marca/producto
2. **Ciudad** - Ciudad donde está ubicado el elemento OOH
3. **Dirección** - Ubicación específica del elemento
4. **Latitud** - Coordenada geográfica (debe ser diferente de 0)
5. **Longitud** - Coordenada geográfica (debe ser diferente de 0)

### Campos Opcionales

Los siguientes campos son opcionales y se manejan automáticamente si faltan:

- **Tipo OOH**: Si falta, se asigna "VALLA" por defecto
- **Proveedor**: Se puede omitir
- **Estado**: Se puede omitir
- **Fechas**: Se pueden omitir
- **Campaña**: Si falta, se genera automáticamente como "MARCA - ESTADO" o solo "MARCA"

## 🔄 Flujo de Importación con Validación

### 1. Carga del Archivo
Usuario arrastra o selecciona archivo Excel → Sistema lee y detecta headers → Extrae datos

### 2. Vista Previa
- Muestra primeros 10 registros con todos los campos
- Indicadores visuales (❌) para campos faltantes
- Usuario puede revisar que las coordenadas estén presentes antes de continuar

### 3. Validación Durante Creación
```javascript
// Para cada registro:
1. Validar datos críticos
   SI faltan datos → Agregar a lista de fallidos + continuar con siguiente
   SI datos completos → Continuar con creación

2. Obtener/crear catálogos (marcas, ciudades, tipos, etc.)

3. Crear dirección con validación geográfica

4. Crear registro OOH

5. SI hay error → Capturar error + continuar con siguiente
```

### 4. Reporte Final

Después de procesar todos los registros, se muestra:

#### Pantalla de Reporte con 3 secciones:

**A. Resumen Visual**
```
┌─────────────────────┬─────────────────────┐
│  ✅                 │  ❌                 │
│  45                 │  13                 │
│  Registros creados  │  Registros omitidos │
└─────────────────────┴─────────────────────┘
```

**B. Tabla de Registros Fallidos**
```
Fila | Marca    | Ciudad  | Dirección | Lat  | Lng  | Motivo
-----|----------|---------|-----------|------|------|---------------------------
3    | CORONA   | BOGOTA  | Calle 80  | ❌   | ❌   | Faltan: Latitud, Longitud
7    | ❌       | CALI    | Av 6      | 3.45 | -76  | Faltan: Marca
12   | POKER    | ❌      | Calle 10  | 4.71 | -74  | Faltan: Ciudad
```

**C. Botón de Descarga CSV**
- Permite descargar archivo CSV con todos los registros que no se pudieron crear
- Nombre del archivo: `registros_fallidos_2026-02-05.csv`
- Incluye todas las columnas + columna de "Motivo" con la razón del fallo

## 📥 Formato del CSV Exportado

```csv
Fila,Marca,Ciudad,Dirección,Latitud,Longitud,Motivo
"3","CORONA","BOGOTA","Calle 80 #45-23","","","Faltan datos críticos: Latitud, Longitud"
"7","","CALI","Avenida 6 Norte","3.4516","-76.5320","Faltan datos críticos: Marca"
"12","POKER","","Calle 10 #20-15","4.7110","-74.0721","Faltan datos críticos: Ciudad"
"18","AGUILA","MEDELLIN","","6.2476","-75.5658","Faltan datos críticos: Dirección"
```

## 🛠️ Funciones Implementadas

### `validateRecord(record, index)`
Valida que un registro tenga todos los datos críticos.

**Parámetros:**
- `record`: Objeto con los datos del registro
- `index`: Número de fila (para logging)

**Retorna:**
```javascript
{
  valid: boolean,     // true si tiene todos los datos críticos
  missing: string[]   // Array con nombres de campos faltantes
}
```

**Ejemplo:**
```javascript
// Registro completo
validateRecord({
  marca: "CORONA",
  ciudad: "BOGOTA", 
  direccion: "Calle 80",
  latitud: 4.7110,
  longitud: -74.0721
}, 5)
// → { valid: true, missing: [] }

// Registro incompleto
validateRecord({
  marca: "POKER",
  ciudad: "CALI",
  direccion: "",      // ❌ Falta
  latitud: 0,         // ❌ Falta (0 no es válido)
  longitud: -76.5320
}, 8)
// → { valid: false, missing: ["Dirección", "Latitud"] }
```

### `exportFailedToCSV()`
Genera y descarga archivo CSV con los registros fallidos.

**Proceso:**
1. Crea array de headers: `['Fila', 'Marca', 'Ciudad', 'Dirección', 'Latitud', 'Longitud', 'Motivo']`
2. Mapea cada registro fallido a una fila CSV
3. Escapa valores con comillas dobles
4. Genera Blob con tipo `text/csv;charset=utf-8`
5. Crea link de descarga automática
6. Limpia el link después de descarga

## 📊 Estados del Componente

### Nuevos Estados Agregados

```javascript
const [step, setStep] = useState('upload'); 
// Valores: 'upload' | 'preview' | 'creating' | 'report'

const [failedRecords, setFailedRecords] = useState([]); 
// Array de objetos: { rowNumber, record, reason }
```

### Estructura de `failedRecords`

```javascript
[
  {
    rowNumber: 3,
    record: {
      marca: "CORONA",
      ciudad: "BOGOTA",
      direccion: "Calle 80",
      latitud: null,      // ❌
      longitud: null      // ❌
    },
    reason: "Faltan datos críticos: Latitud, Longitud"
  },
  // ... más registros fallidos
]
```

## 🎯 Casos de Uso

### Caso 1: Todos los registros válidos
```
Excel con 50 registros → Todos tienen lat/lng/dirección
Resultado: 
  ✅ 50 registros creados
  ❌ 0 registros omitidos
  → Se cierra modal automáticamente
  → Mensaje: "✅ Se crearon 50 registros exitosamente"
```

### Caso 2: Algunos registros inválidos
```
Excel con 58 registros → 45 tienen todos los datos, 13 faltan coordenadas
Resultado:
  ✅ 45 registros creados
  ❌ 13 registros omitidos
  → Se muestra pantalla de reporte
  → Tabla con los 13 registros fallidos
  → Botón para descargar CSV
```

### Caso 3: Registro con error en creación
```
Registro tiene todos los datos pero falla al crear (ej: coordenadas fuera del rango de la ciudad)
Resultado:
  → Se captura el error
  → Se agrega a lista de fallidos con motivo del backend
  → Se continúa con siguiente registro
  → No se detiene la importación completa
```

## 🔍 Logs en Consola

Durante el procesamiento, se generan logs detallados:

```javascript
// Inicio de procesamiento
📝 [EXCEL] Procesando registro 1/58: { marca: "CORONA", ... }

// Validación exitosa
✅ [EXCEL] Registro 1 creado exitosamente

// Validación fallida - datos faltantes
⚠️ [EXCEL] Registro 3 omitido: Faltan datos críticos: Latitud, Longitud

// Error durante creación
❌ [EXCEL] Error en registro 7: Las coordenadas no corresponden a la ciudad BOGOTA
```

## 💡 Mejoras Implementadas

1. **No detención por errores individuales**: Si un registro falla, se continúa con los demás
2. **Feedback visual inmediato**: Preview muestra ❌ en campos faltantes antes de crear
3. **Reporte detallado**: Usuario sabe exactamente qué registros fallaron y por qué
4. **Exportación para corrección**: CSV permite corregir datos faltantes en Excel y reimportar
5. **Validación temprana**: Se valida ANTES de llamar al backend, ahorrando requests
6. **Actualización de datos**: Aunque haya fallos, los registros exitosos se crean y la tabla se actualiza

## 🚀 Flujo Completo de Usuario

```
1. Usuario carga Excel con 58 registros
   ↓
2. Sistema detecta headers y extrae datos
   ↓  
3. Preview muestra 10 registros con indicadores ❌ en lat/lng faltantes
   ↓
4. Usuario hace clic en "Crear 58 registros"
   ↓
5. Sistema procesa cada registro:
   - 45 registros → ✅ Creados
   - 13 registros → ❌ Omitidos (sin coordenadas)
   ↓
6. Se muestra reporte final:
   - Resumen visual: 45 creados, 13 omitidos
   - Tabla con los 13 registros fallidos
   - Detalles de qué falta en cada uno
   ↓
7. Usuario descarga CSV de fallidos
   ↓
8. Usuario corrige Excel agregando coordenadas
   ↓
9. Usuario importa solo los 13 registros corregidos
   ↓
10. ✅ Todos creados exitosamente
```

## 📝 Mensajes de Error Posibles

### Durante Validación
- `"Faltan datos críticos: Marca"`
- `"Faltan datos críticos: Ciudad"`
- `"Faltan datos críticos: Dirección"`
- `"Faltan datos críticos: Latitud, Longitud"`
- `"Faltan datos críticos: Marca, Ciudad, Latitud"`

### Durante Creación (desde backend)
- `"Las coordenadas no corresponden a la ciudad BOGOTA"`
- `"Error al crear dirección: [razón]"`
- `"Brand_id no válido"`
- `"Error de validación: [campo]"`

## 🎨 Estilos CSS Agregados

Nuevas clases para el reporte:
- `.report-container`: Contenedor principal del reporte
- `.report-summary`: Grid con cards de resumen
- `.summary-item.success`: Card verde para registros creados
- `.summary-item.failed`: Card roja para registros omitidos
- `.failed-records-section`: Sección amarilla con tabla de fallidos
- `.failed-table`: Tabla compacta con registros fallidos
- `.btn-download-csv`: Botón naranja para descargar CSV

## ✨ Características Adicionales

### Recuperación Automática
Si el proceso de creación se interrumpe:
- Los registros creados hasta ese momento se mantienen
- El reporte muestra cuántos se procesaron
- Usuario puede volver a intentar con los registros faltantes

### Eficiencia
- Validación local primero (ahorra requests al backend)
- Continúa procesando aunque haya errores
- Crea catálogos una sola vez (cache en memoria)
- No duplica direcciones existentes

### Usabilidad
- Indicadores visuales claros (✅/❌)
- Colores semánticos (verde/rojo/naranja)
- Tabla scrolleable para muchos registros
- CSV listo para editar y reimportar
