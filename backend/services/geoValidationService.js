/**
 * Servicio de validación geográfica
 * Valida que las coordenadas (lat, long) correspondan a la ciudad indicada
 */

const geolib = require('geolib');
const dbService = require('./dbService');

/**
 * Validar que las coordenadas estén dentro del rango de la ciudad
 * @param {string} ciudad - Nombre de la ciudad
 * @param {number} latitud - Latitud
 * @param {number} longitud - Longitud
 * @returns {object} { valido: boolean, mensaje: string, distancia: number }
 */
const validarCoordenadasPorCiudad = async (ciudad, latitud, longitud) => {
  try {
    // Normalizar inputs
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    
    // Validar que sean números válidos
    if (isNaN(lat) || isNaN(lng)) {
      return {
        valido: false,
        mensaje: '❌ Latitud y longitud deben ser números válidos',
        distancia: null,
      };
    }
    
    // Validar rangos geográficos globales
    if (lat < -90 || lat > 90) {
      return {
        valido: false,
        mensaje: '❌ Latitud debe estar entre -90 y 90',
        distancia: null,
      };
    }
    
    if (lng < -180 || lng > 180) {
      return {
        valido: false,
        mensaje: '❌ Longitud debe estar entre -180 y 180',
        distancia: null,
      };
    }
    
    // Obtener información de la ciudad desde la BD
    const infoCiudad = dbService.getCityByName(ciudad);
    
    if (!infoCiudad) {
      const ciudadesDisponibles = dbService.getAllCities();
      const nombresCiudades = ciudadesDisponibles.map(c => c.nombre).join(', ');
      return {
        valido: false,
        mensaje: `❌ Ciudad "${ciudad}" no reconocida. Ciudades disponibles: ${nombresCiudades}`,
        distancia: null,
      };
    }
    
    // Calcular distancia entre la ubicación ingresada y el centro de la ciudad
    const distanciaEnMetros = geolib.getDistance(
      { latitude: lat, longitude: lng },
      { latitude: infoCiudad.latitud, longitude: infoCiudad.longitud }
    );
    
    const distanciaEnKm = (distanciaEnMetros / 1000).toFixed(2);
    const radioKm = infoCiudad.radio_km;
    
    console.log(`📍 Validación geo: Ciudad=${infoCiudad.nombre}, Radio permitido=${radioKm}km, Distancia calculada=${distanciaEnKm}km`);
    
    // Validar que esté dentro del radio permitido
    if (distanciaEnMetros > radioKm * 1000) {
      return {
        valido: false,
        mensaje: `❌ Las coordenadas están a ${distanciaEnKm}km del centro de ${infoCiudad.nombre}, pero el radio permitido es de ${radioKm}km. Verifica que la ciudad sea correcta.`,
        distancia: parseFloat(distanciaEnKm),
        ciudadEsperada: infoCiudad.nombre,
      };
    }
    
    return {
      valido: true,
      mensaje: `✅ Coordenadas válidas para ${infoCiudad.nombre} (a ${distanciaEnKm}km del centro)`,
      distancia: parseFloat(distanciaEnKm),
      ciudadValidada: infoCiudad.nombre,
    };
  } catch (error) {
    console.error('❌ Error en validación geográfica:', error.message);
    return {
      valido: false,
      mensaje: `Error interno en validación: ${error.message}`,
      distancia: null,
    };
  }
};

/**
 * Validar coordenadas sin ciudad (solo validar rangos)
 * @param {number} latitud - Latitud
 * @param {number} longitud - Longitud
 * @returns {object} { valido: boolean, mensaje: string }
 */
const validarCoordenadasBasico = (latitud, longitud) => {
  try {
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    
    if (isNaN(lat) || isNaN(lng)) {
      return {
        valido: false,
        mensaje: 'Latitud y longitud deben ser números válidos',
      };
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        valido: false,
        mensaje: 'Coordenadas fuera de rango válido',
      };
    }
    
    return {
      valido: true,
      mensaje: 'Coordenadas válidas',
    };
  } catch (error) {
    return {
      valido: false,
      mensaje: `Error validando coordenadas: ${error.message}`,
    };
  }
};

module.exports = {
  validarCoordenadasPorCiudad,
  validarCoordenadasBasico,
};
