import React, { useMemo, useState } from 'react';
import axios from 'axios';

const RecordCard = ({ 
  record, 
  isSelected, 
  onSelect, 
  onOpenModal, 
  formatDate, 
  resolveImageUrl, 
  LazyImage,
  toggleCardSelection,
  onCheckedChange 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  
  // Extraer datos del registro
  const recordData = useMemo(() => {
    const marca = record.marca || '';
    const categoria = record.categoria || '';
    const campana = record.campana || '';
    const direccion = record.direccion || '';
    const ciudad = record.ciudad || '';
    const img1 = record.imagen_1 || null;
    const img2 = record.imagen_2 || null;
    const img3 = record.imagen_3 || null;
    const fechaInicio = record.fecha_inicio || '';
    const fechaFin = record.fecha_final || '';
    
    return { marca, categoria, campana, direccion, ciudad, img1, img2, img3, fechaInicio, fechaFin };
  }, [record]);

  const url1 = useMemo(() => resolveImageUrl(recordData.img1), [recordData.img1, resolveImageUrl]);

  // Actualizar estado de check
  const handleToggleCheck = async (e) => {
    e.stopPropagation();
    setIsChecking(true);
    try {
      const newCheckedState = !record.checked;
      const response = await axios.patch(
        `http://localhost:8080/api/ooh/${record.id}/check`,
        { checked: newCheckedState }
      );

      if (response.data.success) {
        if (onCheckedChange) {
          onCheckedChange(record.id, newCheckedState);
        }
      }
    } catch (error) {
      console.error('Error al actualizar check:', error);
      alert('❌ Error al actualizar el estado');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div 
      key={record.id} 
      className={`record-card ${isSelected ? 'selected' : ''}`} 
      onClick={() => {
        if (isSelected || toggleCardSelection) {
          onSelect(record.id);
        }
      }}
    >
      {/* Checkbox de selección */}
      <div className="card-select-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(record.id);
          }}
          className="card-checkbox"
        />
      </div>

      {/* Imagen destacada */}
      <div className="card-image">
        {url1 ? (
          <LazyImage
            src={url1}
            alt={`${recordData.marca} - ${recordData.campana}`}
            placeholder={null}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23ddd" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESin imagen%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="no-image">📷 Sin imagen</div>
        )}
      </div>

      <div className="card-content">
        <div className="card-header">
          <h3>{recordData.marca}</h3>
          <span className="campaign-badge">{recordData.campana}</span>
        </div>

        <div className="card-body">
          <div className="record-field">
            <strong>📦</strong>
            <span>{recordData.categoria}</span>
          </div>

          <div className="record-field">
            <strong>📍</strong>
            <span>{recordData.direccion}</span>
          </div>

          <div className="record-field">
            <strong>🏙️</strong>
            <span>{recordData.ciudad}</span>
          </div>

          <div className="record-field">
            <strong>📅</strong>
            <span>
              {formatDate(recordData.fechaInicio)} - {formatDate(recordData.fechaFin)}
            </span>
          </div>
        </div>

        <div className="card-footer">
          <div className="footer-left">
            <div className="images-count">
              📸 {[recordData.img1, recordData.img2, recordData.img3].filter(Boolean).length} fotos
            </div>
          </div>
          <div className="footer-right">
            <button 
              className={`check-btn ${record.checked ? 'checked' : ''} ${isChecking ? 'loading' : ''}`}
              onClick={handleToggleCheck}
              disabled={isChecking}
              title={record.checked ? 'Desmarcar como chequeado' : 'Marcar como chequeado'}
            >
              {record.checked ? '✓ Chequeado' : '○ Chequear'}
            </button>
            <button 
              className="view-details-btn"
              onClick={() => onOpenModal(record)}
            >
              Ver más
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RecordCard);
