import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL
});

/**
 * Obtener ID de marca por nombre (DESDE APPCONTEXT, SIN API CALL)
 * @param {string} nombre - Nombre de la marca
 * @param {Array} brands - Lista de marcas del AppContext
 * @returns {Promise<{id, nombre, category_id}>} Objeto marca con ID
 */
export const getBrandByName = async (nombre, brands = []) => {
  try {
    // ✅ PRIMERO: Buscar en AppContext (sin llamada API)
    if (brands && brands.length > 0) {
      const brand = brands.find(b => 
        (b.nombre || '').toLowerCase() === (nombre || '').toLowerCase()
      );
      if (brand) {
        console.log(`✅ Marca encontrada en AppContext: ${nombre}`);
        return brand;
      }
    }
    
    // ❌ FALLBACK: Si no existe en AppContext, hacer llamada API
    console.warn(`⚠️  Marca "${nombre}" no en AppContext, consultando API...`);
    const response = await api.get('/api/brands/by-name', {
      params: { nombre }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error obteniendo marca "${nombre}":`, error.message);
    return null;
  }
};

/**
 * Obtener ID de ciudad por nombre (DESDE APPCONTEXT, SIN API CALL)
 * @param {string} nombre - Nombre de la ciudad
 * @param {Array} cities - Lista de ciudades del AppContext
 * @returns {Promise<{id, nombre, region_id}>} Objeto ciudad con ID
 */
export const getCityByName = async (nombre, cities = []) => {
  try {
    // ✅ PRIMERO: Buscar en AppContext (sin llamada API)
    if (cities && cities.length > 0) {
      const city = cities.find(c => 
        (c.nombre || '').toLowerCase() === (nombre || '').toLowerCase()
      );
      if (city) {
        console.log(`✅ Ciudad encontrada en AppContext: ${nombre}`);
        return city;
      }
    }
    
    // ❌ FALLBACK: Si no existe en AppContext, hacer llamada API
    console.warn(`⚠️  Ciudad "${nombre}" no en AppContext, consultando API...`);
    const response = await api.get('/api/cities/by-name', {
      params: { nombre }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error obteniendo ciudad "${nombre}":`, error.message);
    return null;
  }
};

/**
 * Obtener ID de tipo OOH por nombre (DESDE APPCONTEXT, SIN API CALL)
 * @param {string} nombre - Nombre del tipo OOH
 * @param {Array} oohTypes - Lista de tipos OOH del AppContext
 * @returns {Promise<{id, nombre}>} Objeto tipo OOH con ID
 */
export const getOOHTypeByName = async (nombre, oohTypes = []) => {
  try {
    // ✅ PRIMERO: Buscar en AppContext (sin llamada API)
    if (oohTypes && oohTypes.length > 0) {
      const oohType = oohTypes.find(t => 
        (t.nombre || '').toLowerCase() === (nombre || '').toLowerCase()
      );
      if (oohType) {
        console.log(`✅ Tipo OOH encontrado en AppContext: ${nombre}`);
        return oohType;
      }
    }
    
    // ❌ FALLBACK: Si no existe en AppContext, hacer llamada API
    console.warn(`⚠️  Tipo OOH "${nombre}" no en AppContext, consultando API...`);
    const response = await api.get('/api/ooh-types/by-name', {
      params: { nombre }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error obteniendo tipo OOH "${nombre}":`, error.message);
    return null;
  }
};

/**
 * Obtener ID de proveedor por nombre (DESDE APPCONTEXT, SIN API CALL)
 * @param {string} nombre - Nombre del proveedor
 * @param {Array} providers - Lista de proveedores del AppContext
 * @returns {Promise<{id, nombre}>} Objeto proveedor con ID
 */
export const getProviderByName = async (nombre, providers = []) => {
  try {
    // ✅ PRIMERO: Buscar en AppContext (sin llamada API)
    if (providers && providers.length > 0) {
      const provider = providers.find(p => 
        (p.nombre || p || '').toLowerCase() === (nombre || '').toLowerCase()
      );
      if (provider) {
        console.log(`✅ Proveedor encontrado en AppContext: ${nombre}`);
        return provider;
      }
    }
    
    // ❌ FALLBACK: Si no existe en AppContext, hacer llamada API
    console.warn(`⚠️  Proveedor "${nombre}" no en AppContext, consultando API...`);
    const response = await api.get('/api/providers/by-name', {
      params: { nombre }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error obteniendo proveedor "${nombre}":`, error.message);
    return null;
  }
};

/**
 * Obtener ID de campaña por nombre (DESDE APPCONTEXT, SIN API CALL)
 * @param {string} nombre - Nombre de la campaña
 * @param {Array} campaigns - Lista de campañas del AppContext
 * @returns {Promise<{id, nombre}>} Objeto campaña con ID
 */
export const getCampaignByName = async (nombre, campaigns = []) => {
  try {
    // ✅ PRIMERO: Buscar en AppContext (sin llamada API)
    if (campaigns && campaigns.length > 0) {
      const campaign = campaigns.find(c => 
        (c.nombre || '').toLowerCase() === (nombre || '').toLowerCase()
      );
      if (campaign) {
        console.log(`✅ Campaña encontrada en AppContext: ${nombre}`);
        return campaign;
      }
    }
    
    // ❌ FALLBACK: Si no existe en AppContext, hacer llamada API
    console.warn(`⚠️  Campaña "${nombre}" no en AppContext, consultando API...`);
    const response = await api.get('/api/campaigns/by-name', {
      params: { nombre }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error obteniendo campaña "${nombre}":`, error.message);
    return null;
  }
};

/**
 * Obtener todos los datos de referencia para dropdown
 * @returns {Promise<{brands, cities, oohTypes, providers, campaigns}>}
 */
export const getAllReferenceData = async () => {
  try {
    const [brands, cities, oohTypes, providers, campaigns] = await Promise.all([
      api.get('/api/brands'),
      api.get('/api/cities'),
      api.get('/api/ooh-types'),
      api.get('/api/providers'),
      api.get('/api/campaigns')
    ]);

    return {
      brands: brands.data,
      cities: cities.data,
      oohTypes: oohTypes.data,
      providers: providers.data,
      campaigns: campaigns.data
    };
  } catch (error) {
    console.error('❌ Error obteniendo datos de referencia:', error.message);
    return {
      brands: [],
      cities: [],
      oohTypes: [],
      providers: [],
      campaigns: []
    };
  }
};

export default {
  getBrandByName,
  getCityByName,
  getOOHTypeByName,
  getProviderByName,
  getCampaignByName,
  getAllReferenceData
};
