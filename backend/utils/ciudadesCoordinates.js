/**
 * Ciudades colombianas con coordenadas centrales y radio de validación
 * El radio define el área máxima (en metros) donde se pueden ingresar coordenadas
 * para esa ciudad. Esto previene errores como ingresar "Bogotá" con coordenadas de París.
 * 
 * 📋 CÓMO AGREGAR UNA NUEVA CIUDAD O PUEBLO:
 * 
 * 1. Busca las coordenadas del centro de la ciudad en Google Maps:
 *    - Abre Google Maps
 *    - Busca la ciudad/pueblo
 *    - Haz clic derecho en el centro → "¿Qué hay aquí?"
 *    - Copia las coordenadas (ej: 4.7110, -74.0721)
 * 
 * 2. Define el radio según el tamaño del área urbana:
 *    - Pueblos pequeños: 8-12 km
 *    - Ciudades medianas: 15-20 km
 *    - Ciudades grandes: 25-35 km
 *    - Áreas metropolitanas: 40-50 km
 *    
 *    💡 Tip: Es mejor ser generoso. El objetivo es evitar errores graves
 *    (como París para Bogotá), no ser restrictivo al milímetro.
 * 
 * 3. Agrega la entrada en el objeto CIUDADES con este formato:
 * 
 *    NOMBRE_CIUDAD: {
 *      nombre: 'NOMBRE CIUDAD',
 *      latitud: 4.1234,
 *      longitud: -75.5678,
 *      radioKm: 10,
 *    },
 * 
 * Ejemplo para agregar Tunja:
 *    TUNJA: {
 *      nombre: 'TUNJA',
 *      latitud: 5.5353,
 *      longitud: -73.3678,
 *      radioKm: 8,
 *    },
 */

const CIUDADES = {
  // REGIÓN CENTRO - BOGOTÁ Y ÁREA METROPOLITANA
  BOGOTA: {
    nombre: 'BOGOTÁ D.C.',
    latitud: 4.7110,
    longitud: -74.0721,
    radioKm: 45,
    region: 'Centro',
  },
  
  SOACHA: {
    nombre: 'SOACHA',
    latitud: 4.5769,
    longitud: -74.2289,
    radioKm: 12,
    region: 'Centro',
  },
  
  MOSQUERA: {
    nombre: 'MOSQUERA',
    latitud: 4.7424,
    longitud: -74.3531,
    radioKm: 12,
    region: 'Centro',
  },
  
  SESQUILE: {
    nombre: 'SESQUILE',
    latitud: 5.0275,
    longitud: -73.7964,
    radioKm: 10,
    region: 'Centro',
  },
  
  ZIPAQUIRA: {
    nombre: 'ZIPAQUIRÁ',
    latitud: 5.1697,
    longitud: -73.8067,
    radioKm: 12,
    region: 'Centro',
  },
  
  VILLAVICENCIO: {
    nombre: 'VILLAVICENCIO',
    latitud: 4.1431,
    longitud: -73.6292,
    radioKm: 18,
    region: 'Centro',
  },
  
  // REGIÓN ANDES - MEDELLÍN Y ÁREA METROPOLITANA
  MEDELLIN: {
    nombre: 'MEDELLÍN',
    latitud: 6.2442,
    longitud: -75.5812,
    radioKm: 35,
    region: 'Andes',
  },
  
  BELLO: {
    nombre: 'BELLO',
    latitud: 6.3386,
    longitud: -75.5458,
    radioKm: 12,
    region: 'Andes',
  },
  
  ITAGUI: {
    nombre: 'ITAGÜÍ',
    latitud: 6.1676,
    longitud: -75.5857,
    radioKm: 12,
    region: 'Andes',
  },
  
  // REGIÓN ANDES - OTRAS CIUDADES
  BUCARAMANGA: {
    nombre: 'BUCARAMANGA',
    latitud: 7.1254,
    longitud: -73.1198,
    radioKm: 25,
    region: 'Andes',
  },
  
  PEREIRA: {
    nombre: 'PEREIRA',
    latitud: 4.8133,
    longitud: -75.6961,
    radioKm: 18,
    region: 'Andes',
  },
  
  MANIZALES: {
    nombre: 'MANIZALES',
    latitud: 5.0688,
    longitud: -75.5046,
    radioKm: 15,
    region: 'Andes',
  },
  
  ARMENIA: {
    nombre: 'ARMENIA',
    latitud: 4.5339,
    longitud: -75.7314,
    radioKm: 15,
    region: 'Andes',
  },
  
  IBAGUE: {
    nombre: 'IBAGUÉ',
    latitud: 4.4381,
    longitud: -75.2322,
    radioKm: 18,
    region: 'Andes',
  },
  
  TUNJA: {
    nombre: 'TUNJA',
    latitud: 5.5353,
    longitud: -73.3678,
    radioKm: 12,
    region: 'Andes',
  },
  
  DUITAMA: {
    nombre: 'DUITAMA',
    latitud: 5.8122,
    longitud: -73.0384,
    radioKm: 12,
    region: 'Andes',
  },
  
  SOGAMOSO: {
    nombre: 'SOGAMOSO',
    latitud: 5.7297,
    longitud: -72.9275,
    radioKm: 12,
    region: 'Andes',
  },
  
  VITERBO: {
    nombre: 'VITERBO',
    latitud: 4.9597,
    longitud: -75.8197,
    radioKm: 10,
    region: 'Andes',
  },
  
  ROVIRA: {
    nombre: 'ROVIRA',
    latitud: 5.1019,
    longitud: -75.0289,
    radioKm: 8,
    region: 'Andes',
  },
  
  TULUA: {
    nombre: 'TULUÁ',
    latitud: 4.3186,
    longitud: -76.1956,
    radioKm: 12,
    region: 'Andes',
  },
  
  // REGIÓN NORTE - COSTA ATLÁNTICA
  BARRANQUILLA: {
    nombre: 'BARRANQUILLA',
    latitud: 10.9639,
    longitud: -74.7964,
    radioKm: 28,
    region: 'Norte',
  },
  
  CARTAGENA: {
    nombre: 'CARTAGENA DE INDIAS',
    latitud: 10.3910,
    longitud: -75.5136,
    radioKm: 22,
    region: 'Norte',
  },
  
  CUCUTA: {
    nombre: 'CÚCUTA',
    latitud: 7.8935,
    longitud: -72.5080,
    radioKm: 20,
    region: 'Norte',
  },
  
  VALLEDUPAR: {
    nombre: 'VALLEDUPAR',
    latitud: 10.4608,
    longitud: -73.2533,
    radioKm: 18,
    region: 'Norte',
  },
  
  MONTERIA: {
    nombre: 'MONTERÍA',
    latitud: 8.7479,
    longitud: -75.8814,
    radioKm: 20,
    region: 'Norte',
  },
  
  SINCELEJO: {
    nombre: 'SINCELEJO',
    latitud: 9.3047,
    longitud: -75.3977,
    radioKm: 15,
    region: 'Norte',
  },
  
  CORDOBA: {
    nombre: 'CÓRDOBA',
    latitud: 8.7844,
    longitud: -76.1197,
    radioKm: 10,
    region: 'Norte',
  },
  
  // REGIÓN SUR
  CALI: {
    nombre: 'CALI',
    latitud: 3.4372,
    longitud: -76.5197,
    radioKm: 30,
    region: 'Sur',
  },
  
  NEIVA: {
    nombre: 'NEIVA',
    latitud: 2.9271,
    longitud: -75.2898,
    radioKm: 15,
    region: 'Sur',
  },
  
  POPAYAN: {
    nombre: 'POPAYÁN',
    latitud: 2.4448,
    longitud: -76.6133,
    radioKm: 15,
    region: 'Sur',
  },
};

/**
 * Crear un mapa normalizado para búsquedas rápidas
 */
const CIUDAD_MAPA = Object.entries(CIUDADES).reduce((acc, [key, ciudad]) => {
  // Mapear por key en mayúsculas
  acc[key] = ciudad;
  // Mapear por nombre normalizado
  acc[ciudad.nombre.toUpperCase()] = ciudad;
  // También agregar versión sin tilde para búsquedas
  acc[ciudad.nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] = ciudad;
  return acc;
}, {});

/**
 * Obtener ciudad por nombre o código
 * @param {string} ciudadNombre - Nombre o código de ciudad
 * @returns {object|null} Objeto de ciudad o null si no existe
 */
const getCiudad = (ciudadNombre) => {
  if (!ciudadNombre) return null;
  
  const normalizado = String(ciudadNombre)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  return CIUDAD_MAPA[normalizado] || null;
};

/**
 * Obtener todas las ciudades disponibles
 * @returns {array} Lista de ciudades
 */
const getCiudades = () => {
  return Object.values(CIUDADES);
};

/**
 * Obtener nombres de ciudades disponibles
 * @returns {array} Lista de nombres de ciudades
 */
const getNombresCiudades = () => {
  return Object.values(CIUDADES).map(c => c.nombre);
};

/**
 * Obtener ciudades por región
 * @param {string} region - Nombre de la región
 * @returns {array} Lista de ciudades en la región
 */
const getCiudadesPorRegion = (region) => {
  return Object.values(CIUDADES).filter(c => c.region === region);
};

module.exports = {
  CIUDADES,
  CIUDAD_MAPA,
  getCiudad,
  getCiudades,
  getNombresCiudades,
  getCiudadesPorRegion,
};
