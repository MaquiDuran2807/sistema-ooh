import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OOHList.css';
import { useApp } from '../context/AppContext';

const OOHList = () => {
  const { records, fetchRecords, loading: contextLoading } = useApp();
  
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState(null);
  
  // Filtros
  const [searchDireccion, setSearchDireccion] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterCampana, setFilterCampana] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  
  // Listas únicas para filtros
  const [marcas, setMarcas] = useState([]);
  const [campanas, setCampanas] = useState([]);
  
  // Modal de detalles
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [imageReplacements, setImageReplacements] = useState({});

  // Convertir registro de objeto (BD) a array (formato legacy)
  const recordToArray = (record) => {
    if (Array.isArray(record)) return record;
    return [
      record.id || '',           // [0]
      record.id || '',           // [1]
      record.marca || '',        // [2]
      record.categoria || '',    // [3]
      record.proveedor || '',    // [4]
      record.campana || '',      // [5]
      record.direccion || '',    // [6]
      record.ciudad || '',       // [7]
      record.region || '',       // [8]
      record.latitud || '',      // [9]
      record.longitud || '',     // [10]
      record.imagen_1 || '',     // [11]
      record.imagen_2 || '',     // [12]
      record.imagen_3 || '',     // [13]
      record.fecha_inicio || '', // [14]
      record.fecha_final || '',  // [15]
      '',                        // [16]
      record.tipo_ooh || ''      // [17]
    ];
  };

    const resolveImageUrl = (raw) => {
      if (!raw) return null;
      let val = String(raw);
      
      // Reemplazar backslashes JSON-escaped (\\) por barras normales
      val = val.replace(/\\\\/g, '\\');
      
      const lower = val.toLowerCase();

      // http/https directo
      if (lower.startsWith('http://') || lower.startsWith('https://')) return val;

      // Windows absoluta con backslashes
      if (/^[a-z]:\\/i.test(val) || val.includes('\\')) {
        // Buscar "local-images" en el path (insensible a mayúsculas)
        const regex = /local-images[\\\/]/i;
        const match = val.match(regex);
        if (match) {
          const startIndex = val.indexOf(match[0]) + match[0].length;
          const rel = val.substring(startIndex).replace(/\\/g, '/');
          return `http://localhost:8080/api/images/${rel}`;
        }
        // Si no tiene local-images, tomar solo el filename como fallback
        const filename = val.split(/[/\\]/).pop();
        return filename ? `http://localhost:8080/api/images/${filename}` : null;
      }

      // Unix absoluta
      if (val.startsWith('/')) {
        const parts = val.split(/local-images/i);
        if (parts.length > 1) {
          const rel = parts[1].replace(/^\//, '');
          return `http://localhost:8080/api/images/${rel}`;
        }
      }

      // Ruta relativa de API
      if (val.startsWith('/api/images')) {
        return `http://localhost:8080${val}`;
      }

      return val;
    };

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Actualizar datos locales cuando el contexto cambia
  useEffect(() => {
    if (records) {
      setFilteredData(records);
      
      // Extraer valores únicos para filtros
      const uniqueMarcas = [...new Set(records.map(r => r.marca))].filter(Boolean).sort();
      const uniqueCampanas = [...new Set(records.map(r => r.campana))].filter(Boolean).sort();
      setMarcas(uniqueMarcas);
      setCampanas(uniqueCampanas);
    }
  }, [records]);

  useEffect(() => {
    applyFilters();
  }, [records, searchDireccion, filterMarca, filterCampana, filterFechaInicio, filterFechaFin]);

  const applyFilters = () => {
    if (!records) return;
    
    let filtered = [...records];

    // Filtro por búsqueda de dirección
    if (searchDireccion) {
      filtered = filtered.filter(record =>
        record.direccion?.toLowerCase().includes(searchDireccion.toLowerCase())
      );
    }

    // Filtro por marca
    if (filterMarca) {
      filtered = filtered.filter(record => record.marca === filterMarca);
    }

    // Filtro por campaña
    if (filterCampana) {
      filtered = filtered.filter(record => record.campana === filterCampana);
    }

    // Filtro por fecha inicio
    if (filterFechaInicio) {
      filtered = filtered.filter(record => {
        const recordFecha = new Date(record.fecha_inicio);
        const filterFecha = new Date(filterFechaInicio);
        return recordFecha >= filterFecha;
      });
    }

    // Filtro por fecha fin
    if (filterFechaFin) {
      filtered = filtered.filter(record => {
        const recordFecha = new Date(record.fecha_final);
        const filterFecha = new Date(filterFechaFin);
        return recordFecha <= filterFecha;
      });
    }

    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setSearchDireccion('');
    setFilterMarca('');
    setFilterCampana('');
    setFilterFechaInicio('');
    setFilterFechaFin('');
  };

  // Estados para el modal de reporte
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [reportMonth, setReportMonth] = React.useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportMethod, setReportMethod] = React.useState('base'); // 'base' o 'scratch'
  const [isDownloading, setIsDownloading] = React.useState(false);

  const openReportModal = () => {
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
  };

  const downloadReportPPT = async () => {
    if (!reportMonth) {
      alert('⚠️ Por favor selecciona un mes');
      return;
    }

    try {
      setIsDownloading(true);
      console.log(`📥 Descargando PPT de VAYAS para ${reportMonth}...`);
      console.log(`   Método: ${reportMethod === 'base' ? 'Con archivo base (Python)' : 'Desde cero (PptxGenJS)'}`);
      
      const response = await axios.get('http://localhost:8080/api/ooh/report/ppt', {
        params: { 
          month: reportMonth,
          useBase: reportMethod === 'base' ? 'true' : 'false'
        },
        responseType: 'blob',
        timeout: 60000 // 60 segundos de timeout
      });
      
      // Crear un link y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_vallas_${reportMonth}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ PPT descargado exitosamente');
      alert('✅ Reporte PPT descargado correctamente');
      closeReportModal();
    } catch (error) {
      console.error('❌ Error descargando PPT:', error);
      let errorMsg = 'Error al descargar el PPT';
      
      if (error.response?.data?.hint) {
        errorMsg += `\n\n💡 ${error.response.data.hint}`;
      } else if (error.response?.data?.error) {
        errorMsg += `\n${error.response.data.error}`;
      } else {
        errorMsg += `\n${error.message}`;
      }
      
      alert(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  const openModal = (record) => {
    setSelectedRecord(record);
    setEditData({
      id: record[1],
      marca: record[2],
      categoria: record[3],
      proveedor: record[4],
      campana: record[5],
      direccion: record[6],
      ciudad: record[7],
      region: record[8],
      latitud: record[9],
      longitud: record[10],
      fechaInicio: record[14],
      fechaFin: record[15],
      tipoOOH: record[17]
    });
    setEditMode(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
    setEditMode(false);
    setEditData({});
    setImageReplacements({});
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChangeSlot = (slot, fileList) => {
    const file = fileList && fileList[0];
    if (!file) return;
    setImageReplacements(prev => ({ ...prev, [slot]: file }));
  };

  const saveChanges = async () => {
    try {
      // Preparar FormData para enviar con imágenes
      const formData = new FormData();
      formData.append('existingId', editData.id);
      formData.append('marca', editData.marca);
      formData.append('categoria', editData.categoria);
      formData.append('proveedor', editData.proveedor);
      formData.append('campana', editData.campana);
      formData.append('direccion', editData.direccion);
      formData.append('ciudad', editData.ciudad);
      formData.append('region', editData.region);
      formData.append('latitud', editData.latitud);
      formData.append('longitud', editData.longitud);
      formData.append('fechaInicio', editData.fechaInicio);
      formData.append('fechaFin', editData.fechaFin);
      formData.append('tipoOOH', editData.tipoOOH);

      // Agregar nuevas imágenes si se seleccionaron (por slot)
      const slots = Object.keys(imageReplacements);
      if (slots.length > 0) {
        formData.append('imageIndexes', slots.join(',')); // slots en base 1
        slots.forEach(slot => {
          formData.append('imagenes', imageReplacements[slot]);
        });
      }

      const response = await axios.post('http://localhost:8080/api/ooh/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        alert('✅ Registro actualizado correctamente');
        setEditMode(false);
        fetchRecords(); // Recargar datos
        closeModal();
      }
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      alert('❌ Error al guardar los cambios');
    }
  };

  // Función para parsear fechas en formato DD/MM/YYYY o D/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha';
    
    // Si ya es una fecha válida ISO
    if (dateStr.includes('-')) {
      return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    // Parsear formato DD/MM/YYYY o D/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    return dateStr;
  };

  if (contextLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando registros...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">⚠️ {error}</p>
        <button onClick={fetchRecords} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="empty-container">
        <p>📭 No hay registros aún</p>
        <p>Crea el primer registro en la sección "Nuevo Registro"</p>
      </div>
    );
  }

  const displayData = filteredData.length > 0 || searchDireccion || filterMarca || filterCampana || filterFechaInicio || filterFechaFin 
    ? filteredData 
    : records;

  return (
    <div className="ooh-list-container">
      <div className="list-header">
        <h2>Registros OOH ({displayData.length} de {records.length})</h2>
        <div className="header-buttons">
          <button onClick={openReportModal} className="report-btn" title="Generar Reporte PPT de VALLAS">
            📄 Generar Reporte PPT
          </button>
          <button onClick={fetchRecords} className="refresh-btn">
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Buscar por dirección..."
            value={searchDireccion}
            onChange={(e) => setSearchDireccion(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          <select 
            value={filterMarca} 
            onChange={(e) => setFilterMarca(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas las marcas</option>
            {marcas.map((marca, idx) => (
              <option key={idx} value={marca}>{marca}</option>
            ))}
          </select>

          <select 
            value={filterCampana} 
            onChange={(e) => setFilterCampana(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas las campañas</option>
            {campanas.map((campana, idx) => (
              <option key={idx} value={campana}>{campana}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterFechaInicio}
            onChange={(e) => setFilterFechaInicio(e.target.value)}
            placeholder="Fecha inicio desde"
            className="filter-date"
            title="Fecha inicio desde"
          />

          <input
            type="date"
            value={filterFechaFin}
            onChange={(e) => setFilterFechaFin(e.target.value)}
            placeholder="Fecha fin hasta"
            className="filter-date"
            title="Fecha fin hasta"
          />

          <button onClick={clearFilters} className="clear-filters-btn">
            ✖️ Limpiar
          </button>
        </div>
      </div>

      {displayData.length === 0 ? (
        <div className="no-results">
          <p>🔍 No se encontraron registros con los filtros aplicados</p>
          <button onClick={clearFilters} className="btn-secondary">
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="records-grid">
          {displayData.map((record, index) => {
            // Extraer datos del objeto (desde BD) o array (legacy)
            const marca = typeof record === 'object' && !Array.isArray(record) ? record.marca : record[2];
            const categoria = typeof record === 'object' && !Array.isArray(record) ? record.categoria : record[3];
            const campana = typeof record === 'object' && !Array.isArray(record) ? record.campana : record[5];
            const direccion = typeof record === 'object' && !Array.isArray(record) ? record.direccion : record[6];
            const ciudad = typeof record === 'object' && !Array.isArray(record) ? record.ciudad : record[7];
            const img1 = typeof record === 'object' && !Array.isArray(record) ? record.imagen_1 : record[11];
            const img2 = typeof record === 'object' && !Array.isArray(record) ? record.imagen_2 : record[12];
            const img3 = typeof record === 'object' && !Array.isArray(record) ? record.imagen_3 : record[13];
            const fechaInicio = typeof record === 'object' && !Array.isArray(record) ? record.fecha_inicio : record[14];
            const fechaFin = typeof record === 'object' && !Array.isArray(record) ? record.fecha_final : record[15];
            
            const url1 = resolveImageUrl(img1);
            return (
              <div key={index} className="record-card">
                {/* Imagen destacada */}
                <div className="card-image">
                  {url1 ? (
                      <img 
                      src={url1}
                      alt={`${marca} - ${campana}`}
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
                    <h3>{marca}</h3>
                    <span className="campaign-badge">{campana}</span>
                  </div>

                  <div className="card-body">
                    <div className="record-field">
                      <strong>📦</strong>
                      <span>{categoria}</span>
                    </div>

                    <div className="record-field">
                      <strong>📍</strong>
                      <span>{direccion}</span>
                    </div>

                    <div className="record-field">
                      <strong>🏙️</strong>
                      <span>{ciudad}</span>
                    </div>

                    <div className="record-field">
                      <strong>📅</strong>
                      <span>
                        {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                      </span>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="images-count">
                      📸 {[img1, img2, img3].filter(Boolean).length} fotos
                    </div>
                    <button 
                      className="view-details-btn"
                      onClick={() => openModal(record)}
                    >
                      Ver más
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalles */}
      {showModal && selectedRecord && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRecord[2]} - {selectedRecord[5]}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* Imagen principal */}
              {resolveImageUrl(selectedRecord[11]) && (
                <div className="modal-image">
                  <img 
                    src={resolveImageUrl(selectedRecord[11])} 
                    alt={`${selectedRecord[2]} - ${selectedRecord[5]}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="300"%3E%3Crect fill="%23ddd" width="100%25" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESin imagen%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}

              {/* Detalles del registro */}
              <div className="modal-details">
                <div className="detail-row">
                  <strong>ID:</strong>
                  <span>{selectedRecord[1]}</span>
                </div>
                <div className="detail-row">
                  <strong>Marca:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.marca} 
                      onChange={(e) => handleEditChange('marca', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord[2]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Campaña:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.campana} 
                      onChange={(e) => handleEditChange('campana', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord[5]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Categoría:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.categoria} 
                      onChange={(e) => handleEditChange('categoria', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord[3]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Proveedor:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.proveedor} 
                      onChange={(e) => handleEditChange('proveedor', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord[4]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Dirección:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.direccion} 
                      onChange={(e) => handleEditChange('direccion', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord[6]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Ciudad:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.ciudad} 
                      onChange={(e) => handleEditChange('ciudad', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord[7]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Región:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.region} 
                      onChange={(e) => handleEditChange('region', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord[8]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Coordenadas:</strong>
                  {editMode ? (
                    <div style={{display: 'flex', gap: '5px'}}>
                      <input 
                        type="text" 
                        value={editData.latitud} 
                        onChange={(e) => handleEditChange('latitud', e.target.value)}
                        className="edit-input"
                        placeholder="Latitud"
                        style={{flex: 1}}
                      />
                      <input 
                        type="text" 
                        value={editData.longitud} 
                        onChange={(e) => handleEditChange('longitud', e.target.value)}
                        className="edit-input"
                        placeholder="Longitud"
                        style={{flex: 1}}
                      />
                    </div>
                  ) : (
                    <span>{selectedRecord[9]},{selectedRecord[10]}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Fecha Inicio:</strong>
                  {editMode ? (
                    <input 
                      type="date" 
                      value={editData.fechaInicio} 
                      onChange={(e) => handleEditChange('fechaInicio', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{formatDate(selectedRecord[14])}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Fecha Fin:</strong>
                  {editMode ? (
                    <input 
                      type="date" 
                      value={editData.fechaFin} 
                      onChange={(e) => handleEditChange('fechaFin', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{formatDate(selectedRecord[15])}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Fotos:</strong>
                  <span>{[selectedRecord[11], selectedRecord[12], selectedRecord[13]].filter(Boolean).length}</span>
                </div>
                <div className="detail-row">
                  <strong>Tipo OOH:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.tipoOOH} 
                      onChange={(e) => handleEditChange('tipoOOH', e.target.value)}
                      className="edit-input"
                      list="tiposOOH"
                    />
                  ) : (
                    <span>{selectedRecord[17]}</span>
                  )}
                </div>
              </div>

              {/* Galería de imágenes - Las 3 imágenes */}
              <div className="modal-gallery">
                <h3>📸 Todas las imágenes ({[selectedRecord[11], selectedRecord[12], selectedRecord[13]].filter(Boolean).length}/3)</h3>
                
                <div className="gallery-grid">
                  {[
                    { url: selectedRecord[11], num: 1 },
                    { url: selectedRecord[12], num: 2 },
                    { url: selectedRecord[13], num: 3 }
                  ].map((item, idx) => (
                    <div key={idx} className={`gallery-item ${!item.url ? 'empty' : ''}`}>
                      {item.url ? (
                        <>
                          <img 
                            src={resolveImageUrl(item.url)}
                            alt={`Foto ${item.num}`}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="200"%3E%3Crect fill="%23ddd" width="100%25" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ESin imagen%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div className="gallery-item-label">Foto {item.num}</div>
                          {editMode && (
                            <div className="replace-control">
                              <label className="upload-btn-modal">
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleImageChangeSlot(item.num, e.target.files)}
                                />
                                Cambiar esta foto
                              </label>
                              {imageReplacements[item.num] && (
                                <small>
                                  Nuevo: {imageReplacements[item.num].name}
                                </small>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="gallery-placeholder">
                          <span>📷 Foto {item.num}</span>
                          <small>No disponible</small>
                          {editMode && (
                            <div className="replace-control" style={{ marginTop: '8px' }}>
                              <label className="upload-btn-modal">
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleImageChangeSlot(item.num, e.target.files)}
                                />
                                Subir foto {item.num}
                              </label>
                              {imageReplacements[item.num] && (
                                <small style={{ display: 'block', marginTop: '6px', color: '#666' }}>
                                  Nuevo: {imageReplacements[item.num].name}
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {!editMode ? (
                <>
                  <button className="modal-btn btn-edit" onClick={() => setEditMode(true)}>
                    ✏️ Editar
                  </button>
                  <button className="modal-btn btn-cancel" onClick={closeModal}>Cerrar</button>
                </>
              ) : (
                <>
                  <button className="modal-btn btn-save" onClick={saveChanges}>
                    💾 Guardar
                  </button>
                  <button className="modal-btn btn-cancel" onClick={() => { setEditMode(false); setImageReplacements({}); }}>
                    ❌ Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Reporte PPT */}
      {showReportModal && (
        <div className="modal-overlay" onClick={closeReportModal}>
          <div className="modal-content-report" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Generar Reporte PPT - VALLAS</h3>
              <button className="modal-close" onClick={closeReportModal}>✖</button>
            </div>

            <div className="modal-body-report">
              <div className="report-config-section">
                <label className="report-label">
                  📅 Mes del Reporte:
                  <input 
                    type="month" 
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="report-month-input"
                  />
                </label>
                <small className="report-hint">
                  Filtra VALLAS por fecha de inicio o fin dentro del mes seleccionado
                </small>
              </div>

              <div className="report-config-section">
                <label className="report-label">
                  🎨 Método de Generación:
                </label>
                <div className="report-method-options">
                  <label className="report-radio-option">
                    <input 
                      type="radio" 
                      name="reportMethod" 
                      value="base"
                      checked={reportMethod === 'base'}
                      onChange={(e) => setReportMethod(e.target.value)}
                    />
                    <div className="report-radio-label">
                      <strong>Con Archivo Base</strong>
                      <small>Usa "REPORTE FACTURACIÓN BASE.pptx" como plantilla</small>
                      <small style={{ color: '#666' }}>Requiere: python-pptx instalado</small>
                    </div>
                  </label>

                  <label className="report-radio-option">
                    <input 
                      type="radio" 
                      name="reportMethod" 
                      value="scratch"
                      checked={reportMethod === 'scratch'}
                      onChange={(e) => setReportMethod(e.target.value)}
                    />
                    <div className="report-radio-label">
                      <strong>Desde Cero</strong>
                      <small>Genera PPT con PptxGenJS (solo Node.js)</small>
                      <small style={{ color: '#666' }}>No requiere Python</small>
                    </div>
                  </label>
                </div>
              </div>

              <div className="report-info-box">
                <strong>ℹ️ Información:</strong>
                <ul>
                  <li>Solo se incluyen registros con Tipo_OOH = "VALLA"</li>
                  <li>Cada VALLA genera un slide con: Dirección, Ciudad, 3 imágenes, Vigencia, Proveedor</li>
                  <li>El archivo se descargará automáticamente al generarse</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={closeReportModal} 
                className="modal-btn-cancel"
                disabled={isDownloading}
              >
                Cancelar
              </button>
              <button 
                onClick={downloadReportPPT} 
                className="modal-btn-save"
                disabled={isDownloading || !reportMonth}
              >
                {isDownloading ? '⏳ Generando...' : '📥 Generar y Descargar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Datalist de tipos OOH disponibles */}
      <datalist id="tiposOOH">
        <option value="VAYA" />
        <option value="PARADEROS" />
        <option value="VAYAS MOTORIZADAS" />
        <option value="CAJITAS DE LUZ" />
        <option value="PRODUCCIÓN" />
      </datalist>
    </div>
  );
};

export default OOHList;
