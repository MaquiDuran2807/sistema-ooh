const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Crear carpeta de imágenes locales si no existe
const imagesDir = path.join(__dirname, '../local-images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/**
 * Formatea fecha para nombre de carpeta (YYYY-MM)
 */
const formatFolderDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch {
    return 'sin-fecha';
  }
};

/**
 * Limpia una cadena para nombre de archivo (sin espacios ni caracteres especiales)
 */
const sanitizeFilename = (str) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
};

/**
 * Sube imágenes al almacenamiento local (para desarrollo sin GCP)
 * @param {Array} files - Array de archivos desde multer
 * @param {Object} metadata - Objeto con id, marca, campana, direccion
 * @returns {Promise<Array>} Rutas locales absolutas de los archivos
 */
const uploadToLocal = async (files, metadata = {}) => {
  try {
    const uploadPromises = files.map(async (file, index) => {
      let filename;
      let targetDir = imagesDir;

      const pngBuffer = await sharp(file.buffer)
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      if (metadata.id && metadata.marca) {
        const marcaClean = sanitizeFilename(metadata.marca);
        const hash = crypto.createHash('md5').update(pngBuffer).digest('hex');
        const timestamp = Date.now(); // Timestamp para evitar caché

        // Crear estructura de carpetas simple: marca/
        targetDir = path.join(imagesDir, marcaClean);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Nombre de archivo: id_hash_timestamp.png (con timestamp para nuevas versiones)
        filename = `${metadata.id}_${hash}_${timestamp}.png`;
      } else {
        filename = `${Date.now()}-${uuidv4()}.png`;
      }

      const filepath = path.join(targetDir, filename);

      await fs.promises.writeFile(filepath, pngBuffer);
      const absolutePath = path.normalize(filepath);
      // console.log(`Imagen guardada localmente: ${absolutePath}`);
      return absolutePath;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error al subir localmente:', error);
    throw error;
  }
};

/**
 * Sirve las imágenes almacenadas localmente (soporta estructura de carpetas)
 */
const serveImage = (filename, res) => {
  try {
    // filename puede incluir subcarpetas: marca/campana/fecha/archivo.jpg
    const filepath = path.join(imagesDir, filename);
    
    // Seguridad: asegurar que la ruta está dentro de imagesDir
    const normalizedPath = path.normalize(filepath);
    const normalizedBase = path.normalize(imagesDir);
    if (!normalizedPath.startsWith(normalizedBase)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    if (fs.existsSync(filepath)) {
      res.sendFile(filepath);
    } else {
      res.status(404).json({ error: 'Imagen no encontrada' });
    }
  } catch (error) {
    console.error('Error al servir imagen:', error);
    res.status(500).json({ error: 'Error al servir imagen' });
  }
};

/**
 * Elimina un archivo de almacenamiento local
 * @param {String} imageUrl - URL local de la imagen
 */
const deleteFromLocal = async (imageUrl) => {
  try {
    // Extraer el filename de la URL
    const filename = imageUrl.replace('/api/images/', '');
    const filepath = path.join(imagesDir, filename);

    // Seguridad: asegurar que la ruta está dentro de imagesDir
    if (!filepath.startsWith(imagesDir)) {
      // console.warn('Intento de eliminar archivo fuera de imagesDir');
      return;
    }

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      // console.log(`Archivo eliminado: ${filename}`);
    }
  } catch (error) {
    console.error('Error al eliminar archivo local:', error);
  }
};

module.exports = {
  uploadToLocal,
  serveImage,
  deleteFromLocal
};
