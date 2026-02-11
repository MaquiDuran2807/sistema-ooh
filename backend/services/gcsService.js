const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');

let storage;
let bucket;
let historicoBucket;

// Inicializar Storage solo si hay configuración
if (process.env.GCP_PROJECT_ID && process.env.GCP_KEY_FILE) {
  storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_KEY_FILE
  });

  // Bucket principal (publicis-abi) - se usa para todo
  if (process.env.GCP_STORAGE_BUCKET) {
    bucket = storage.bucket(process.env.GCP_STORAGE_BUCKET);
  }

  // Bucket para histórico - usando el mismo bucket publicis-abi
  // Las imágenes se organizan en la carpeta Historico/ dentro del bucket
  if (process.env.GCP_HISTORICO_BUCKET) {
    historicoBucket = storage.bucket(process.env.GCP_HISTORICO_BUCKET);
    // console.log(`🪣 Usando bucket: ${process.env.GCP_HISTORICO_BUCKET}/Historico/`);
  }
} else {
  // console.log('⚠️ GCS no configurado: Falta GCP_PROJECT_ID o GCP_KEY_FILE');
}

/**
 * Sube múltiples archivos a Google Cloud Storage
 * Organiza las imágenes en: Historico/OOH-APP-IMAGES/{brand}/{recordId}/imagen_{index}.{ext}
 * 
 * @param {Array} files - Array de archivos desde multer
 * @param {String} brand - Nombre de la marca (ej: 'AGUILA', 'POKER')
 * @param {String} recordId - ID del registro OOH (ej: 'REC-001')
 * @param {Object} options - Opciones avanzadas (opcional)
 * @param {Array<String>} options.filenames - Rutas completas dentro del bucket para sobrescribir
 * @returns {Promise<Array>} URLs públicas de los archivos subidos
 */
const uploadToGCS = async (files, brand = 'GENERAL', recordId = null, options = {}) => {
  try {
    if (!historicoBucket) {
      throw new Error('❌ Bucket histórico no configurado. Ejecuta: node init-gcs-buckets.js');
    }

    const basePrefix = process.env.GCP_HISTORICO_PREFIX || 'Historico/OOH-APP-IMAGES';
    const filenames = Array.isArray(options.filenames) ? options.filenames : [];

    // Si no hay recordId, generar uno temporal
    if (!recordId) {
      recordId = `REC-${Date.now()}`;
    }

    // Normalizar el nombre de la marca (sin espacios, mayúsculas)
    const normalizedBrand = brand.toUpperCase().replace(/\s+/g, '_');

    console.log(`☁️ Subiendo ${files.length} imagen(es) a gs://${process.env.GCP_HISTORICO_BUCKET}/${basePrefix}/${normalizedBrand}/${recordId}/`);

    const normalizeTargetPath = (inputPath, index) => {
      const timestamp = Date.now(); // Agregar timestamp para evitar caché
      const defaultPath = `${basePrefix}/${normalizedBrand}/${recordId}/imagen_${index + 1}_${timestamp}.png`;
      if (!inputPath) return defaultPath;
      
      const cleaned = String(inputPath).split('?')[0];
      const withoutExt = cleaned.replace(/\.[^/.]+$/, '');
      
      // Si ya tiene timestamp (de update previo), reemplazarlo
      const timestampRegex = /_\d{13}\.png$/;
      if (timestampRegex.test(withoutExt + '.png')) {
        return `${withoutExt.replace(/_\d{13}$/, '')}_${timestamp}.png`;
      }
      
      return `${withoutExt}_${timestamp}.png`;
    };

    const uploadPromises = files.map(async (file, index) => {
      try {
        const filename = normalizeTargetPath(filenames[index], index);
        const gcsFile = historicoBucket.file(filename);

        const pngBuffer = await sharp(file.buffer)
          .png({ compressionLevel: 9, adaptiveFiltering: true })
          .toBuffer();

        await gcsFile.save(pngBuffer, {
          metadata: {
            contentType: 'image/png',
            metadata: {
              brand: normalizedBrand,
              recordId: recordId,
              uploadedAt: new Date().toISOString(),
              originalName: file.originalname,
              originalMime: file.mimetype
            }
          }
        });

        const publicUrl = `https://storage.googleapis.com/${process.env.GCP_HISTORICO_BUCKET}/${filename}`;
        console.log(`✅ Imagen subida: ${publicUrl}`);
        return publicUrl;
      } catch (err) {
        console.error(`❌ Error al subir ${file.originalname}:`, err);
        throw new Error('Error al subir imagen a Cloud Storage');
      }
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('❌ Error al subir a GCS:', error);
    throw error;
  }
};

/**
 * Elimina un archivo de Google Cloud Storage (publicis-abi bucket)
 * @param {String} imageUrl - URL pública de la imagen
 */
const deleteFromGCS = async (imageUrl) => {
  try {
    // Extraer el path del archivo de la URL pública
    // URL formato: https://storage.googleapis.com/publicis-abi/path/to/file
    const urlParts = imageUrl.split('/');
    const bucketName = urlParts[3];
    const filepath = urlParts.slice(4).join('/');

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filepath);
    await file.delete();
    // console.log(`✅ Archivo eliminado: ${filepath}`);
  } catch (error) {
    console.error('❌ Error al eliminar de GCS:', error);
    // No lanzar error, solo registrar
  }
};

/**
 * Elimina todos los archivos de un registro específico (del bucket Historico)
 * @param {String} brand - Nombre de la marca
 * @param {String} recordId - ID del registro
 */
const deleteRecordFolder = async (brand, recordId) => {
  try {
    const normalizedBrand = brand.toUpperCase().replace(/\s+/g, '_');
    const basePrefix = process.env.GCP_HISTORICO_PREFIX || 'Historico/OOH-APP-IMAGES';
    const prefix = `${basePrefix}/${normalizedBrand}/${recordId}/`;
    
    const [files] = await historicoBucket.getFiles({ prefix });
    
    if (files.length === 0) {
      // console.log(`⚠️ No se encontraron archivos en: ${prefix}`);
      return;
    }

    const deletePromises = files.map(file => file.delete());
    await Promise.all(deletePromises);
    
    // console.log(`✅ ${files.length} archivos eliminados de ${prefix}`);
  } catch (error) {
    console.error('❌ Error al eliminar carpeta de GCS:', error);
  }
};

/**
 * Obtiene información de un archivo en GCS
 * @param {String} filepath - Ruta del archivo en GCS
 */
const getFileInfo = async (filepath) => {
  try {
    const file = bucket.file(filepath);
    const [metadata] = await file.getMetadata();
    return metadata;
  } catch (error) {
    console.error('Error al obtener info de archivo:', error);
    throw error;
  }
};

/**
 * Lista todos los archivos en GCS (del bucket Historico)
 * @param {String} prefix - Prefijo para filtrar archivos (ej: 'Historico/OOH-APP-IMAGES/')
 * @param {String} brand - Filtrar por marca específica (opcional)
 * @param {String} recordId - Filtrar por registro específico (opcional)
 */
const listFiles = async (prefix = '', brand = null, recordId = null) => {
  try {
    // Construir el prefijo basado en los parámetros
    const basePrefix = process.env.GCP_HISTORICO_PREFIX || 'Historico/OOH-APP-IMAGES';
    let fullPrefix = prefix || `${basePrefix}/`;
    
    if (brand) {
      const normalizedBrand = brand.toUpperCase().replace(/\s+/g, '_');
      fullPrefix = `${basePrefix}/${normalizedBrand}/`;
      
      if (recordId) {
        fullPrefix = `${basePrefix}/${normalizedBrand}/${recordId}/`;
      }
    }
    
    const [files] = await historicoBucket.getFiles({ prefix: fullPrefix });
    return files.map(file => ({
      name: file.name,
      url: `https://storage.googleapis.com/${process.env.GCP_HISTORICO_BUCKET}/${file.name}`,
      metadata: file.metadata
    }));
  } catch (error) {
    console.error('❌ Error al listar archivos:', error);
    throw error;
  }
};

/**
 * Obtiene las URLs de imágenes de un registro específico (del bucket Historico)
 * @param {String} brand - Nombre de la marca
 * @param {String} recordId - ID del registro
 * @returns {Promise<Array>} Array de URLs de imágenes
 */
const getRecordImages = async (brand, recordId) => {
  try {
    const files = await listFiles('', brand, recordId);
    return files.map(file => file.url);
  } catch (error) {
    console.error('❌ Error al obtener imágenes del registro:', error);
    return [];
  }
};

module.exports = {
  uploadToGCS,
  deleteFromGCS,
  deleteRecordFolder,
  getFileInfo,
  listFiles,
  getRecordImages
};
