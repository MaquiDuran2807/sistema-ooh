// Sistema avanzado de caché de imágenes con localStorage + IndexedDB
const CACHE_KEY_PREFIX = 'ooh_image_cache_';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const DB_NAME = 'OOH_IMAGE_DB';
const DB_STORE = 'images';

let db = null;

/**
 * Inicializar IndexedDB
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (e) => {
      const objectStore = e.target.result.createObjectStore(DB_STORE, { keyPath: 'id' });
      objectStore.createIndex('timestamp', 'timestamp', { unique: false });
    };
  });
};

/**
 * Guardar imagen como blob en IndexedDB
 */
export const cacheImageBlob = async (imageUrl, blobData) => {
  try {
    await initDB();
    
    const cacheEntry = {
      id: imageUrl,
      blob: blobData,
      timestamp: Date.now(),
      size: blobData.size
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_STORE], 'readwrite');
      const store = transaction.objectStore(DB_STORE);
      const request = store.put(cacheEntry);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`✅ Imagen cacheada (IndexedDB): ${imageUrl.substring(0, 60)}...`);
        resolve(true);
      };
    });
  } catch (error) {
    console.warn('⚠️ Error guardando blob en caché:', error);
    return false;
  }
};

/**
 * Obtener imagen blob desde caché
 */
export const getCachedImageBlob = async (imageUrl) => {
  try {
    await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_STORE], 'readonly');
      const store = transaction.objectStore(DB_STORE);
      const request = store.get(imageUrl);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          const age = Date.now() - request.result.timestamp;
          if (age > CACHE_DURATION_MS) {
            // Expiró, eliminar
            const deleteReq = store.delete(imageUrl);
            deleteReq.onsuccess = () => resolve(null);
          } else {
            resolve(request.result.blob);
          }
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.warn('⚠️ Error leyendo blob desde caché:', error);
    return null;
  }
};

/**
 * Obtener URL de objeto desde blob cacheado
 */
export const getCachedImageUrl = async (imageUrl) => {
  try {
    const blob = await getCachedImageBlob(imageUrl);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.warn('⚠️ Error obteniendo URL de caché:', error);
  }
  return null;
};

/**
 * Guardar lista de imágenes en localStorage (metadata solamente)
 */
export const cacheRecordImages = (recordId, images) => {
  try {
    const cacheData = {
      images,
      timestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${recordId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('⚠️ Error guardando metadata en localStorage:', error);
    clearExpiredCache();
  }
};

/**
 * Obtener lista de imágenes desde localStorage
 */
export const getCachedImages = (recordId) => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${recordId}`);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;

    if (age > CACHE_DURATION_MS) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${recordId}`);
      return null;
    }

    return cacheData.images;
  } catch (error) {
    console.warn('⚠️ Error leyendo metadata desde caché:', error);
    return null;
  }
};

/**
 * Invalidar caché de un registro
 */
export const invalidateCache = (recordId) => {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${recordId}`);
  } catch (error) {
    console.warn('⚠️ Error invalidando caché:', error);
  }
};

/**
 * Limpiar entradas expiradas
 */
export const clearExpiredCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (!cached) return;

          const cacheData = JSON.parse(cached);
          const age = now - cacheData.timestamp;

          if (age > CACHE_DURATION_MS) {
            localStorage.removeItem(key);
            console.log(`🗑️ Caché expirado eliminado: ${key}`);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('⚠️ Error limpiando caché expirado:', error);
  }
};

/**
 * Obtener tamaño total de caché
 */
export const getCacheSize = async () => {
  try {
    let localStorageSize = 0;
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          localStorageSize += new Blob([item]).size;
        }
      }
    });

    let indexedDBSize = 0;
    try {
      await initDB();
      const transaction = db.transaction([DB_STORE], 'readonly');
      const store = transaction.objectStore(DB_STORE);
      
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          indexedDBSize = request.result.reduce((sum, entry) => sum + (entry.size || 0), 0);
          const totalKB = ((localStorageSize + indexedDBSize) / 1024).toFixed(2);
          resolve({
            localStorage: (localStorageSize / 1024).toFixed(2),
            indexedDB: (indexedDBSize / 1024).toFixed(2),
            total: totalKB
          });
        };
      });
    } catch (e) {
      return {
        localStorage: (localStorageSize / 1024).toFixed(2),
        indexedDB: 0,
        total: (localStorageSize / 1024).toFixed(2)
      };
    }
  } catch (error) {
    return { localStorage: 0, indexedDB: 0, total: 0 };
  }
};

/**
 * Limpiar TODOS los caches (para debugging)
 */
export const clearAllImageCaches = async () => {
  try {
    // Limpiar localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key));
    
    // Limpiar IndexedDB
    await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_STORE], 'readwrite');
      const store = transaction.objectStore(DB_STORE);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('🗑️ TODOS los caches de imágenes limpiados');
        resolve(true);
      };
    });
  } catch (error) {
    console.error('❌ Error limpiando caches:', error);
    return false;
  }
};

// Limpiar caché expirado al iniciar
clearExpiredCache();
