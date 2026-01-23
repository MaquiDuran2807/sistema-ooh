import React, { useState } from 'react';
import './AddMarcaModal.css';

const AddMarcaModal = ({ isOpen, onClose, onAdd }) => {
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevasCampanas, setNuevasCampanas] = useState('');
  const [error, setError] = useState('');

  const categorias = ['CERVEZAS', 'NABS'];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!nuevaMarca.trim()) {
      setError('El nombre de la marca es obligatorio');
      return;
    }

    if (!nuevaCategoria) {
      setError('Debes seleccionar una categoría');
      return;
    }

    const campanas = nuevasCampanas
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    onAdd({
      nombre: nuevaMarca.trim().toUpperCase(),
      categoria: nuevaCategoria,
      campanas: campanas
    });

    setNuevaMarca('');
    setNuevaCategoria('');
    setNuevasCampanas('');
    setError('');
  };

  const handleClose = () => {
    setNuevaMarca('');
    setNuevaCategoria('');
    setNuevasCampanas('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Agregar Nueva Marca</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="modal-form-group">
              <label>Nombre de la Marca *</label>
              <input
                type="text"
                value={nuevaMarca}
                onChange={(e) => setNuevaMarca(e.target.value)}
                placeholder="Ej: NUEVA MARCA"
              />
            </div>

            <div className="modal-form-group">
              <label>Categoría *</label>
              <select
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
              >
                <option value="">-- Seleccionar --</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="modal-form-group">
              <label>Campañas (separadas por comas)</label>
              <textarea
                value={nuevasCampanas}
                onChange={(e) => setNuevasCampanas(e.target.value)}
                placeholder="Ej: CAMPAÑA 1, CAMPAÑA 2, CAMPAÑA 3"
                rows="3"
              />
              <small>Opcional - puedes agregar campañas más tarde</small>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleClose}>
            Cancelar
          </button>
          <button className="btn-add" onClick={handleSubmit}>
            Agregar Marca
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMarcaModal;
