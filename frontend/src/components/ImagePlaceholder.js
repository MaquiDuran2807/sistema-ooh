import React, { useState } from 'react';
import './ImagePlaceholder.css';

/**
 * Componente de imagen con placeholder automático
 * Muestra placeholder cuando:
 * - No hay URL válida
 * - El servidor retorna 404 o error
 */
const ImagePlaceholder = ({ 
  src, 
  alt = 'Imagen', 
  className = '', 
  style = {},
  onLoad,
  onError
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const handleImageError = (e) => {
    console.warn(`Imagen no disponible: ${src}`);
    setImageFailed(true);
    if (onError) onError(e);
  };

  const handleImageLoad = (e) => {
    setImageFailed(false);
    if (onLoad) onLoad(e);
  };

  // Placeholder SVG con estilos
  const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cdefs%3E%3Cstyle%3E.placeholder-bg { fill: %23f0f0f0; } .placeholder-text { fill: %23999; font-family: Arial, sans-serif; font-size: 24px; text-anchor: middle; dominant-baseline: middle; } .placeholder-icon { fill: %23bbb; }%3C/style%3E%3C/defs%3E%3Crect class="placeholder-bg" width="400" height="300"/%3E%3Ctext class="placeholder-text" x="200" y="130"%3ESin imagen%3C/text%3E%3Ccircle class="placeholder-icon" cx="200" cy="80" r="25"/%3E%3C/svg%3E`;

  if (!src || imageFailed) {
    return (
      <div className={`image-placeholder ${className}`} style={style}>
        <img 
          src={placeholderSvg}
          alt={alt}
          className="placeholder-img"
          style={style}
        />
        <span className="placeholder-text">📷 Sin imagen</span>
      </div>
    );
  }

  return (
    <img 
      src={src}
      alt={alt}
      className={`image-actual ${className}`}
      style={style}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  );
};

export default ImagePlaceholder;
