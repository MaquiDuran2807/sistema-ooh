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

// ==================== RUTAS DE LECTURA - OOH RECORDS ====================

// GET - Obtener todos los registros
router.get('/all', oohController.getAllOOH);

// GET - Obtener registro por ID
router.get('/:id', oohController.getOOHById);

// ==================== RUTAS DE LECTURA - REPORTS ====================

// GET - Generar PPT de facturacion
router.get('/report/ppt', oohController.generateReport);

// ==================== RUTAS DE LECTURA - BRANDS ====================

// GET - Obtener todas las marcas
router.get('/brands', oohController.getAllBrands);

// GET - Obtener marca por nombre (para mapeo frontend)
router.get('/brands/by-name', oohController.getBrandByName);

// GET - Obtener campañas de una marca
router.get('/brands/:brandId/campaigns', oohController.getCampaignsByBrand);

// ==================== RUTAS DE LECTURA - OOH TYPES ====================

// GET - Obtener todos los tipos de OOH
router.get('/ooh-types', oohController.getAllOOHTypes);

// GET - Obtener tipo OOH por nombre (para mapeo frontend)
router.get('/ooh-types/by-name', oohController.getOOHTypeByName);

// ==================== RUTAS DE LECTURA - CITIES ====================

// GET - Obtener todas las ciudades
router.get('/cities', oohController.getAllCities);

// GET - Obtener ciudades por región
router.get('/cities/region/:region', oohController.getCitiesByRegion);

// GET - Obtener ciudad por nombre
router.get('/cities/by-name', oohController.getCityByName);

// POST - Crear nueva ciudad
router.post('/cities/create', oohController.createCity);

// POST - Validar nombre de ciudad (detectar duplicados)
router.post('/cities/validate', oohController.validateCityName);

// ==================== RUTAS DE ADDRESSES ====================

// POST - Crear nueva dirección
router.post('/addresses/create', oohController.createAddress);

// ==================== RUTAS DE LECTURA - PROVIDERS ====================

// GET - Obtener todos los proveedores
router.get('/providers', oohController.getAllProviders);

// GET - Obtener proveedor por nombre (para mapeo frontend)
router.get('/providers/by-name', oohController.getProviderByName);

// ==================== RUTAS DE LECTURA - CAMPAIGNS ====================

// GET - Obtener todas las campañas
router.get('/campaigns', oohController.getAllCampaigns);

// GET - Obtener campaña por nombre (para mapeo frontend)
router.get('/campaigns/by-name', oohController.getCampaignByName);

// ==================== RUTAS DE ESCRITURA ====================

// POST - Crear/actualizar registro OOH (acepta hasta 3 archivos en el campo "imagenes")
router.post('/create', upload.array('imagenes', 3), oohController.createOOH);

// DELETE - Eliminar registro OOH
router.delete('/:id', oohController.deleteOOH);

// POST - Crear nueva marca
router.post('/brands/create', oohController.createBrand);

// POST - Crear nueva campaña
router.post('/campaigns/create', oohController.createCampaign);

// POST - Crear nuevo tipo de OOH
router.post('/ooh-types/create', oohController.createOOHType);

module.exports = router;
