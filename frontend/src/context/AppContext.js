import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';

const AppContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const AppProvider = ({ children }) => {
  // Datos maestros
  const [brands, setBrands] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [oohTypes, setOohTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [providers, setProviders] = useState([]);
  const [regions, setRegions] = useState([]);
  
  // Datos transaccionales
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Cargar TODOS los datos maestros en una sola llamada
  const initializeApp = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🚀 Inicializando app... URL:', API_URL);
      const startTime = performance.now();
      const res = await axios.get(`${API_URL}/api/ooh/initialize`);
      const endTime = performance.now();
      const requestTime = (endTime - startTime).toFixed(2);
      
      // Calcular tamaño de la respuesta recibida
      const jsonString = JSON.stringify(res.data);
      const sizeInBytes = new Blob([jsonString]).size;
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      
      console.log(`⏱️ TIEMPO DE REQUEST: ${requestTime}ms`);
      console.log(`📊 TAMAÑO DE RESPUESTA (cliente):`);
      console.log(`   Bytes: ${sizeInBytes}`);
      console.log(`   KB: ${sizeInKB}`);
      console.log(`   MB: ${sizeInMB}`);
      
      // Log completo de la respuesta
      console.log('✅ RESPUESTA COMPLETA DEL SERVIDOR:', res.data);
      console.log('📋 Estructura recibida:', Object.keys(res.data));
      if (res.data.data) {
        console.log('📦 Claves en data:', Object.keys(res.data.data));
      }
      
      if (res.data.success) {
        console.log('📊 Cargando datos maestros...');
        const {
          brands = [],
          campaigns = [],
          categories = [],
          advertisers = [],
          oohTypes = [],
          cities = [],
          addresses = [],
          providers = [],
          regions = [],
          records = []
        } = res.data.data;
        
        setBrands(brands);
        setCampaigns(campaigns);
        setCategories(categories);
        setAdvertisers(advertisers);
        setOohTypes(oohTypes);
        setCities(cities);
        setAddresses(addresses);
        setProviders(providers);
        setRegions(regions);
        setRecords(records);
        
        console.log('📈 RESUMEN DATOS CARGADOS:', {
          brands: brands.length,
          campaigns: campaigns.length,
          categories: categories.length,
          advertisers: advertisers.length,
          oohTypes: oohTypes.length,
          cities: cities.length,
          addresses: addresses.length,
          providers: providers.length,
          regions: regions.length,
          records: records.length
        });
        
        // Log detallado de cada tipo de dato
        console.log('🏷️ BRANDS:', brands);
        console.log('📋 CAMPAIGNS:', campaigns);
        console.log('📂 CATEGORIES:', categories);
        console.log('🏢 ADVERTISERS:', advertisers);
        console.log('🚀 OOH_TYPES:', oohTypes);
        console.log('🏙️ CITIES:', cities);
        console.log('📍 ADDRESSES:', addresses);
        console.log('🏭 PROVIDERS:', providers);
        console.log('🗺️ REGIONS:', regions);
        console.log('📊 RECORDS:', records);
        
        setInitialized(true);
      } else {
        console.error('❌ Error en respuesta:', res.data);
      }
    } catch (error) {
      console.error('❌ Error inicializando app:', error.message);
      console.error('   Detalles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar marcas desde API
  const fetchBrands = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/ooh/brands/all`);
      if (res.data.success) {
        const brandsData = res.data.data.map(b => ({
          id: b.id,
          nombre: b.nombre,
          categoria: b.categoria || '',
          category_id: b.category_id,
          advertiser_id: b.advertiser_id
        }));
        setBrands(brandsData);
        return brandsData;
      }
    } catch (error) {
      console.error('❌ Error cargando marcas:', error);
      return [];
    }
  }, []);

  // Cargar campañas de una marca
  const fetchCampaigns = useCallback(async (brandId) => {
    try {
      const res = await axios.get(`${API_URL}/api/ooh/brands/${brandId}/campaigns`);
      if (res.data.success) {
        return res.data.data.map(c => c.nombre);
      }
      return [];
    } catch (error) {
      console.error('Error cargando campañas:', error);
      return [];
    }
  }, []);

  // Cargar tipos de OOH desde API
  const fetchOohTypes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/ooh/ooh-types/all`);
      if (res.data.success) {
        const typesData = res.data.data.map(t => t.nombre);
        setOohTypes(typesData);
        return typesData;
      }
    } catch (error) {
      console.error('❌ Error cargando tipos OOH:', error);
      return [];
    }
  }, []);

  // Cargar ciudades desde API
  const fetchCities = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/ooh/cities/all`);
      if (res.data.success) {
        const citiesData = res.data.data.map(c => ({
          id: c.id,
          nombre: c.nombre,
          latitud: c.latitud,
          longitud: c.longitud,
          radioKm: c.radio_km,
          region: c.region
        }));
        setCities(citiesData);
        return citiesData;
      }
    } catch (error) {
      console.error('❌ Error cargando ciudades:', error);
      return [];
    }
  }, []);

  // Cargar todos los registros con paginación
  const fetchRecords = useCallback(async (page = 1, limit = 1000) => {
    setLoading(true);
    try {
      console.log(`📄 Cargando registros: page=${page}, limit=${limit}`);
      const res = await axios.get(`${API_URL}/api/ooh/all`, {
        params: { page, limit }
      });
      if (res.data.success) {
        console.log(`✅ Registros cargados: ${res.data.data.length} de ${res.data.pagination?.total || 'N/A'}`);
        setRecords(res.data.data);
        return {
          data: res.data.data,
          pagination: res.data.pagination
        };
      }
    } catch (error) {
      console.error('Error cargando registros:', error);
      return { data: [], pagination: null };
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear marca
  const createBrand = useCallback(async (nombre, categoria) => {
    try {
      const res = await axios.post(`${API_URL}/api/ooh/brands/create`, {
        nombre,
        categoria
      });
      if (res.data.success) {
        // Refrescar lista de marcas
        const updatedBrands = await (async () => {
          const brandRes = await axios.get(`${API_URL}/api/ooh/brands/all`);
          if (brandRes.data.success) {
            const brandsData = brandRes.data.data.map(b => ({
              id: b.id,
              nombre: b.nombre,
              categoria: b.categoria || ''
            }));
            setBrands(brandsData);
            return brandsData;
          }
          return [];
        })();
        return res.data.data;
      }
    } catch (error) {
      console.error('Error creando marca:', error);
      throw error;
    }
  }, []);

  // Crear campaña
  const createCampaign = useCallback(async (nombre, brandId) => {
    try {
      const res = await axios.post(`${API_URL}/api/ooh/campaigns/create`, {
        nombre,
        brandId
      });
      if (res.data.success) {
        return res.data.data;
      }
    } catch (error) {
      console.error('Error creando campaña:', error);
      throw error;
    }
  }, []);

  // Crear tipo OOH
  const createOohType = useCallback(async (nombre) => {
    try {
      const res = await axios.post(`${API_URL}/api/ooh/ooh-types/create`, { nombre });
      if (res.data.success) {
        // Refrescar lista de tipos
        const updatedTypes = await (async () => {
          const typeRes = await axios.get(`${API_URL}/api/ooh/ooh-types/all`);
          if (typeRes.data.success) {
            const typesData = typeRes.data.data.map(t => t.nombre);
            setOohTypes(typesData);
            return typesData;
          }
          return [];
        })();
        return res.data.data;
      }
    } catch (error) {
      console.error('Error creando tipo OOH:', error);
      throw error;
    }
  }, []);

  // Crear o actualizar registro
  const saveRecord = useCallback(async (formData, images, imageIndexes, existingId) => {
    try {
      const data = new FormData();
      
      // Agregar campos de texto
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      // Si es actualización, agregar ID
      if (existingId) {
        data.append('existingId', existingId);
        if (imageIndexes && imageIndexes.length > 0) {
          data.append('imageIndexes', imageIndexes.join(','));
        }
      }

      // Agregar imágenes
      images.forEach((img, index) => {
        if (img) {
          data.append('imagenes', img);
        }
      });

      const res = await axios.post(`${API_URL}/api/ooh/create`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        // Refrescar lista de registros
        setLoading(true);
        try {
          const recordRes = await axios.get(`${API_URL}/api/ooh/all`);
          if (recordRes.data.success) {
            setRecords(recordRes.data.data);
          }
        } finally {
          setLoading(false);
        }
        return res.data.data;
      }
    } catch (error) {
      console.error('Error guardando registro:', error);
      throw error;
    }
  }, []);

  const value = {
    // Datos maestros
    brands,
    campaigns,
    categories,
    advertisers,
    oohTypes,
    cities,
    addresses,
    providers,
    regions,
    
    // Datos transaccionales
    records,
    loading,
    initialized,
    
    // Funciones
    initializeApp,
    fetchBrands,
    fetchCampaigns,
    fetchOohTypes,
    fetchCities,
    fetchRecords,
    createBrand,
    createCampaign,
    createOohType,
    saveRecord
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
};
