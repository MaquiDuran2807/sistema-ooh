const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');
let cron = null;
try {
  cron = require('node-cron');
} catch (err) {
  console.warn('⚠️ node-cron no está disponible. Instala con: npm install node-cron');
}
require('dotenv').config();

const oohRoutes = require('./routes/ooh');
const localStorageService = require('./services/localStorageService');
const dbService = require('./services/dbService');

const app = express();
const PORT = process.env.PORT || 8080;
const USE_BIGQUERY = process.env.USE_BIGQUERY === 'true' || false;
const BIGQUERY_DAILY_SYNC = process.env.BIGQUERY_DAILY_SYNC !== 'false';
const BIGQUERY_SYNC_CRON = process.env.BIGQUERY_SYNC_CRON || '0 2 * * *';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para logging de todas las peticiones
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('\n========================================');
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  
  // Interceptar la respuesta
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[${timestamp}] Respuesta: ${res.statusCode}`);
    if (data) {
      try {
        // Si es Buffer o no es string, no intentes parsearlo
        if (Buffer.isBuffer(data)) {
          console.log('Response Body: [Binary Data - PPT file]');
        } else {
          const parsed = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(parsed, null, 2));
        }
      } catch {
        // Si falla el parse, intenta substring solo si es string
        if (typeof data === 'string') {
          console.log('Response Body:', data.substring(0, 200));
        } else {
          console.log('Response Body: [Non-JSON Response]');
        }
      }
    }
    console.log('========================================\n');
    originalSend.call(this, data);
  };
  
  next();
});

// Rutas
app.use('/api/ooh', oohRoutes);

// Servir imágenes locales (para desarrollo) - soporta subcarpetas
app.get('/api/images/*', (req, res) => {
  // Extraer la ruta completa después de /api/images/
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
  console.error('Excepción no capturada:', error);
  // El servidor continúa corriendo
});

const start = async () => {
  console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
  console.log(`   Frontend: http://localhost:3000`);
  console.log(`   Backend: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  
  // Inicializar BD
  try {
    await dbService.initDB();
    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error inicializando BD:', error);
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
          console.log(`📊 [BIGQUERY SYNC] (${reason}) Status: ${res.statusCode}`);
          if (body) {
            console.log(`📊 [BIGQUERY SYNC] (${reason}) Response: ${body.substring(0, 200)}`);
          }
          resolve();
        });
      });
      req.on('error', (err) => {
        console.error(`❌ [BIGQUERY SYNC] (${reason}) Error:`, err.message);
        reject(err);
      });
      req.end();
    });
  };

  // Programar sincronización diaria (si está habilitada)
  if (USE_BIGQUERY && BIGQUERY_DAILY_SYNC) {
    if (!cron) {
      console.warn('⚠️ BigQuery sync diario no se programó: node-cron no está instalado');
    } else if (cron.validate(BIGQUERY_SYNC_CRON)) {
      cron.schedule(BIGQUERY_SYNC_CRON, () => {
        console.log(`🕒 [BIGQUERY SYNC] Ejecutando sync programado (${BIGQUERY_SYNC_CRON})`);
        triggerBigQuerySync('cron').catch(() => {});
      });
      console.log(`🕒 BigQuery sync diario programado: ${BIGQUERY_SYNC_CRON}`);
    } else {
      console.warn(`⚠️ BIGQUERY_SYNC_CRON inválido: ${BIGQUERY_SYNC_CRON}`);
    }
  } else if (USE_BIGQUERY) {
    console.log('🕒 BigQuery sync diario desactivado (BIGQUERY_DAILY_SYNC=false)');
  }
};

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, start);
}

module.exports = { app, start };
