import React, { useState } from 'react';
import './AddCiudadModal.css';

const AddCiudadModal = ({ isOpen, onClose, onAdd }) => {
  const [nuevaCiudad, setNuevaCiudad] = useState('');
  const [nuevaRegion, setNuevaRegion] = useState('');
  const [error, setError] = useState('');

  const regiones = ['CO Andes', 'CO Norte', 'CO Centro', 'CO Sur'];

  const handleAdd = () => {
    if (!nuevaCiudad.trim()) {
      setError('La ciudad es obligatoria');
      return;
    }
    if (!nuevaRegion) {
      setError('La región es obligatoria');
      return;
    }

    onAdd({
      nombre: nuevaCiudad.toUpperCase(),
      region: nuevaRegion
    });

    setNuevaCiudad('');
    setNuevaRegion('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Agregar Nueva Ciudad</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-form-group">
            <label htmlFor="ciudad">Ciudad *</label>
            <input
              type="text"
              id="ciudad"
              value={nuevaCiudad}
              onChange={(e) => {
                setNuevaCiudad(e.target.value);
                setError('');
              }}
              placeholder="Ej: SANTA FE DE ANTIOQUIA"
              maxLength="50"
            />
          </div>

          <div className="modal-form-group">
            <label htmlFor="region">Región *</label>
            <select
              id="region"
              value={nuevaRegion}
              onChange={(e) => {
                setNuevaRegion(e.target.value);
                setError('');
              }}
            >
              <option value="">Selecciona una región</option>
              {regiones.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-add" onClick={handleAdd}>
            Agregar Ciudad
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCiudadModal;
