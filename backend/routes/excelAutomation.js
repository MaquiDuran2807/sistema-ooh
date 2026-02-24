const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const dbService = require('../services/dbService');

// Configurar multer para recibir archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

// 📊 Normalizar datos del Excel
const normalizeExcelData = (data) => {
  return data.map((row, index) => {
    const normalized = {};
    
    // Mapeo de columnas esperadas (case-insensitive)
    const columnMap = {
      'marca': ['marca', 'brand', 'marca_producto'],
      'campana': ['campana', 'campaign', 'nombre_campana'],
      'proveedor': ['proveedor', 'provider', 'supplier'],
      'tipo_ooh': ['tipo_ooh', 'tipo', 'type', 'ooh_type'],
      'direccion': ['direccion', 'address', 'ubicacion'],
      'ciudad': ['ciudad', 'city', 'municipio'],
      'latitud': ['latitud', 'latitude', 'lat'],
      'longitud': ['longitud', 'longitude', 'lng', 'lon'],
      'fecha_inicio': ['fecha_inicio', 'start_date', 'inicio'],
      'fecha_final': ['fecha_final', 'end_date', 'fin', 'fecha_fin'],
      'estado': ['estado', 'status', 'state']
    };

    // Buscar cada campo en las columnas del Excel
    for (const [key, aliases] of Object.entries(columnMap)) {
      for (const alias of aliases) {
        const found = Object.keys(row).find(k => 
          k.toLowerCase().trim() === alias.toLowerCase()
        );
        if (found && row[found]) {
          normalized[key] = row[found];
          break;
        }
      }
    }

    normalized._rowNumber = index + 2; // +2 porque Excel empieza en 1 y tiene encabezados
    return normalized;
  });
};

// 🔍 Validar registro individual
const validateRecord = async (record, dbData) => {
  const errors = [];
  const warnings = [];

  // Validar campos obligatorios
  if (!record.marca) errors.push('Marca requerida');
  if (!record.campana) errors.push('Campaña requerida');
  if (!record.tipo_ooh) errors.push('Tipo OOH requerido');
  if (!record.direccion) errors.push('Dirección requerida');
  if (!record.ciudad) errors.push('Ciudad requerida');
  if (!record.fecha_inicio) errors.push('Fecha inicio requerida');
  if (!record.fecha_final) errors.push('Fecha final requerida');

  // Validar existencia en BD
  if (record.marca) {
    const brand = dbData.brands.find(b => 
      b.nombre.toLowerCase() === record.marca.toLowerCase()
    );
    if (!brand) {
      errors.push(`Marca "${record.marca}" no existe en la base de datos`);
    }
  }

  if (record.campana) {
    const campaign = dbData.campaigns.find(c => 
      c.nombre.toLowerCase() === record.campana.toLowerCase()
    );
    if (!campaign) {
      warnings.push(`Campaña "${record.campana}" no existe (se creará automáticamente)`);
    }
  }

  if (record.ciudad) {
    const city = dbData.cities.find(c => 
      c.nombre.toLowerCase() === record.ciudad.toLowerCase()
    );
    if (!city) {
      errors.push(`Ciudad "${record.ciudad}" no existe en la base de datos`);
    }
  }

  // Validar coordenadas
  if (record.latitud) {
    const lat = parseFloat(record.latitud);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(`Latitud inválida: ${record.latitud}`);
    }
  }

  if (record.longitud) {
    const lng = parseFloat(record.longitud);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push(`Longitud inválida: ${record.longitud}`);
    }
  }

  // Validar fechas
  if (record.fecha_inicio && record.fecha_final) {
    const inicio = new Date(record.fecha_inicio);
    const final = new Date(record.fecha_final);
    
    if (isNaN(inicio.getTime())) {
      errors.push(`Fecha inicio inválida: ${record.fecha_inicio}`);
    }
    if (isNaN(final.getTime())) {
      errors.push(`Fecha final inválida: ${record.fecha_final}`);
    }
    if (inicio > final) {
      errors.push('Fecha inicio no puede ser mayor que fecha final');
    }
  }

  return { errors, warnings };
};

// 🚀 Endpoint principal: Procesar Excel desde Power Automate
router.post('/process-excel', upload.single('file'), async (req, res) => {
  // console.log('📥 [AUTOMATION] Recibiendo archivo Excel desde Power Automate');
  // console.log('� Archivo:', req.file?.originalname);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se recibió ningún archivo'
      });
    }

    // 1. Leer Excel
    // console.log('📖 Leyendo archivo Excel...');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // console.log(`📊 ${rawData.length} filas encontradas`);

    // 2. Normalizar datos
    const records = normalizeExcelData(rawData);

    // 3. Obtener datos de la BD para validación
    const [brands, campaigns, cities, oohTypes, providers] = await Promise.all([
      dbService.getAllBrands(),
      dbService.getAllCampaigns(),
      dbService.getAllCities(),
      dbService.getAllOohTypes(),
      dbService.getAllProviders()
    ]);

    const dbData = { brands, campaigns, cities, oohTypes, providers };

    // 4. Validar cada registro
    // console.log('🔍 Validando registros...');
    const validationResults = [];
    const validRecords = [];
    const invalidRecords = [];

    for (const record of records) {
      const { errors, warnings } = await validateRecord(record, dbData);
      
      const result = {
        rowNumber: record._rowNumber,
        record: record,
        errors: errors,
        warnings: warnings,
        isValid: errors.length === 0
      };

      validationResults.push(result);

      if (result.isValid) {
        validRecords.push(record);
      } else {
        invalidRecords.push(result);
      }
    }

    // console.log(`✅ Registros válidos: ${validRecords.length}`);
    // console.log(`❌ Registros inválidos: ${invalidRecords.length}`);

    // 5. Devolver resultado (Power Automate se encargará del email)
    if (invalidRecords.length > 0) {
      return res.status(200).json({
        success: false,
        message: 'Se encontraron errores de validación',
        fileName: req.file.originalname,
        summary: {
          totalRecords: records.length,
          validRecords: validRecords.length,
          invalidRecords: invalidRecords.length
        },
        errors: invalidRecords,
        validRecords: validRecords
      });
    }

    // 6. Si todo es válido
    // console.log('✅ Todos los registros son válidos');
    
    // TODO: Implementar lógica de creación automática similar a ExcelUploader
    // Por ahora, solo validamos y reportamos

    return res.status(200).json({
      success: true,
      message: 'Archivo procesado exitosamente. Todos los registros son válidos.',
      fileName: req.file.originalname,
      summary: {
        totalRecords: records.length,
        validRecords: validRecords.length,
        invalidRecords: 0
      },
      records: validRecords
    });

  } catch (error) {
    console.error('❌ Error procesando Excel:', error);

    return res.status(500).json({
      success: false,
      error: 'Error procesando archivo',
      message: error.message,
      fileName: req.file?.originalname || 'Desconocido'
    });
  }
});

module.exports = router;
