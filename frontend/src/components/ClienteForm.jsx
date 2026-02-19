import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix icono Leaflet
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Coordenadas decimales directas: "9.362272, -83.694580" o "9.362272,-83.694580"
const COORDS_REGEX = /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/;

// Decimal con símbolo y dirección: "9,36276° N, 83,69524° O"  (coma o punto como decimal)
const DECIMAL_DIR_REGEX = /^-?\d+[,.]\d+\s*°?\s*[NSns]\s*[,;]?\s*-?\d+[,.]\d+\s*°?\s*[EWOewo]$/i;

// DMS: "9°21'44.2"N 83°41'40.5"W"
const DMS_REGEX = /^\d+[°\s]\d+['\s]\d+([,.]\d+)?["\s]*[NSns][\s,;]+\d+[°\s]\d+['\s]\d+([,.]\d+)?["\s]*[EWOewo]$/i;

// Dominios válidos de Google Maps y Apple Maps
const MAPS_REGEX = /^(https?:\/\/|maps:\/\/)(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl|maps\.apple\.com|maps\.apple)/i;

// Links cortos (no tienen coords en la URL — requieren resolver el redirect)
const SHORT_URL_REGEX = /maps\.app\.goo\.gl|goo\.gl\/maps|maps\.apple/i;

// Válido si es cualquiera de los formatos aceptados
const isValidUbicacion = (s) =>
  COORDS_REGEX.test(s) ||
  DECIMAL_DIR_REGEX.test(s) ||
  DMS_REGEX.test(s) ||
  MAPS_REGEX.test(s);

/**
 * Extrae coordenadas de cualquier formato soportado.
 * Misma lógica que el backend (ClienteService.extraerCoordenadas)
 *
 * Formatos:
 *   lat,lng                    → Decimal directo
 *   9,36276° N, 83,69524° O    → Decimal con símbolo y dirección
 *   9°21'44.2"N 83°41'40.5"W  → DMS (Grados Minutos Segundos)
 *   ?ll=  ?sll=  @  ?q=        → URLs de Google/Apple Maps
 */
function parseUbicacion(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // 1. Decimal directo: "9.362272, -83.694580"
  const direct = parseLatLng(s);
  if (direct) return direct;

  // 2. Decimal con símbolo y dirección: "9,36276° N, 83,69524° O"
  const decDir = parseDecimalDireccion(s);
  if (decDir) return decDir;

  // 3. DMS: "9°21'44.2"N 83°41'40.5"W"
  const dms = parseDMS(s);
  if (dms) return dms;

  // 4. ll= (Apple Maps — siempre numérico)
  let c = extraerParam(s, 'll=', 3);
  if (c) return c;

  // 5. sll= (Apple Maps source location)
  c = extraerParam(s, 'sll=', 4);
  if (c) return c;

  // 6. @lat,lng,zoom (Google Maps)
  const at = s.indexOf('@');
  if (at >= 0) {
    const parts = s.substring(at + 1).split(',');
    if (parts.length >= 2) {
      c = parseLatLng(parts[0] + ',' + parts[1]);
      if (c) return c;
    }
  }

  // 7. q=lat,lng (Google Maps — solo si numérico)
  c = extraerParam(s, 'q=', 2);
  if (c) return c;

  return null;
}

/**
 * Decimal con símbolo y dirección: "9,36276° N, 83,69524° O"
 * Acepta coma o punto como separador decimal. O = Oeste = West.
 */
function parseDecimalDireccion(s) {
  const regex = /(-?\d+[,.]\d+)\s*°?\s*([NSns])\s*[,;]?\s*(-?\d+[,.]\d+)\s*°?\s*([EWOewo])/i;
  const m = s.trim().match(regex);
  if (!m) return null;
  let lat = parseFloat(m[1].replace(',', '.'));
  let lng = parseFloat(m[3].replace(',', '.'));
  if (m[2].toUpperCase() === 'S') lat = -lat;
  const lngDir = m[4].toUpperCase();
  if (lngDir === 'W' || lngDir === 'O') lng = -lng;
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * DMS: "9°21'44.2"N 83°41'40.5"W"
 * Acepta coma o punto en los segundos.
 */
function parseDMS(s) {
  const regex = /(\d+)[°\s]+(\d+)[''\s]+(\d+(?:[,.]\d+)?)["\u2033\s]*([NSns])[\s,;]+(\d+)[°\s]+(\d+)[''\s]+(\d+(?:[,.]\d+)?)["\u2033\s]*([EWOewo])/i;
  const m = s.trim().match(regex);
  if (!m) return null;
  const lat = dmsADecimal(m[1], m[2], m[3], m[4]);
  const lng = dmsADecimal(m[5], m[6], m[7], m[8]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function dmsADecimal(grados, minutos, segundos, direccion) {
  const d = parseFloat(grados);
  const min = parseFloat(minutos);
  const sec = parseFloat(String(segundos).replace(',', '.'));
  let decimal = d + min / 60 + sec / 3600;
  const dir = direccion.toUpperCase();
  if (dir === 'S' || dir === 'W' || dir === 'O') decimal = -decimal;
  return decimal;
}

function extraerParam(s, param, paramLen) {
  const idx = s.toLowerCase().indexOf(param.toLowerCase());
  if (idx < 0) return null;
  let sub = s.substring(idx + paramLen);
  const end = sub.indexOf('&');
  if (end >= 0) sub = sub.substring(0, end);
  return parseLatLng(sub);
}

function parseLatLng(s) {
  if (!s) return null;
  const parts = s.trim().replace(/\s/g, '').split(',');
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default function ClienteForm({ onSubmit, initialData, isLoading = false }) {
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    telefono: initialData?.telefono || '',
    cedula: initialData?.cedula || '',
    ubicacion: initialData?.ubicacion || '',
    notas: initialData?.notas || ''
  });

  const [errors, setErrors] = useState({});

  // Estado derivado del campo ubicacion
  const ubicacionTrimmed = formData.ubicacion.trim();
  const isCoordsInput = COORDS_REGEX.test(ubicacionTrimmed);
  const isValidMapsUrl = MAPS_REGEX.test(ubicacionTrimmed);
  const isShortUrl = SHORT_URL_REGEX.test(ubicacionTrimmed);
  const isValid = isValidUbicacion(ubicacionTrimmed);
  const coords = useMemo(
    () => (isValid ? parseUbicacion(ubicacionTrimmed) : null),
    [ubicacionTrimmed, isValid]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.telefono.trim()) newErrors.telefono = 'El teléfono es obligatorio';
    if (!formData.ubicacion.trim()) {
      newErrors.ubicacion = 'La ubicación es obligatoria';
    } else if (!isValidUbicacion(formData.ubicacion.trim())) {
      newErrors.ubicacion = 'Debe ser coordenadas, DMS o link de Google Maps / Apple Maps';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className='card'>
      <div className='form-group'>
        <label className='form-label'>Nombre <span className='text-red-500'>*</span></label>
        <input type='text' name='nombre' value={formData.nombre} onChange={handleChange}
               className='form-input' placeholder='Nombre del cliente' />
        {errors.nombre && <p className='text-red-500 text-sm mt-1'>{errors.nombre}</p>}
      </div>

      <div className='form-group'>
        <label className='form-label'>Teléfono <span className='text-red-500'>*</span></label>
        <input type='tel' name='telefono' value={formData.telefono} onChange={handleChange}
               className='form-input' placeholder='+506 8888-8888' />
        {errors.telefono && <p className='text-red-500 text-sm mt-1'>{errors.telefono}</p>}
      </div>

      <div className='form-group'>
        <label className='form-label'>Cédula</label>
        <input type='text' name='cedula' value={formData.cedula} onChange={handleChange}
               className='form-input' placeholder='1-0123-0456' />
      </div>

      <div className='form-group'>
        <label className='form-label'>📍 Ubicación <span className='text-red-500'>*</span></label>
        <input
          type='text'
          name='ubicacion'
          value={formData.ubicacion}
          onChange={handleChange}
          className='form-input'
          placeholder='Link de Google/Apple Maps, coordenadas o DMS'
        />
        <p className='text-xs text-gray-500 mt-1'>
          Acepta: <strong>link de Google Maps / Apple Maps</strong>, <strong>9.3622, -83.6945</strong>,{' '}
          <strong>9,36276° N, 83,69524° O</strong> o <strong>9°21'44.2"N 83°41'40.5"W</strong>
        </p>
        {errors.ubicacion && <p className='text-red-500 text-sm mt-1'>{errors.ubicacion}</p>}

        {/* Feedback si el valor no es válido */}
        {ubicacionTrimmed && !isValid && !errors.ubicacion && (
          <p className='text-xs text-red-500 mt-1'>
            ❌ Formato no reconocido — usa coordenadas, DMS o link de Google/Apple Maps
          </p>
        )}

        {/* Mapa de previsualización */}
        {isValid && (
          <div className='mt-3'>
            {coords ? (
              <>
                <div className='map-container'>
                  <MapContainer
                    key={`${coords.lat}-${coords.lng}`}
                    center={[coords.lat, coords.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />
                    <Marker position={[coords.lat, coords.lng]} />
                  </MapContainer>
                </div>
                <p className='text-xs text-green-700 mt-1 font-medium'>
                  ✅ {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </p>
              </>
            ) : isShortUrl ? (
              <p className='text-xs text-orange-500 mt-1'>
                ⚠️ Link corto detectado — el mapa se verá en el detalle del cliente. El link es válido.
              </p>
            ) : (
              <p className='text-xs text-orange-500 mt-1'>
                ⚠️ Link válido pero sin coordenadas visibles en la URL. Se guardará correctamente.
              </p>
            )}
          </div>
        )}
      </div>

      <div className='form-group'>
        <label className='form-label'>Notas</label>
        <textarea name='notas' value={formData.notas} onChange={handleChange} rows='4'
                  className='form-textarea' placeholder='Información adicional...' />
      </div>

      <div className='flex gap-2'>
        <button type='submit' disabled={isLoading} className='btn btn-primary flex-1'>
          {isLoading ? '💾 Guardando...' : '💾 Guardar Cliente'}
        </button>
        <button type='button' onClick={() => window.history.back()} className='btn btn-secondary'>
          Cancelar
        </button>
      </div>
    </form>
  );
}
