// Service Worker para cachear imágenes
const CACHE_VERSION = 'ooh-images-v1';
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

// Instalar
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Cachear: imágenes de GCS + imágenes locales + requests a /api/ooh/image
  const isImage = 
    url.includes('storage.googleapis.com') ||
    url.includes('/api/images/') ||
    url.includes('/api/ooh/image');
  
  if (isImage && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_VERSION).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            console.log('📦 Imagen servida desde caché:', url);
            return response;
          }
          
          return fetch(event.request).then(response => {
            // Solo cachear si es exitosa
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
              console.log('✅ Imagen cacheada:', url);
            }
            return response;
          }).catch(error => {
            console.error('❌ Error descargando imagen:', url, error);
            // Retornar imagen en caché si existe (fallback offline)
            return cache.match(event.request);
          });
        });
      })
    );
  } else {
    // Peticiones normales (no imágenes)
    event.respondWith(fetch(event.request));
  }
});

// Mensaje para limpiar caché manualmente si es necesario
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
    caches.delete(CACHE_VERSION).then(() => {
      console.log('🗑️ Caché de imágenes limpiado');
    });
  }
});
