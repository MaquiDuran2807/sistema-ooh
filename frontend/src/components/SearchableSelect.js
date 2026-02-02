import React, { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';

/**
 * Componente SearchableSelect - Select con buscador
 * 
 * Props:
 * - options: Array de opciones [{ id, nombre }, ...]
 * - value: Valor seleccionado
 * - onChange: Callback (value) => {}
 * - placeholder: Texto placeholder
 * - label: Etiqueta del campo
 * - required: Si es requerido
 * - displayField: Campo a mostrar (default 'nombre')
 * - valueField: Campo de valor (default 'id')
 * - onSelect: Callback (option) => {} - retorna el objeto completo
 */
const SearchableSelect = ({
  options = [],
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar...',
  label,
  required = false,
  displayField = 'nombre',
  valueField = 'id'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Actualizar opciones filtradas cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = options.filter(option =>
      String(option[displayField]).toLowerCase().includes(term) ||
      String(option[valueField]).toLowerCase().includes(term)
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options, displayField, valueField]);

  // Cerrar cuando hace click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelectOption = (option) => {
    onChange(option[valueField]);
    if (onSelect) {
      onSelect(option);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  // Encontrar la opción seleccionada para mostrar
  const selectedOption = options.find(opt => opt[valueField] === value);
  const displayValue = selectedOption ? selectedOption[displayField] : '';

  return (
    <div className="searchable-select-container" ref={containerRef}>
      {label && <label>{label} {required && '*'}</label>}
      
      <div className="searchable-select-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="searchable-select-input"
          placeholder={placeholder}
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          required={required}
        />
        <span className={`searchable-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <ul className="searchable-select-list">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option[valueField]}
                className={`searchable-select-item ${
                  option[valueField] === value ? 'selected' : ''
                }`}
                onClick={() => handleSelectOption(option)}
              >
                {option[displayField]}
              </li>
            ))
          ) : (
            <li className="searchable-select-no-results">
              No hay resultados para "{searchTerm}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
