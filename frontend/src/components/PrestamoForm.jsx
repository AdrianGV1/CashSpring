import React, { useState, useEffect, useMemo } from 'react';
import { clienteApi } from '../services/api';
import { uploadToCloudinary } from '../services/cloudinaryService';

const TIPO_ACUERDO_INFO = {
  PENALIZACION_POR_DIA: {
    label: 'QUINCENA ÚNICA',
    desc: '1 cuota a 15 dias. Total = monto + monto x interes.',
  },
  PAGO_EN_MES: {
    label: 'VARIAS QUINCENAS',
    desc: 'De 2 a 10 quincenas. Cada cuota = (principal / N) + (monto x interes). La ultima cuota absorbe el residuo del principal.',
  },
  QUINCENAS_DOBLES: {
    label: 'DOBLE',
    desc: 'Total = monto x 2. Indica el monto de cada cuota; la ultima cuota sera el residuo.',
  },
};

function calcularTotal(monto, interes, tipoAcuerdo, cantidadQuincenas) {
  if (!monto || monto <= 0) return null;
  const m = Number(monto);
  const i = Number(interes);
  if (tipoAcuerdo === 'PENALIZACION_POR_DIA') return Math.round(m + m * i);
  if (tipoAcuerdo === 'PAGO_EN_MES') {
    const n = Number(cantidadQuincenas);
    if (!n || n < 2) return null;
    return Math.round(m + m * i * n);
  }
  if (tipoAcuerdo === 'QUINCENAS_DOBLES') return m * 2;
  return null;
}

const formatMoney = (amount) =>
  new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
  }).format(amount);

// Componente reutilizable para subir una imagen
const ImageUploadField = ({ label, fotoKey, fotos, fotosPreviews, uploadingFotos, onSelect, error, required: isRequired }) => (
  <div className="form-group">
    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '0.875rem' }}>
      {label}{isRequired && <span style={{ color: '#dc2626', marginLeft: '0.2rem' }}>*</span>}
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <label style={{
        cursor: uploadingFotos[fotoKey] ? 'not-allowed' : 'pointer',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        background: uploadingFotos[fotoKey] ? '#f3f4f6' : '#ffffff',
        border: `1px solid ${fotos[fotoKey] ? '#16a34a' : error ? '#dc2626' : '#d1d5db'}`,
        borderRadius: '6px',
        color: uploadingFotos[fotoKey] ? '#9ca3af' : fotos[fotoKey] ? '#16a34a' : error ? '#dc2626' : '#374151',
        userSelect: 'none',
        transition: 'all 0.15s ease-in-out',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          disabled={uploadingFotos[fotoKey]}
          onChange={(e) => onSelect(e, fotoKey)}
        />
        {uploadingFotos[fotoKey] ? '⏳ Subiendo...' : fotos[fotoKey] ? '🔄 Cambiar foto' : '📷 Seleccionar foto'}
      </label>
      {fotosPreviews[fotoKey] && (
        <img
          src={fotosPreviews[fotoKey]}
          alt={label}
          style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />
      )}
    </div>
    {fotos[fotoKey] && !uploadingFotos[fotoKey] && (
      <small style={{ color: '#16a34a', display: 'block', marginTop: '0.25rem', fontWeight: 500 }}>✓ Imagen subida correctamente</small>
    )}
    {error && !fotos[fotoKey] && (
      <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem', fontWeight: 500 }}>{error}</small>
    )}
  </div>
);

const INITIAL_FORM = {
  clienteId: null,
  cedula: '',
  nombre: '',
  telefono: '',
  ubicacion: '',
  ubicacionExtra: '',
  ordenPatronal: '',
  notas: '',
  montoPrestado: '',
  interesBase: 0.20,
  fechaInicio: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' }),
  tipoAcuerdo: 'PENALIZACION_POR_DIA',
  cantidadQuincenas: '',
  montoCuota: '',
};

const PrestamoForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [verificandoCedula, setVerificandoCedula] = useState(false);
  
  // Nuevo estado para la selección de cliente
  const [clienteMode, setClienteMode] = useState('nuevo'); // 'nuevo' o 'existente'
  const [clientesDisponibles, setClientesDisponibles] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  // Estado para fotos (URLs de Cloudinary)
  const [fotos, setFotos] = useState({
    ordenPatronal: null,
    cedulaFrente: null,
    cedulaDetras: null,
    ubicacion: null,
    ubicacionExtra: null,
  });
  const [fotosPreviews, setFotosPreviews] = useState({
    ordenPatronal: null,
    cedulaFrente: null,
    cedulaDetras: null,
    ubicacion: null,
    ubicacionExtra: null,
  });
  const [uploadingFotos, setUploadingFotos] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...INITIAL_FORM,
        ...initialData,
        interesBase: initialData.interesBase ?? 0.20,
        fechaInicio: initialData.fechaInicio || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' }),
        cantidadQuincenas: initialData.cantidadQuincenas ?? '',
        montoCuota: initialData.montoCuota ?? '',
      });
    }
  }, [initialData]);

  // Cargar clientes disponibles cuando se selecciona "existente"
  useEffect(() => {
    if (clienteMode === 'existente') {
      setCargandoClientes(true);
      clienteApi.getDisponibles()
        .then(clientes => {
          setClientesDisponibles(clientes || []);
        })
        .catch(error => {
          console.error('Error cargando clientes disponibles:', error);
          setClientesDisponibles([]);
        })
        .finally(() => setCargandoClientes(false));
    }
  }, [clienteMode]);

  const handleClienteModeChange = (mode) => {
    setClienteMode(mode);
    // Limpiar datos del cliente al cambiar modo
    setFormData({
      ...formData,
      clienteId: null,
      cedula: '',
      nombre: '',
      telefono: '',
      ubicacion: '',
      ubicacionExtra: '',
      ordenPatronal: '',
      notas: '',
    });
    setFotosPreviews({ ordenPatronal: null, cedulaFrente: null, cedulaDetras: null, ubicacion: null, ubicacionExtra: null });
    setErrors({});
  };

  const handleClienteExistenteSelect = (e) => {
    const clienteId = e.target.value;
    if (!clienteId) {
      setFormData({
        ...formData,
        clienteId: null,
        cedula: '',
        nombre: '',
        telefono: '',
        ubicacion: '',
        ubicacionExtra: '',
        notas: '',
      });
      return;
    }

    const cliente = clientesDisponibles.find(c => c.id === Number(clienteId));
    if (cliente) {
      setFormData({
        ...formData,
        clienteId: cliente.id,
        cedula: cliente.cedula || '',
        nombre: cliente.nombre || '',
        telefono: cliente.telefono || '',
        ubicacion: cliente.ubicacion || '',
        ubicacionExtra: cliente.ubicacionExtra || '',
        notas: cliente.notas || '',
      });
    }
  };

  const handleCedulaBlur = async () => {
    if (clienteMode === 'existente') return; // No validar si es cliente existente
    
    const cedula = formData.cedula.trim();
    if (!cedula) return;
    setVerificandoCedula(true);
    try {
      const response = await clienteApi.getAll();
      const clientes = response || [];
      const existe = clientes.some(
        (c) => c.cedula && c.cedula.toLowerCase() === cedula.toLowerCase()
      );
      if (existe) {
        setErrors((prev) => ({ ...prev, cedula: 'Ya existe un cliente registrado con esta cedula.' }));
      }
    } catch (e) {
      console.error('Error al verificar cedula:', e);
    } finally {
      setVerificandoCedula(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cedula') {
      const filtered = value.replace(/\D/g, '').slice(0, 9);
      setFormData((prev) => ({ ...prev, [name]: filtered }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
      return;
    }
    if (name === 'telefono') {
      const filtered = value.replace(/\D/g, '').slice(0, 8);
      setFormData((prev) => ({ ...prev, [name]: filtered }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleImageSelect = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    // Preview inmediato
    const previewUrl = URL.createObjectURL(file);
    setFotosPreviews((prev) => ({ ...prev, [key]: previewUrl }));
    // Subir a Cloudinary
    setUploadingFotos((prev) => ({ ...prev, [key]: true }));
    try {
      const url = await uploadToCloudinary(file);
      setFotos((prev) => ({ ...prev, [key]: url }));
      // Limpiar error de esa foto al subir exitosamente
      const errorKey = 'foto' + key.charAt(0).toUpperCase() + key.slice(1);
      setErrors((prev) => ({ ...prev, [errorKey]: null }));
    } catch (err) {
      console.error('Error al subir foto:', err);
      alert('Error al subir la imagen. Intenta de nuevo.');
      setFotosPreviews((prev) => ({ ...prev, [key]: null }));
    } finally {
      setUploadingFotos((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleInteres = (delta) => {
    setFormData((prev) => {
      const current = Number(prev.interesBase);
      const next = Math.round((current + delta) * 100) / 100;
      if (next < 0.15 || next > 0.25) return prev;
      return { ...prev, interesBase: next };
    });
  };

  const totalAPagar = useMemo(
    () => calcularTotal(formData.montoPrestado, formData.interesBase, formData.tipoAcuerdo, formData.cantidadQuincenas),
    [formData.montoPrestado, formData.interesBase, formData.tipoAcuerdo, formData.cantidadQuincenas]
  );

  const validar = () => {
    const e = {};
    
    // Validar campos del cliente solo si es modo "nuevo"
    if (clienteMode === 'nuevo') {
      if (!formData.cedula.trim()) e.cedula = 'La cedula es obligatoria.';
      else if (formData.cedula.trim().length !== 9) e.cedula = 'La cédula debe tener exactamente 9 dígitos.';
      if (!formData.nombre.trim()) e.nombre = 'El nombre completo es obligatorio.';
      if (!formData.telefono.trim()) e.telefono = 'El telefono es obligatorio.';
      else if (formData.telefono.trim().length !== 8) e.telefono = 'El teléfono debe tener exactamente 8 dígitos.';
      if (!formData.ubicacion.trim()) e.ubicacion = 'La ubicacion es obligatoria.';
      if (!formData.ubicacionExtra.trim()) e.ubicacionExtra = 'La ubicación de trabajo es obligatoria.';
      // Fotos obligatorias
      if (!fotos.ordenPatronal) e.fotoOrdenPatronal = 'La foto de la orden patronal es obligatoria.';
      if (!fotos.cedulaFrente) e.fotoCedulaFrente = 'La foto del frente de la cédula es obligatoria.';
      if (!fotos.cedulaDetras) e.fotoCedulaDetras = 'La foto del detrás de la cédula es obligatoria.';
      if (!fotos.ubicacion) e.fotoUbicacion = 'La foto de la ubicación de la casa es obligatoria.';
      if (!fotos.ubicacionExtra) e.fotoUbicacionExtra = 'La foto de la ubicación de trabajo es obligatoria.';
    } else if (clienteMode === 'existente') {
      // Validar que se haya seleccionado un cliente
      if (!formData.clienteId) e.clienteId = 'Debe seleccionar un cliente.';
    }
    
    if (!formData.montoPrestado || Number(formData.montoPrestado) <= 0)
      e.montoPrestado = 'El monto prestado es obligatorio y debe ser mayor a 0.';
    if (!formData.fechaInicio) e.fechaInicio = 'La fecha de inicio es obligatoria.';
    if (formData.tipoAcuerdo === 'PAGO_EN_MES') {
      const n = Number(formData.cantidadQuincenas);
      if (!formData.cantidadQuincenas || n < 2 || n > 10)
        e.cantidadQuincenas = 'La cantidad de quincenas debe ser entre 2 y 10.';
    }
    if (formData.tipoAcuerdo === 'QUINCENAS_DOBLES') {
      const mc = Number(formData.montoCuota);
      if (!formData.montoCuota || mc <= 0)
        e.montoCuota = 'El monto por cuota es obligatorio y debe ser mayor a 0.';
      else if (totalAPagar && mc >= totalAPagar)
        e.montoCuota = 'El monto de la cuota debe ser menor al total a pagar.';
    }
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validar();
    // Preservar error de cédula duplicada seteado desde el blur
    if (errors.cedula) errs.cedula = errors.cedula;
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const dataToSend = {
      montoPrestado: Number(formData.montoPrestado),
      interesBase: formData.interesBase,
      fechaInicio: formData.fechaInicio,
      tipoAcuerdo: formData.tipoAcuerdo,
    };

    // Si es cliente existente, solo enviar el clienteId
    if (clienteMode === 'existente' && formData.clienteId) {
      dataToSend.clienteId = formData.clienteId;
    } else {
      // Si es cliente nuevo, enviar todos los datos del cliente
      dataToSend.cedula = formData.cedula.trim();
      dataToSend.nombre = formData.nombre.trim();
      dataToSend.telefono = formData.telefono.trim();
      dataToSend.ubicacion = formData.ubicacion.trim();
      dataToSend.ubicacionExtra = formData.ubicacionExtra.trim();
      dataToSend.notas = formData.notas.trim() || null;
      // Fotos
      dataToSend.ordenPatronal = formData.ordenPatronal?.trim() || null;
      dataToSend.fotoOrdenPatronal = fotos.ordenPatronal || null;
      dataToSend.fotoCedulaFrente = fotos.cedulaFrente || null;
      dataToSend.fotoCedulaDetras = fotos.cedulaDetras || null;
      dataToSend.fotoUbicacion = fotos.ubicacion || null;
      dataToSend.fotoUbicacionExtra = fotos.ubicacionExtra || null;
    }

    if (formData.tipoAcuerdo === 'PAGO_EN_MES') {
      dataToSend.cantidadQuincenas = Number(formData.cantidadQuincenas);
    } else if (formData.tipoAcuerdo === 'QUINCENAS_DOBLES') {
      dataToSend.montoPorQuincena = Number(formData.montoCuota);
    }

    onSubmit(dataToSend);
  };

  const inputStyle = (campo) =>
    errors[campo] ? { borderColor: '#dc3545', width: '100%', boxSizing: 'border-box' } : {};

  return (
    <form onSubmit={handleSubmit} className="form-container">

      {/* SECCION: DATOS DEL CLIENTE */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 1.5rem 0', 
          color: '#374151', 
          fontSize: '1.125rem', 
          fontWeight: 600,
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.75rem'
        }}>
          Datos del Cliente
        </h3>

        {/* Selector de Modo de Cliente */}
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          background: '#f9fafb', 
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: 500, 
            color: '#374151',
            fontSize: '0.875rem'
          }}>
            Tipo de Cliente
          </label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              background: clienteMode === 'nuevo' ? '#3b82f6' : '#ffffff',
              color: clienteMode === 'nuevo' ? '#ffffff' : '#6b7280',
              borderRadius: '6px',
              fontWeight: 500,
              border: '1px solid #d1d5db',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="radio"
                name="clienteMode"
                value="nuevo"
                checked={clienteMode === 'nuevo'}
                onChange={() => handleClienteModeChange('nuevo')}
                style={{ display: 'none' }}
              />
              Nuevo Cliente
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              background: clienteMode === 'existente' ? '#3b82f6' : '#ffffff',
              color: clienteMode === 'existente' ? '#ffffff' : '#6b7280',
              borderRadius: '6px',
              fontWeight: 500,
              border: '1px solid #d1d5db',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="radio"
                name="clienteMode"
                value="existente"
                checked={clienteMode === 'existente'}
                onChange={() => handleClienteModeChange('existente')}
                style={{ display: 'none' }}
              />
              Cliente Existente
            </label>
          </div>
        </div>

        {/* Selector de Cliente Existente */}
        {clienteMode === 'existente' && (
          <div className="form-group">
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.875rem'
            }}>
              Seleccionar Cliente *
            </label>
            {cargandoClientes ? (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: '0.875rem',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                Cargando clientes disponibles...
              </div>
            ) : clientesDisponibles.length === 0 ? (
              <div style={{ 
                padding: '1rem', 
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                color: '#92400e',
                fontSize: '0.875rem'
              }}>
                No hay clientes disponibles sin préstamos activos.
              </div>
            ) : (
              <>
                <select
                  value={formData.clienteId || ''}
                  onChange={handleClienteExistenteSelect}
                  style={{
                    ...inputStyle('clienteId'),
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151'
                  }}
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clientesDisponibles.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} - {cliente.cedula}
                    </option>
                  ))}
                </select>
                {errors.clienteId && (
                  <small style={{ color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                    {errors.clienteId}
                  </small>
                )}
              </>
            )}
          </div>
        )}

        {/* Formulario para Nuevo Cliente */}
        {clienteMode === 'nuevo' && (
          <>

            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>Cédula *</label>
              <input
                type="text"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                onBlur={handleCedulaBlur}
                placeholder="123456789"
                maxLength={9}
                inputMode="numeric"
                style={{
                  ...inputStyle('cedula'),
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: `1px solid ${errors.cedula ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.15s ease-in-out'
                }}
                disabled={!!initialData}
              />
              {errors.cedula && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.cedula}</small>}
              {verificandoCedula && <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>Verificando cédula...</small>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Juan Pérez Solano"
                  style={{
                    ...inputStyle('nombre'),
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: `1px solid ${errors.nombre ? '#dc2626' : '#d1d5db'}`,
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.15s ease-in-out'
                  }}
                />
                {errors.nombre && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.nombre}</small>}
              </div>

              <div className="form-group">
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>Teléfono *</label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="88889999"
                  maxLength={8}
                  inputMode="numeric"
                  style={{
                    ...inputStyle('telefono'),
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: `1px solid ${errors.telefono ? '#dc2626' : '#d1d5db'}`,
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.15s ease-in-out'
                  }}
                />
                {errors.telefono && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.telefono}</small>}
              </div>
            </div>

            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>Ubicación Casa *</label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Coordenadas o dirección"
                style={{
                  ...inputStyle('ubicacion'),
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: `1px solid ${errors.ubicacion ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.15s ease-in-out'
                }}
              />
              {errors.ubicacion && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.ubicacion}</small>}
              <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                Puedes pegar coordenadas de Google Maps o una dirección descriptiva.
              </small>
            </div>

            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>Ubicación Trabajo *</label>
              <input
                type="text"
                name="ubicacionExtra"
                value={formData.ubicacionExtra}
                onChange={handleChange}
                placeholder="Coordenadas o dirección"
                style={{
                  ...inputStyle('ubicacionExtra'),
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: `1px solid ${errors.ubicacionExtra ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.15s ease-in-out'
                }}
              />
              {errors.ubicacionExtra && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.ubicacionExtra}</small>}
              <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                Puedes pegar coordenadas de Google Maps o una dirección descriptiva.
              </small>
            </div>

            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>Notas</label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                rows="3"
                placeholder="Observaciones adicionales..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease-in-out'
                }}
              />
            </div>
          </>
        )}

        {/* Mostrar datos del cliente seleccionado (solo lectura) */}
        {clienteMode === 'existente' && formData.clienteId && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: '#f0f9ff', 
            borderRadius: '6px',
            border: '1px solid #0ea5e9'
          }}>
            <h4 style={{ 
              margin: '0 0 0.75rem 0', 
              color: '#0c4a6e', 
              fontSize: '0.875rem',
              fontWeight: 600
            }}>
              Cliente Seleccionado
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '0.75rem', 
              fontSize: '0.875rem'
            }}>
              <div><strong>Nombre:</strong> {formData.nombre}</div>
              <div><strong>Cédula:</strong> {formData.cedula}</div>
              <div><strong>Teléfono:</strong> {formData.telefono}</div>
              <div><strong>Ubicación Casa:</strong> {formData.ubicacion}</div>
              {formData.ubicacionExtra && (
                <div><strong>Ubicación Trabajo:</strong> {formData.ubicacionExtra}</div>
              )}
              {formData.notas && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Notas:</strong> {formData.notas}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECCION: DOCUMENTOS (solo cliente nuevo) */}
      {clienteMode === 'nuevo' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            color: '#374151',
            fontSize: '1.125rem',
            fontWeight: 600,
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '0.75rem'
          }}>
            Documentos y Fotos
          </h3>

          {/* Orden Patronal */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>📋 Orden Patronal</h4>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '0.875rem' }}>Nombre / Número de Orden Patronal</label>
              <input
                type="text"
                name="ordenPatronal"
                value={formData.ordenPatronal || ''}
                onChange={handleChange}
                placeholder="Ej: Empresa XYZ S.A. / OP-12345"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', transition: 'border-color 0.15s ease-in-out' }}
              />
            </div>
            <ImageUploadField
              label="Foto de la Orden Patronal"
              fotoKey="ordenPatronal"
              fotos={fotos}
              fotosPreviews={fotosPreviews}
              uploadingFotos={uploadingFotos}
              onSelect={handleImageSelect}
              error={errors.fotoOrdenPatronal}
              required
            />
          </div>

          {/* Cédula */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>🪪 Cédula de Identidad</h4>
            <div className="form-row">
              <ImageUploadField
                label="Cédula — Frente"
                fotoKey="cedulaFrente"
                fotos={fotos}
                fotosPreviews={fotosPreviews}
                uploadingFotos={uploadingFotos}
                onSelect={handleImageSelect}
                error={errors.fotoCedulaFrente}
                required
              />
              <ImageUploadField
                label="Cédula — Detrás"
                fotoKey="cedulaDetras"
                fotos={fotos}
                fotosPreviews={fotosPreviews}
                uploadingFotos={uploadingFotos}
                onSelect={handleImageSelect}
                error={errors.fotoCedulaDetras}
                required
              />
            </div>
          </div>

          {/* Fotos de ubicaciones */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>📍 Fotos de Ubicaciones</h4>
            <div className="form-row">
              <ImageUploadField
                label="Foto Ubicación Casa"
                fotoKey="ubicacion"
                fotos={fotos}
                fotosPreviews={fotosPreviews}
                uploadingFotos={uploadingFotos}
                onSelect={handleImageSelect}
                error={errors.fotoUbicacion}
                required
              />
              <ImageUploadField
                label="Foto Ubicación Trabajo"
                fotoKey="ubicacionExtra"
                fotos={fotos}
                fotosPreviews={fotosPreviews}
                uploadingFotos={uploadingFotos}
                onSelect={handleImageSelect}
                error={errors.fotoUbicacionExtra}
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* SECCION: DATOS DEL PRESTAMO */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 1.5rem 0', 
          color: '#374151', 
          fontSize: '1.125rem', 
          fontWeight: 600,
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.75rem'
        }}>
          Datos del Préstamo
        </h3>

        <div className="form-row">
          <div className="form-group">
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.875rem'
            }}>Monto Prestado (CRC) *</label>
            <input
              type="number"
              name="montoPrestado"
              value={formData.montoPrestado}
              onChange={handleChange}
              min="1"
              placeholder="Ej: 100000"
              style={{
                ...inputStyle('montoPrestado'),
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                border: `1px solid ${errors.montoPrestado ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.15s ease-in-out'
              }}
            />
            {errors.montoPrestado && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.montoPrestado}</small>}
          </div>

          <div className="form-group">
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.875rem'
            }}>Interes Base *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleInteres(-0.05)}
                disabled={Number(formData.interesBase) <= 0.15}
                style={{
                  padding: '0.5rem',
                  fontSize: '1rem',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: Number(formData.interesBase) <= 0.15 ? 'not-allowed' : 'pointer',
                  color: Number(formData.interesBase) <= 0.15 ? '#9ca3af' : '#374151'
                }}
              >
                -
              </button>
              <span style={{ fontWeight: 600, fontSize: '1.125rem', minWidth: '3rem', textAlign: 'center' }}>
                {(Number(formData.interesBase) * 100).toFixed(0)}%
              </span>
              <button
                type="button"
                onClick={() => handleInteres(0.05)}
                disabled={Number(formData.interesBase) >= 0.25}
                style={{
                  padding: '0.5rem',
                  fontSize: '1rem',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: Number(formData.interesBase) >= 0.25 ? 'not-allowed' : 'pointer',
                  color: Number(formData.interesBase) >= 0.25 ? '#9ca3af' : '#374151'
                }}
              >
                +
              </button>
            </div>
            <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>Mínimo 15% - Máximo 25% - pasos de 5%</small>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.875rem'
            }}>Fecha Inicio *</label>
            <input
              type="date"
              name="fechaInicio"
              value={formData.fechaInicio}
              onChange={handleChange}
              style={{
                ...inputStyle('fechaInicio'),
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                border: `1px solid ${errors.fechaInicio ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.15s ease-in-out'
              }}
            />
            {errors.fechaInicio && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.fechaInicio}</small>}
          </div>

          <div className="form-group">
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              color: '#374151',
              fontSize: '0.875rem'
            }}>Tipo de Acuerdo *</label>
            <select
              name="tipoAcuerdo"
              value={formData.tipoAcuerdo}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.15s ease-in-out'
              }}
            >
              {Object.entries(TIPO_ACUERDO_INFO).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {formData.tipoAcuerdo && (
              <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                {TIPO_ACUERDO_INFO[formData.tipoAcuerdo]?.desc}
              </small>
            )}
          </div>
        </div>

        {formData.tipoAcuerdo === 'PAGO_EN_MES' && (
          <div style={{ 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '6px', 
            padding: '1rem', 
            marginBottom: '1rem' 
          }}>
            <h4 style={{ 
              margin: '0 0 1rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151'
            }}>Configuración de Quincenas *</h4>
            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>Cantidad de quincenas * (2-10)</label>
              <input
                type="number"
                name="cantidadQuincenas"
                value={formData.cantidadQuincenas}
                onChange={handleChange}
                min="2"
                max="10"
                placeholder="Ej: 4"
                style={{
                  ...inputStyle('cantidadQuincenas'),
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: `1px solid ${errors.cantidadQuincenas ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.15s ease-in-out'
                }}
              />
              {errors.cantidadQuincenas && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.cantidadQuincenas}</small>}
              <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                Cada cuota = principal por quincena + {(Number(formData.interesBase) * 100).toFixed(0)}% del monto prestado. La última absorbe el residuo.
              </small>
            </div>
          </div>
        )}

        {formData.tipoAcuerdo === 'QUINCENAS_DOBLES' && (
          <div style={{ 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '6px', 
            padding: '1rem', 
            marginBottom: '1rem' 
          }}>
            <h4 style={{ 
              margin: '0 0 1rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151'
            }}>Configuración de Cuotas *</h4>
            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>Monto por cuota (CRC) *</label>
              <input
                type="number"
                name="montoCuota"
                value={formData.montoCuota}
                onChange={handleChange}
                min="1"
                placeholder="Ej: 3000"
                style={{
                  ...inputStyle('montoCuota'),
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: `1px solid ${errors.montoCuota ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  transition: 'border-color 0.15s ease-in-out'
                }}
              />
              {errors.montoCuota && <small style={{ color: '#dc2626', display: 'block', marginTop: '0.25rem' }}>{errors.montoCuota}</small>}
              <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>La última cuota será el residuo.</small>
            </div>
          </div>
        )}

        <div style={{
          background: '#f0f9ff', 
          border: '1px solid #0ea5e9', 
          borderRadius: '6px',
          padding: '1rem',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#0c4a6e', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Monto a pagar</div>
            <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>
              {formData.tipoAcuerdo === 'PAGO_EN_MES'
                ? `Monto + interes x ${formData.cantidadQuincenas || 'N'} quincenas`
                : formData.tipoAcuerdo === 'QUINCENAS_DOBLES'
                ? 'Total = monto x 2'
                : 'Monto + interes'}
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0c4a6e' }}>
            {totalAPagar != null && formData.montoPrestado ? formatMoney(totalAPagar) : '--'}
          </div>
        </div>
      </div>

      <div className="form-actions" style={{
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button 
          type="button" 
          onClick={onCancel} 
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151',
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#f9fafb';
            e.target.style.borderColor = '#9ca3af';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#ffffff';
            e.target.style.borderColor = '#d1d5db';
          }}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#ffffff',
            background: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease-in-out'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#2563eb';
            e.target.style.borderColor = '#2563eb';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#3b82f6';
            e.target.style.borderColor = '#3b82f6';
          }}
        >
          {initialData ? 'Actualizar' : 'Crear'} Préstamo
        </button>
      </div>
    </form>
  );
};

export default PrestamoForm;
