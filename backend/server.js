const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');
let cron = null;
try {
  cron = require('node-cron');
} catch (err) {
  // console.warn('âš ï¸ node-cron no estÃ¡ disponible. Instala con: npm install node-cron');
}
require('dotenv').config();

const oohRoutes = require('./routes/ooh');
const excelAutomationRoutes = require('./routes/excelAutomation');
const localStorageService = require('./services/localStorageService');
const dbService = require('./services/dbService');

const app = express();
const PORT = process.env.PORT || 8080;
const USE_BIGQUERY = process.env.USE_BIGQUERY === 'true' || false;
const BIGQUERY_DAILY_SYNC = process.env.BIGQUERY_DAILY_SYNC !== 'false';
const BIGQUERY_SYNC_CRON = process.env.BIGQUERY_SYNC_CRON || '0 18 * * *';

// Middleware CORS - Permitir Power Automate y localhost
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Power Automate, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Lista de orÃ­genes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://flow.microsoft.com',  // Power Automate
      /^https:\/\/.*\.logic\.azure\.com$/,  // Azure Logic Apps
      /^https:\/\/.*\.azurewebsites\.net$/   // Azure Web Apps
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      // Si es RegExp
      return allowed.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // console.log('âš ï¸ CORS bloqueado para origin:', origin);
      callback(null, true); // En desarrollo, permitir todos por ahora
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ⚡ CONFIGURAR HEADERS DE CACHÉ PARA IMÁGENES
app.use((req, res, next) => {
  // Si es una petición de imagen (local o en rutas)
  if (req.path.includes('/api/images/') || req.path.includes('local-images')) {
    // Caché público por 30 días (máximo permitido)
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    res.set('Expires', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString());
    res.set('ETag', "");
  }
  next();
});
// Middleware para logging de todas las peticiones
// Rutas
app.use('/api/ooh', oohRoutes);
app.use('/api/automation', excelAutomationRoutes);  // â† Nueva ruta para Power Automate

// Servir imÃ¡genes locales (para desarrollo) - soporta subcarpetas
app.get('/api/images/*', (req, res) => {
  // Extraer la ruta completa despuÃ©s de /api/images/
  const imagePath = req.params[0];
  localStorageService.serveImage(imagePath, res);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Middleware para capturar errores no manejados
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

// Manejador global de promesas rechazadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rechazada no manejada:', reason);
});

// Manejador global de excepciones no capturadas
process.on('uncaughtException', (error) => {
  console.error('ExcepciÃ³n no capturada:', error);
  // El servidor continÃºa corriendo
});

const start = async () => {
  // console.log(`âœ… Servidor ejecutÃ¡ndose en puerto ${PORT}`);
  // console.log(`   Frontend: http://localhost:3000`);
  // console.log(`   Backend: http://localhost:${PORT}`);
  // console.log(`   Health: http://localhost:${PORT}/health`);
  
  // Inicializar BD
  try {
    await dbService.initDB();

  } catch (error) {
    console.error('âŒ Error inicializando BD:', error);
  }

  const triggerBigQuerySync = (reason = 'manual') => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        method: 'POST',
        hostname: 'localhost',
        port: PORT,
        path: '/api/ooh/bigquery/sync'
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          // console.log(`ðŸ“Š [BIGQUERY SYNC] (${reason}) Status: ${res.statusCode}`);
          if (body) {
            // console.log(`ðŸ“Š [BIGQUERY SYNC] (${reason}) Response: ${body.substring(0, 200)}`);
          }
          resolve();
        });
      });
      req.on('error', (err) => {
        console.error(`âŒ [BIGQUERY SYNC] (${reason}) Error:`, err.message);
        reject(err);
      });
      req.end();
    });
  };

  // Programar sincronizaciÃ³n diaria (si estÃ¡ habilitada)
  if (USE_BIGQUERY && BIGQUERY_DAILY_SYNC) {
    if (!cron) {
      // console.warn('âš ï¸ BigQuery sync diario no se programÃ³: node-cron no estÃ¡ instalado');
    } else if (cron.validate(BIGQUERY_SYNC_CRON)) {
      cron.schedule(BIGQUERY_SYNC_CRON, () => {
        // console.log(`ðŸ•’ [BIGQUERY SYNC] Ejecutando sync programado (${BIGQUERY_SYNC_CRON})`);
        triggerBigQuerySync('cron').catch(() => {});
      });
      // console.log(`ðŸ•’ BigQuery sync diario programado: ${BIGQUERY_SYNC_CRON}`);
    } else {
      // console.warn(`âš ï¸ BIGQUERY_SYNC_CRON invÃ¡lido: ${BIGQUERY_SYNC_CRON}`);
    }
  } else if (USE_BIGQUERY) {
    // console.log('ðŸ•’ BigQuery sync diario desactivado (BIGQUERY_DAILY_SYNC=false)');
  }
};

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, start);
}

module.exports = { app, start };

