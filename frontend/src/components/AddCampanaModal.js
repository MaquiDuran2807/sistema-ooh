import React, { useState } from 'react';
import './AddCampanaModal.css';
import { useApp } from '../context/AppContext';
import AddMarcaModal from './AddMarcaModal';

const AddCampanaModal = ({ isOpen, onClose, onAdd, brands = [] }) => {
  const { categories = [], advertisers = [] } = useApp();
  
  const [formData, setFormData] = useState({
    nombre: '',
    brand_id: ''
  });
  const [showAddMarcaModal, setShowAddMarcaModal] = useState(false);
  const [availableBrands, setAvailableBrands] = useState(brands);
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
      setError('El nombre de la campaña es requerido');
      return;
    }

    if (!formData.brand_id) {
      setError('Debes seleccionar una marca');
      return;
    }

    onAdd({
      nombre: formData.nombre.trim().toUpperCase(),
      brand_id: parseInt(formData.brand_id)
    });

    setFormData({
      nombre: '',
      brand_id: ''
    });
    setError('');
  };

  const handleAddMarca = (newMarca) => {
    const marcaWithDefaults = {
      id: Math.max(...availableBrands.map(b => b.id || 0), 0) + 1,
      nombre: newMarca.nombre,
      categoria: newMarca.categoria,
      category_id: newMarca.category_id,
      advertiser_id: newMarca.advertiser_id,
      anunciante: newMarca.anunciante
    };

    setAvailableBrands(prev => [...prev, marcaWithDefaults]);
    setFormData(prev => ({
      ...prev,
      brand_id: marcaWithDefaults.id
    }));
    setShowAddMarcaModal(false);
  };

  const handleClose = () => {
    setFormData({
      nombre: '',
      brand_id: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Crear Nueva Campaña</h2>
            <button className="modal-close" onClick={handleClose}>×</button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="brand_id">Marca *</label>
              <div className="select-with-add">
                <select
                  id="brand_id"
                  name="brand_id"
                  value={formData.brand_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Seleccionar marca --</option>
                  {(availableBrands || []).map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.nombre}
                    </option>
                  ))}
                </select>
                <button 
                  type="button"
                  className="btn-add-small"
                  onClick={() => setShowAddMarcaModal(true)}
                  title="Crear nueva marca"
                >
                  +
                </button>
              </div>
              <small style={{ display: 'block', marginTop: '6px', color: '#666' }}>
                No ves la marca? Crea una nueva haciendo click en "+"
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="nombre">Nombre de la Campaña *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: VERANO 2024, NAVIDAD, etc."
                required
              />
            </div>

            <div className="modal-buttons">
              <button type="button" className="btn-cancel" onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit">
                Crear Campaña
              </button>
            </div>
          </form>
        </div>
      </div>

      <AddMarcaModal 
        isOpen={showAddMarcaModal}
        onClose={() => setShowAddMarcaModal(false)}
        onAdd={handleAddMarca}
      />
    </>
  );
};

export default AddCampanaModal;
