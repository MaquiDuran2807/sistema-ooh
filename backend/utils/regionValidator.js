/**
 * Utilidad para validar y sugerir regiones basadas en coordenadas GPS
 * Las regiones de Colombia tienen rangos geográficos aproximados
 */

// Rangos de coordenadas para cada región de Colombia
const REGIONES_COORDENADAS = {
  'CO Norte': {
    nombre: 'CO Norte',
    descripcion: 'Costa Caribe y Norte de Santander',
    latMin: 7.5,
    latMax: 12.5,
    lngMin: -76.0,
    lngMax: -71.0,
    ciudadesEjemplo: ['Barranquilla', 'Cartagena', 'Santa Marta', 'Cúcuta', 'Valledupar']
  },
  'CO Centro': {
    nombre: 'CO Centro',
    descripcion: 'Altiplano Cundiboyacense y Llanos',
    latMin: 2.5,
    latMax: 6.5,
    lngMin: -74.5,
    lngMax: -72.0,
    ciudadesEjemplo: ['Bogotá', 'Tunja', 'Duitama', 'Villavicencio', 'Zipaquirá']
  },
  'CO Andes': {
    nombre: 'CO Andes',
    descripcion: 'Eje Cafetero y Valle de Aburrá',
    latMin: 4.0,
    latMax: 6.7,
    lngMin: -76.5,
    lngMax: -74.5,
    ciudadesEjemplo: ['Medellín', 'Manizales', 'Pereira', 'Armenia', 'Ibagué']
  },
  'CO Sur': {
    nombre: 'CO Sur',
    descripcion: 'Valle del Cauca, Cauca y Huila',
    latMin: 1.0,
    latMax: 4.5,
    lngMin: -77.5,
    lngMax: -74.5,
    ciudadesEjemplo: ['Cali', 'Popayán', 'Neiva', 'Pasto', 'Tulúa']
  }
};

/**
 * Determina la región basándose en coordenadas GPS
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Object} - { region: string, confidence: number, alternatives: Array }
 */
function getRegionByCoordinates(lat, lng) {
  const matches = [];
  
  for (const [key, region] of Object.entries(REGIONES_COORDENADAS)) {
    // Verificar si está dentro del rango
    const withinLat = lat >= region.latMin && lat <= region.latMax;
    const withinLng = lng >= region.lngMin && lng <= region.lngMax;
    
    if (withinLat && withinLng) {
      // Calcular confianza basada en qué tan central está el punto
      const latCenter = (region.latMin + region.latMax) / 2;
      const lngCenter = (region.lngMin + region.lngMax) / 2;
      const latRange = region.latMax - region.latMin;
      const lngRange = region.lngMax - region.lngMin;
      
      const latDistance = Math.abs(lat - latCenter) / (latRange / 2);
      const lngDistance = Math.abs(lng - lngCenter) / (lngRange / 2);
      const avgDistance = (latDistance + lngDistance) / 2;
      
      const confidence = Math.max(0, 1 - avgDistance);
      
      matches.push({
        region: region.nombre,
        descripcion: region.descripcion,
        confidence: Math.round(confidence * 100),
        ciudadesEjemplo: region.ciudadesEjemplo
      });
    }
  }
  
  // Ordenar por confianza
  matches.sort((a, b) => b.confidence - a.confidence);
  
  if (matches.length === 0) {
    return {
      region: null,
      confidence: 0,
      alternatives: [],
      warning: `Coordenadas (${lat}, ${lng}) fuera de rangos conocidos de Colombia`
    };
  }
  
  return {
    region: matches[0].region,
    confidence: matches[0].confidence,
    descripcion: matches[0].descripcion,
    alternatives: matches.slice(1),
    ciudadesEjemplo: matches[0].ciudadesEjemplo
  };
}

/**
 * Valida si una región dada coincide con las coordenadas
 * @param {string} region - Región declarada
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Object} - { isValid: boolean, suggested: string, message: string }
 */
function validateRegion(region, lat, lng) {
  const resultado = getRegionByCoordinates(lat, lng);
  
  if (!resultado.region) {
    return {
      isValid: false,
      suggested: null,
      confidence: 0,
      message: resultado.warning
    };
  }
  
  const isValid = region.toUpperCase() === resultado.region.toUpperCase();
  
  return {
    isValid,
    suggested: resultado.region,
    confidence: resultado.confidence,
    message: isValid 
      ? `✅ Región "${region}" correcta para coordenadas (${lat}, ${lng})`
      : `⚠️  Región "${region}" no coincide con coordenadas. Se sugiere "${resultado.region}" (confianza: ${resultado.confidence}%)`,
    descripcion: resultado.descripcion,
    ciudadesEjemplo: resultado.ciudadesEjemplo,
    alternatives: resultado.alternatives
  };
}

/**
 * Obtiene todas las regiones con sus rangos de coordenadas
 * @returns {Object} - Objeto con todas las regiones
 */
function getAllRegionsWithCoordinates() {
  return REGIONES_COORDENADAS;
}

/**
 * Verifica si unas coordenadas están dentro de Colombia
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {boolean}
 */
function isWithinColombia(lat, lng) {
  // Límites aproximados de Colombia
  const colombiaLimits = {
    latMin: -4.2, // San Andrés y sur de Colombia
    latMax: 13.4, // Punta Gallinas
    lngMin: -79.0, // Isla de Malpelo
    lngMax: -66.9  // Frontera con Brasil
  };
  
  return lat >= colombiaLimits.latMin && 
         lat <= colombiaLimits.latMax && 
         lng >= colombiaLimits.lngMin && 
         lng <= colombiaLimits.lngMax;
}

module.exports = {
  getRegionByCoordinates,
  validateRegion,
  getAllRegionsWithCoordinates,
  isWithinColombia,
  REGIONES_COORDENADAS
};
