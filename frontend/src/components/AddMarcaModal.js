import React, { useState } from 'react';
import './AddMarcaModal.css';
import { useApp } from '../context/AppContext';

const AddMarcaModal = ({ isOpen, onClose, onAdd }) => {
  const { categories = [], advertisers = [] } = useApp();
  
  const [formData, setFormData] = useState({
    nombre: '',
    category_id: '',
    advertiser_id: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre de la marca es requerido');
      return;
    }

    if (!formData.category_id) {
      setError('La categoría es requerida');
      return;
    }

    if (!formData.advertiser_id) {
      setError('El anunciante es requerido');
      return;
    }

    const selectedCategory = categories.find(c => c.id === parseInt(formData.category_id));
    const selectedAdvertiser = advertisers.find(a => a.id === parseInt(formData.advertiser_id));

    onAdd({
      nombre: formData.nombre.trim().toUpperCase(),
      categoria: selectedCategory?.nombre || '',
      category_id: parseInt(formData.category_id),
      advertiser_id: parseInt(formData.advertiser_id),
      anunciante: selectedAdvertiser?.nombre || ''
    });

    setFormData({
      nombre: '',
      category_id: '',
      advertiser_id: ''
    });
    setError('');
  };

  const handleClose = () => {
    setFormData({
      nombre: '',
      category_id: '',
      advertiser_id: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Crear Nueva Marca</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="nombre">Nombre de la Marca *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: CORONA, AGUILA, BBC, etc."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category_id">Categoría *</label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Seleccionar categoría --</option>
              {(categories || []).map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="advertiser_id">Anunciante *</label>
            <select
              id="advertiser_id"
              name="advertiser_id"
              value={formData.advertiser_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Seleccionar anunciante --</option>
              {(advertisers || []).map(adv => (
                <option key={adv.id} value={adv.id}>
                  {adv.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-buttons">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit">
              Crear Marca
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMarcaModal;
