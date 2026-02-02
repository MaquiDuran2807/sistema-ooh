import React, { useState } from 'react';
import './AddTipoOOHModal.css';

const AddTipoOOHModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    nombre: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      alert('El nombre del tipo OOH es requerido');
      return;
    }

    onAdd(formData);
    setFormData({ nombre: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Crear Nuevo Tipo OOH</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre del Tipo OOH *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: VAYA, PARADEROS, VAYAS MOTORIZADAS, etc."
              required
            />
          </div>

          <div className="modal-buttons">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit">
              Crear Tipo OOH
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTipoOOHModal;
