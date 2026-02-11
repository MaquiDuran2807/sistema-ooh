# 🚀 Quick Start: Power Automate Integration

Configuración rápida en 4 pasos para automatizar la carga de archivos Excel con Power Automate.

---

## ⚙️ Paso 1: Iniciar Backend (2 minutos)

### 1.1 Instalar dependencias
```bash
cd backend
npm install
```
✅ Ya tienes instalado: `xlsx`, `multer`

### 1.2 Iniciar servidor
```bash
npm start
```

✅ **El servidor debería iniciar en `http://localhost:8080`**

---

## 📁 Paso 2: Preparar Carpeta OneDrive/SharePoint (2 minutos)

1. Abre OneDrive o SharePoint
2. Crea carpeta: `OOH/Imports`
3. Copia la ruta (la necesitarás en el Flow)

---

## ⚡ Paso 3: Crear Flow en Power Automate (10 minutos)

### 3.1 Acceder a Power Automate
1. Ve a https://make.powerautomate.com
2. Inicia sesión con tu cuenta Microsoft

### 3.2 Crear Flow

**Opción A: Importar Template (Recomendado)**
1. Clic en "Mis flujos" → "Importar" → "Importar paquete (.zip)"
2. Sube el archivo `power-automate-template.json` (⚠️ necesitas comprimirlo en .zip primero)
3. Configura las conexiones (OneDrive, Office 365)
4. Importar

**Opción B: Configuración Manual (Paso a Paso)**

#### 1️⃣ Nuevo Flow
- Clic en "Crear" → "Flujo automatizado en la nube"
- Nombre: `Procesar Excel OOH`
- Trigger: "Cuando se crea o modifica un archivo (OneDrive)" → Crear

#### 2️⃣ Configurar Trigger
```
📁 Carpeta: OOH/Imports
🔄 Cómo desea comprobar cambios: Cambios (crear o modificar)
⏱️ Intervalo: 5 minutos
```

#### 3️⃣ Filtro: Solo archivos .xlsx
- Nuevo paso → "Condición"
- Condición:
  ```
  Nombre de archivo (del trigger) | termina con | .xlsx
  ```

#### 4️⃣ Obtener Contenido del Archivo (Si es .xlsx)
- Nuevo paso → "Obtener contenido de archivo (OneDrive)"
- Identificador de archivo: `Id de archivo` (del trigger)

#### 5️⃣ Enviar archivo al Backend
- Nuevo paso → "HTTP"
- Configuración:
  ```
  Método: POST
  URI: http://TU_SERVIDOR:8080/api/automation/process-excel
  
  Encabezados:
    Content-Type: multipart/form-data; boundary=----Boundary
  
  Cuerpo: (copiar el código de abajo)
  ```

**Código del Cuerpo HTTP**:
```
------Boundary
Content-Disposition: form-data; name="file"; filename="@{triggerOutputs()?['body/Name']}"
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

@{body('Obtener_contenido_de_archivo')}
------Boundary--
```

#### 6️⃣ Analizar Respuesta JSON
- Nuevo paso → "Analizar JSON"
- Contenido: `@body('HTTP')`
- Esquema: (el backend devuelve éxito/errores)
  ```json
  {
    "type": "object",
    "properties": {
      "success": { "type": "boolean" },
      "message": { "type": "string" },
      "fileName": { "type": "string" },
      "summary": {
        "type": "object",
        "properties": {
          "totalRecords": { "type": "integer" },
          "validRecords": { "type": "integer" },
          "invalidRecords": { "type": "integer" }
        }
      },
      "errors": { "type": "array" }
    }
  }
  ```

#### 7️⃣ Condición: ¿Hay errores?
- Nuevo paso → "Condición"
- Expresión: `@body('Analizar_JSON')?['success']` | es igual a | `false`

#### 8️⃣ Si HAY errores → Enviar email con detalles
- En la rama "Si es verdadero"
- Nuevo paso → "Enviar correo electrónico (Office 365)"
- Para: `admin@tuempresa.com`
- Asunto: `❌ Errores en Excel OOH - @{body('Analizar_JSON')?['fileName']}`
- Cuerpo (HTML):
  ```html
  <h2>⚠️ Errores de Validación</h2>
  <p><strong>Archivo:</strong> @{body('Analizar_JSON')?['fileName']}</p>
  <p><strong>Registros válidos:</strong> @{body('Analizar_JSON')?['summary']?['validRecords']}</p>
  <p><strong>Registros con errores:</strong> @{body('Analizar_JSON')?['summary']?['invalidRecords']}</p>
  <p><em>Ver detalles completos adjuntos</em></p>
  ```
- **Archivo adjunto**: Agrega el Excel original con los errores

#### 9️⃣ Si NO hay errores → Notificación de éxito (opcional)
- En la rama "Si es falso"
- Nuevo paso → "Enviar correo electrónico (Office 365)"
- Asunto: `✅ Excel procesado - @{body('Analizar_JSON')?['fileName']}`

#### 🔟 Guardar y Activar
- Clic en "Guardar" (arriba a la derecha)
- Activa el Flow si no está activado

---

## 🧪 Paso 4: Probar (5 minutos)

### 4.1 Preparar archivo de prueba

Crea un archivo Excel `test_ooh.xlsx` con estas columnas:

| MARCA | CAMPAÑA | CIUDAD | DIRECCIÓN | TIPO DE OOH | PROVEEDOR | VISIBILIDAD | ESTADO |
|-------|---------|--------|-----------|-------------|-----------|-------------|--------|
| CORONA | Verano 2024 | Bogotá | Carrera 7 #32-16 | Valla | Clear Channel | Alto | Disponible |
| BBC | Invierno 2024 | Medellín | Calle 10 #20-30 | Puente | Mobiliario | Medio | Disponible |

### 4.2 Subir archivo
1. Sube `test_ooh.xlsx` a la carpeta `OOH/Imports` en OneDrive, O
2. Si ya existe un archivo ahí, **actualízalo** (guarda cambios en el Excel)
3. Espera 5 minutos (o el intervalo configurado)

### 4.3 Verificar
1. **Power Automate**: Ve a "Mis flujos" → Clic en tu flow → "Historial de ejecuciones"
2. **Email**: Deberías recibir un email con el resultado
3. **Backend**: Revisa logs en la consola donde corre `npm start`

---

## 🐛 Troubleshooting Rápido

### ❌ "CORS error" en Power Automate
✅ El backend ya está configurado para permitir Power Automate
✅ Verifica que `server.js` tenga los orígenes correctos

### ❌ "Connection timeout" en Power Automate
✅ Power Automate no puede acceder a `localhost`
✅ **Solución**: Usa ngrok para exponer tu servidor:
```bash
ngrok http 8080
```
✅ Copia la URL pública (ej: `https://abc123.ngrok.io`)
✅ Actualiza URI en Power Automate: `https://abc123.ngrok.io/api/automation/process-excel`

### ❌ Flow no se ejecuta
✅ Verifica que el Flow esté **activado**
✅ Sube un archivo `.xlsx` (no `.xls`)
✅ Verifica que el archivo esté en la carpeta correcta
✅ Espera el intervalo configurado (5 min por defecto)

---

## 📊 Formato Excel Esperado

Tu archivo Excel debe tener estas columnas (mínimo):

### ✅ Columnas Requeridas
- **MARCA** (ej: CORONA, BBC, POKER)
### ✅ Columnas Requeridas
- **MARCA** (ej: CORONA, BBC, POKER)
- **CAMPAÑA** (ej: Verano 2024)
- **CIUDAD** (ej: Bogotá, Medellín)
- **DIRECCIÓN** (ej: Carrera 7 #32-16)
- **TIPO DE OOH** (ej: Valla, Puente, Bus)
- **PROVEEDOR** (ej: Clear Channel)
- **VISIBILIDAD** (Alto, Medio, Bajo)
- **ESTADO** (Disponible, Ocupado, Mantenimiento)
- **FECHA_INICIO** (formato: `YYYY-MM-DD` ej: `2024-01-15`)
- **FECHA_FINAL** (formato: `YYYY-MM-DD` ej: `2024-06-30`)

### 📝 Columnas Opcionales
- CATEGORÍA
- REGIÓN
- COORDENADAS (formato: `lat,long` ej: `4.6097,-74.0817`)
- VALOR

**Notas**:
- Los nombres de columnas NO son case-sensitive (`marca` = `MARCA` = `Marca`)
- Puedes agregar columnas extra, serán ignoradas
- Las celdas vacías en columnas requeridas generarán error

---

## 📧 Respuesta JSON del Backend

Power Automate recibirá una respuesta JSON con la validación. Basándote en esta respuesta, configuras el email.

### Respuesta con errores (success: false):
```json
{
  "success": false,
  "message": "Se encontraron errores de validación",
  "fileName": "test_ooh.xlsx",
  "summary": {
    "totalRecords": 10,
    "validRecords": 7,
    "invalidRecords": 3
  },
  "errors": [
    {
      "rowNumber": 2,
      "errors": ["Marca \"INVALIDA\" no existe en la base de datos"],
      "warnings": [],
      "record": { "marca": "INVALIDA", ... }
    }
  ],
  "validRecords": [ ... ]
}
```

### Respuesta sin errores (success: true):
```json
{
  "success": true,
  "message": "Archivo procesado exitosamente. Todos los registros son válidos.",
  "fileName": "test_ooh.xlsx",
  "summary": {
    "totalRecords": 10,
    "validRecords": 10,
    "invalidRecords": 0
  },
  "records": [ ... ]
}
```

---

## 🎯 Próximos Pasos

Una vez configurado:

1. **Modo Producción**: Deploy el backend en la nube (Azure, AWS, Heroku)
2. **HTTPS**: Usa SSL/TLS para seguridad
3. **Autenticación**: Agrega API Key para proteger el endpoint
4. **Monitoreo**: Revisa logs de Power Automate periódicamente
5. **Expansión**: Agrega más validaciones según tus necesidades

---

## 📚 Documentación Completa

Para más detalles, consulta:
- [POWER_AUTOMATE_SETUP.md](POWER_AUTOMATE_SETUP.md) - Guía completa con troubleshooting avanzado
- [README.md](README.md) - Documentación general del proyecto

---

## ✅ Checklist Final

Antes de usar en producción, verifica:

- [x] Backend corriendo (`npm start`)
- [x] Carpeta OneDrive/SharePoint creada
- [x] Flow activado en Power Automate
- [x] Archivo de prueba procesado correctamente
- [x] Email configurado en Power Automate
- [ ] Backend deployado en servidor público (no localhost)
- [ ] HTTPS configurado
- [ ] API Key agregado (opcional pero recomendado)

---

**🎉 ¡Listo! Ahora tus archivos Excel se procesarán automáticamente**

Cada vez que subas un archivo `.xlsx` a la carpeta configurada, Power Automate lo detectará, validará contra el backend y enviará un email con los resultados.
