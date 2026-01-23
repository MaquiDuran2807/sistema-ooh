import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';

const AppContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const AppProvider = ({ children }) => {
  const [brands, setBrands] = useState([]);
  const [oohTypes, setOohTypes] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar marcas desde API
  const fetchBrands = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/ooh/brands/all`);
      if (res.data.success) {
        const brandsData = res.data.data.map(b => ({
          id: b.id,
          nombre: b.nombre,
          categoria: b.categoria || ''
        }));
        setBrands(brandsData);
        return brandsData;
      }
    } catch (error) {
      console.error('Error cargando marcas:', error);
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
      console.error('Error cargando tipos OOH:', error);
      return [];
    }
  }, []);

  // Cargar todos los registros
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/ooh/all`);
      if (res.data.success) {
        setRecords(res.data.data);
        return res.data.data;
      }
    } catch (error) {
      console.error('Error cargando registros:', error);
      return [];
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
        await fetchBrands(); // Refrescar lista
        return res.data.data;
      }
    } catch (error) {
      console.error('Error creando marca:', error);
      throw error;
    }
  }, [fetchBrands]);

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
        await fetchOohTypes(); // Refrescar lista
        return res.data.data;
      }
    } catch (error) {
      console.error('Error creando tipo OOH:', error);
      throw error;
    }
  }, [fetchOohTypes]);

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
        await fetchRecords(); // Refrescar lista
        return res.data.data;
      }
    } catch (error) {
      console.error('Error guardando registro:', error);
      throw error;
    }
  }, [fetchRecords]);

  const value = {
    brands,
    oohTypes,
    records,
    loading,
    fetchBrands,
    fetchCampaigns,
    fetchOohTypes,
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
