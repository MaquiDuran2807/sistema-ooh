const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE
});

const bucket = storage.bucket(process.env.GCP_STORAGE_BUCKET);

/**
 * Sube múltiples archivos a Google Cloud Storage
 * @param {Array} files - Array de archivos desde multer
 * @returns {Promise<Array>} URLs públicas de los archivos subidos
 */
const uploadToGCS = async (files) => {
  try {
    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const filename = `ooh-images/${Date.now()}-${uuidv4()}-${file.originalname}`;
        const gcsFile = bucket.file(filename);

        gcsFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype
          }
        }, (err) => {
          if (err) {
            console.error(`Error al subir ${file.originalname}:`, err);
            reject(new Error('Error al subir imagen a Cloud Storage'));
          } else {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
            console.log(`Imagen subida: ${publicUrl}`);
            resolve(publicUrl);
          }
        });
      });
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error al subir a GCS:', error);
    throw error;
  }
};

/**
 * Elimina un archivo de Google Cloud Storage
 * @param {String} imageUrl - URL pública de la imagen
 */
const deleteFromGCS = async (imageUrl) => {
  try {
    // Extraer el path del archivo de la URL pública
    // URL formato: https://storage.googleapis.com/bucket-name/path/to/file
    const urlParts = imageUrl.split('/');
    const bucketName = urlParts[3];
    const filepath = urlParts.slice(4).join('/');

    const file = bucket.file(filepath);
    await file.delete();
    console.log(`Archivo eliminado: ${filepath}`);
  } catch (error) {
    console.error('Error al eliminar de GCS:', error);
    // No lanzar error, solo registrar
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
 * Lista todos los archivos en GCS
 * @param {String} prefix - Prefijo para filtrar archivos (ej: 'ooh-images/')
 */
const listFiles = async (prefix = '') => {
  try {
    const [files] = await bucket.getFiles({ prefix });
    return files.map(file => ({
      name: file.name,
      url: `https://storage.googleapis.com/${bucket.name}/${file.name}`
    }));
  } catch (error) {
    console.error('Error al listar archivos:', error);
    throw error;
  }
};

module.exports = {
  uploadToGCS,
  deleteFromGCS,
  getFileInfo,
  listFiles
};
