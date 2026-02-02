import React, { useState, useMemo } from 'react';
import './AddDireccionModal.css';

// Constante de conversión: 1 grado de latitud ≈ 111.32 km
const KM_PER_DEGREE_LAT = 111.32;

// Conversión dinámica de longitud (varía con la latitud)
const getKmPerDegreeLong = (lat) => {
  return KM_PER_DEGREE_LAT * Math.cos(lat * Math.PI / 180);
};

const AddDireccionModal = ({ isOpen, onClose, onAdd, cities = [] }) => {
  const [formData, setFormData] = useState({
    ciudad: '',
    descripcion: '',
    latitud: '',
    longitud: ''
  });

  const [selectedCity, setSelectedCity] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Si cambio ciudad, actualizar selectedCity
    if (name === 'ciudad') {
      const city = cities.find(c => c.nombre === value);
      setSelectedCity(city || null);
      setValidationMessage('');
    } else if ((name === 'latitud' || name === 'longitud') && selectedCity) {
      // Validar si las coordenadas están dentro del rango
      validateCoordinates(name, value);
    }
  };

  // Calcular los límites permitidos basados en el radio de la ciudad
  const geoBounds = useMemo(() => {
    if (!selectedCity || !selectedCity.latitud || !selectedCity.longitud) {
      return null;
    }

    const centerLat = parseFloat(selectedCity.latitud);
    const centerLong = parseFloat(selectedCity.longitud);
    const radioKm = parseFloat(selectedCity.radioKm || 10); // Default 10km si no existe

    // Convertir radio de km a grados
    const latDelta = radioKm / KM_PER_DEGREE_LAT;
    const longDelta = radioKm / getKmPerDegreeLong(centerLat);

    return {
      minLat: centerLat - latDelta,
      maxLat: centerLat + latDelta,
      minLong: centerLong - longDelta,
      maxLong: centerLong + longDelta,
      centerLat,
      centerLong,
      radioKm
    };
  }, [selectedCity]);

  const validateCoordinates = (fieldName, value) => {
    if (!geoBounds || !value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const otherLat = fieldName === 'latitud' ? numValue : parseFloat(formData.latitud);
    const otherLong = fieldName === 'longitud' ? numValue : parseFloat(formData.longitud);

    if (!otherLat || !otherLong) return;

    const isLatValid = otherLat >= geoBounds.minLat && otherLat <= geoBounds.maxLat;
    const isLongValid = otherLong >= geoBounds.minLong && otherLong <= geoBounds.maxLong;

    if (!isLatValid || !isLongValid) {
      setValidationMessage(
        `⚠️ Coordenadas fuera de rango para ${selectedCity.nombre}:\n` +
        `Latitud permitida: ${geoBounds.minLat.toFixed(4)} a ${geoBounds.maxLat.toFixed(4)}\n` +
        `Longitud permitida: ${geoBounds.minLong.toFixed(4)} a ${geoBounds.maxLong.toFixed(4)}`
      );
    } else {
      setValidationMessage('✅ Coordenadas dentro del rango permitido');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.ciudad.trim()) {
      alert('La ciudad es requerida');
      return;
    }

    if (!formData.descripcion.trim()) {
      alert('La descripción de la dirección es requerida');
      return;
    }

    if (!formData.latitud || !formData.longitud) {
      alert('Latitud y Longitud son requeridas');
      return;
    }

    if (isNaN(parseFloat(formData.latitud)) || isNaN(parseFloat(formData.longitud))) {
      alert('Latitud y Longitud deben ser números válidos');
      return;
    }

    // Validar que estén dentro del rango de la ciudad
    if (geoBounds) {
      const lat = parseFloat(formData.latitud);
      const long = parseFloat(formData.longitud);
      const isLatValid = lat >= geoBounds.minLat && lat <= geoBounds.maxLat;
      const isLongValid = long >= geoBounds.minLong && long <= geoBounds.maxLong;

      if (!isLatValid || !isLongValid) {
        alert(
          `⚠️ Coordenadas fuera de rango para ${selectedCity.nombre}:\n` +
          `Latitud permitida: ${geoBounds.minLat.toFixed(4)} a ${geoBounds.maxLat.toFixed(4)}\n` +
          `Longitud permitida: ${geoBounds.minLong.toFixed(4)} a ${geoBounds.maxLong.toFixed(4)}`
        );
        return;
      }
    }

    onAdd(formData);
    setFormData({
      ciudad: '',
      descripcion: '',
      latitud: '',
      longitud: ''
    });
    setSelectedCity(null);
    setValidationMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Crear Nueva Dirección</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="ciudad">Ciudad *</label>
            <select
              id="ciudad"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              required
            >
              <option value="">-- Seleccionar ciudad --</option>
              {cities.map(city => (
                <option key={city.id} value={city.nombre}>
                  {city.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción de la Dirección *</label>
            <input
              type="text"
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Ej: AV NORTE 45 # 123, CERCA AL PARQUE, etc."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="latitud">Latitud *</label>
              <input
                type="number"
                id="latitud"
                name="latitud"
                value={formData.latitud}
                onChange={handleChange}
                placeholder="Ej: 4.7110"
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
                onChange={handleChange}
                placeholder="Ej: -74.0721"
                step="0.0001"
                required
              />
            </div>
          </div>

          {selectedCity && geoBounds && (
            <div className="city-info">
              <p><strong>📍 {selectedCity.nombre}</strong> - Radio: {geoBounds.radioKm} km</p>
              <p><strong>Centro:</strong> Lat {geoBounds.centerLat.toFixed(4)}, Long {geoBounds.centerLong.toFixed(4)}</p>
              <div className="geo-bounds">
                <p><strong>✅ Rango permitido:</strong></p>
                <p>🔵 <strong>Latitud:</strong> {geoBounds.minLat.toFixed(4)} a {geoBounds.maxLat.toFixed(4)}</p>
                <p>🔵 <strong>Longitud:</strong> {geoBounds.minLong.toFixed(4)} a {geoBounds.maxLong.toFixed(4)}</p>
              </div>
            </div>
          )}

          {validationMessage && (
            <div className={`validation-message ${validationMessage.includes('✅') ? 'success' : 'warning'}`}>
              {validationMessage}
            </div>
          )}

          <div className="modal-buttons">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit">
              Crear Dirección
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDireccionModal;
