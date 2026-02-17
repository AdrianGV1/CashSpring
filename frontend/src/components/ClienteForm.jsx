import { useState } from 'react';
import MapPicker from './MapPicker';

export default function ClienteForm({ onSubmit, initialData = {}, isLoading = false }) {
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    telefono: initialData.telefono || '',
    cedula: initialData.cedula || '',
    latitud: initialData.latitud || null,
    longitud: initialData.longitud || null,
    direccionReferencia: initialData.direccionReferencia || '',
    notas: initialData.notas || ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleMapChange = (lat, lng) => {
    setFormData(prev => ({ ...prev, latitud: lat, longitud: lng }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.telefono.trim()) newErrors.telefono = 'El teléfono es obligatorio';
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
               className='form-input' placeholder='Nombre completo del cliente' />
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
        <label className='form-label'>📍 Ubicación en el mapa</label>
        <MapPicker latitud={formData.latitud} longitud={formData.longitud} onChange={handleMapChange} />
      </div>

      <div className='form-group'>
        <label className='form-label'>Dirección de Referencia</label>
        <input type='text' name='direccionReferencia' value={formData.direccionReferencia} 
               onChange={handleChange} className='form-input' placeholder='Ej: 200m norte del mercado' />
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
