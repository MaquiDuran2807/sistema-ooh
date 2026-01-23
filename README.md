# OOH Advertising Management System

Sistema completo de gestión de publicidad en espacios exteriores (Out of Home) con formulario React, backend Node.js, almacenamiento en **Google Cloud Storage** e integración con Excel.

## ⭐ Actualizado a GCP

Este proyecto ahora está optimizado para **Google Cloud Platform** con Cloud Run y Cloud Storage. [Ver guía de migración →](GCP_MIGRATION.md)

## 🚀 Características

- ✅ **Formulario React** - Interfaz moderna y responsiva para captar información OOH
- ✅ **API Node.js/Express** - Backend robusto con manejo de imágenes y datos
- ✅ **Google Cloud Storage** - Almacenamiento seguro de imágenes en la nube
- ✅ **Excel Integration** - Actualización automática de archivo Excel con registros
- ✅ **Cloud Run Deployment** - Serverless y escalable automáticamente
- ✅ **Validaciones** - Validación de campos, tamaño de imágenes y tipos de archivo
- ✅ **Interfaz Moderna** - Diseño responsivo con gradientes y animaciones

## 📋 Campos del Formulario

- **Marca** - Nombre de la marca
- **Campaña** - Nombre de la campaña
- **Dirección** - Ubicación del anuncio OOH
- **3 Imágenes** - Subida de 3 imágenes (máx 5MB cada una)
- **Fecha de Vigencia** - Fecha hasta la cual estará activa la campaña

## 🏗️ Estructura del Proyecto

```
nuevo ooh/
├── backend/                 # Servidor Node.js
│   ├── controllers/
│   │   └── oohController.js
│   ├── routes/
│   │   └── ooh.js
│   ├── services/
│   │   ├── excelService.js
│   │   └── s3Service.js
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
└── frontend/                # Aplicación React
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── OOHForm.js
    │   │   ├── OOHForm.css
    │   │   ├── OOHList.js
    │   │   └── OOHList.css
    │   ├── services/
    │   │   └── api.js
    │   ├── App.js
    │   ├── index.css
    │   └── index.js
    ├── package.json
    └── README.md
```

## ⚙️ Requisitos

- Node.js 14+
- npm o yarn
- Cuenta Google Cloud Platform (con $300 crédito gratis)
- gcloud CLI instalada
- Excel (opcional, para ver el archivo generado)

## 🔧 Instalación y Configuración

### 1️⃣ Configurar Google Cloud (20 minutos)

Sigue [GCP_STORAGE_SETUP.md](GCP_STORAGE_SETUP.md) para:
- Crear proyecto GCP
- Configurar Cloud Storage bucket
- Crear service account
- Obtener credenciales

### 2️⃣ Backend

1. Navega a la carpeta backend:
```bash
cd backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea archivo `.env` basado en `.env.example`:
```env
PORT=8080
GCP_PROJECT_ID=your-gcp-project-id
GCP_STORAGE_BUCKET=ooh-images-prod
GCP_KEY_FILE=./ooh-key.json
EXCEL_FILE_PATH=./ooh_data.xlsx
```

4. Copia tu archivo `ooh-key.json` a la carpeta backend

5. Inicia el servidor:
```bash
npm start
```

O para desarrollo con auto-reload:
```bash
npm run dev
```

### 3️⃣ Frontend

1. En otra terminal, navega a frontend:
```bash
cd frontend
```

2. Instala las dependencias:
```bash
npm install
```

3. (Opcional) Crea archivo `.env` para configurar URL de API:
```env
REACT_APP_API_URL=http://localhost:8080
```

4. Inicia la aplicación:
```bash
npm start
```

Se abrirá automáticamente en http://localhost:3000

### 4️⃣ Deploy a Google Cloud (15 minutos)

Una vez configurado localmente:

**Windows:**
```bash
deploy-gcp.bat all
```

**Mac/Linux:**
```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh all
```

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para más opciones.

## 📡 API Endpoints

### POST /api/ooh/create
Crea un nuevo registro OOH con imágenes

**Request:**
- `marca` (string) - Nombre de la marca
- `campana` (string) - Nombre de la campaña  
- `direccion` (string) - Ubicación
- `fechaVigencia` (date) - Fecha de vigencia
- `images` (file[]) - 3 archivos de imagen

**Response:**
```json
{
  "success": true,
  "message": "Registro creado exitosamente",
  "data": {
    "id": "uuid",
    "marca": "Nike",
    "campana": "Summer Campaign",
    "direccion": "Calle Principal 123",
    "imagenes": ["url1", "url2", "url3"],
    "fechaVigencia": "2024-12-31",
    "fechaCreacion": "2024-01-22T..."
  }
}
```

### GET /api/ooh/all
Obtiene todos los registros

**Response:**
```json
{
  "success": true,
  "data": [[row1], [row2], ...]
}
```

### GET /api/ooh/:id
Obtiene un registro específico por ID

## 💾 Almacenamiento

- **Imágenes**: Se guardan automáticamente en AWS S3 con estructura `ooh-images/timestamp-uuid-filename`
- **Datos**: Se guardan en archivo Excel local `ooh_data.xlsx` con todas las columnas necesarias

## 🎨 Customización

### Cambiar colores
Los colores principales están en los archivos CSS:
- Color primario: `#667eea`
- Color secundario: `#764ba2`

Modifica estos valores en:
- `frontend/src/index.css`
- `frontend/src/components/OOHForm.css`
- `frontend/src/components/OOHList.css`

### Agregar más campos
1. Edita el formulario en `OOHForm.js`
2. Agrega las columnas en `excelService.js`
3. Actualiza el controlador en `oohController.js`

## 📚 Dependencias Principales

**Backend:**
- express - Framework web
- multer - Manejo de carga de archivos
- aws-sdk - Integración con AWS S3
- exceljs - Lectura/escritura de Excel
- cors - Control de origen cruzado

**Frontend:**
- react - Librería UI
- axios - Cliente HTTP
- react-scripts - Scripts de build

## 🐛 Troubleshooting

**Error de conexión a S3:**
- Verifica que las credenciales AWS sean correctas en `.env`
- Asegúrate de que el bucket existe y es accesible
- Comprueba los permisos IAM

**Error al cargar archivos:**
- Verifica el límite de tamaño (5MB)
- Asegúrate de que solo estés subiendo imágenes
- Comprueba que estés subiendo exactamente 3 imágenes

**Excel no se actualiza:**
- Verifica la ruta del archivo en `EXCEL_FILE_PATH`
- Asegúrate de tener permisos de escritura en esa carpeta
- Cierra el Excel si está abierto

## 📝 Notas Importantes

- Los IDs se generan automáticamente como UUID
- Las fechas se guardan en formato ISO
- Los links de imágenes son públicos en S3
- El archivo Excel se crea automáticamente en la primera solicitud
- Las imágenes se nombran con timestamp + UUID para evitar conflictos

## 📄 Licencia

Este proyecto está disponible bajo licencia libre.

## 👨‍💻 Soporte

Para reportar errores o sugerencias, crea un issue en el repositorio.
