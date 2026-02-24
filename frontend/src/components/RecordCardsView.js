import React from 'react';
import RecordCard from './RecordCard';

/**
 * Componente para renderizar OOH records en modo tarjetas con infinite scroll
 */
const RecordCardsView = ({
  displayData,
  records,
  recordsPagination,
  hasTextFilters,
  hasMoreRecords,
  loadMoreRef,
  openModal,
  formatDate,
  resolveImageUrl,
  LazyImage,
  toggleCardSelection,
  handleCheckedChange,
  selectedCards,
  skeletonCount
}) => {
  // Calcular total usando mismo criterio que displayData
  const totalRecords = hasTextFilters 
    ? displayData.length 
    : recordsPagination?.total || records.length;

  return (
    <div className="records-grid">
      {/* Con filtros: mostrar solo registros filtrados sin infinite scroll */}
      {hasTextFilters ? (
        displayData.map((record) => {
          const isSelected = selectedCards.has(record.id);
          return (
            <RecordCard
              key={record.id}
              record={record}
              isSelected={isSelected}
              onSelect={toggleCardSelection}
              onOpenModal={openModal}
              formatDate={formatDate}
              resolveImageUrl={resolveImageUrl}
              LazyImage={LazyImage}
              toggleCardSelection={toggleCardSelection}
              onCheckedChange={handleCheckedChange}
            />
          );
        })
      ) : (
        /* Sin filtros: renderizar array completo con skeletons para infinite scroll */
        Array.from({ length: totalRecords }).map((_, idx) => {
          const record = records[idx];
          
          // Si existe el registro, mostrar la tarjeta
          if (record) {
            const isSelected = selectedCards.has(record.id);
            return (
              <RecordCard
                key={record.id}
                record={record}
                isSelected={isSelected}
                onSelect={toggleCardSelection}
                onOpenModal={openModal}
                formatDate={formatDate}
                resolveImageUrl={resolveImageUrl}
                LazyImage={LazyImage}
                toggleCardSelection={toggleCardSelection}
                onCheckedChange={handleCheckedChange}
              />
            );
          }
          
          // Si NO existe, mostrar skeleton (placeholder)
          return (
            <div key={`skeleton-${idx}`} className="record-card skeleton">
              {/* El primer skeleton es el sentinel para infinite scroll */}
              {idx === records.length && hasMoreRecords && (
                <div ref={loadMoreRef} className="load-more-observer-marker" style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', opacity: 0 }} />
              )}
              <div className="card-image skeleton-block" />
              <div className="card-content">
                <div className="skeleton-line title" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default RecordCardsView;
