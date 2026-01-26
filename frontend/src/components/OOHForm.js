import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OOHForm.css';
import AddCiudadModal from './AddCiudadModal';
import AddMarcaModal from './AddMarcaModal';
import { ciudades } from '../data/ciudades';
import { useApp } from '../context/AppContext';

const OOHForm = ({ onSuccess }) => {
  const { 
    fetchBrands, 
    fetchCampaigns, 
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

  // Cargar ciudades desde localStorage + ciudades predefinidas
  useEffect(() => {
    const storedCities = localStorage.getItem('customCities');
    const customCities = storedCities ? JSON.parse(storedCities) : [];
    const allCities = [...ciudades, ...customCities];
    setAvailableCities(allCities);
  }, []);

  // Cargar marcas desde contexto global
  useEffect(() => {
    const loadBrands = async () => {
      const data = await fetchBrands();
      if (data) {
        setAvailableMarcas(data);
      }
    };
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias — ejecutar UNA SOLA VEZ al montar

  // Cargar tipos OOH desde contexto global
  useEffect(() => {
    const loadTypes = async () => {
      const data = await fetchOohTypes();
      if (data) {
        setAvailableTiposOOH(data);
      }
    };
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias — ejecutar UNA SOLA VEZ al montar

  // Cargar proveedores desde localStorage
  useEffect(() => {
    const storedProveedores = localStorage.getItem('proveedores');
    const proveedores = storedProveedores ? JSON.parse(storedProveedores) : [];
    setAvailableProveedores(proveedores);
  }, []);

  // Cargar direcciones desde localStorage
  useEffect(() => {
    const storedDirecciones = localStorage.getItem('direcciones');
    const direcciones = storedDirecciones ? JSON.parse(storedDirecciones) : [];
    setAvailableDirecciones(direcciones);
  }, []);

  const handleMarcaChange = async (value) => {
    const foundMarca = (availableMarcas || []).find(m => m.nombre === value);
    
    if (foundMarca) {
      setFormData(prev => ({
        ...prev,
        marca: value,
        categoria: foundMarca.categoria,
        campana: ''
      }));
      
      // Cargar campañas de la marca desde contexto
      try {
        const campaignsData = await fetchCampaigns(foundMarca.id);
        setAvailableCampanas(campaignsData);
      } catch (error) {
        console.error('Error cargando campañas:', error);
        setAvailableCampanas([]);
      }
    } else {
      setFormData(prev => ({ ...prev, marca: value, categoria: '', campana: '' }));
      setAvailableCampanas([]);
    }
  };

  const handleAddMarca = async (newMarca) => {
    try {
      const createdBrand = await createBrand(newMarca.nombre, newMarca.categoria);
      
      setAvailableMarcas(prev => [...(prev || []), {
        id: createdBrand.id,
        nombre: createdBrand.nombre,
        categoria: createdBrand.categoria || ''
      }]);
      setFormData(prev => ({
        ...prev,
        marca: createdBrand.nombre,
        categoria: createdBrand.categoria,
        campana: ''
      }));
      setAvailableCampanas([]);
      setShowAddMarcaModal(false);
      setMessage({ type: 'success', text: 'Marca creada exitosamente' });
    } catch (error) {
      console.error('❌ Error creando marca:', error);
      setMessage({ type: 'error', text: 'Error al crear marca' });
    }
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
    if (value && !(availableCampanas || []).includes(value) && formData.marca) {
      const marca = (availableMarcas || []).find(m => m.nombre === formData.marca);
      if (marca && marca.id) {
        try {
          await createCampaign(value, marca.id);
          setAvailableCampanas(prev => [...(prev || []), value]);
        } catch (error) {
          console.error('Error creando campaña:', error);
        }
      }
    }
  };

  const handleTipoOOHChange = async (value) => {
    setFormData(prev => ({ ...prev, tipoOOH: value }));
    if (value && !(availableTiposOOH || []).includes(value)) {
      try {
        await createOohType(value);
        setAvailableTiposOOH(prev => [...(prev || []), value]);
      } catch (error) {
        console.error('Error creando tipo OOH:', error);
      }
    }
  };

  const handleDireccionChange = (value) => {
    setFormData(prev => ({ ...prev, direccion: value }));
    
    if (value && !(availableDirecciones || []).includes(value)) {
      const updated = [...(availableDirecciones || []), value];
      setAvailableDirecciones(updated);
      localStorage.setItem('direcciones', JSON.stringify(updated));
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

  const handleAddCiudad = (newCity) => {
    const newCityData = {
      nombre: newCity.nombre,
      region: newCity.region
    };
    
    // Guardar en localStorage
    const storedCities = localStorage.getItem('customCities');
    const customCities = storedCities ? JSON.parse(storedCities) : [];
    customCities.push(newCityData);
    localStorage.setItem('customCities', JSON.stringify(customCities));
    
    // Actualizar estado
    setAvailableCities(prev => [...(prev || []), newCityData]);
    setFormData(prev => ({
      ...prev,
      ciudad: newCity.nombre,
      region: newCity.region
    }));
    setShowAddCiudadModal(false);
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
    if (!formData.marca || !formData.categoria || !formData.proveedor || !formData.tipoOOH || !formData.campana || !formData.direccion || 
        !formData.ciudad || !formData.region || !formData.latitud || !formData.longitud || 
        !formData.fechaInicio) {
      setMessage({ type: 'error', text: 'Faltan campos obligatorios: marca, categoría, proveedor, tipoOOH, campaña, dirección, ciudad, región, latitud, longitud, fechaInicio' });
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

    if (images.filter(img => img !== null).length !== 3) {
      setMessage({ type: 'error', text: 'Debes subir exactamente 3 imágenes' });
      return;
    }

    // Preparar FormData
    const formDataToSend = new FormData();
    formDataToSend.append('marca', formData.marca);
    formDataToSend.append('categoria', formData.categoria);
    formDataToSend.append('proveedor', formData.proveedor);
    formDataToSend.append('tipoOOH', formData.tipoOOH);
    formDataToSend.append('campana', formData.campana);
    formDataToSend.append('direccion', formData.direccion);
    formDataToSend.append('ciudad', formData.ciudad);
    formDataToSend.append('region', formData.region);
    formDataToSend.append('latitud', formData.latitud);
    formDataToSend.append('longitud', formData.longitud);
    formDataToSend.append('fechaInicio', formData.fechaInicio);
    formDataToSend.append('fechaFin', formData.fechaFin);
    
    images.forEach((image, index) => {
      if (image) {
        formDataToSend.append('imagenes', image);
      }
    });

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8080/api/ooh/create', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

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
        setMessage({ type: 'success', text: '✅ Registro actualizado exitosamente (misma dirección, fecha, marca y campaña)' });
      } else {
        setMessage({ type: 'success', text: '✅ Registro creado exitosamente' });
      }

      // Llamar callback después de 2 segundos
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Error al crear el registro' 
      });
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
            <label htmlFor="marca">Marca *</label>
            <input
              type="text"
              id="marca"
              name="marca"
              list="marcas-list"
              value={formData.marca}
              onChange={(e) => handleMarcaChange(e.target.value)}
              placeholder="Escribe o selecciona una marca"
              required
            />
            <datalist id="marcas-list">
              {(availableMarcas || []).map((m, idx) => (
                <option key={idx} value={m.nombre} />
              ))}
            </datalist>
            {!(availableMarcas || []).find(m => m.nombre === formData.marca) && formData.marca && (
              <button 
                type="button" 
                className="btn-add-inline"
                onClick={() => setShowAddMarcaModal(true)}
              >
                + Agregar "{formData.marca}" como nueva marca
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría *</label>
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
            <input
              type="text"
              id="proveedor"
              name="proveedor"
              list="proveedores-list"
              value={formData.proveedor}
              onChange={(e) => handleProveedorChange(e.target.value)}
              placeholder="Escribe o selecciona proveedor"
              required
            />
            <datalist id="proveedores-list">
              {(availableProveedores || []).map((p, idx) => (
                <option key={idx} value={p} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="tipoOOH">Tipo OOH *</label>
            <input
              type="text"
              id="tipoOOH"
              name="tipoOOH"
              list="tipos-list"
              value={formData.tipoOOH}
              onChange={(e) => handleTipoOOHChange(e.target.value)}
              placeholder="VAYA, PARADEROS, VAYAS MOTORIZADAS..."
              required
            />
            <datalist id="tipos-list">
              {(availableTiposOOH || []).map((t, idx) => (
                <option key={idx} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="campana">Campaña *</label>
            <input
              type="text"
              id="campana"
              name="campana"
              list="campanas-list"
              value={formData.campana}
              onChange={(e) => handleCampanaChange(e.target.value)}
              placeholder={(availableCampanas || []).length > 0 ? "Selecciona o escribe campaña" : "Primero selecciona una marca"}
              required
            />
            <datalist id="campanas-list">
              {(availableCampanas || []).map((c, idx) => (
                <option key={idx} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="direccion">Dirección *</label>
          <input
            type="text"
            id="direccion"
            name="direccion"
            list="direcciones-list"
            value={formData.direccion}
            onChange={(e) => handleDireccionChange(e.target.value)}
            placeholder="Escribe o selecciona dirección"
            required
          />
          <datalist id="direcciones-list">
            {(availableDirecciones || []).map((d, idx) => (
              <option key={idx} value={d} />
            ))}
          </datalist>
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
          <h3>📸 Imágenes (Debes subir exactamente 3)</h3>
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
    </div>
  );
};

export default OOHForm;
