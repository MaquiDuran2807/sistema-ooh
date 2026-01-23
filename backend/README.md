# OOH Backend

Backend en Node.js/Express para el sistema de gestión OOH.

## Instalación

```bash
npm install
```

## Configuración

Copia `.env.example` a `.env` y rellena los valores:

```env
PORT=5000
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
EXCEL_FILE_PATH=./ooh_data.xlsx
```

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm start
```

## API

### POST /api/ooh/create
Crear nuevo registro con imágenes

### GET /api/ooh/all
Obtener todos los registros

### GET /api/ooh/:id
Obtener registro por ID

### GET /health
Health check del servidor
