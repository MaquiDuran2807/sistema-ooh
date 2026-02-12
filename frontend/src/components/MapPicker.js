import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';

// Fix Leaflet default icon issue with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon (optional)
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
function LocationMarker({ position, onLocationChange, editable }) {
  const markerRef = useRef(null);
  
  const map = useMapEvents({
    click(e) {
      if (editable && onLocationChange) {
        onLocationChange(e.latlng);
      }
    },
  });

  useEffect(() => {
    if (position && map) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  // Event handlers para el drag del marcador
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null && editable && onLocationChange) {
        const newPos = marker.getLatLng();
        onLocationChange(newPos);
      }
    },
  };

  return position ? (
    <Marker 
      position={position} 
      icon={customIcon}
      draggable={editable}
      eventHandlers={eventHandlers}
      ref={markerRef}
    />
  ) : null;
}

const MapPicker = ({ 
  latitude, 
  longitude, 
  onLocationChange, 
  editable = true,
  height = '300px',
  zoom = 13,
  showCoordinates = true,
  cityCenter = null,  // { lat, lng, radius } para mostrar círculo
  showRadius = true
}) => {
  const [position, setPosition] = useState(null);
  const [isInBounds, setIsInBounds] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);
        checkBounds(lat, lng);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, cityCenter]);

  const checkBounds = (lat, lng) => {
    if (!cityCenter || !cityCenter.radius) {
      setIsInBounds(true);
      return;
    }

    const distance = calculateDistance(
      cityCenter.lat,
      cityCenter.lng,
      lat,
      lng
    );

    setIsInBounds(distance <= cityCenter.radius);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleLocationChange = (latlng) => {
    setPosition([latlng.lat, latlng.lng]);
    checkBounds(latlng.lat, latlng.lng);
    if (onLocationChange) {
      onLocationChange(latlng.lat, latlng.lng);
    }
  };

  const defaultCenter = position || (cityCenter ? [cityCenter.lat, cityCenter.lng] : [4.7110, -74.0721]);

  return (
    <div className="map-picker-container">
      {showCoordinates && position && (
        <div className={`map-coordinates-display ${!isInBounds ? 'out-of-bounds' : ''}`}>
          📍 Lat: {position[0].toFixed(4)}, Lng: {position[1].toFixed(4)}
          {cityCenter && cityCenter.radius && (
            <span className="distance-info">
              {isInBounds ? ' ✅ Dentro del radio' : ' ⚠️ Fuera del radio'}
            </span>
          )}
        </div>
      )}
      
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height, width: '100%', borderRadius: '8px' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Círculo del radio de la ciudad */}
        {cityCenter && cityCenter.radius && showRadius && (
          <Circle
            center={[cityCenter.lat, cityCenter.lng]}
            radius={cityCenter.radius * 1000} // Convertir km a metros
            pathOptions={{
              color: isInBounds ? '#4CAF50' : '#FF9800',
              fillColor: isInBounds ? '#4CAF50' : '#FF9800',
              fillOpacity: 0.1,
              weight: 2
            }}
          />
        )}
        
        <LocationMarker 
          position={position} 
          onLocationChange={handleLocationChange}
          editable={editable}
        />
      </MapContainer>
      
      {editable && (
        <div className="map-help-text">
          💡 {position ? '🖱️ Arrastra el marcador o haz clic en el mapa para cambiar ubicación' : 'Haz clic en el mapa para seleccionar ubicación'}
        </div>
      )}
    </div>
  );
};

export default MapPicker;
