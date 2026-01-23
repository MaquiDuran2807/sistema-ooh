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

// POST - Crear/actualizar registro OOH (acepta hasta 3 archivos en el campo "imagenes")
router.post('/create', upload.array('imagenes', 3), oohController.createOOH);

// GET - Obtener todos los registros
router.get('/all', oohController.getAllOOH);

// GET - Obtener registro por ID
router.get('/:id', oohController.getOOHById);

// GET - Generar PPT de facturacion
router.get('/report/ppt', oohController.generateReport);

// GET - Obtener todas las marcas
router.get('/brands/all', oohController.getAllBrands);

// GET - Obtener campañas de una marca
router.get('/brands/:brandId/campaigns', oohController.getCampaignsByBrand);

// GET - Obtener todos los tipos de OOH
router.get('/ooh-types/all', oohController.getAllOOHTypes);

// POST - Crear nueva marca
router.post('/brands/create', oohController.createBrand);

// POST - Crear nueva campaña
router.post('/campaigns/create', oohController.createCampaign);

// POST - Crear nuevo tipo de OOH
router.post('/ooh-types/create', oohController.createOOHType);

module.exports = router;
