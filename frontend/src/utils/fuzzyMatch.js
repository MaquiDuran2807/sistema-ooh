// Implementación simple de fuzzy matching basado en similitud de strings

/**
 * Calcula la similitud entre dos strings (0-1)
 * Usa distancia de Levenshtein normalizada
 */
function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
}

/**
 * Calcula similitud entre dos strings (0-1, donde 1 es idéntico)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Normaliza un string para comparación (mayúsculas, sin acentos, sin espacios extra)
 */
function normalizeString(str) {
  return str
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .replace(/\s+/g, ' ') // Múltiples espacios a uno
    .trim();
}

/**
 * Busca y rankea items similares al query
 * @param {string} query - String a buscar
 * @param {Array} items - Array de objetos con campo 'nombre'
 * @param {number} threshold - Umbral de similitud (0-1, default 0.5)
 * @param {number} maxResults - Máximo de resultados a retornar
 * @returns {Array} Array de objetos con item y score, ordenados por similitud
 */
export function findSimilar(query, items, threshold = 0.5, maxResults = 5) {
  if (!query || !items || items.length === 0) {
    return [];
  }

  const normalizedQuery = normalizeString(query);
  
  const matches = items
    .map(item => {
      const itemName = normalizeString(item.nombre);
      
      // Coincidencia exacta
      if (itemName === normalizedQuery) {
        return { item, score: 1.0, type: 'exact' };
      }
      
      // Coincidencia que empieza con
      if (itemName.startsWith(normalizedQuery)) {
        return { item, score: 0.95, type: 'starts-with' };
      }
      
      // Coincidencia que contiene
      if (itemName.includes(normalizedQuery)) {
        return { item, score: 0.85, type: 'contains' };
      }
      
      // Similitud por Levenshtein
      const similarity = calculateSimilarity(normalizedQuery, itemName);
      
      return { item, score: similarity, type: 'fuzzy' };
    })
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return matches;
}

/**
 * Encuentra el mejor match para un query
 */
export function findBestMatch(query, items, threshold = 0.7) {
  const matches = findSimilar(query, items, threshold, 1);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Revisa si ya existe un item exacto o muy similar
 */
export function checkDuplicate(query, items, threshold = 0.85) {
  const match = findBestMatch(query, items, threshold);
  return match ? match.item : null;
}
