import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OOHForm.css';
import AddCiudadModal from './AddCiudadModal';
import AddMarcaModal from './AddMarcaModal';
import AddProveedorModal from './AddProveedorModal';
import AddTipoOOHModal from './AddTipoOOHModal';
import AddDireccionModal from './AddDireccionModal';
import AddCampanaModal from './AddCampanaModal';
import SearchableSelect from './SearchableSelect';
import { ciudades } from '../data/ciudades';
import { useApp } from '../context/AppContext';
import dbService from '../services/dbService';

const OOHForm = ({ onSuccess }) => {
  // Obtener datos del contexto global
  const { 
    brands,
    campaigns,
    categories,
    advertisers,
    cities: contextCities,
    addresses: contextAddresses,
    providers: contextProviders,
    regions: contextRegions,
    oohTypes: contextOohTypes,
    fetchCampaigns, 
    fetchBrands, 
    fetchCampaigns: fetchCampaignsAPI, 
    fetchOohTypes, 
    createBrand, 
    createCampaign, 
    createOohType
  } = useApp();

  const [formData, setFormData] = useState({
    marca: '',
    categoria: '',
    proveedor: '',
    tipoOOH: '',
    campana: '',
    direccion: '',
    ciudad: '',
    region: '',
    latitud: '',
    longitud: '',
    fechaInicio: '',
    fechaFin: ''
  });

  const [availableMarcas, setAvailableMarcas] = useState([]);
  const [availableCampanas, setAvailableCampanas] = useState([]);
  const [availableProveedores, setAvailableProveedores] = useState([]);
  const [availableTiposOOH, setAvailableTiposOOH] = useState([]);
  const [availableDirecciones, setAvailableDirecciones] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  
  const [images, setImages] = useState([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddCiudadModal, setShowAddCiudadModal] = useState(false);
  const [showAddMarcaModal, setShowAddMarcaModal] = useState(false);
  const [showAddProveedorModal, setShowAddProveedorModal] = useState(false);
  const [showAddTipoOOHModal, setShowAddTipoOOHModal] = useState(false);
  const [showAddDireccionModal, setShowAddDireccionModal] = useState(false);
  const [showAddCampanaModal, setShowAddCampanaModal] = useState(false);

  // Cargar marcas del contexto global
  useEffect(() => {
    if (brands && brands.length > 0) {
      setAvailableMarcas(brands);
    }
  }, [brands]);

  // Cargar proveedores del contexto global
  useEffect(() => {
    if (contextProviders && contextProviders.length > 0) {
      const proveedorNames = contextProviders.map(p => p.nombre || p);
      setAvailableProveedores(proveedorNames);
    }
  }, [contextProviders]);

  // Cargar tipos OOH del contexto global
  useEffect(() => {
    if (contextOohTypes && contextOohTypes.length > 0) {
      const oohTypeNames = contextOohTypes.map(t => t.nombre || t);
      setAvailableTiposOOH(oohTypeNames);
    }
  }, [contextOohTypes]);

  // Cargar ciudades y direcciones del contexto global
  useEffect(() => {
    if (contextCities && contextCities.length > 0) {
      setAvailableCities(contextCities);
    }
    
    if (contextAddresses && contextAddresses.length > 0) {
      const direccionesNames = contextAddresses.map(a => a.descripcion || `${a.ciudad}`);
      setAvailableDirecciones(direccionesNames);
    }
  }, [contextCities, contextAddresses]);

  // Manejar selección de marca
  const handleMarcaChange = (brandId) => {
    const foundMarca = brands.find(m => m.id === brandId);
    
    if (foundMarca) {
      setFormData(prev => ({
        ...prev,
        marca: foundMarca.nombre,
        categoria: foundMarca.categoria || '',
        campana: ''
      }));
      
      // Cargar campañas de la marca desde el contexto global
      if (campaigns && campaigns.length > 0) {
        const marcaCampaigns = campaigns
          .filter(c => c.brand_id === brandId)
          .map(c => ({ id: c.id, nombre: c.nombre, brand_id: c.brand_id }));
        setAvailableCampanas(marcaCampaigns);
      } else {
        setAvailableCampanas([]);
      }
    } else {
      setFormData(prev => ({ ...prev, marca: '', categoria: '', campana: '' }));
      setAvailableCampanas([]);
    }
  };

  const handleAddMarca = async (newMarca) => {
    try {
      // Usar los datos de newMarca directamente (ya viene del modal con toda la info)
      const marcaData = {
        id: Math.max(...availableMarcas.map(m => m.id || 0), 0) + 1,
        nombre: newMarca.nombre,
        categoria: newMarca.categoria,
        category_id: newMarca.category_id,
        advertiser_id: newMarca.advertiser_id,
        anunciante: newMarca.anunciante
      };

      setAvailableMarcas(prev => [...(prev || []), marcaData]);
      setFormData(prev => ({
        ...prev,
        marca: newMarca.nombre,
        categoria: newMarca.categoria,
        campana: ''
      }));
      setAvailableCampanas([]);
      setShowAddMarcaModal(false);
      setMessage({ type: 'success', text: '✅ Marca creada exitosamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('❌ Error creando marca:', error);
      setMessage({ type: 'error', text: 'Error al crear marca' });
    }
  };

  const handleAddCampaña = (newCampaña) => {
    const newCampaignData = {
      id: Math.max(...campaigns.map(c => c.id || 0), 0) + 1,
      nombre: newCampaña.nombre,
      brand_id: newCampaña.brand_id
    };

    setAvailableCampanas(prev => [...(prev || []), newCampaignData]);
    setFormData(prev => ({
      ...prev,
      campana: newCampaña.nombre
    }));
    setShowAddCampanaModal(false);
    setMessage({ type: 'success', text: '✅ Campaña creada exitosamente' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleProveedorChange = (value) => {
    setFormData(prev => ({ ...prev, proveedor: value }));
    
    if (value && !(availableProveedores || []).includes(value)) {
      const updated = [...(availableProveedores || []), value];
      setAvailableProveedores(updated);
      localStorage.setItem('proveedores', JSON.stringify(updated));
    }
  };

  const handleCampanaChange = async (value) => {
    setFormData(prev => ({ ...prev, campana: value }));
    
    // Si escribe campaña nueva no presente en lista y hay marca seleccionada, crearla
    if (value && !availableCampanas.find(c => c.nombre === value) && formData.marca) {
      const marca = availableMarcas.find(m => m.nombre === formData.marca);
      if (marca && marca.id) {
        try {
          await createCampaign(value, marca.id);
          const newCampaign = { nombre: value, brand_id: marca.id };
          setAvailableCampanas(prev => [...(prev || []), newCampaign]);
        } catch (error) {
          console.error('Error creando campaña:', error);
        }
      }
    }
  };

  // Mostrar todas las campañas si no hay marca seleccionada
  const getVisibleCampanas = () => {
    if (formData.marca && availableCampanas.length > 0) {
      // Si hay marca seleccionada, mostrar solo sus campañas
      return availableCampanas;
    } else if (!formData.marca && campaigns && campaigns.length > 0) {
      // Si no hay marca seleccionada, mostrar todas las campañas
      return campaigns.map(c => ({ id: c.id, nombre: c.nombre, brand_id: c.brand_id }));
    }
    return [];
  };

  const handleDireccionChange = (value) => {
    console.log('📍 Dirección seleccionada:', value);
    
    // Buscar la dirección completa en contextAddresses
    const foundAddress = contextAddresses?.find(a => a.descripcion === value);
    
    if (foundAddress) {
      console.log('✅ Dirección encontrada en AppContext:', foundAddress);
      
      // Buscar la ciudad asociada
      const foundCity = contextCities?.find(c => c.id === foundAddress.city_id);
      
      if (foundCity) {
        console.log('✅ Ciudad encontrada:', foundCity);
        
        // ✅ LLENAR TODOS LOS CAMPOS automáticamente
        setFormData(prev => ({
          ...prev,
          direccion: value,
          ciudad: foundCity.nombre,
          region: foundCity.region,
          latitud: foundAddress.latitud,
          longitud: foundAddress.longitud
        }));
        
        console.log('✅ Formulario actualizado con dirección completa');
      } else {
        console.warn('⚠️ Ciudad no encontrada para city_id:', foundAddress.city_id);
        // Solo llenar dirección y coordenadas
        setFormData(prev => ({
          ...prev,
          direccion: value,
          latitud: foundAddress.latitud,
          longitud: foundAddress.longitud
        }));
      }
    } else {
      console.log('⚠️ Dirección no encontrada en AppContext, solo actualizando campo');
      // Solo actualizar el campo de dirección
      setFormData(prev => ({ ...prev, direccion: value }));
    }
  };

  const handleCiudadChange = (e) => {
    const selectedCity = e.target.value;
    const foundCity = (availableCities || []).find(c => c.nombre === selectedCity);
    
    if (foundCity) {
      setFormData(prev => ({
        ...prev,
        ciudad: selectedCity,
        region: foundCity.region
      }));
    } else if (selectedCity === 'otro') {
      setShowAddCiudadModal(true);
    }
  };

  const handleAddCiudad = async (newCity) => {
    try {
      // Enviar al backend para guardar en BD
      const response = await fetch('http://localhost:8080/api/ooh/cities/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: newCity.nombre,
          region: newCity.region
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('❌ Error al crear ciudad:', result.error || result.message);
        alert(`Error: ${result.error || result.message}`);
        return;
      }
      
      // Si fue exitoso, actualizar el estado
      const newCityData = result.data;
      
      // Actualizar estado
      setAvailableCities(prev => [...(prev || []), newCityData]);
      setFormData(prev => ({
        ...prev,
        ciudad: newCity.nombre,
        region: newCity.region
      }));
      
      console.log(`✅ Ciudad agregada exitosamente: ${newCity.nombre}`);
      setShowAddCiudadModal(false);
      
    } catch (error) {
      console.error('❌ Error de conexión al crear ciudad:', error);
      alert('Error de conexión: No se puede crear la ciudad');
    }
  };

  const handleAddProveedor = (newProveedor) => {
    setAvailableProveedores(prev => [...(prev || []), newProveedor.nombre]);
    setFormData(prev => ({
      ...prev,
      proveedor: newProveedor.nombre
    }));
    setShowAddProveedorModal(false);
    setMessage({ type: 'success', text: '✅ Proveedor creado exitosamente' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleAddTipoOOH = (newTipo) => {
    setAvailableTiposOOH(prev => [...(prev || []), newTipo.nombre]);
    setFormData(prev => ({
      ...prev,
      tipoOOH: newTipo.nombre
    }));
    setShowAddTipoOOHModal(false);
    setMessage({ type: 'success', text: '✅ Tipo OOH creado exitosamente' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleAddDireccion = async (newDireccion) => {
    console.log('📍 Agregando nueva dirección:', newDireccion);
    
    try {
      // Buscar la ciudad en contextCities para obtener su ID
      const ciudad = contextCities?.find(c => c.nombre === newDireccion.ciudad);
      
      if (!ciudad) {
        console.error('❌ Ciudad no encontrada:', newDireccion.ciudad);
        setMessage({ type: 'error', text: `Ciudad "${newDireccion.ciudad}" no encontrada` });
        return;
      }
      
      // ✅ GUARDAR EN BD primero
      console.log('💾 Guardando dirección en BD...');
      const response = await fetch('http://localhost:8080/api/ooh/addresses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          city_id: ciudad.id,
          descripcion: newDireccion.descripcion,
          latitud: newDireccion.latitud,
          longitud: newDireccion.longitud
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('❌ Error al crear dirección:', result.error || result.message);
        setMessage({ type: 'error', text: `Error: ${result.error || result.message}` });
        return;
      }
      
      console.log('✅ Dirección guardada en BD:', result.data);
      const newAddress = result.data;
      
      const direccionName = newDireccion.descripcion;
      
      // Actualizar estado local
      setAvailableDirecciones(prev => [...(prev || []), direccionName]);
      
      // ✅ LLENAR FORMULARIO con dirección, coordenadas, ciudad y región
      setFormData(prev => ({
        ...prev,
        direccion: direccionName,
        latitud: newDireccion.latitud,
        longitud: newDireccion.longitud,
        ciudad: ciudad.nombre,        // ✅ LLENAR CIUDAD
        region: ciudad.region          // ✅ LLENAR REGIÓN
      }));
      
      setShowAddDireccionModal(false);
      setMessage({ type: 'success', text: `✅ Dirección creada: ${direccionName} (${ciudad.nombre})` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
      console.log('✅ Formulario actualizado con:', {
        direccion: direccionName,
        ciudad: ciudad.nombre,
        region: ciudad.region,
        latitud: newDireccion.latitud,
        longitud: newDireccion.longitud
      });
      
    } catch (error) {
      console.error('❌ Error creando dirección:', error);
      setMessage({ type: 'error', text: 'Error al crear dirección' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Solo se aceptan archivos de imagen' });
        return;
      }

      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'La imagen no puede exceder 5MB' });
        return;
      }

      const newImages = [...images];
      newImages[index] = file;
      setImages(newImages);

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...imagePreviews];
        newPreviews[index] = reader.result;
        setImagePreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages[index] = null;
    setImages(newImages);

    const newPreviews = [...imagePreviews];
    newPreviews[index] = null;
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos obligatorios (fechaFin es opcional para actualizaciones)
    if (!formData.marca || !formData.proveedor || !formData.tipoOOH || !formData.campana || !formData.direccion || 
        !formData.ciudad || !formData.latitud || !formData.longitud || 
        !formData.fechaInicio) {
      setMessage({ type: 'error', text: 'Faltan campos obligatorios: marca, proveedor, tipoOOH, campaña, dirección, ciudad, latitud, longitud, fechaInicio' });
      return;
    }

    // Validar que latitud y longitud sean números válidos
    if (isNaN(parseFloat(formData.latitud)) || isNaN(parseFloat(formData.longitud))) {
      setMessage({ type: 'error', text: 'Latitud y Longitud deben ser números válidos' });
      return;
    }

    // Validar rango de fechas solo si fechaFin está presente
    if (formData.fechaFin && new Date(formData.fechaInicio) >= new Date(formData.fechaFin)) {
      setMessage({ type: 'error', text: 'La fecha de inicio debe ser menor a la fecha de fin' });
      return;
    }

    const imageCount = images.filter(img => img !== null).length;
    if (imageCount === 0) {
      setMessage({ type: 'error', text: '⚠️ Debes subir al menos 1 imagen. Se recomienda subir 3 imágenes.' });
      return;
    }

    setLoading(true);

    try {
      console.log('➕ [OOHFORM - CREAR NUEVO] Iniciando creación de registro...');
      
      // ✅ NUEVA ARQUITECTURA: Mapear nombres → IDs (USANDO APPCONTEXT)
      console.log('🔍 [CREAR] Mapeando nombres a IDs desde AppContext...');
      
      // Obtener IDs desde AppContext usando dbService (PASANDO LOS ARRAYS)
      const brand = await dbService.getBrandByName(formData.marca, brands);
      const city = await dbService.getCityByName(formData.ciudad, contextCities);
      const oohType = await dbService.getOOHTypeByName(formData.tipoOOH, contextOohTypes);
      const provider = await dbService.getProviderByName(formData.proveedor, contextProviders);
      const campaign = await dbService.getCampaignByName(formData.campana, campaigns);
      
      console.log('📊 [CREAR] IDs obtenidos:');
      console.log(`   brand_id: ${brand?.id} (${formData.marca})`);
      console.log(`   city_id: ${city?.id} (${formData.ciudad})`);
      console.log(`   ooh_type_id: ${oohType?.id} (${formData.tipoOOH})`);
      console.log(`   provider_id: ${provider?.id} (${formData.proveedor})`);
      console.log(`   campaign_id: ${campaign?.id} (${formData.campana})`);

      // Validar que se obtuvieron todos los IDs
      if (!brand?.id || !city?.id || !oohType?.id || !provider?.id || !campaign?.id) {
        const missing = [];
        if (!brand?.id) missing.push(`marca "${formData.marca}"`);
        if (!city?.id) missing.push(`ciudad "${formData.ciudad}"`);
        if (!oohType?.id) missing.push(`tipo OOH "${formData.tipoOOH}"`);
        if (!provider?.id) missing.push(`proveedor "${formData.proveedor}"`);
        if (!campaign?.id) missing.push(`campaña "${formData.campana}"`);
        
        setMessage({ 
          type: 'error', 
          text: `❌ No se encontraron: ${missing.join(', ')}. Verifica los datos ingresados.` 
        });
        setLoading(false);
        return;
      }

      // Preparar FormData con IDs en lugar de nombres
      const formDataToSend = new FormData();
      
      // ✅ NUEVOS CAMPOS: IDs (REQUERIDOS)
      formDataToSend.append('brand_id', brand.id);
      formDataToSend.append('campaign_id', campaign.id);
      formDataToSend.append('city_id', city.id);
      formDataToSend.append('ooh_type_id', oohType.id);
      formDataToSend.append('provider_id', provider.id);
      
      // ✅ CAMPOS COMUNES (sin cambios)
      formDataToSend.append('direccion', formData.direccion);
      formDataToSend.append('latitud', formData.latitud);
      formDataToSend.append('longitud', formData.longitud);
      formDataToSend.append('fechaInicio', formData.fechaInicio);
      formDataToSend.append('fechaFin', formData.fechaFin);
      
      // ❌ NO ENVIAR: marca, categoria, proveedor, tipoOOH, campana, ciudad, region
      // Estos se derivan automáticamente de los IDs en el backend
      
      // Imágenes
      images.forEach((image, index) => {
        if (image) {
          formDataToSend.append('imagenes', image);
        }
      });

      console.log('✅ [CREAR] FormData preparado con IDs (sin nombres, sin existingId)');
      console.log('📤 [CREAR] Enviando a POST /api/ooh/create (nuevo registro)...');
      
      const response = await axios.post('http://localhost:8080/api/ooh/create', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ [CREAR] Respuesta exitosa:', response.data);      console.log('✅ Respuesta exitosa:', response.data);
      
      setMessage({ type: 'success', text: '✅ Registro creado exitosamente' });
      
      // Limpiar formulario
      setFormData({
        marca: '',
        categoria: '',
        proveedor: '',
        tipoOOH: '',
        campana: '',
        direccion: '',
        ciudad: '',
        region: '',
        latitud: '',
        longitud: '',
        fechaInicio: '',
        fechaFin: ''
      });
      setAvailableCampanas([]);
      setImages([null, null, null]);
      setImagePreviews([null, null, null]);

      // Mostrar mensaje de actualización o creación
      if (response.data.updated) {
        setMessage({ type: 'success', text: '✅ Registro actualizado exitosamente' });
      } else {
        setMessage({ type: 'success', text: '✅ Registro creado exitosamente' });
      }

      // Llamar callback después de 2 segundos
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      
      // Si el error tiene mensaje del servidor, mostrarlo
      if (error.response?.data?.error) {
        setMessage({ 
          type: 'error', 
          text: `❌ ${error.response.data.error}` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Error: ${error.message}` 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ooh-form-container">
      <form onSubmit={handleSubmit} className="ooh-form">
        <h2>Nuevo Registro OOH</h2>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Marca *</label>
            <div className="input-with-button">
              <SearchableSelect
                options={availableMarcas}
                value={availableMarcas.find(m => m.nombre === formData.marca)?.id || ''}
                onChange={handleMarcaChange}
                placeholder="Buscar marca..."
                required
                displayField="nombre"
                valueField="id"
                onSelect={(marca) => {
                  // La marca ya fue procesada en handleMarcaChange
                }}
              />
              <button 
                type="button" 
                className="btn-add"
                onClick={() => setShowAddMarcaModal(true)}
                title="Crear nueva marca"
              >
                +
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría</label>
            <input
              type="text"
              id="categoria"
              value={formData.categoria}
              placeholder="Se asigna automáticamente"
              readOnly
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="proveedor">Proveedor *</label>
            <div className="input-with-button">
              <select
                id="proveedor"
                value={formData.proveedor}
                onChange={(e) => handleProveedorChange(e.target.value)}
                required
              >
                <option value="">-- Seleccionar proveedor --</option>
                {(availableProveedores || []).map((p, idx) => (
                  <option key={idx} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="btn-add"
                onClick={() => setShowAddProveedorModal(true)}
                title="Crear nuevo proveedor"
              >
                +
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tipoOOH">Tipo OOH *</label>
            <div className="input-with-button">
              <select
                id="tipoOOH"
                value={formData.tipoOOH}
                onChange={(e) => setFormData(prev => ({ ...prev, tipoOOH: e.target.value }))}
                required
              >
                <option value="">-- Seleccionar tipo OOH --</option>
                {(availableTiposOOH || []).map((t, idx) => (
                  <option key={idx} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="btn-add"
                onClick={() => setShowAddTipoOOHModal(true)}
                title="Crear nuevo tipo OOH"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="campana">Campaña *</label>
            <div className="input-with-button">
              <select
                id="campana"
                value={formData.campana}
                onChange={(e) => handleCampanaChange(e.target.value)}
                required
              >
                <option value="">
                  {formData.marca ? "-- Seleccionar campaña --" : "-- Ver todas las campañas --"}
                </option>
                {getVisibleCampanas().map((c, idx) => (
                  <option key={idx} value={c.nombre || c}>
                    {c.nombre || c}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="btn-add"
                onClick={() => setShowAddCampanaModal(true)}
                title="Crear nueva campaña"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="direccion">Dirección *</label>
          <div className="input-with-button">
            <select
              id="direccion"
              value={formData.direccion}
              onChange={(e) => handleDireccionChange(e.target.value)}
              required
            >
              <option value="">-- Seleccionar dirección --</option>
              {(availableDirecciones || []).map((d, idx) => (
                <option key={idx} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button 
              type="button" 
              className="btn-add"
              onClick={() => setShowAddDireccionModal(true)}
              title="Crear nueva dirección"
            >
              +
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ciudad">Ciudad *</label>
            <select
              id="ciudad"
              value={formData.ciudad}
              onChange={handleCiudadChange}
              required
            >
              <option value="">-- Seleccionar ciudad --</option>
              {(availableCities || []).map((city) => (
                <option key={city.nombre} value={city.nombre}>
                  {city.nombre}
                </option>
              ))}
              <option value="otro">Agregar nueva ciudad...</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="region">Región *</label>
            <input
              type="text"
              id="region"
              name="region"
              value={formData.region}
              readOnly
              placeholder="Se asigna automáticamente"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="latitud">Latitud *</label>
            <input
              type="number"
              id="latitud"
              name="latitud"
              value={formData.latitud}
              onChange={handleInputChange}
              placeholder="Ej: 40.4168"
              step="0.0001"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="longitud">Longitud *</label>
            <input
              type="number"
              id="longitud"
              name="longitud"
              value={formData.longitud}
              onChange={handleInputChange}
              placeholder="Ej: -3.7038"
              step="0.0001"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fechaInicio">Fecha de Inicio *</label>
            <input
              type="date"
              id="fechaInicio"
              name="fechaInicio"
              value={formData.fechaInicio}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaFin">Fecha de Fin</label>
            <input
              type="date"
              id="fechaFin"
              name="fechaFin"
              value={formData.fechaFin}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="images-section">
          <h3>📸 Imágenes *</h3>
          <p className="images-info">
            ⚠️ <strong>Requerido:</strong> Debes subir al menos 1 imagen. 
            <br />
            💡 <strong>Recomendado:</strong> Se recomienda subir 3 imágenes para mejor visualización.
          </p>
          <div className="images-grid">
            {[0, 1, 2].map((index) => (
              <div key={index} className="image-upload-box">
                <label htmlFor={`image-${index}`} className="upload-label">
                  {imagePreviews[index] ? (
                    <>
                      <img src={imagePreviews[index]} alt={`Preview ${index + 1}`} />
                      <div className="image-overlay">Cambiar imagen</div>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <span>📷</span>
                      <span>Imagen {index + 1}</span>
                    </div>
                  )}
                </label>
                <input
                  type="file"
                  id={`image-${index}`}
                  accept="image/*"
                  onChange={(e) => handleImageChange(index, e)}
                  style={{ display: 'none' }}
                />
                {imagePreviews[index] && (
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => removeImage(index)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? '⏳ Guardando...' : '✓ Guardar Registro'}
        </button>
      </form>

      <AddCiudadModal 
        isOpen={showAddCiudadModal}
        onClose={() => setShowAddCiudadModal(false)}
        onAdd={handleAddCiudad}
        ciudades={availableCities}
      />

      <AddMarcaModal 
        isOpen={showAddMarcaModal}
        onClose={() => setShowAddMarcaModal(false)}
        onAdd={handleAddMarca}
      />

      <AddProveedorModal 
        isOpen={showAddProveedorModal}
        onClose={() => setShowAddProveedorModal(false)}
        onAdd={handleAddProveedor}
      />

      <AddTipoOOHModal 
        isOpen={showAddTipoOOHModal}
        onClose={() => setShowAddTipoOOHModal(false)}
        onAdd={handleAddTipoOOH}
      />

      <AddDireccionModal 
        isOpen={showAddDireccionModal}
        onClose={() => setShowAddDireccionModal(false)}
        onAdd={handleAddDireccion}
        cities={availableCities}
      />

      <AddCampanaModal 
        isOpen={showAddCampanaModal}
        onClose={() => setShowAddCampanaModal(false)}
        onAdd={handleAddCampaña}
        brands={availableMarcas}
      />
    </div>
  );
};

export default OOHForm;
