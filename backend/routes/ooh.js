const express = require('express');
const multer = require('multer');
const router = express.Router();
const oohController = require('../controllers/oohController');

// Configurar multer para manejar 3 imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por imagen
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos de imagen'));
    }
  }
});

// ==================== RUTAS DE INICIALIZACIÓN ====================

// GET - Inicializar app (cargar todos los datos maestros)
// DEBE IR PRIMERO, antes que cualquier ruta con parámetros
router.get('/initialize', oohController.initializeApp);

// ==================== RUTAS DE CATÁLOGOS (ANTES DE /:id) ====================

// GET - Obtener todas las marcas
router.get('/brands', oohController.getAllBrands);

// GET - Obtener marca por nombre (para mapeo frontend)
router.get('/brands/by-name', oohController.getBrandByName);

// POST - Crear nueva marca
router.post('/brands', oohController.createBrand);

// GET - Obtener campañas de una marca
router.get('/brands/:brandId/campaigns', oohController.getCampaignsByBrand);

// GET - Obtener todas las campañas
router.get('/campaigns', oohController.getAllCampaigns);

// GET - Obtener campaña por nombre (para mapeo frontend)
router.get('/campaigns/by-name', oohController.getCampaignByName);

// POST - Crear nueva campaña
router.post('/campaigns', oohController.createCampaign);

// GET - Obtener todos los tipos de OOH
router.get('/types', oohController.getAllOOHTypes);

// GET - Obtener tipo OOH por nombre (para mapeo frontend)
router.get('/types/by-name', oohController.getOOHTypeByName);

// POST - Crear nuevo tipo de OOH
router.post('/types', oohController.createOOHType);

// GET - Obtener todas las ciudades
router.get('/cities', oohController.getAllCities);

// GET - Obtener coordenadas automáticamente por nombre de ciudad
router.get('/cities/coordinates', oohController.getCityCoordinates);

// GET - Obtener ciudades por región
router.get('/cities/region/:region', oohController.getCitiesByRegion);

// GET - Obtener ciudad por nombre
router.get('/cities/by-name', oohController.getCityByName);

// POST - Crear nueva ciudad
router.post('/cities', oohController.createCity);

// PUT - Actualizar ciudad existente
router.put('/cities/:id', oohController.updateCity);

// POST - Validar nombre de ciudad (detectar duplicados)
router.post('/cities/validate', oohController.validateCityName);

// GET - Obtener todos los proveedores
router.get('/providers', oohController.getAllProviders);

// GET - Obtener proveedor por nombre (para mapeo frontend)
router.get('/providers/by-name', oohController.getProviderByName);

// POST - Crear nuevo proveedor
router.post('/providers', oohController.createProvider);

// GET - Obtener todos los estados OOH
router.get('/states', oohController.getAllOOHStates);

// POST - Crear nuevo estado OOH
router.post('/states', oohController.createOOHState);

// ==================== RUTAS DE LECTURA - OOH RECORDS ====================

// GET - Obtener períodos disponibles (años y meses)
router.get('/periods/available', oohController.getAvailablePeriods);

// GET - Obtener todos los registros
router.get('/all', oohController.getAllOOH);

// ==================== RUTAS DE LECTURA - REPORTS ====================

// GET - Generar PPT de facturacion
router.get('/report/ppt', oohController.generateReport);

// POST - Crear nueva dirección
router.post('/addresses/create', oohController.createAddress);

// ==================== RUTAS DE ESCRITURA ====================

// POST - Crear/actualizar registro OOH (acepta múltiples imágenes)
router.post('/create', upload.array('imagenes', 25), oohController.createOOH);

// GET - Obtener imágenes de un registro
router.get('/:id/images', oohController.getRecordImages);

// POST - Subir imágenes adicionales a un registro
router.post('/:id/images/upload', upload.array('imagenes', 25), oohController.uploadRecordImages);

// POST - Subir imágenes con slots (posiciones) predefinidos
router.post('/:id/images/upload-with-slots', upload.array('imagenes', 25), oohController.uploadRecordImagesWithSlots);

// PATCH - Actualizar roles de imágenes (principal/secundaria/terciaria)
router.patch('/:id/images/roles', oohController.setRecordImageRoles);

// GET - Obtener registro por ID
router.get('/:id', oohController.getOOHById);

// DELETE - Eliminar registro OOH
router.delete('/:id', oohController.deleteOOH);

// ==================== BIGQUERY SYNC ====================

// POST - Sincronizar BigQuery desde SQLite (full refresh)
router.post('/bigquery/sync', oohController.syncBigQuery);

// POST - Sincronizar un registro específico a BigQuery
router.post('/:id/sync-bigquery', oohController.syncRecordToBigQuery);

// PATCH - Actualizar campo "checked" del registro
router.patch('/:id/check', oohController.updateChecked);

module.exports = router;
