import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App';

// ✅ Registrar Service Worker para caché de imágenes
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registrado para caché de imágenes');
        
        // Comprobar actualizaciones cada 60 segundos
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch(error => {
        console.warn('⚠️ Service Worker error:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
