const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const PptxGenJS = require('pptxgenjs');
const localStorageService = require('../services/localStorageService');
const dbService = require('../services/dbService');
const geoValidationService = require('../services/geoValidationService');

// Utilidades para fechas y texto
const parseDateSafe = (value) => {
  if (!value) return null;
  if (String(value).includes('-')) {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  const parts = String(value).split('/').map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    return isNaN(d) ? null : d;
  }
  return null;
};

// Normalizar fecha a formato ISO (yyyy-MM-dd)
// Soporta múltiples formatos: yyyy-MM-dd, d/MM/yyyy, DD/MM/YYYY, etc.
const normalizeDateToISO = (value) => {
  if (!value) return null;
  
  const valueStr = String(value).trim();
  
  // Si ya está en formato ISO (yyyy-MM-dd), devolverlo tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(valueStr)) {
    return valueStr;
  }
  
  // Intentar parsear como fecha
  let date = null;
  
  // Formato: d/MM/yyyy o DD/MM/YYYY
  if (valueStr.includes('/')) {
    const parts = valueStr.split('/').map(v => parseInt(v, 10));
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day > 0 && day <= 31 && month > 0 && month <= 12) {
        date = new Date(year, month - 1, day);
      }
    }
  } else {
    // Intentar como objeto Date normal
    date = new Date(valueStr);
  }
  
  if (!date || isNaN(date.getTime())) {
    console.warn(`⚠️ No se pudo parsear fecha: "${valueStr}"`);
    return null;
  }
  
  // Convertir a ISO (yyyy-MM-dd)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const matchesMonth = (value, monthStr) => {
  if (!monthStr) return true;
  
  // Manejar formato ISO yyyy-MM-dd
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const yearMonth = value.substring(0, 7); // Extrae "yyyy-MM"
    return yearMonth === monthStr;
  }
  
  // Formato anterior d/MM/yyyy
  const d = parseDateSafe(value);
  if (!d) return false;
  const current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return current === monthStr;
};

const formatMonthLabel = (monthStr) => {
  if (!monthStr) return 'TODOS LOS MESES';
  const months = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const [y,m] = monthStr.split('-');
  const idx = parseInt(m, 10) - 1;
  const name = months[idx] || monthStr;
  return `${name} ${y}`;
};

// Convertir fecha ISO (yyyy-MM-dd) a texto en español (ej: "4 de enero de 2026")
const formatDateToSpanish = (isoDate) => {
  if (!isoDate) return '';
  
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const parts = String(isoDate).split('-');
  
  if (parts.length !== 3) return isoDate;
  
  const [year, month, day] = parts;
  const monthIdx = parseInt(month, 10) - 1;
  const dayNum = parseInt(day, 10);
  
  if (monthIdx < 0 || monthIdx >= 12) return isoDate;
  
  return `${dayNum} de ${months[monthIdx]} de ${year}`;
};

// Convertir ruta de API a ruta del filesystem
const getLocalImagePath = (inputPath) => {
  if (!inputPath) return null;

  // Si ya es absoluta, devolver normalizada
  if (path.isAbsolute(inputPath)) {
    const normalized = path.normalize(inputPath);
    console.log(`🖼️ Ruta absoluta recibida, usando: ${normalized}`);
    return normalized;
  }

  // apiPath esperado: /api/images/MARCA/CAMPANA/YYYY-MM/filename.jpg
  const cleanPath = String(inputPath).replace(/^\/api\/images\//, '');
  const baseDir = path.join(__dirname, '..', 'local-images');
  const fullPath = path.join(baseDir, cleanPath);

  // Si existe, devolver
  if (fs.existsSync(fullPath)) {
    console.log(`🖼️ Convirtiendo ruta: ${inputPath} -> ${fullPath}`);
    return fullPath;
  }

  // Fallback: buscar por nombre de archivo en todo local-images (ruta en CSV errada)
  const filename = path.basename(cleanPath);
  let found = null;
  const stack = [baseDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile() && entry.name === filename) {
        found = p;
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    console.log(`🖼️ Fallback encontrado: ${found}`);
    return found;
  }

  console.warn(`⚠️ Imagen no encontrada para ruta: ${inputPath}`);
  return fullPath;
};

const createOOH = async (req, res) => {
  // 📊 Detectar si es CREATE o UPDATE
  const existingId = req.body.existingId || req.body.id;
  const operationType = existingId ? 'UPDATE' : 'CREATE';
  const emoji = existingId ? '🔄' : '➕';
  
  console.log(`\n${emoji} [${operationType} OOH] Iniciando ${existingId ? 'actualización' : 'creación'} de registro${existingId ? ` ID: ${existingId}` : ''}...`);
  
  try {
    // 📊 NUEVA ARQUITECTURA: Aceptar IDs en lugar de nombres
    
    // ✅ NUEVOS CAMPOS: Recibir IDs en lugar de nombres
    const { 
      brand_id, campaign_id, ooh_type_id, provider_id, city_id,  // ✅ IDs
      direccion, latitud, longitud, fechaInicio, fechaFin       // campos comunes
    } = req.body;
    
    // 🔄 COMPATIBILIDAD: Si vienen nombres (backend antiguo), rechazar
    const { marca, categoria, proveedor, tipoOOH, campana, ciudad, region } = req.body;
    
    if (marca || categoria || proveedor || tipoOOH || campana || ciudad || region) {
      console.log(`⚠️ [${operationType}] ADVERTENCIA: Se recibieron campos con nombres en lugar de IDs`);
      console.log(`📝 [${operationType}] Campos recibidos (nombres - DEPRECATED):`, { marca, categoria, proveedor, tipoOOH, campana, ciudad, region });
      return res.status(400).json({
        error: 'Arquitectura actualizada: Enviar IDs en lugar de nombres',
        requiredFields: {
          brand_id: 'Integer - ID de marca',
          campaign_id: 'Integer - ID de campaña',
          ooh_type_id: 'Integer - ID de tipo OOH',
          provider_id: 'Integer - ID de proveedor',
          city_id: 'Integer - ID de ciudad'
        },
        example: {
          brand_id: 1,
          campaign_id: 5,
          ooh_type_id: 3,
          provider_id: 2,
          city_id: 15
        },
        note: 'Los campos categoria y region se derivarán automáticamente de las relaciones'
      });
    }

    // ✅ Validar que se recibieron los IDs requeridos
    console.log(`📋 [${operationType}] Datos recibidos (IDs):`, { existingId, brand_id, campaign_id, ooh_type_id, provider_id, city_id, direccion, latitud, longitud });

    if (!brand_id || !campaign_id || !ooh_type_id || !provider_id || !city_id || !direccion || !latitud || !longitud || !fechaInicio) {
      console.log(`❌ [${operationType}] Error: Faltan IDs obligatorios`);
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        required: ['brand_id', 'campaign_id', 'ooh_type_id', 'provider_id', 'city_id', 'direccion', 'latitud', 'longitud', 'fechaInicio'],
        received: Object.keys(req.body)
      });
    }

    // ✅ Obtener datos relacionados desde BD usando los IDs
    console.log(`\n📚 [${operationType} - BD LOOKUP] Obteniendo datos relacionados por IDs...`);
    
    const brand = await dbService.getBrandById(brand_id);
    const campaign = await dbService.getCampaignById(campaign_id);
    const oohType = await dbService.getOOHTypeById(ooh_type_id);
    const provider = await dbService.getProviderById(provider_id);
    const city = await dbService.getCityById(city_id);

    // ✅ Validar que todos los IDs existan
    if (!brand) {
      return res.status(400).json({ error: `Marca no encontrada con ID: ${brand_id}` });
    }
    if (!campaign) {
      return res.status(400).json({ error: `Campaña no encontrada con ID: ${campaign_id}` });
    }
    if (!oohType) {
      return res.status(400).json({ error: `Tipo OOH no encontrado con ID: ${ooh_type_id}` });
    }
    if (!provider) {
      return res.status(400).json({ error: `Proveedor no encontrado con ID: ${provider_id}` });
    }
    if (!city) {
      return res.status(400).json({ error: `Ciudad no encontrada con ID: ${city_id}` });
    }

    console.log('✅ Todos los IDs validados en BD');
    console.log(`   • Brand: ${brand.nombre} (id=${brand_id})`);
    console.log(`   • Campaign: ${campaign.nombre} (id=${campaign_id})`);
    console.log(`   • Type: ${oohType.nombre} (id=${ooh_type_id})`);
    console.log(`   • Provider: ${provider.nombre} (id=${provider_id})`);
    console.log(`   • City: ${city.nombre} (id=${city_id})`);

    // ✅ AUTO-COMPUTAR: Derivar category_id desde brand.category_id
    const category_id = brand.category_id;
    console.log(`✅ AUTO-COMPUTAR category_id=${category_id} desde brand.category_id`);

    // ✅ AUTO-COMPUTAR: Derivar region_id desde city.region_id
    const region_id = city.region_id;
    console.log(`✅ AUTO-COMPUTAR region_id=${region_id} desde city.region_id`);

    // Normalizar fechas a formato ISO (yyyy-MM-dd)
    const FECHA_INICIO = normalizeDateToISO(fechaInicio);
    const FECHA_FIN = normalizeDateToISO(fechaFin);

    console.log('📅 Fechas normalizadas:', { FECHA_INICIO, FECHA_FIN });
    console.log('📸 Archivos recibidos:', req.files ? req.files.length : 0);

    // 🌍 VALIDACIÓN GEOGRÁFICA: Verificar que las coordenadas correspondan a la ciudad
    console.log('\n📍 [VALIDACIÓN GEO] Verificando que coordenadas correspondan a la ciudad...');
    const geoValidation = await geoValidationService.validarCoordenadasPorCiudad(city.nombre, latitud, longitud);
    
    if (!geoValidation.valido) {
      console.log(`❌ [VALIDACIÓN GEO] ${geoValidation.mensaje}`);
      return res.status(400).json({
        error: geoValidation.mensaje,
        detalles: 'Las coordenadas (latitud, longitud) deben corresponder a la ciudad indicada. Verifica que no haya confusión de ubicaciones.'
      });
    }
    console.log(`✅ [VALIDACIÓN GEO] ${geoValidation.mensaje}`);

    // Si es una actualización (tiene ID), las imágenes son opcionales
    const isUpdate = !!existingId;
    console.log(`🔄 ¿Es actualización? ${isUpdate} (existingId=${existingId})`);
    
    const imageIndexes = req.body.imageIndexes
      ? String(req.body.imageIndexes)
          .split(',')
          .map(v => parseInt(v, 10) - 1) // de 1-based en el front a 0-based aquí
          .filter(v => v >= 0 && v < 3)
      : [];
    
    // Validar que haya al menos 1 imagen para registros nuevos
    if (!isUpdate && (!req.files || req.files.length === 0)) {
      console.log('❌ Error: No se recibió ninguna imagen para registro nuevo');
      return res.status(400).json({
        error: '⚠️ Debes subir al menos 1 imagen para un nuevo registro. Se recomienda subir 3 imágenes.'
      });
    }

    console.log('🔍 Buscando registro existente...');

    let existing = null;
    if (existingId) {
      existing = await dbService.findExistingById(existingId);
    } else {
      // NOTA: Con la nueva arquitectura ID-based, buscar duplicados por dirección + ciudad + marca + fecha
      existing = await dbService.findExisting(direccion.toUpperCase(), FECHA_INICIO, brand.nombre, campaign.nombre);
    }
    
    const existingCSV = existing ? { lineIndex: 0, values: existing } : { lineIndex: -1, values: null };

    console.log('📊 Registro existente:', existingCSV.values ? 'SÍ' : 'NO');

    let id;
    let imageUrls = [];
    
    if (existingCSV.values) {
      // Usar el ID existente del registro encontrado
      id = existingCSV.values.id;
      console.log(`♻️ Actualizando registro existente con ID: ${id}`);
      
      // Partimos de las imágenes actuales
      imageUrls = [
        existingCSV.values.imagen_1 || '',
        existingCSV.values.imagen_2 || '',
        existingCSV.values.imagen_3 || ''
      ];

      // Si no hay nuevas imágenes, mantenemos las existentes tal cual
      if (!req.files || req.files.length === 0) {
        console.log('📷 Manteniendo imágenes existentes');
      } else {
        console.log('📤 Subiendo nuevas imágenes (reemplazo parcial)...');
        const uploadedUrls = await localStorageService.uploadToLocal(req.files, {
          id,
          marca: brand.nombre,
          campana: campaign.nombre,
          direccion: direccion.toUpperCase(),
          fechaInicio: FECHA_INICIO
        });

        // Reemplazar solo los slots indicados; si no se envían índices, reemplazar en orden
        uploadedUrls.forEach((url, idx) => {
          const targetIndex = imageIndexes[idx] !== undefined ? imageIndexes[idx] : idx;
          imageUrls[targetIndex] = url;
        });
      }
    } else {
      // Si no se encontró registro pero se envió un ID, es un error
      if (existingId) {
        console.log('❌ Error: ID proporcionado no encontrado en la base de datos');
        return res.status(404).json({
          error: 'Registro no encontrado con el ID proporcionado'
        });
      }
      
      // Generar nuevo ID
      id = uuidv4();
      console.log(`🆕 Creando nuevo registro con ID: ${id}`);
      
      console.log('📤 Subiendo imágenes...');
      imageUrls = await localStorageService.uploadToLocal(req.files, {
        id,
        marca: brand.nombre,
        campana: campaign.nombre,
        direccion: direccion.toUpperCase(),
        fechaInicio: FECHA_INICIO
      });
    }
    
    console.log('✅ Imágenes obtenidas:', imageUrls);
    console.log('📊 Imagen 0:', imageUrls[0] ? imageUrls[0].substring(0, 80) : 'vacía');
    console.log('📊 Imagen 1:', imageUrls[1] ? imageUrls[1].substring(0, 80) : 'vacía');
    console.log('📊 Imagen 2:', imageUrls[2] ? imageUrls[2].substring(0, 80) : 'vacía');
    
    // ✅ CONSTRUIR oohData CON ARQUITECTURA ID-BASED
    const oohData = {
      id,
      // ✅ NUEVOS CAMPOS: IDs en lugar de nombres
      brand_id: brand_id,
      campaign_id: campaign_id,
      ooh_type_id: ooh_type_id,
      provider_id: provider_id,
      city_id: city_id,
      category_id: category_id,          // ✅ AUTO-COMPUTADO
      region_id: region_id,               // ✅ AUTO-COMPUTADO
      // Datos locales para búsqueda rápida (denormalizados)
      marca: brand.nombre,
      campana: campaign.nombre,
      tipoOOH: oohType.nombre,
      proveedor: provider.nombre,
      ciudad: city.nombre,
      // Información geográfica
      latitud: parseFloat(latitud),
      longitud: parseFloat(longitud),
      // Imágenes
      imagenes: imageUrls,
      // Fechas
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN || (existingCSV.values ? existingCSV.values.fecha_final : null),
      direccion: direccion.toUpperCase(),
      fechaCreacion: new Date().toISOString()
    };

    // Actualizar o agregar según corresponda
    if (existingCSV.values) {
      console.log(`💾 [UPDATE] Actualizando registro existente ID: ${id}...`);
      await dbService.updateRecord(id, oohData);
      console.log(`✅ [UPDATE] Registro actualizado exitosamente - ID: ${id}`);
      res.status(200).json({
        success: true,
        message: 'Registro actualizado exitosamente',
        data: oohData,
        updated: true
      });
    } else {
      console.log('💾 [CREATE] Guardando nuevo registro en base de datos...');
      await dbService.addRecord(oohData);
      console.log(`✅ [CREATE] Registro creado exitosamente - ID: ${oohData.id}`);
      res.status(201).json({
        success: true,
        message: 'Registro creado exitosamente',
        data: oohData,
        updated: false
      });
    }
  } catch (error) {
    console.error(`❌ [${operationType}] Error en createOOH:`, error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: `Error al ${existingId ? 'actualizar' : 'crear'} el registro`,
      details: error.message
    });
  }
};

const getAllOOH = async (req, res) => {
  console.log('\n🔵 [GET ALL OOH] Obteniendo registros...');
  try {
    // Paginación: page (default 1), limit (default 50)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    console.log(`📄 Paginación: page=${page}, limit=${limit}, offset=${offset}`);
    
    // Leer todos los registros de la BD
    const allRecords = await dbService.getAllRecords();
    const total = allRecords.length;
    
    // Aplicar paginación en memoria
    const records = allRecords.slice(offset, offset + limit);
    
    console.log(`✅ Total registros: ${total}, enviando: ${records.length} (página ${page})`);
    
    if (records.length > 0) {
      console.log('📸 Ejemplo imagen_1:', records[0].imagen_1);
      console.log('📸 Ejemplo imagen_2:', records[0].imagen_2);
    }
    
    res.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + records.length < total
      }
    });
  } catch (error) {
    console.error('❌ Error en getAllOOH:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Error al obtener los registros',
      details: error.message
    });
  }
};

const getOOHById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await dbService.findExistingById(id);

    if (!record) {
      return res.status(404).json({
        error: 'Registro no encontrado'
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error en getOOHById:', error);
    res.status(500).json({
      error: 'Error al obtener el registro',
      details: error.message
    });
  }
};

// Generar PPT de VAYAS filtrado por mes (YYYY-MM)
// Estructura: Dirección (título), Ciudad, Imagen grande + 2 pequeñas, Vigencia, REF+Proveedor
// Query params: month=YYYY-MM, useBase=true (opcional: usar archivo base como plantilla)
const generateReport = async (req, res) => {
  try {
    const monthParam = req.query.month ? String(req.query.month).slice(0, 7) : null;
    const useBase = req.query.useBase === 'true';
    
    // Obtener registros filtrados por VALLA
    const allRecords = await dbService.getAllRecords();
    console.log(`📋 Total registros en BD: ${allRecords.length}`);

    // Filtrar por VALLA y mes
    const records = allRecords
      .filter(record => {
        const tipoOOH = String(record.tipo_ooh || '').trim().toUpperCase();
        const match = tipoOOH === 'VALLA';
        if (!match) {
          console.log(`❌ Registro rechazado: tipo_ooh="${record.tipo_ooh}" (no es VALLA)`);
        }
        return match;
      })
      .filter(record => {
        if (!monthParam) return true;
        // Filtrar por mes: yyyy-MM
        const recordMonth = String(record.fecha_inicio || '').slice(0, 7);
        return recordMonth === monthParam;
      })
      .map(record => {
        const imagenes = [record.imagen_1, record.imagen_2, record.imagen_3]
          .filter(Boolean)
          .map(p => getLocalImagePath(p))
          .filter(Boolean);

        return {
          id: record.id,
          marca: record.marca,
          categoria: record.categoria,
          proveedor: record.proveedor,
          campana: record.campana,
          direccion: record.direccion,
          ciudad: record.ciudad,
          region: record.region,
          latitud: record.latitud,
          longitud: record.longitud,
          imagenes,
          fechaInicio: record.fecha_inicio,
          fechaFin: record.fecha_final,
          tipoOOH: record.tipo_ooh
        };
      });

    // Filtrar por mes si se especifica
    const filtered = monthParam 
      ? records.filter(r => matchesMonth(r.fechaInicio, monthParam) || matchesMonth(r.fechaFin, monthParam))
      : records;

    console.log(`📊 Registros totales VALLA: ${records.length}`);
    console.log(`📊 Registros filtrados para ${monthParam}: ${filtered.length}`);
    if (filtered.length > 0) {
      console.log(`   Ejemplo fecha inicio: ${filtered[0].fechaInicio}`);
      console.log(`   Ejemplo fecha fin: ${filtered[0].fechaFin}`);
    }

    if (monthParam && filtered.length === 0) {
      return res.status(404).json({ 
        error: 'Sin registros de VALLA para el mes indicado',
        month: monthParam 
      });
    }

    const total = filtered.length;
    console.log(`📊 Generando PPT con ${total} registros de VAYA${monthParam ? ` para ${monthParam}` : ''}`);
    console.log(`   Método: ${useBase ? 'Archivo BASE + Python' : 'PptxGenJS desde cero'}`);

    // OPCIÓN 1: Usar archivo base con Python (requiere python-pptx instalado)
    if (useBase) {
      const { spawn } = require('child_process');
      const tmpDataPath = path.join(__dirname, `temp_data_${Date.now()}.json`);
      const tmpOutputPath = path.join(__dirname, `temp_output_${Date.now()}.pptx`);
      const basePPTPath = path.join(__dirname, '..', 'REPORTE FACTURACIÓN BASE.pptx');
      const pythonScript = path.join(__dirname, '..', 'generate_ppt_from_base_v3.py');
      
      // Verificar que existe el archivo base
      if (!fs.existsSync(basePPTPath)) {
        console.warn('⚠️ Archivo base no encontrado, usando PptxGenJS...');
      } else {
        // Preparar datos para Python
        const pyData = {
          base_file: basePPTPath,
          output_file: tmpOutputPath,
          records: filtered,
          month: monthParam
        };
        
        fs.writeFileSync(tmpDataPath, JSON.stringify(pyData, null, 2));
        
        // Ejecutar script Python
        return new Promise((resolve, reject) => {
          const python = spawn('python', [pythonScript, tmpDataPath]);
          
          let stdout = '';
          let stderr = '';
          
          python.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(data.toString().trim());
          });
          
          python.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(data.toString().trim());
          });
          
          python.on('close', (code) => {
            // Limpiar archivo temporal de datos
            try { fs.unlinkSync(tmpDataPath); } catch (e) {}
            
            if (code !== 0) {
              console.error(`❌ Python script failed (code ${code}): ${stderr}`);
              return reject(new Error(`Python script failed: ${stderr}`));
            }
            
            // Leer archivo generado
            if (!fs.existsSync(tmpOutputPath)) {
              return reject(new Error('Python no generó el archivo de salida'));
            }
            
            const buffer = fs.readFileSync(tmpOutputPath);
            
            // Limpiar archivo temporal de salida
            try { fs.unlinkSync(tmpOutputPath); } catch (e) {}
            
            // Enviar archivo
            const label = monthParam ? monthParam : 'todos';
            res.setHeader('Content-Disposition', `attachment; filename="reporte_vallas_${label}.pptx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
            
            resolve();
          });
        }).catch(error => {
          return res.status(500).json({ 
            error: 'Error al generar el reporte PPT con archivo base',
            details: error.message,
            hint: 'Instalar python-pptx: pip install python-pptx'
          });
        });
      }
    }

    // OPCIÓN 2: Crear PPT desde cero con PptxGenJS (por defecto)
    const pptx = new PptxGenJS();
    pptx.title = 'REPORTE VAYAS';
    
    // Dimensiones del slide (por defecto en PptxGenJS)
    const SLIDE_WIDTH = 10;   // pulgadas
    const SLIDE_HEIGHT = 7.5;  // pulgadas
    
    // Colores del branding ABI
    const colorRojo = 'CC0000';
    const colorOro = 'D4A574';
    const colorAzul = '003366';

    // Slide de portada
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: colorAzul };
    titleSlide.addText('REPORTE DE VAYAS', { 
      x: 0.5, y: 2.0, w: 9, 
      fontSize: 44, bold: true, align: 'center', color: 'FFFFFF' 
    });
    titleSlide.addText(formatMonthLabel(monthParam), { 
      x: 0.5, y: 3.2, w: 9, 
      fontSize: 24, align: 'center', color: colorOro 
    });
    titleSlide.addText(`Total: ${total} registros`, { 
      x: 0.5, y: 4.2, w: 9, 
      fontSize: 18, align: 'center', color: 'FFFFFF' 
    });

    // Crear un slide por registro VAYA
    filtered.forEach((record, idx) => {
      const slide = pptx.addSlide();
      
      // Fondo blanco
      slide.background = { color: 'FFFFFF' };
      
      // Barra superior con rojo ABI
      slide.addShape(pptx.ShapeType.rect, { 
        x: 0, y: 0, w: SLIDE_WIDTH, h: 0.35, 
        fill: { color: colorRojo }, 
        line: { type: 'none' } 
      });
      
      // TÍTULO = Dirección (más pequeño para que quepa)
      slide.addText(record.direccion.toUpperCase(), {
        x: 0.4, y: 0.5, w: 6.0,
        fontSize: 22, bold: true, color: colorAzul,
        align: 'left'
      });
      
      // CIUDAD (subtítulo)
      slide.addText(record.ciudad.toUpperCase(), {
        x: 0.4, y: 1.0, w: 6.0,
        fontSize: 14, color: '666666',
        align: 'left'
      });
      
      // LAYOUT DE IMÁGENES - 1 grande + 2 pequeñas
      const margin = 0.4;
      const gap = 0.15;
      
      // Imagen grande (izquierda) - cuadrada
      const largeImgSize = 4.0;  // 4"x4"
      const largeImgX = margin;
      const largeImgY = 1.5;
      
      if (record.imagenes[0]) {
        const imgPath = getLocalImagePath(record.imagenes[0]);
        if (imgPath && fs.existsSync(imgPath)) {
          slide.addImage({
            path: imgPath,
            x: largeImgX, y: largeImgY, 
            w: largeImgSize, h: largeImgSize,
            sizing: { type: 'cover', w: largeImgSize, h: largeImgSize }
          });
        } else {
          slide.addShape(pptx.ShapeType.rect, {
            x: largeImgX, y: largeImgY, 
            w: largeImgSize, h: largeImgSize,
            fill: { color: 'EEEEEE' },
            line: { color: 'CCCCCC', width: 2 }
          });
          slide.addText('📷 NO DISPONIBLE', {
            x: largeImgX, y: largeImgY + largeImgSize/2 - 0.2, 
            w: largeImgSize,
            fontSize: 10, align: 'center', color: '999999'
          });
        }
      }
      
      // Imágenes pequeñas (derecha) - rectangulares apiladas
      const smallImgWidth = 4.6;
      const smallImgHeight = 1.9;
      const rightX = largeImgX + largeImgSize + gap;
      const topY = largeImgY;
      
      // Imagen 2 (arriba derecha)
      if (record.imagenes[1]) {
        const imgPath = getLocalImagePath(record.imagenes[1]);
        if (imgPath && fs.existsSync(imgPath)) {
          slide.addImage({
            path: imgPath,
            x: rightX, y: topY, 
            w: smallImgWidth, h: smallImgHeight,
            sizing: { type: 'cover', w: smallImgWidth, h: smallImgHeight }
          });
        } else {
          slide.addShape(pptx.ShapeType.rect, {
            x: rightX, y: topY, 
            w: smallImgWidth, h: smallImgHeight,
            fill: { color: 'EEEEEE' },
            line: { color: 'CCCCCC', width: 1 }
          });
        }
      }
      
      // Imagen 3 (abajo derecha)
      const bottomY = topY + smallImgHeight + gap;
      if (record.imagenes[2]) {
        const imgPath = getLocalImagePath(record.imagenes[2]);
        if (imgPath && fs.existsSync(imgPath)) {
          slide.addImage({
            path: imgPath,
            x: rightX, y: bottomY, 
            w: smallImgWidth, h: smallImgHeight,
            sizing: { type: 'cover', w: smallImgWidth, h: smallImgHeight }
          });
        } else {
          slide.addShape(pptx.ShapeType.rect, {
            x: rightX, y: bottomY, 
            w: smallImgWidth, h: smallImgHeight,
            fill: { color: 'EEEEEE' },
            line: { color: 'CCCCCC', width: 1 }
          });
        }
      }
      
      // VIGENCIA (texto en parte inferior)
      const vigenciaText = `Vigencia: ${formatDateToSpanish(record.fechaInicio)} - ${formatDateToSpanish(record.fechaFin)}`;
      slide.addText(vigenciaText, {
        x: margin, y: 6.0, w: 9.0,
        fontSize: 12, bold: true, color: colorRojo,
        align: 'left'
      });
      
      // REF: PROVEEDOR (última línea)
      slide.addText(`REF: ${record.proveedor}`, {
        x: margin, y: 6.5, w: 9.0,
        fontSize: 11, color: '333333',
        align: 'left'
      });
      
      console.log(`✅ Slide ${idx + 1}: ${record.direccion} (${record.ciudad})`);
    });

    const buffer = await pptx.write('nodebuffer');
    const label = monthParam ? monthParam : 'todos';
    res.setHeader('Content-Disposition', `attachment; filename="reporte_vallas_${label}.pptx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (error) {
    console.error('❌ Error al generar PPT:', error);
    return res.status(500).json({ 
      error: 'Error al generar el reporte PPT',
      details: error.message 
    });
  }
};

// Obtener todas las marcas
const getAllBrands = async (req, res) => {
  try {
    const brands = dbService.getAllBrands();
    return res.json({ success: true, data: brands });
  } catch (error) {
    console.error('❌ Error obteniendo marcas:', error);
    return res.status(500).json({ error: 'Error obteniendo marcas' });
  }
};

// Obtener campañas de una marca
const getCampaignsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const campaigns = dbService.getCampaignsByBrand(parseInt(brandId));
    return res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('❌ Error obteniendo campañas:', error);
    return res.status(500).json({ error: 'Error obteniendo campañas' });
  }
};

// Obtener todos los tipos de OOH
const getAllOOHTypes = async (req, res) => {
  try {
    const types = dbService.getAllOOHTypes();
    return res.json({ success: true, data: types });
  } catch (error) {
    console.error('❌ Error obteniendo tipos OOH:', error);
    return res.status(500).json({ error: 'Error obteniendo tipos OOH' });
  }
};

// Crear marca
const createBrand = async (req, res) => {
  try {
    const { nombre, categoria } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de marca requerido' });
    }
    const brandId = await dbService.addBrand(nombre, categoria);
    dbService.saveDB();
    return res.status(201).json({ success: true, data: { id: brandId, nombre, categoria } });
  } catch (error) {
    console.error('❌ Error creando marca:', error);
    return res.status(500).json({ error: 'Error creando marca' });
  }
};

// Crear campaña
const createCampaign = async (req, res) => {
  try {
    const { nombre, brandId } = req.body;
    if (!nombre || !brandId) {
      return res.status(400).json({ error: 'Nombre y brandId requeridos' });
    }
    const campaignId = await dbService.addCampaign(nombre, parseInt(brandId));
    dbService.saveDB();
    return res.status(201).json({ success: true, data: { id: campaignId, nombre, brand_id: brandId } });
  } catch (error) {
    console.error('❌ Error creando campaña:', error);
    return res.status(500).json({ error: 'Error creando campaña' });
  }
};

// Crear tipo OOH
const createOOHType = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de tipo OOH requerido' });
    }
    const typeId = await dbService.addOOHType(nombre);
    dbService.saveDB();
    return res.status(201).json({ success: true, data: { id: typeId, nombre } });
  } catch (error) {
    console.error('❌ Error creando tipo OOH:', error);
    return res.status(500).json({ error: 'Error creando tipo OOH' });
  }
};

// Obtener todas las ciudades
const getAllCities = async (req, res) => {
  try {
    const cities = dbService.getAllCities();
    return res.status(200).json({ 
      success: true, 
      data: cities,
      count: cities.length 
    });
  } catch (error) {
    console.error('❌ Error obteniendo ciudades:', error);
    return res.status(500).json({ error: 'Error obteniendo ciudades' });
  }
};

// Obtener ciudades por región
const getCitiesByRegion = async (req, res) => {
  try {
    const { region } = req.params;
    if (!region) {
      return res.status(400).json({ error: 'Región requerida' });
    }
    const cities = dbService.getCitiesByRegion(region);
    return res.status(200).json({ 
      success: true, 
      data: cities,
      region,
      count: cities.length 
    });
  } catch (error) {
    console.error('❌ Error obteniendo ciudades por región:', error);
    return res.status(500).json({ error: 'Error obteniendo ciudades por región' });
  }
};

// Obtener ciudad por nombre
const getCityByName = async (req, res) => {
  try {
    const { nombre } = req.params;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de ciudad requerido' });
    }
    const city = dbService.getCityByName(nombre);
    if (!city) {
      return res.status(404).json({ error: 'Ciudad no encontrada' });
    }
    return res.status(200).json({ 
      success: true, 
      data: city
    });
  } catch (error) {
    console.error('❌ Error obteniendo ciudad:', error);
    return res.status(500).json({ error: 'Error obteniendo ciudad' });
  }
};

// Validar nombre de ciudad (detectar duplicados con variaciones)
const validateCityName = async (req, res) => {
  try {
    const { ciudad } = req.body;
    
    if (!ciudad) {
      return res.status(400).json({ 
        error: 'Nombre de ciudad requerido',
        valid: false
      });
    }

    // Validar el nombre
    const validation = dbService.validateCityName(ciudad);
    
    if (!validation.isValid) {
      console.log(`⚠️ [VALIDACIÓN CIUDAD] Duplicado detectado: ${validation.message}`);
      
      return res.status(400).json({
        success: false,
        valid: false,
        error: '🚫 Nombre de ciudad duplicado o variación existente',
        message: validation.message,
        ciudadIntentada: ciudad,
        normalizado: validation.normalized,
        ciudadExistente: validation.duplicate ? validation.duplicate.nombre : null,
        regionExistente: validation.duplicate ? validation.duplicate.region : null,
        detalles: {
          sugerencia: 'Esta ciudad ya existe en el sistema con un nombre similar. Usa el nombre exacto de la ciudad existente.'
        }
      });
    }

    // Si es válido, devolver confirmación
    console.log(`✅ [VALIDACIÓN CIUDAD] ${validation.message}`);
    
    return res.status(200).json({
      success: true,
      valid: true,
      message: validation.message,
      ciudadIntentada: ciudad,
      normalizado: validation.normalized
    });
    
  } catch (error) {
    console.error('❌ Error validando ciudad:', error);
    return res.status(500).json({ 
      error: 'Error validando ciudad',
      valid: false 
    });
  }
};

// Inicializar app - cargar todos los datos maestros
const initializeApp = (req, res) => {
  try {
    const db = dbService.getDatabase();
    
    // Cargar marcas
    const brandsStmt = db.prepare('SELECT b.id, b.nombre, c.nombre as categoria, a.nombre as anunciante, b.category_id, b.advertiser_id FROM brands b JOIN categories c ON b.category_id = c.id JOIN advertisers a ON b.advertiser_id = a.id ORDER BY b.nombre');
    const brands = [];
    while (brandsStmt.step()) {
      brands.push(brandsStmt.getAsObject());
    }
    brandsStmt.free();
    
    // Cargar campañas
    const campaignsStmt = db.prepare('SELECT c.id, c.nombre, c.brand_id, b.nombre as marca FROM campaigns c JOIN brands b ON c.brand_id = b.id ORDER BY c.nombre');
    const campaigns = [];
    while (campaignsStmt.step()) {
      campaigns.push(campaignsStmt.getAsObject());
    }
    campaignsStmt.free();
    
    // Cargar categorías
    const categoriesStmt = db.prepare('SELECT id, nombre FROM categories ORDER BY nombre');
    const categories = [];
    while (categoriesStmt.step()) {
      categories.push(categoriesStmt.getAsObject());
    }
    categoriesStmt.free();
    
    // Cargar anunciantes
    const advertisersStmt = db.prepare('SELECT id, nombre FROM advertisers ORDER BY nombre');
    const advertisers = [];
    while (advertisersStmt.step()) {
      advertisers.push(advertisersStmt.getAsObject());
    }
    advertisersStmt.free();
    
    // Cargar tipos OOH
    const typesStmt = db.prepare('SELECT id, nombre FROM ooh_types ORDER BY nombre');
    const oohTypes = [];
    while (typesStmt.step()) {
      oohTypes.push(typesStmt.getAsObject());
    }
    typesStmt.free();
    
    // Cargar ciudades
    const citiesStmt = db.prepare('SELECT c.id, c.nombre, c.latitud, c.longitud, c.radio_km, r.nombre as region FROM cities c JOIN regions r ON c.region_id = r.id ORDER BY c.nombre');
    const cities = [];
    while (citiesStmt.step()) {
      cities.push(citiesStmt.getAsObject());
    }
    citiesStmt.free();
    
    // Cargar direcciones
    const addressesStmt = db.prepare('SELECT a.id, a.city_id, a.descripcion, a.latitud, a.longitud, c.nombre as ciudad FROM addresses a JOIN cities c ON a.city_id = c.id ORDER BY c.nombre, a.descripcion');
    const addresses = [];
    while (addressesStmt.step()) {
      addresses.push(addressesStmt.getAsObject());
    }
    addressesStmt.free();
    
    // Cargar proveedores
    const providersStmt = db.prepare('SELECT id, nombre FROM providers ORDER BY nombre');
    const providers = [];
    while (providersStmt.step()) {
      providers.push(providersStmt.getAsObject());
    }
    providersStmt.free();
    
    // Cargar regiones
    const regionsStmt = db.prepare('SELECT id, nombre FROM regions ORDER BY nombre');
    const regions = [];
    while (regionsStmt.step()) {
      regions.push(regionsStmt.getAsObject());
    }
    regionsStmt.free();
    
    // Cargar registros OOH
    const recordsStmt = db.prepare('SELECT o.id, o.brand_id, o.campaign_id, o.ooh_type_id, o.address_id, o.provider_id, o.fecha_inicio, o.fecha_final, b.nombre as marca, c.nombre as campana, t.nombre as tipo FROM ooh_records o JOIN brands b ON o.brand_id = b.id JOIN campaigns c ON o.campaign_id = c.id JOIN ooh_types t ON o.ooh_type_id = t.id ORDER BY o.fecha_inicio DESC');
    const records = [];
    while (recordsStmt.step()) {
      records.push(recordsStmt.getAsObject());
    }
    recordsStmt.free();
    
    const responseData = {
      success: true,
      data: {
        brands,
        campaigns,
        categories,
        advertisers,
        oohTypes,
        cities,
        addresses,
        providers,
        regions,
        records
      }
    };
    
    // Calcular tamaño de la respuesta
    const jsonString = JSON.stringify(responseData);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    
    console.log('📊 TAMAÑO DE RESPUESTA /initialize:');
    console.log(`   Bytes: ${sizeInBytes}`);
    console.log(`   KB: ${sizeInKB}`);
    console.log(`   MB: ${sizeInMB}`);
    console.log(`   Breakdown:`);
    console.log(`   - Brands (${brands.length}): ${(JSON.stringify(brands).length / 1024).toFixed(2)} KB`);
    console.log(`   - Campaigns (${campaigns.length}): ${(JSON.stringify(campaigns).length / 1024).toFixed(2)} KB`);
    console.log(`   - Categories (${categories.length}): ${(JSON.stringify(categories).length / 1024).toFixed(2)} KB`);
    console.log(`   - Advertisers (${advertisers.length}): ${(JSON.stringify(advertisers).length / 1024).toFixed(2)} KB`);
    console.log(`   - OOH Types (${oohTypes.length}): ${(JSON.stringify(oohTypes).length / 1024).toFixed(2)} KB`);
    console.log(`   - Cities (${cities.length}): ${(JSON.stringify(cities).length / 1024).toFixed(2)} KB`);
    console.log(`   - Addresses (${addresses.length}): ${(JSON.stringify(addresses).length / 1024).toFixed(2)} KB`);
    console.log(`   - Providers (${providers.length}): ${(JSON.stringify(providers).length / 1024).toFixed(2)} KB`);
    console.log(`   - Regions (${regions.length}): ${(JSON.stringify(regions).length / 1024).toFixed(2)} KB`);
    console.log(`   - Records (${records.length}): ${(JSON.stringify(records).length / 1024).toFixed(2)} KB`);
    
    res.json(responseData);
  } catch (error) {
    console.error('Error en initializeApp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Crear nueva ciudad
const createCity = async (req, res) => {
  try {
    const { nombre, region } = req.body;
    
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ 
        error: 'Nombre de ciudad requerido',
        valid: false
      });
    }
    
    if (!region || !region.trim()) {
      return res.status(400).json({ 
        error: 'Región requerida',
        valid: false
      });
    }
    
    const CIUDAD = nombre.toUpperCase();
    const REGION = region.toUpperCase();
    
    // Validar si la ciudad ya existe
    const validation = dbService.validateCityName(CIUDAD);
    if (!validation.isValid) {
      console.log(`⚠️ [CREATE CITY] Duplicado detectado: ${validation.message}`);
      return res.status(400).json({
        success: false,
        valid: false,
        error: '🚫 Nombre de ciudad duplicado o variación existente',
        message: validation.message,
        ciudadIntentada: CIUDAD,
        normalizado: validation.normalized,
        ciudadExistente: validation.duplicate ? validation.duplicate.nombre : null,
        regionExistente: validation.duplicate ? validation.duplicate.region : null
      });
    }
    
    // Crear la ciudad en BD
    const newCity = dbService.addCity(CIUDAD, REGION);
    
    console.log(`✅ [CREATE CITY] Ciudad creada: ${CIUDAD} en región ${REGION}`);
    return res.status(201).json({
      success: true,
      valid: true,
      message: `Ciudad "${CIUDAD}" creada exitosamente en región "${REGION}"`,
      data: newCity
    });
    
  } catch (error) {
    console.error('❌ Error creando ciudad:', error);
    return res.status(500).json({ 
      error: 'Error al crear la ciudad',
      details: error.message
    });
  }
};

// Obtener marca por nombre (para mapeo frontend)
const getBrandByName = async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de marca requerido' });
    }
    const brand = dbService.getBrandByName(nombre);
    if (!brand) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    return res.status(200).json(brand);
  } catch (error) {
    console.error('❌ Error obteniendo marca:', error);
    return res.status(500).json({ error: 'Error obteniendo marca' });
  }
};

// Obtener tipo OOH por nombre (para mapeo frontend)
const getOOHTypeByName = async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de tipo OOH requerido' });
    }
    const oohType = dbService.getOOHTypeByName(nombre);
    if (!oohType) {
      return res.status(404).json({ error: 'Tipo OOH no encontrado' });
    }
    return res.status(200).json(oohType);
  } catch (error) {
    console.error('❌ Error obteniendo tipo OOH:', error);
    return res.status(500).json({ error: 'Error obteniendo tipo OOH' });
  }
};

// Obtener todos los proveedores
const getAllProviders = async (req, res) => {
  try {
    const providers = dbService.getAllProviders();
    return res.status(200).json(providers);
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    return res.status(500).json({ error: 'Error obteniendo proveedores' });
  }
};

// Obtener proveedor por nombre (para mapeo frontend)
const getProviderByName = async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de proveedor requerido' });
    }
    const provider = dbService.getProviderByName(nombre);
    if (!provider) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    return res.status(200).json(provider);
  } catch (error) {
    console.error('❌ Error obteniendo proveedor:', error);
    return res.status(500).json({ error: 'Error obteniendo proveedor' });
  }
};

// Obtener todas las campañas
const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = dbService.getAllCampaigns();
    return res.status(200).json(campaigns);
  } catch (error) {
    console.error('❌ Error obteniendo campañas:', error);
    return res.status(500).json({ error: 'Error obteniendo campañas' });
  }
};

// Obtener campaña por nombre (para mapeo frontend)
const getCampaignByName = async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de campaña requerido' });
    }
    const campaign = dbService.getCampaignByName(nombre);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }
    return res.status(200).json(campaign);
  } catch (error) {
    console.error('❌ Error obteniendo campaña:', error);
    return res.status(500).json({ error: 'Error obteniendo campaña' });
  }
};

// Eliminar registro OOH
const deleteOOH = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID del registro requerido' });
    }

    console.log(`\n🗑️  [DELETE OOH] Eliminando registro: ${id}`);

    // Usar la función completa de eliminación del dbService
    const result = dbService.deleteOOHRecord(id);

    if (!result.success) {
      console.error('❌ Error eliminando registro:', result.error);
      return res.status(400).json({ 
        error: result.error,
        success: false 
      });
    }

    console.log(`✅ Eliminación completada`);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error en deleteOOH:', error);
    return res.status(500).json({ 
      error: 'Error eliminando registro',
      detail: error.message 
    });
  }
};

// Crear nueva dirección
const createAddress = async (req, res) => {
  try {
    const { city_id, descripcion, latitud, longitud } = req.body;
    
    console.log('📍 [CREATE ADDRESS] Creando dirección:', { city_id, descripcion, latitud, longitud });
    
    if (!city_id || !descripcion || !latitud || !longitud) {
      return res.status(400).json({ 
        error: 'Faltan campos obligatorios',
        required: ['city_id', 'descripcion', 'latitud', 'longitud']
      });
    }
    
    // Verificar que la ciudad existe
    const city = await dbService.getCityById(city_id);
    if (!city) {
      return res.status(400).json({ error: `Ciudad no encontrada con ID: ${city_id}` });
    }
    
    // Validar coordenadas contra ciudad
    const validation = await geoValidationService.validarCoordenadasPorCiudad(
      city.nombre,
      parseFloat(latitud), 
      parseFloat(longitud)
    );
    
    if (!validation.valido) {
      return res.status(400).json({ 
        error: 'Coordenadas fuera del rango de la ciudad',
        details: validation.mensaje
      });
    }
    
    // Crear dirección en BD
    const db = dbService.getDatabase();
    const insertStmt = db.prepare(
      'INSERT INTO addresses (city_id, descripcion, latitud, longitud) VALUES (?, ?, ?, ?)'
    );
    insertStmt.run([city_id, descripcion, latitud, longitud]);
    insertStmt.free();
    
    // Obtener el ID insertado
    const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
    lastIdStmt.step();
    const newId = lastIdStmt.getAsObject().id;
    lastIdStmt.free();
    
    // Guardar BD
    await dbService.saveDB();
    
    const newAddress = {
      id: newId,
      city_id,
      ciudad: city.nombre,
      descripcion,
      latitud,
      longitud
    };
    
    console.log('✅ [CREATE ADDRESS] Dirección creada:', newAddress);
    
    return res.status(201).json({
      success: true,
      message: 'Dirección creada exitosamente',
      data: newAddress
    });
    
  } catch (error) {
    console.error('❌ Error creando dirección:', error);
    return res.status(500).json({ 
      error: 'Error creando dirección',
      details: error.message 
    });
  }
};

module.exports = {
  initializeApp,
  createOOH,
  getAllOOH,
  getOOHById,
  generateReport,
  getAllBrands,
  getBrandByName,
  getCampaignsByBrand,
  getAllOOHTypes,
  getOOHTypeByName,
  getAllProviders,
  getProviderByName,
  getAllCampaigns,
  getCampaignByName,
  createBrand,
  createCampaign,
  createOOHType,
  getAllCities,
  getCitiesByRegion,
  getCityByName,
  createCity,
  validateCityName,
  createAddress,
  deleteOOH
};
