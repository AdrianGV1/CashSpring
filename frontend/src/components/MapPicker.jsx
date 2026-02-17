import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Convierte coordenadas DMS a decimal
 * Ejemplo: "9°19'23.5\"N" -> 9.323194
 */
function dmsToDecimal(dmsString) {
  if (!dmsString || typeof dmsString !== 'string') return null;
  
  // Regex para formato: 9°19'23.5"N o 9 19 23.5 N
  const regex = /(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*([NSEW])/i;
  const match = dmsString.trim().match(regex);
  
  if (!match) return null;
  
  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4].toUpperCase();
  
  let decimal = degrees + minutes / 60 + seconds / 3600;
  
  // Si es Sur u Oeste, el valor es negativo
  if (direction === 'S' || direction === 'W' || direction === 'O') {
    decimal = -decimal;
  }
  
  return decimal;
}

/**
 * Convierte decimal a DMS format
 */
function decimalToDMS(decimal, isLatitude) {
  if (decimal === null || decimal === undefined) return '';
  
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(1);
  
  let direction;
  if (isLatitude) {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }
  
  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

export default function MapPicker({ latitud, longitud, onChange }) {
  const [position, setPosition] = useState(
    latitud && longitud ? { lat: latitud, lng: longitud } : null
  );
  
  // Estados para entrada DMS
  const [latDMS, setLatDMS] = useState('');
  const [lngDMS, setLngDMS] = useState('');
  const [error, setError] = useState('');

  const defaultCenter = { lat: 9.9281, lng: -84.0907 };

  useEffect(() => {
    if (latitud && longitud) {
      setLatDMS(decimalToDMS(latitud, true));
      setLngDMS(decimalToDMS(longitud, false));
    }
  }, [latitud, longitud]);

  useEffect(() => {
    if (position) {
      onChange(position.lat, position.lng);
    }
  }, [position]);

  const handleConvertDMS = () => {
    setError('');
    
    const lat = dmsToDecimal(latDMS);
    const lng = dmsToDecimal(lngDMS);
    
    if (lat === null || lng === null) {
      setError(`Formato inválido. Usa: 9°19'23.5"N 83°35'55.1"W`);
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setError('Latitud debe estar entre -90 y 90');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      setError('Longitud debe estar entre -180 y 180');
      return;
    }
    
    setPosition({ lat, lng });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setPosition(newPos);
          setLatDMS(decimalToDMS(newPos.lat, true));
          setLngDMS(decimalToDMS(newPos.lng, false));
        },
        (error) => {
          console.error('Error:', error);
          alert('No se pudo obtener tu ubicación');
        }
      );
    }
  };

  return (
    <div>
      {/* Entrada de coordenadas DMS */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          📍 Ingresar Coordenadas (Formato DMS)
        </p>
        <p className="text-xs text-gray-600 mb-3">
          Ejemplo: 9°19'23.5"N - 83°35'55.1"W
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Latitud</label>
            <input
              type="text"
              value={latDMS}
              onChange={(e) => setLatDMS(e.target.value)}
              placeholder="9°19'23.5&quot;N"
              className="form-input mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Longitud</label>
            <input
              type="text"
              value={lngDMS}
              onChange={(e) => setLngDMS(e.target.value)}
              placeholder="83°35'55.1&quot;W"
              className="form-input mt-1"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConvertDMS}
            className="btn btn-primary text-sm"
          >
            🗺️ Mostrar en Mapa
          </button>
          
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="btn btn-secondary text-sm"
          >
            📍 Mi Ubicación
          </button>
        </div>
        
        {error && (
          <p className="text-red-600 text-sm mt-2">⚠️ {error}</p>
        )}
      </div>
      
      {/* Mapa */}
      <div className="map-container mb-2">
        <MapContainer
          center={position || defaultCenter}
          zoom={position ? 15 : 13}
          style={{ height: '100%', width: '100%' }}
          key={position ? `${position.lat}-${position.lng}` : 'default'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && <Marker position={[position.lat, position.lng]} />}
        </MapContainer>
      </div>
      
      {position && (
        <div className="bg-gray-50 p-3 rounded text-sm">
          <p className="font-semibold text-gray-700 mb-1">Coordenadas:</p>
          <p className="text-gray-600">
            <strong>DMS:</strong> {latDMS}, {lngDMS}
          </p>
          <p className="text-gray-600">
            <strong>Decimal:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
