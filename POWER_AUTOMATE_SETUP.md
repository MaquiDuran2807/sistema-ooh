# Guía de Configuración: Power Automate + Excel Automation

Esta guía explica cómo configurar Power Automate (Microsoft Flow) para procesar automáticamente archivos Excel cargados en OneDrive/SharePoint. El backend valida los datos y devuelve errores en JSON; Power Automate se encarga de enviar las notificaciones por email.

## 📋 Índice
1. [Configuración del Backend](#configuración-del-backend)
2. [Crear el Flow en Power Automate](#crear-el-flow-en-power-automate)
3. [Probar la Integración](#probar-la-integración)
4. [Troubleshooting](#troubleshooting)

---

## 1. Configuración del Backend

### 1.1 Instalar Dependencias

```bash
cd backend
npm install
```

### 1.2 Iniciar Servidor

```bash
npm start
```

El servidor se iniciará en `http://localhost:8080`

### 1.3 Verificar Endpoint

Puedes probar manualmente con curl o Postman:

```bash
curl -X POST http://localhost:8080/api/automation/process-excel \
  -F "file=@ruta/al/archivo.xlsx"
```

---

## 2. Crear el Flow en Power Automate

---

## 2. Crear el Flow en Power Automate

### 2.1 Configuración Manual (Opción Recomendada)

1. **Inicia sesión en Power Automate**
   - Ve a https://make.powerautomate.com
   - Inicia sesión con tu cuenta de Microsoft

2. **Crear un nuevo Flow**
   - Haz clic en "Crear" → "Flujo automatizado en la nube"
   - Nombre: `Procesar Excel OOH`

3. **Configurar Trigger (Disparador)**
   - Busca y selecciona: **"Cuando se crea o modifica un archivo (OneDrive)"**
   - O si usas SharePoint: **"Cuando se crea o modifica un archivo (SharePoint)"**
   - Configuración:
     - **Carpeta**: `/OOH/Imports` (o la carpeta que prefieras)
     - **Incluir subcarpetas**: Sí
     - **Cómo deseas comprobar cambios**: **Cambios (crear o modificar)** ← Importante para detectar actualizaciones
     - **Frecuencia**: Cada 5 minutos (o según necesites)

4. **Agregar Condición de Filtro**
   - Nuevo paso → "Condición"
   - Campo: `Nombre de archivo` (del trigger)
   - Condición: `termina con`
   - Valor: `.xlsx`
   
   Esto asegura que solo se procesen archivos Excel.
   
   ⚠️ **Nota importante**: El Flow se ejecutará cada vez que el archivo sea **creado o modificado**, no solo la primera vez que se carga.

5. **Agregar Acción HTTP (Si es .xlsx)**
   - En la rama "Si es verdadero"
   - Agregar acción → HTTP
   - Configuración:
     - **Método**: POST
     - **URI**: `http://tu-servidor:8080/api/automation/process-excel`
     - **Encabezados**:
       ```
       Content-Type: multipart/form-data
       ```
     - **Cuerpo**:
       ```
       --boundary123
       Content-Disposition: form-data; name="file"; filename="@{triggerOutputs()?['body/Name']}"
       Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

       @{triggerOutputs()?['body/$content']}
       --boundary123--
       ```

6. **Analizar Respuesta JSON**
   - Nuevo paso → "Analizar JSON"
   - Contenido: `@body('HTTP')`
   - Usar el esquema de respuesta del backend (ver sección API Reference)

7. **Condición: Verificar si hay errores**
   - Nuevo paso → "Condición"
   - Expresión: `@body('Analizar_JSON')?['success']` | es igual a | `false`

8. **Si HAY errores → Enviar email**
   - En la rama "Si es verdadero"
   - Agregar acción → "Enviar correo electrónico (Office 365)"
   - Configurar email con los detalles de los errores
   - Adjuntar el archivo Excel original

9. **Si NO hay errores → Notificación de éxito (opcional)**
   - En la rama "Si es falso"
   - Enviar email de confirmación

6. **Configurar CORS (solo si hay errores)**
   - Si Power Automate muestra error CORS, el backend ya está configurado
   - Los orígenes permitidos son:
     - `https://flow.microsoft.com`
     - `https://*.logic.azure.com`
     - `https://*.azurewebsites.net`

### 3.2 Importar Template JSON (Opción Rápida)

Próximamente: Template JSON listo para importar.

### 3.3 Configuración Avanzada

**Agregar Notificación de Éxito**:
```
Después de HTTP → Agregar acción → "Enviar un mensaje de Teams"
Mensaje: "✅ Archivo @{triggerOutputs()?['body/Name']} procesado correctamente"
```

**Agregar Log de Errores**:
```
Si HTTP falla → Agregar acción → "Crear elemento (SharePoint)"
Lista: "Logs de Errores"
Título: @{triggerOutputs()?['body/Name']}
Error: @{body('HTTP')?['error']}
```

---

## 4. Probar la Integración

### 4.1 Prueba Local

1. Asegúrate de que el backend esté corriendo:
   ```bash
   cd backend
   npm start
   ```

2. Verifica que el endpoint responda:
   ```bash
   curl http://localhost:5000/api/automation/test-email?email=tu-email@gmail.com
   ```

### 4.2 Prueba con Postman

1. Abre Postman
2. Nueva request → POST
3. URL: `http://localhost:5000/api/automation/process-excel`
4. Body → form-data:
   - Key: `file` (tipo: File) → Selecciona un Excel de prueba
   - Key: `email` (tipo: Text) → `tu-email@gmail.com`
5. Send

Deberías recibir una respuesta JSON:
```json
{
  "success": true,
  "message": "Excel procesado correctamente",
  "processed": 10,
  "errors": [],
  "warnings": []
}
```

O si hay errores:
```json
{
  "success": false,
  "message": "Se encontraron errores en el Excel",
  "processed": 10,
  "errors": [
    {
      "row": 2,
      "field": "MARCA",
      "error": "Marca no existe en base de datos"
    }
  ]
}
```

### 4.3 Prueba con Power Automate

1. Sube un archivo Excel de prueba a la carpeta configurada en OneDrive/SharePoint
2. Espera 5 minutos (o el intervalo configurado)
3. Verifica en Power Automate:
   - Ve a "Mis flujos"
   - Haz clic en tu flujo
   - Verifica el historial de ejecuciones
4. Si hay errores, verifica:
   - El backend está corriendo
   - La URL es correcta (usa IP pública si el servidor no está en localhost)
   - Las credenciales SMTP son correctas

---

## 5. Troubleshooting

### Error: "CORS origin not allowed"

**Solución**:
El backend ya está configurado para permitir Power Automate. Verifica que el archivo `backend/server.js` tenga:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://flow.microsoft.com',
      /^https:\/\/.*\.logic\.azure\.com$/,
      /^https:\/\/.*\.azurewebsites\.net$/
};
```

### Error: "Timeout" (Power Automate)

Si Power Automate muestra timeout:

1. Verifica que el backend esté accesible desde internet (no solo localhost)
2. Usa ngrok para exponer tu localhost:
   ```bash
   ngrok http 8080
   ```
3. Copia la URL pública de ngrok (ej: `https://abc123.ngrok.io`)
4. Actualiza la URL en Power Automate: `https://abc123.ngrok.io/api/automation/process-excel`

### Error: "File too large"

El límite actual es 10MB. Para archivos más grandes:

1. Edita `backend/routes/excelAutomation.js` línea 10:
   ```javascript
   limits: { fileSize: 50 * 1024 * 1024 } // 50MB
   ```

---

## 6. Endpoint API Reference

### POST /api/automation/process-excel

Procesa un archivo Excel y valida los registros contra la base de datos. **El backend NO envía emails; devuelve JSON con los errores para que Power Automate los procese**.

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file` (File): Archivo Excel (.xlsx)

**Response (éxito sin errores)**:
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

**Response (con errores)**:
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

---

## 7. Formato Excel Esperado

El archivo Excel debe tener las siguientes columnas (no case-sensitive):

### Columnas Requeridas

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| MARCA | Nombre de la marca | CORONA |
| CAMPAÑA | Nombre de la campaña | Verano 2024 |
| CIUDAD | Ciudad del registro | Bogotá |
| DIRECCIÓN | Dirección completa | Carrera 7 #32-16 |
| TIPO DE OOH | Tipo de medio | Valla |
| PROVEEDOR | Nombre del proveedor | Clear Channel |
| VISIBILIDAD | Alto/Medio/Bajo | Alto |
| ESTADO | Disponible/Ocupado/Mantenimiento | Disponible |
| FECHA_INICIO | Fecha de inicio | 2024-01-15 |
| FECHA_FINAL | Fecha de finalización | 2024-02-15 |

### Columnas Opcionales

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| CATEGORÍA | Categoría del OOH | Premium |
| REGIÓN | Región geográfica | Centro |
| COORDENADAS | Lat,Long | 4.6097,-74.0817 |
| VALOR | Valor del OOH | 1500000 |

### Validaciones Automáticas

El sistema valida automáticamente:
- ✅ Marca existe en base de datos
- ✅ Campaña existe (o se lista como nueva)
- ✅ Ciudad existe en base de datos
- ✅ Proveedor existe (o se lista como nuevo)
- ✅ Coordenadas tienen formato válido (lat,long)
- ✅ Fechas tienen formato válido
- ✅ Estado es uno de los permitidos
- ✅ Visibilidad es uno de los permitidos
- ✅ Campos requeridos no estén vacíos

---

## 8. Arquitectura del Sistema

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   OneDrive/     │         │  Power Automate  │         │    Email     │
│   SharePoint    │────────▶│      Flow        │────────▶│   (Office    │
└─────────────────┘         │                  │         │   365)       │
      (Excel)                │ • Valida JSON    │         └──────────────┘
                             │ • Arma email     │
                             │ • Envía reporte  │
                             └────────┬─────────┘
                                      │
                                      │ HTTP POST
                                      ▼
                        ┌────────────────────────┐
                        │    Backend Server      │
                        │    (Node.js)           │
                        │                        │
                        │ • Lee Excel            │
                        │ • Valida registros     │
                        │ • Devuelve JSON        │
                        └────────────────────────┘
                                      │
                                      ▼
                        ┌────────────────────────┐
                        │   SQLite Database      │
                        │   (Validación)         │
                        └────────────────────────┘
```

---

## 9. Siguientes Pasos

### Implementaciones Futuras

1. **Creación Automática de Registros**
   - Actualmente solo valida
   - Próximamente: crear registros automáticamente si son válidos

2. **Procesamiento en Batch**
   - Para archivos grandes (>1000 registros)
   - Con tracking de progreso

3. **Webhook de Respuesta**
   - Notificar a Power Automate cuando termine el procesamiento
   - Para archivos grandes que toman tiempo

4. **Dashboard de Monitoreo**
   - Ver historial de archivos procesados
   - Estadísticas de errores comunes

---

## 10. Seguridad

### Recomendaciones de Producción

1. **No uses localhost en producción**
   - Deploy el backend en Azure, AWS, o Heroku
   - Usa HTTPS (SSL/TLS)

2. **Protege el endpoint con autenticación**
   - Agrega API Key en headers
   - O usa Azure AD authentication

3. **Valida el origen del request**
   - El backend ya tiene CORS configurado
   - Considera agregar un token secreto

4. **Limita el tamaño de archivos**
   - Actual: 10MB
   - Ajusta según tus necesidades

5. **Rate limiting**
   - Agrega rate limiting para prevenir abuso
   - Usa `express-rate-limit`

---

## 📞 Soporte

Si tienes problemas:

1. Verifica logs del backend: `npm start` debe mostrar mensajes de error
2. Prueba el endpoint de test: `/api/automation/test-email`
3. Revisa la configuración SMTP en `.env`
4. Verifica que Power Automate esté usando la URL correcta
5. Consulta la sección de Troubleshooting arriba

---

## 📄 Licencia y Créditos

Developed for OOH Management System
Backend: Node.js + Express
Frontend: React
Automation: Microsoft Power Automate
