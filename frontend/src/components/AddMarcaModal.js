import React, { useState, useEffect } from 'react';
import './AddMarcaModal.css';
import { useApp } from '../context/AppContext';

const AddMarcaModal = ({ isOpen, onClose, onAdd }) => {
  const { fetchBrands } = useApp(); 
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevasCampanas, setNuevasCampanas] = useState('');
  const [error, setError] = useState('');
  const [brandsCount, setBrandsCount] = useState(0);
  const [debug, setDebug] = useState(false); // Para ver estado

  const categorias = ['CERVEZAS', 'NABS'];

  // Cargar marcas cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        console.log('🔵 AddMarcaModal: Cargando datos porque isOpen=true');
        const data = await fetchBrands();
        console.log('📊 AddMarcaModal recibió brands:', data?.length, data);
        if (data) {
          setBrandsCount(data.length);
        }
      };
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Solo isOpen, fetchBrands viene del contexto

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
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
    
    // Cerrar modal después de guardar
    setTimeout(() => {
      onClose();
    }, 300);
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

          <div className="modal-info">
            <small>Marcas existentes: {brandsCount}</small>
            <button 
              type="button"
              style={{marginLeft: '10px', fontSize: '10px', padding: '2px 6px'}}
              onClick={() => setDebug(!debug)}
            >
              {debug ? '🔍 Ocultar' : '🔍 Debug'}
            </button>
          </div>

          {debug && (
            <div className="modal-debug" style={{background: '#f0f0f0', padding: '8px', marginBottom: '10px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px'}}>
              <p><strong>Estado del Modal:</strong></p>
              <p>nuevaMarca: "{nuevaMarca}"</p>
              <p>nuevaCategoria: "{nuevaCategoria}"</p>
              <p>nuevasCampanas: "{nuevasCampanas}"</p>
              <p>brandsCount: {brandsCount}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="modal-form-group">
              <label>Nombre de la Marca *</label>
              <input
                type="text"
                value={nuevaMarca}
                onChange={(e) => setNuevaMarca(e.target.value)}
                placeholder="Ej: NUEVA MARCA"
                autoFocus
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
