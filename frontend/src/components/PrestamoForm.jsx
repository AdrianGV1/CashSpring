import React, { useState, useEffect, useMemo } from 'react';
import { clienteApi } from '../services/api';

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

const INITIAL_FORM = {
  clienteId: null,
  cedula: '',
  nombre: '',
  telefono: '',
  ubicacion: '',
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
      notas: '',
    });
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
      dataToSend.notas = formData.notas.trim() || null;
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
        background: '#f0f7ff',
        border: '1px solid #b8d4f5',
        borderRadius: '10px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1565c0', fontSize: '1rem', fontWeight: 700 }}>
          Datos del Cliente
        </h3>

        {/* Selector de Modo de Cliente */}
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '0.75rem', 
          background: '#fff', 
          borderRadius: '8px',
          border: '2px solid #e3f2fd'
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#1976d2',
            fontSize: '0.9rem'
          }}>
            Tipo de Cliente
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              background: clienteMode === 'nuevo' ? '#1976d2' : '#f5f5f5',
              color: clienteMode === 'nuevo' ? '#fff' : '#555',
              borderRadius: '6px',
              fontWeight: clienteMode === 'nuevo' ? 600 : 400,
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                name="clienteMode"
                value="nuevo"
                checked={clienteMode === 'nuevo'}
                onChange={() => handleClienteModeChange('nuevo')}
                style={{ marginRight: '0.5rem' }}
              />
              Nuevo Cliente
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              background: clienteMode === 'existente' ? '#1976d2' : '#f5f5f5',
              color: clienteMode === 'existente' ? '#fff' : '#555',
              borderRadius: '6px',
              fontWeight: clienteMode === 'existente' ? 600 : 400,
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                name="clienteMode"
                value="existente"
                checked={clienteMode === 'existente'}
                onChange={() => handleClienteModeChange('existente')}
                style={{ marginRight: '0.5rem' }}
              />
              Cliente Existente
            </label>
          </div>
        </div>

        {/* Selector de Cliente Existente */}
        {clienteMode === 'existente' && (
          <div className="form-group">
            <label>Seleccionar Cliente *</label>
            {cargandoClientes ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                Cargando clientes disponibles...
              </div>
            ) : clientesDisponibles.length === 0 ? (
              <div style={{ 
                padding: '1rem', 
                background: '#fff3cd', 
                border: '1px solid #ffc107',
                borderRadius: '6px',
                color: '#856404'
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
                    padding: '0.5rem',
                    fontSize: '1rem',
                    borderRadius: '6px',
                    border: '1px solid #ced4da'
                  }}
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clientesDisponibles.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} - {cliente.cedula}
                    </option>
                  ))}
                </select>
                {errors.clienteId && <small style={{ color: '#dc3545' }}>{errors.clienteId}</small>}
              </>
            )}
          </div>
        )}

        {/* Formulario para Nuevo Cliente */}
        {clienteMode === 'nuevo' && (
          <>
            <div className="form-group">
              <label>Cedula *</label>
              <input
                type="text"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                onBlur={handleCedulaBlur}
                placeholder="Ej: 123456789"
                maxLength={9}
                inputMode="numeric"
                style={inputStyle('cedula')}
                disabled={!!initialData}
              />
              {errors.cedula && <small style={{ color: '#dc3545' }}>{errors.cedula}</small>}
              {verificandoCedula && <small style={{ color: '#6c757d' }}>Verificando cedula...</small>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Juan Perez Solano"
                  style={inputStyle('nombre')}
                />
                {errors.nombre && <small style={{ color: '#dc3545' }}>{errors.nombre}</small>}
              </div>

              <div className="form-group">
                <label>Telefono *</label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Ej: 88889999"
                  maxLength={8}
                  inputMode="numeric"
                  style={inputStyle('telefono')}
                />
                {errors.telefono && <small style={{ color: '#dc3545' }}>{errors.telefono}</small>}
              </div>
            </div>

            <div className="form-group">
              <label>Ubicacion *</label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Coordenadas o direccion"
                style={inputStyle('ubicacion')}
              />
              {errors.ubicacion && <small style={{ color: '#dc3545' }}>{errors.ubicacion}</small>}
              <small style={{ color: '#6c757d' }}>
                Puedes pegar coordenadas de Google Maps o una direccion descriptiva.
              </small>
            </div>

            <div className="form-group">
              <label>Notas</label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                rows="3"
                placeholder="Observaciones adicionales..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </>
        )}

        {/* Mostrar datos del cliente seleccionado (solo lectura) */}
        {clienteMode === 'existente' && formData.clienteId && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: '#e8f5e9', 
            borderRadius: '8px',
            border: '1px solid #81c784'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#2e7d32', fontSize: '0.9rem' }}>
              Datos del Cliente Seleccionado
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>Nombre:</strong> {formData.nombre}</div>
              <div><strong>Cédula:</strong> {formData.cedula}</div>
              <div><strong>Teléfono:</strong> {formData.telefono}</div>
              <div><strong>Ubicación:</strong> {formData.ubicacion}</div>
              {formData.notas && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Notas:</strong> {formData.notas}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECCION: DATOS DEL PRESTAMO */}
      <div style={{
        background: '#f6fff6',
        border: '1px solid #b2dfb2',
        borderRadius: '10px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#2e7d32', fontSize: '1rem', fontWeight: 700 }}>
          Datos del Prestamo
        </h3>

        <div className="form-row">
          <div className="form-group">
            <label>Monto Prestado (CRC) *</label>
            <input
              type="number"
              name="montoPrestado"
              value={formData.montoPrestado}
              onChange={handleChange}
              min="1"
              placeholder="Ej: 100000"
              style={inputStyle('montoPrestado')}
            />
            {errors.montoPrestado && <small style={{ color: '#dc3545' }}>{errors.montoPrestado}</small>}
          </div>

          <div className="form-group">
            <label>Interes Base *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleInteres(-0.05)}
                disabled={Number(formData.interesBase) <= 0.15}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '1.1rem' }}
              >
                -
              </button>
              <span style={{ fontWeight: 700, fontSize: '1.25rem', minWidth: '3rem', textAlign: 'center' }}>
                {(Number(formData.interesBase) * 100).toFixed(0)}%
              </span>
              <button
                type="button"
                onClick={() => handleInteres(0.05)}
                disabled={Number(formData.interesBase) >= 0.25}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '1.1rem' }}
              >
                +
              </button>
            </div>
            <small style={{ color: '#6c757d' }}>Minimo 15% - Maximo 25% - pasos de 5%</small>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha Inicio *</label>
            <input
              type="date"
              name="fechaInicio"
              value={formData.fechaInicio}
              onChange={handleChange}
              min={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' })}
              style={inputStyle('fechaInicio')}
            />
            {errors.fechaInicio && <small style={{ color: '#dc3545' }}>{errors.fechaInicio}</small>}
          </div>

          <div className="form-group">
            <label>Tipo de Acuerdo *</label>
            <select
              name="tipoAcuerdo"
              value={formData.tipoAcuerdo}
              onChange={handleChange}
            >
              {Object.entries(TIPO_ACUERDO_INFO).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {formData.tipoAcuerdo && (
              <small style={{ color: '#6c757d' }}>
                {TIPO_ACUERDO_INFO[formData.tipoAcuerdo]?.desc}
              </small>
            )}
          </div>
        </div>

        {formData.tipoAcuerdo === 'PAGO_EN_MES' && (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ marginTop: 0 }}>Configuracion de Quincenas *</h4>
            <div className="form-group">
              <label>Cantidad de quincenas * (2-10)</label>
              <input
                type="number"
                name="cantidadQuincenas"
                value={formData.cantidadQuincenas}
                onChange={handleChange}
                min="2"
                max="10"
                placeholder="Ej: 4"
                style={inputStyle('cantidadQuincenas')}
              />
              {errors.cantidadQuincenas && <small style={{ color: '#dc3545' }}>{errors.cantidadQuincenas}</small>}
              <small style={{ color: '#6c757d' }}>
                Cada cuota = principal por quincena + {(Number(formData.interesBase) * 100).toFixed(0)}% del monto prestado. La ultima absorbe el residuo.
              </small>
            </div>
            {formData.montoPrestado && formData.cantidadQuincenas && Number(formData.cantidadQuincenas) >= 2 && Number(formData.cantidadQuincenas) <= 10 && (() => {
              const n = Number(formData.cantidadQuincenas);
              const m = Number(formData.montoPrestado);
              const i = Number(formData.interesBase);
              const interesFijo = Math.round(m * i);
              const principalBase = Math.floor(m / n);
              const residuoPrincipal = m - principalBase * (n - 1);
              const cuotas = Array.from({ length: n }, (_, idx) =>
                idx < n - 1 ? principalBase + interesFijo : residuoPrincipal + interesFijo
              );
              const esResiduo = residuoPrincipal !== principalBase;
              return (
                <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#495057' }}>
                    Preview: {n} cuota{n !== 1 ? 's' : ''} | Principal/quincena: {formatMoney(principalBase)} | Interes: {formatMoney(interesFijo)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {cuotas.map((c, idx) => (
                      <span key={idx} style={{
                        background: idx === n - 1 && esResiduo ? '#fff3cd' : '#d4edda',
                        border: `1px solid ${idx === n - 1 && esResiduo ? '#ffc107' : '#28a745'}`,
                        borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.85rem', fontWeight: 500,
                      }}>
                        #{idx + 1}: {formatMoney(c)}{idx === n - 1 && esResiduo ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                  {esResiduo && <small style={{ color: '#856404', marginTop: '0.35rem', display: 'block' }}>* Ultima cuota con residuo de principal.</small>}
                </div>
              );
            })()}
          </div>
        )}

        {formData.tipoAcuerdo === 'QUINCENAS_DOBLES' && (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ marginTop: 0 }}>Configuracion de Cuotas *</h4>
            <div className="form-group">
              <label>Monto por cuota (CRC) *</label>
              <input
                type="number"
                name="montoCuota"
                value={formData.montoCuota}
                onChange={handleChange}
                min="1"
                placeholder="Ej: 3000"
                style={inputStyle('montoCuota')}
              />
              {errors.montoCuota && <small style={{ color: '#dc3545' }}>{errors.montoCuota}</small>}
              <small style={{ color: '#6c757d' }}>La ultima cuota sera el residuo.</small>
            </div>
            {totalAPagar && formData.montoCuota && Number(formData.montoCuota) > 0 && Number(formData.montoCuota) < totalAPagar && (() => {
              const mc = Number(formData.montoCuota);
              const total = totalAPagar;
              const n = Math.ceil(total / mc);
              const residuo = total - mc * (n - 1);
              const cuotas = Array.from({ length: n }, (_, i) => (i < n - 1 ? mc : residuo));
              return (
                <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: '#495057' }}>
                    Preview: {n} cuota{n !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {cuotas.map((c, i) => (
                      <span key={i} style={{
                        background: i === n - 1 && residuo !== mc ? '#fff3cd' : '#d4edda',
                        border: `1px solid ${i === n - 1 && residuo !== mc ? '#ffc107' : '#28a745'}`,
                        borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.85rem', fontWeight: 500,
                      }}>
                        #{i + 1}: {formatMoney(c)}{i === n - 1 && residuo !== mc ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                  {residuo !== mc && <small style={{ color: '#856404', marginTop: '0.35rem', display: 'block' }}>* Ultima cuota es el residuo.</small>}
                </div>
              );
            })()}
          </div>
        )}

        <div style={{
          background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: '8px',
          padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#2e7d32', marginBottom: '0.25rem' }}>Monto a pagar</div>
            <div style={{ fontSize: '0.8rem', color: '#388e3c' }}>
              {formData.tipoAcuerdo === 'PAGO_EN_MES'
                ? `Monto + interes x ${formData.cantidadQuincenas || 'N'} quincenas`
                : formData.tipoAcuerdo === 'QUINCENAS_DOBLES'
                ? 'Total = monto x 2'
                : 'Monto + interes'}
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1b5e20' }}>
            {totalAPagar != null && formData.montoPrestado ? formatMoney(totalAPagar) : '--'}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          {initialData ? 'Actualizar' : 'Crear'} Prestamo
        </button>
      </div>
    </form>
  );
};

export default PrestamoForm;
