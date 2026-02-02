/**
 * Normalización robusta de nombres de ciudades
 * Elimina tildes, dieresis, puntos, guiones para comparación
 * Detecta duplicados con variaciones
 */

/**
 * Normaliza un nombre de ciudad removiendo caracteres especiales
 * @param {string} cityName - Nombre de la ciudad a normalizar
 * @returns {string} Nombre normalizado en mayúsculas y sin caracteres especiales
 */
const normalizeCityName = (cityName) => {
  if (!cityName || typeof cityName !== 'string') {
    return '';
  }

  return cityName
    // Convertir a mayúsculas
    .toUpperCase()
    // Remover espacios extra
    .trim()
    // Remover tildes y dieresis (ÑÁÉÍÓÚÜ -> NAEIOU)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remover puntos (.)
    .replace(/\./g, '')
    // Convertir guiones (-) y guiones bajos (_) a espacios
    .replace(/[-_]/g, ' ')
    // Limpiar espacios múltiples
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Compara dos nombres de ciudad considerando variaciones
 * @param {string} name1 - Primer nombre
 * @param {string} name2 - Segundo nombre
 * @returns {boolean} true si son iguales o variaciones
 */
const isCityDuplicate = (name1, name2) => {
  const normalized1 = normalizeCityName(name1);
  const normalized2 = normalizeCityName(name2);
  return normalized1 === normalized2 && normalized1.length > 0;
};

/**
 * Busca duplicados en un array de ciudades
 * @param {Array} cities - Array de objetos con propiedad 'nombre'
 * @param {string} newCityName - Nombre de la nueva ciudad a verificar
 * @returns {Object|null} Objeto con {found: boolean, duplicate: Object|null, message: string}
 */
const findDuplicate = (cities, newCityName) => {
  if (!Array.isArray(cities)) {
    return {
      found: false,
      duplicate: null,
      message: 'Lista de ciudades inválida'
    };
  }

  const normalizedNew = normalizeCityName(newCityName);
  
  if (normalizedNew.length === 0) {
    return {
      found: false,
      duplicate: null,
      message: 'Nombre de ciudad vacío'
    };
  }

  for (const city of cities) {
    if (isCityDuplicate(city.nombre, newCityName)) {
      return {
        found: true,
        duplicate: city,
        message: `❌ Duplicado detectado: "${newCityName}" es igual a ciudad existente "${city.nombre}" (normalizado: "${normalizedNew}")`,
        original: city.nombre,
        normalized: normalizedNew
      };
    }
  }

  return {
    found: false,
    duplicate: null,
    message: `✅ Ciudad "${newCityName}" no tiene duplicados (normalizado: "${normalizedNew}")`
  };
};

/**
 * Obtiene todas las variaciones posibles de un nombre
 * Útil para debug/logging
 * @param {string} cityName - Nombre de la ciudad
 * @returns {Array} Array con variaciones
 */
const getVariations = (cityName) => {
  return {
    original: cityName,
    normalized: normalizeCityName(cityName),
    uppercase: cityName.toUpperCase(),
    trimmed: cityName.trim()
  };
};

module.exports = {
  normalizeCityName,
  isCityDuplicate,
  findDuplicate,
  getVariations
};
