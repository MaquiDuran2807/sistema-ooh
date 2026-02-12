import React, { useState, useEffect } from 'react';
import { ciudades as ciudadesData } from '../data/ciudades';
import './AddCiudadModal.css';

const AddCiudadModal = ({ isOpen, onClose, onAdd, ciudades = [] }) => {
  const [nuevaCiudad, setNuevaCiudad] = useState('');
  const [nuevaRegion, setNuevaRegion] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [radio, setRadio] = useState('');
  const [error, setError] = useState('');
  const [msgExiste, setMsgExiste] = useState('');
  const [loading, setLoading] = useState(false);
  const [coordSource, setCoordSource] = useState('');

  const regiones = ['CO Andes', 'CO Norte', 'CO Centro', 'CO Sur'];

  // Auto-buscar coordenadas cuando cambia el nombre de ciudad
  useEffect(() => {
    if (nuevaCiudad.trim() && nuevaCiudad.length > 2) {
      buscarCoordenadas();
    } else {
      setLatitud('');
      setLongitud('');
      setRadio('');
      setMsgExiste('');
      setCoordSource('');
    }
  }, [nuevaCiudad]);

  const buscarCoordenadas = async () => {
    try {
      setLoading(true);
      setError('');
      setMsgExiste('');

      const response = await fetch(
        `http://localhost:8080/api/ooh/cities/coordinates?nombre=${encodeURIComponent(nuevaCiudad)}&region=${encodeURIComponent(nuevaRegion)}`,
        { method: 'GET' }
      );

      const result = await response.json();

      if (result.success) {
        if (result.exists) {
          // Ciudad ya existe en BD
          setMsgExiste(
            `✅ Ciudad "${result.data.nombre}" ya existe en la base de datos con coordenadas (${result.data.latitud}, ${result.data.longitud})`
          );
          setLatitud(result.data.latitud?.toString() || '');
          setLongitud(result.data.longitud?.toString() || '');
          setRadio(result.data.radio_km?.toString() || '15');
          setCoordSource('existing');
        } else if (result.found) {
          // Coordenadas encontradas automáticamente
          setLatitud(result.data.latitud.toString());
          setLongitud(result.data.longitud.toString());
          setRadio(result.data.radio.toString());
          setCoordSource('auto');
          // console.log(`📍 Coordenadas auto-detectadas para ${nuevaCiudad}`);
        } else {
          // No se encontraron coordenadas
          setLatitud('');
          setLongitud('');
          setRadio('15');
          setCoordSource('manual');
          // console.log(`⚠️ Ingresa las coordenadas manualmente para ${nuevaCiudad}`);
        }
      }
    } catch (err) {
      console.error('Error buscando coordenadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (msgExiste) {
      setError('❌ Esta ciudad ya existe en la base de datos. No se puede crear duplicada.');
      return;
    }

    if (!nuevaCiudad.trim()) {
      setError('La ciudad es obligatoria');
      return;
    }
    if (!nuevaRegion) {
      setError('La región es obligatoria');
      return;
    }
    if (!latitud || !longitud || !radio) {
      setError('Latitud, longitud y radio son obligatorios');
      return;
    }

    const latNum = parseFloat(latitud);
    const lonNum = parseFloat(longitud);
    const radNum = parseFloat(radio);

    if (isNaN(latNum) || isNaN(lonNum) || isNaN(radNum)) {
      setError('Las coordenadas deben ser números válidos');
      return;
    }

    onAdd({
      nombre: nuevaCiudad.toUpperCase(),
      region: nuevaRegion,
      latitud: latNum,
      longitud: lonNum,
      radio: radNum
    });

    setNuevaCiudad('');
    setNuevaRegion('');
    setLatitud('');
    setLongitud('');
    setRadio('');
    setError('');
    setMsgExiste('');
    setCoordSource('');
    
    // Cerrar modal después de guardar
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClose = () => {
    setNuevaCiudad('');
    setNuevaRegion('');
    setLatitud('');
    setLongitud('');
    setRadio('');
    setError('');
    setMsgExiste('');
    setCoordSource('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Agregar Nueva Ciudad</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {msgExiste && <div className="modal-exists">{msgExiste}</div>}

          <div className="modal-info">
            <small>
              💡 Las coordenadas se detectan automáticamente. Si no aparecen, ingresa manualmente.
              <br/>
              📍 Usamos el centro de la ciudad como punto de referencia
            </small>
          </div>

          <div className="modal-form-group">
            <label htmlFor="ciudad">
              Ciudad {loading && '⏳'}*
            </label>
            <input
              type="text"
              id="ciudad"
              value={nuevaCiudad}
              onChange={(e) => {
                setNuevaCiudad(e.target.value);
                setError('');
              }}
              placeholder="Ej: MEDELLIN"
              maxLength="50"
              autoFocus
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
                if (nuevaCiudad.trim()) {
                  buscarCoordenadas();
                }
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

          <div className="modal-coords-row">
            <div className="modal-form-group">
              <label htmlFor="latitud">
                Latitud {coordSource === 'auto' && '✅'}*
              </label>
              <input
                type="number"
                id="latitud"
                value={latitud}
                onChange={(e) => {
                  setLatitud(e.target.value);
                  setError('');
                }}
                placeholder="6.2476"
                step="0.0001"
              />
            </div>

            <div className="modal-form-group">
              <label htmlFor="longitud">
                Longitud {coordSource === 'auto' && '✅'}*
              </label>
              <input
                type="number"
                id="longitud"
                value={longitud}
                onChange={(e) => {
                  setLongitud(e.target.value);
                  setError('');
                }}
                placeholder="-75.5658"
                step="0.0001"
              />
            </div>

            <div className="modal-form-group">
              <label htmlFor="radio">
                Radio (km) {coordSource === 'auto' && '✅'}*
              </label>
              <input
                type="number"
                id="radio"
                value={radio}
                onChange={(e) => {
                  setRadio(e.target.value);
                  setError('');
                }}
                placeholder="35"
                step="0.5"
                min="1"
              />
            </div>
          </div>

          {coordSource && (
            <div className={`modal-coord-status coord-${coordSource}`}>
              {coordSource === 'auto' && '📍 Coordenadas detectadas automáticamente'}
              {coordSource === 'existing' && '✅ Ciudad ya existe (mostrando datos existentes)'}
              {coordSource === 'manual' && '✏️ Ingresa coordenadas manualmente'}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleClose}>
            Cancelar
          </button>
          <button className="btn-add" onClick={handleAdd} disabled={!!msgExiste || loading}>
            {loading ? 'Buscando...' : 'Agregar Ciudad'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCiudadModal;
