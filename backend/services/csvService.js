const fs = require('fs');
const path = require('path');

const CSV_FILE = process.env.CSV_FILE_PATH || path.join(__dirname, '../ooh_data.csv');
const HEADERS = [
  'ID',
  'Marca',
  'Anunciante',
  'Categoria',
  'Tipo_OOH',
  'Campana',
  'Ciudad',
  'Ciudad_Dashboard',
  'Direccion',
  'Coordenadas',
  'Fecha_Inicio',
  'Fecha_Final',
  'Imgur_Link',
  'Imgur_Link_2',
  'Imgur_Link_3',
  'Region',
  'Proveedor'
];

// Normaliza texto a mayúsculas sostenidas (deja vacío si null/undefined)
const normalizeText = (value) => String(value || '').trim().toUpperCase();

const ensureHeader = async () => {
  const exists = fs.existsSync(CSV_FILE);
  if (!exists) {
    await fs.promises.writeFile(CSV_FILE, HEADERS.join(';') + '\n', 'utf8');
  }
};

const csvEscape = (value) => {
  const v = value === undefined || value === null ? '' : String(value);
  // Como usamos punto y coma, solo necesitamos escapar punto y coma si aparece en el valor
  return v.replace(/;/g, ',');
};

// Construye ruta absoluta hacia local-images, aceptando ya-abs y /api/images
const buildAbsoluteImagePath = (rawPath) => {
  if (!rawPath) return '';

  // Si ya es absoluta, normalizar y devolver
  if (path.isAbsolute(rawPath)) {
    return path.normalize(rawPath);
  }

  // Limpiar /api/images/
  const clean = String(rawPath).replace(/^\/api\/images\//, '');
  const baseDir = path.join(__dirname, '../local-images');
  const candidate = path.join(baseDir, clean);

  if (fs.existsSync(candidate)) return candidate;

  // Fallback: buscar por nombre de archivo
  const filename = path.basename(clean);
  const stack = [baseDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile() && entry.name === filename) {
        return p;
      }
    }
  }

  return candidate; // devuelve candidato aunque no exista, para logging aguas arriba
};

const addToCSV = async (data) => {
  await ensureHeader();

  const safe = validateRecordFields(data);

  // NOTA: Las fechas en data.fechaInicio y data.fechaFin ya vienen normalizadas
  // en formato ISO (yyyy-MM-dd) desde oohController.normalizeDateToISO()
  // Se guardan tal cual sin conversión adicional
  const row = [
    csvEscape(safe.id),
    csvEscape(normalizeText(safe.marca)),
    csvEscape('ABI'),
    csvEscape(normalizeText(safe.categoria || '')),
      csvEscape(normalizeText(safe.tipoOOH || '')), // Tipo_OOH in position 4
    csvEscape(normalizeText(safe.campana)),
    csvEscape(normalizeText(safe.ciudad)),
    csvEscape(normalizeText(safe.ciudad)),
    csvEscape(normalizeText(safe.direccion)),
    csvEscape(`${safe.latitud},${safe.longitud}`),
    csvEscape(safe.fechaInicio),  // ISO format: yyyy-MM-dd
    csvEscape(safe.fechaFin),      // ISO format: yyyy-MM-dd
    csvEscape(safe.imagenes && safe.imagenes.length > 0 ? buildAbsoluteImagePath(safe.imagenes[0]) : ''),
    csvEscape(safe.imagenes && safe.imagenes.length > 1 ? buildAbsoluteImagePath(safe.imagenes[1]) : ''),
    csvEscape(safe.imagenes && safe.imagenes.length > 2 ? buildAbsoluteImagePath(safe.imagenes[2]) : ''),
    csvEscape(normalizeText(safe.region)),
    csvEscape(normalizeText(safe.proveedor || 'APX'))
  ].join(';') + '\n';

  await fs.promises.appendFile(CSV_FILE, row, 'utf8');
};

const findExistingInCSV = async (direccion, fechaInicio, marca, campana) => {
  try {
    await ensureHeader();
    const content = await fs.promises.readFile(CSV_FILE, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(';');
      // Índices CSV nuevos: 0=ID, 1=Marca, 2=Anunciante, 3=Categoria, 4=Tipo_OOH, 5=Campana, 6=Ciudad, 7=Ciudad_Dashboard, 8=Direccion, 9=Coordenadas, 10=Fecha_Inicio, 11=Fecha_Final, 12=Imgur_Link, 13=Imgur_Link_2, 14=Imgur_Link_3, 15=Region, 16=Proveedor
      const isNewSchema = values.length >= 17;
      const dir = normalizeText(values[isNewSchema ? 8 : 7]);
      const fi = values[isNewSchema ? 10 : 9];
      const mar = normalizeText(values[1]);
      const cam = normalizeText(values[isNewSchema ? 5 : 4]);
      if (dir === normalizeText(direccion) && fi === fechaInicio && mar === normalizeText(marca) && cam === normalizeText(campana)) {
        return { lineIndex: i, values };
      }
    }
    
    return { lineIndex: -1, values: null };
  } catch (error) {
    console.error('Error al buscar en CSV:', error);
    return { lineIndex: -1, values: null };
  }
};

const findExistingInCSVById = async (id) => {
  try {
    await ensureHeader();
    const content = await fs.promises.readFile(CSV_FILE, 'utf8');
    const lines = content.split('\n');
    
    console.log('🔎 Buscando ID en CSV:', id);
    console.log('📄 Total líneas en CSV:', lines.length - 1);
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(';');
      const csvId = values[0].trim();
      
      console.log(`Línea ${i}: Comparando "${csvId}" con "${id}"`);
      
      // Índice 0 = ID
      if (csvId === id.trim()) {
        console.log('✅ ID encontrado en línea', i);
        return { lineIndex: i, values };
      }
    }
    
    console.log('❌ ID no encontrado en ninguna línea');
    return { lineIndex: -1, values: null };
  } catch (error) {
    console.error('Error al buscar en CSV por ID:', error);
    return { lineIndex: -1, values: null };
  }
};

// Validador de rutas de imagen - detecta y corrige corrupción
const validateAndFixImagePath = (imagePath, fallbackData = {}) => {
  // Si está vacío, intentar recuperar desde disco usando el ID/marca/campana
  if (!imagePath || imagePath.trim() === '') {
    if (fallbackData.id && fallbackData.marca && fallbackData.campana) {
      try {
        const marca = normalizeText(fallbackData.marca);
        const campana = normalizeText(fallbackData.campana);
        const basePath = path.join(__dirname, '..', 'local-images', marca, campana);

        if (fs.existsSync(basePath)) {
          const dateFolders = fs.readdirSync(basePath).filter(item => {
            const fullPath = path.join(basePath, item);
            return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(item);
          });

          for (const dateFolder of dateFolders) {
            const folderPath = path.join(basePath, dateFolder);
            const files = fs.readdirSync(folderPath);
            const matchingFile = files.find(file => file.includes(fallbackData.id));

            if (matchingFile) {
              const recoveredPath = path.join(folderPath, matchingFile);
              console.log(`✅ Ruta recuperada (vacío): ${recoveredPath}`);
              return recoveredPath;
            }
          }
        }
      } catch (error) {
        console.error('Error al intentar recuperar ruta vacía:', error);
      }
    }

    return '';
  }

  // Detectar patrones de corrupción comunes
  const corruptionPatterns = [
    /^\d{4}-\d{2}-\d{2}$/,  // Fechas ISO: 2026-02-28
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,  // Fechas: 28/02/2026
    /^https?:\/\//,  // URLs HTTP que no deberían estar aquí
    /^\/api\/images\//  // Rutas API sin convertir
  ];

  // Verificar si la ruta está corrupta
  const isCorrupt = corruptionPatterns.some(pattern => pattern.test(imagePath.trim()));
  
  if (isCorrupt) {
    console.warn(`⚠️ Detectada ruta de imagen corrupta: "${imagePath}"`);
    
    // Si hay datos de fallback y la ruta corrupta parece ser una fecha
    // intentar buscar la imagen en el sistema de archivos
    if (fallbackData.id && fallbackData.marca && fallbackData.campana) {
      const marca = normalizeText(fallbackData.marca);
      const campana = normalizeText(fallbackData.campana);
      const basePath = path.join(__dirname, '..', 'local-images', marca, campana);
      
      try {
        // Buscar carpetas de fecha en el directorio de la campaña
        if (fs.existsSync(basePath)) {
          const dateFolders = fs.readdirSync(basePath).filter(item => {
            const fullPath = path.join(basePath, item);
            return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(item);
          });
          
          // Buscar archivos que coincidan con el ID
          for (const dateFolder of dateFolders) {
            const folderPath = path.join(basePath, dateFolder);
            const files = fs.readdirSync(folderPath);
            const matchingFile = files.find(file => file.includes(fallbackData.id));
            
            if (matchingFile) {
              const recoveredPath = path.join(folderPath, matchingFile);
              console.log(`✅ Ruta recuperada: ${recoveredPath}`);
              return recoveredPath;
            }
          }
        }
      } catch (error) {
        console.error('Error al intentar recuperar ruta de imagen:', error);
      }
    }
    
    // Si no se pudo recuperar, devolver vacío para evitar guardar datos corruptos
    console.error(`❌ No se pudo recuperar la ruta corrupta, guardando vacío`);
    return '';
  }

  // Si la ruta parece válida, normalizarla usando buildAbsoluteImagePath
  return buildAbsoluteImagePath(imagePath);
};

// Valida y sanea los 17 campos antes de escribir la fila
const validateRecordFields = (data) => {
  const sanitized = { ...data };

  const requireText = (key, fallback = '') => {
    if (!sanitized[key] || String(sanitized[key]).trim() === '') {
      console.warn(`⚠️ Campo faltante: ${key}`);
      sanitized[key] = fallback;
    }
  };

  const ensureDate = (key) => {
    const v = sanitized[key];
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(String(v).trim())) {
      sanitized[key] = String(v).trim();
    } else {
      console.warn(`⚠️ Fecha inválida en ${key}: ${v}`);
      sanitized[key] = '';
    }
  };

  const ensureCoords = () => {
    const v = sanitized.latitud !== undefined && sanitized.longitud !== undefined
      ? `${sanitized.latitud},${sanitized.longitud}`
      : sanitized.coordenadas;
    if (v && /^-?\d+(\.\d+)?,\-?\d+(\.\d+)?$/.test(String(v).trim())) {
      const [lat, lng] = String(v).split(',');
      sanitized.latitud = parseFloat(lat);
      sanitized.longitud = parseFloat(lng);
    } else {
      console.warn(`⚠️ Coordenadas inválidas: ${v}`);
      sanitized.latitud = '';
      sanitized.longitud = '';
    }
  };

  requireText('id');
  requireText('marca');
  requireText('campana');
  requireText('ciudad');
  requireText('direccion');
  requireText('region', '');
  requireText('proveedor', 'APX');
  ensureDate('fechaInicio');
  ensureDate('fechaFin');
  ensureCoords();

  return sanitized;
};

const updateCSVLine = async (lineIndex, data) => {
  try {
    const content = await fs.promises.readFile(CSV_FILE, 'utf8');
    const lines = content.split('\n');
    
    // NOTA: Las fechas en data.fechaInicio y data.fechaFin ya vienen normalizadas
    // en formato ISO (yyyy-MM-dd) desde oohController.normalizeDateToISO()
    // Se guardan tal cual sin conversión adicional
    
    // Validar campos completos
    const safe = validateRecordFields(data);

    // Validar y corregir rutas de imágenes antes de guardar
    const img1 = safe.imagenes && safe.imagenes.length > 0 ? 
      validateAndFixImagePath(safe.imagenes[0], { id: safe.id, marca: safe.marca, campana: safe.campana }) : '';
    const img2 = safe.imagenes && safe.imagenes.length > 1 ? 
      validateAndFixImagePath(safe.imagenes[1], { id: safe.id, marca: safe.marca, campana: safe.campana }) : '';
    const img3 = safe.imagenes && safe.imagenes.length > 2 ? 
      validateAndFixImagePath(safe.imagenes[2], { id: safe.id, marca: safe.marca, campana: safe.campana }) : '';
    
    console.log('📸 Rutas de imagen validadas:');
    console.log('  Img1:', img1 || '(vacío)');
    console.log('  Img2:', img2 || '(vacío)');
    console.log('  Img3:', img3 || '(vacío)');
    
    const row = [
      csvEscape(safe.id),
      csvEscape(normalizeText(safe.marca)),
      csvEscape('ABI'),
      csvEscape(normalizeText(safe.categoria || '')),
      csvEscape(normalizeText(safe.tipoOOH || '')),
      csvEscape(normalizeText(safe.campana)),
      csvEscape(normalizeText(safe.ciudad)),
      csvEscape(normalizeText(safe.ciudad)),
      csvEscape(normalizeText(safe.direccion)),
      csvEscape(`${safe.latitud},${safe.longitud}`),
      csvEscape(safe.fechaInicio),  // ISO format: yyyy-MM-dd
      csvEscape(safe.fechaFin),      // ISO format: yyyy-MM-dd
      csvEscape(img1),
      csvEscape(img2),
      csvEscape(img3),
      csvEscape(normalizeText(safe.region)),
      csvEscape(normalizeText(safe.proveedor || 'APX'))
    ].join(';');
    
    lines[lineIndex] = row;
    await fs.promises.writeFile(CSV_FILE, lines.join('\n'), 'utf8');
    console.log(`CSV actualizado en línea ${lineIndex}`);
  } catch (error) {
    console.error('Error al actualizar CSV:', error);
    throw error;
  }
};

const getAllFromCSV = async () => {
  try {
    console.log('📂 Iniciando getAllFromCSV...');
    await ensureHeader();
    
    if (!fs.existsSync(CSV_FILE)) {
      console.warn('⚠️ Archivo CSV no existe en:', CSV_FILE);
      return [];
    }

    console.log('✅ Archivo CSV encontrado:', CSV_FILE);
    const content = await fs.promises.readFile(CSV_FILE, 'utf8');
    const lines = content.split('\n');
    
    console.log(`📋 Total líneas en CSV: ${lines.length}`);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parsear CSV con punto y coma
      const values = line.split(';');
      console.log(`📝 Línea ${i}:`, values);
      
      // Soporta esquema nuevo (17 columnas) y antiguo (16 columnas sin Tipo_OOH)
      const isNewSchema = values.length >= 17;
      // Índices nuevos: 0=ID,1=Marca,2=Anunciante,3=Categoria,4=Tipo_OOH,5=Campana,6=Ciudad,7=Ciudad_Dashboard,8=Direccion,9=Coordenadas,10=Fecha_Inicio,11=Fecha_Final,12=Imgur_Link,13=Imgur_Link_2,14=Imgur_Link_3,15=Region,16=Proveedor
      const idxCampana = isNewSchema ? 5 : 4;
      const idxCiudad = isNewSchema ? 6 : 5;
      const idxDir = isNewSchema ? 8 : 7;
      const idxCoords = isNewSchema ? 9 : 8;
      const idxFechaInicio = isNewSchema ? 10 : 9;
      const idxFechaFin = isNewSchema ? 11 : 10;
      const idxImg1 = isNewSchema ? 12 : 11;
      const idxImg2 = isNewSchema ? 13 : 12;
      const idxImg3 = isNewSchema ? 14 : 13;
      const idxRegion = isNewSchema ? 15 : 14;
      const idxProveedor = isNewSchema ? 16 : 15;
      const idxTipo = isNewSchema ? 4 : null;

      const [lat, lng] = values[idxCoords] ? values[idxCoords].split(',') : ['', ''];
      
      data.push([
        null, // índice 0 vacío (compatibilidad con Excel)
        values[0], // ID
        normalizeText(values[1]), // Marca
        normalizeText(values[3]), // Categoria
        normalizeText(values[idxProveedor] || 'APX'), // Proveedor
        normalizeText(values[idxCampana]), // Campaña
        normalizeText(values[idxDir]), // Dirección
        normalizeText(values[idxCiudad]), // Ciudad
        normalizeText(values[idxRegion]), // Region
        lat, // Latitud
        lng, // Longitud
        values[idxImg1], // Imagen 1
        values[idxImg2], // Imagen 2
        values[idxImg3], // Imagen 3
        values[idxFechaInicio], // Fecha Inicio
        values[idxFechaFin], // Fecha Fin
        '', // Fecha Creación (no está en CSV)
        normalizeText(idxTipo !== null ? values[idxTipo] : '') // Tipo OOH al final
      ]);
    }

    console.log(`📊 Total registros encontrados en CSV: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Error al leer CSV:', error);
    console.error('Stack:', error.stack);
    return [];
  }
};

module.exports = {
  addToCSV,
  findExistingInCSV,
  findExistingInCSVById,
  updateCSVLine,
  getAllFromCSV
};
