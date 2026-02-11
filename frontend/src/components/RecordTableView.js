import React from 'react';

/**
 * Componente para renderizar OOH records en modo tabla con infinite scroll
 */
const RecordTableView = ({
  displayData,
  records,
  recordsPagination,
  hasTextFilters,
  hasMoreRecords,
  loadMoreRef,
  openModal,
  formatDate,
  handleCheckInTable,
  checkingStates,
  skeletonCount
}) => {
  // Calcular cuántos skeletons mostrar
  const totalRecords = recordsPagination?.total || records.length;
  const skeletonsToShow = Math.max(0, totalRecords - records.length);

  return (
    <div className="records-table-wrapper">
      <table className="records-table">
        <thead>
          <tr>
            <th>Marca</th>
            <th>Campaña</th>
            <th>Categoría</th>
            <th>Ciudad</th>
            <th>Dirección</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Tipo OOH</th>
            <th>Proveedor</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {/* Con filtros: mostrar solo registros filtrados */}
          {hasTextFilters ? (
            displayData.map((record) => (
              <tr key={record.id} className="records-table-row" onClick={() => openModal(record)}>
                <td>{record.marca || '-'}</td>
                <td>{record.campana || '-'}</td>
                <td>{record.categoria || '-'}</td>
                <td>{record.ciudad || '-'}</td>
                <td>{record.direccion || '-'}</td>
                <td>{formatDate(record.fecha_inicio)}</td>
                <td>{formatDate(record.fecha_final)}</td>
                <td>{record.tipo_ooh || '-'}</td>
                <td>{record.proveedor || '-'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button 
                    className={`check-btn-table ${record.checked ? 'checked' : ''} ${checkingStates[record.id] ? 'loading' : ''}`}
                    onClick={(e) => handleCheckInTable(e, record.id, record.checked)}
                    disabled={checkingStates[record.id]}
                    title={record.checked ? 'Desmarcar como chequeado' : 'Marcar como chequeado'}
                  >
                    {record.checked ? '✓ Chequeado' : '○ Chequear'}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            /* Sin filtros: mostrar registros + skeletons para infinite scroll */
            <>
              {/* Filas de registros cargados */}
              {records.map((record) => (
                <tr key={record.id} className="records-table-row" onClick={() => openModal(record)}>
                  <td>{record.marca || '-'}</td>
                  <td>{record.campana || '-'}</td>
                  <td>{record.categoria || '-'}</td>
                  <td>{record.ciudad || '-'}</td>
                  <td>{record.direccion || '-'}</td>
                  <td>{formatDate(record.fecha_inicio)}</td>
                  <td>{formatDate(record.fecha_final)}</td>
                  <td>{record.tipo_ooh || '-'}</td>
                  <td>{record.proveedor || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      className={`check-btn-table ${record.checked ? 'checked' : ''} ${checkingStates[record.id] ? 'loading' : ''}`}
                      onClick={(e) => handleCheckInTable(e, record.id, record.checked)}
                      disabled={checkingStates[record.id]}
                      title={record.checked ? 'Desmarcar como chequeado' : 'Marcar como chequeado'}
                    >
                      {record.checked ? '✓ Chequeado' : '○ Chequear'}
                    </button>
                  </td>
                </tr>
              ))}

              {/* Filas skeleton para cargar más */}
              {hasMoreRecords && skeletonsToShow > 0 && Array.from({ length: skeletonsToShow }).map((_, idx) => (
                <tr key={`skeleton-row-${idx}`} className="records-table-row skeleton-row">
                  {/* El primer skeleton es el sentinel para infinite scroll */}
                  {idx === 0 && (
                    <td ref={loadMoreRef} style={{ width: '1px', height: '1px', opacity: 0, padding: 0 }}></td>
                  )}
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                  <td><div className="skeleton-line" /></td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RecordTableView;
