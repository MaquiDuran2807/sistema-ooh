const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const PptxGenJS = require('pptxgenjs');
const localStorageService = require('../services/localStorageService');
const dbService = require('../services/dbService');

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
  console.log('\n🔵 [CREATE OOH] Iniciando creación de registro...');
  try {
    // Buscar ID tanto en "id" como en "existingId" (compatibilidad)
    const existingId = req.body.existingId || req.body.id;
    const { marca, categoria, proveedor, tipoOOH, campana, direccion, ciudad, region, latitud, longitud, fechaInicio, fechaFin } = req.body;

    // Normalizar a mayúsculas sostenidas (excepto IDs, fechas, coords)
    const MARCA = (marca || '').toUpperCase();
    const CATEGORIA = (categoria || '').toUpperCase();
    const PROVEEDOR = (proveedor || '').toUpperCase();
    const TIPO_OOH = (tipoOOH || '').toUpperCase();
    const CAMPANA = (campana || '').toUpperCase();
    const DIRECCION = (direccion || '').toUpperCase();
    const CIUDAD = (ciudad || '').toUpperCase();
    const REGION = (region || '').toUpperCase();
    
    // Normalizar fechas a formato ISO (yyyy-MM-dd)
    const FECHA_INICIO = normalizeDateToISO(fechaInicio);
    const FECHA_FIN = normalizeDateToISO(fechaFin);

    console.log('📋 Datos recibidos:', { existingId, marca, categoria, proveedor, tipoOOH, campana, direccion, ciudad, region, latitud, longitud, fechaInicio, fechaFin });
    console.log('📅 Fechas normalizadas:', { FECHA_INICIO, FECHA_FIN });
    console.log('📸 Archivos recibidos:', req.files ? req.files.length : 0);
    console.log('🔑 Todos los campos del body:', Object.keys(req.body));

    // Validar campos obligatorios
    if (!marca || !categoria || !proveedor || !tipoOOH || !campana || !direccion || !ciudad || !region || !latitud || !longitud || !FECHA_INICIO) {
      console.log('❌ Error: Faltan campos obligatorios');
      return res.status(400).json({
        error: 'Faltan campos obligatorios: marca, categoría, proveedor, tipoOOH, campaña, dirección, ciudad, región, latitud, longitud, fechaInicio'
      });
    }

    // Si es una actualización (tiene ID), las imágenes son opcionales
    const isUpdate = !!existingId;
    console.log(`🔄 ¿Es actualización? ${isUpdate} (existingId=${existingId})`);
    
    const imageIndexes = req.body.imageIndexes
      ? String(req.body.imageIndexes)
          .split(',')
          .map(v => parseInt(v, 10) - 1) // de 1-based en el front a 0-based aquí
          .filter(v => v >= 0 && v < 3)
      : [];
    
    // Validar imágenes solo si es creación nueva
    if (!isUpdate && (!req.files || req.files.length !== 3)) {
      console.log('❌ Error: No se recibieron 3 imágenes para registro nuevo');
      return res.status(400).json({
        error: 'Debes subir exactamente 3 imágenes para un nuevo registro'
      });
    }

    console.log('🔍 Buscando registro existente...');

    let existing = null;
    if (existingId) {
      existing = await dbService.findExistingById(existingId);
    } else {
      existing = await dbService.findExisting(DIRECCION, FECHA_INICIO, MARCA, CAMPANA);
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
          marca: MARCA,
          campana: CAMPANA,
          direccion: DIRECCION,
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
        marca: MARCA,
        campana: CAMPANA,
        direccion: DIRECCION,
        fechaInicio: FECHA_INICIO
      });
    }
    
    console.log('✅ Imágenes obtenidas:', imageUrls);
    console.log('📊 Imagen 0:', imageUrls[0] ? imageUrls[0].substring(0, 80) : 'vacía');
    console.log('📊 Imagen 1:', imageUrls[1] ? imageUrls[1].substring(0, 80) : 'vacía');
    console.log('📊 Imagen 2:', imageUrls[2] ? imageUrls[2].substring(0, 80) : 'vacía');
    
    const oohData = {
      id,
      marca: MARCA,
      categoria: CATEGORIA,
      proveedor: PROVEEDOR,
      tipoOOH: TIPO_OOH,
      campana: CAMPANA,
      direccion: DIRECCION,
      ciudad: CIUDAD,
      region: REGION,
      latitud: parseFloat(latitud),
      longitud: parseFloat(longitud),
      imagenes: imageUrls,
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN || (existingCSV.values ? existingCSV.values.fecha_final : null),
      fechaCreacion: new Date().toISOString()
    };

    // Actualizar o agregar según corresponda
    if (existingCSV.values) {
      console.log('💾 Actualizando registro en base de datos...');
      await dbService.updateRecord(id, oohData);
      console.log('✅ Registro actualizado exitosamente');
      res.status(200).json({
        success: true,
        message: 'Registro actualizado exitosamente',
        data: oohData,
        updated: true
      });
    } else {
      console.log('💾 Guardando nuevo registro en base de datos...');
      await dbService.addRecord(oohData);
      console.log('✅ Registro creado exitosamente');
      res.status(201).json({
        success: true,
        message: 'Registro creado exitosamente',
        data: oohData,
        updated: false
      });
    }
  } catch (error) {
    console.error('❌ Error en createOOH:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Error al crear el registro',
      details: error.message
    });
  }
};

const getAllOOH = async (req, res) => {
  console.log('\n🔵 [GET ALL OOH] Obteniendo todos los registros...');
  try {
    // Leer de la base de datos
    const records = await dbService.getAllRecords();
    console.log(`✅ Registros obtenidos de la BD: ${records.length}`);
    if (records.length > 0) {
      console.log('📸 Ejemplo imagen_1:', records[0].imagen_1);
      console.log('📸 Ejemplo imagen_2:', records[0].imagen_2);
    }
    res.json({
      success: true,
      data: records
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

module.exports = {
  createOOH,
  getAllOOH,
  getOOHById,
  generateReport,
  getAllBrands,
  getCampaignsByBrand,
  getAllOOHTypes,
  createBrand,
  createCampaign,
  createOOHType
};
