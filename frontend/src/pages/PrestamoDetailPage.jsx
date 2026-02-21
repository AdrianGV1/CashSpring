import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prestamoApi } from '../services/prestamoApi';
import { cuotaApi } from '../services/cuotaApi';
import { pagoApi } from '../services/pagoApi';
import { clienteApi } from '../services/api';

const PrestamoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prestamo, setPrestamo] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [cuotas, setCuotas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [montoExtendido, setMontoExtendido] = useState('');
  const [mantenerCuotaActual, setMantenerCuotaActual] = useState(true);
  const [montoPorCuota, setMontoPorCuota] = useState('');
  const [extensionError, setExtensionError] = useState(null);
  const [extensionLoading, setExtensionLoading] = useState(false);
  const [pagoData, setPagoData] = useState({
    monto: '',
    fechaPago: new Date().toISOString().split('T')[0],
    notas: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [prestamoActual, cuotasData, pagosData] = await Promise.all([
        prestamoApi.getById(id),
        cuotaApi.getByPrestamo(id),
        pagoApi.getByPrestamo(id)
      ]);

      if (!prestamoActual) {
        throw new Error('Préstamo no encontrado');
      }

      setPrestamo(prestamoActual);
      setCuotas(cuotasData);
      setPagos(pagosData);

      // Cargar datos del cliente
      const clienteResp = await clienteApi.getById(prestamoActual.clienteId);
      setCliente(clienteResp.data);

    } catch (err) {
      setError('Error al cargar los datos del préstamo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    try {
      await pagoApi.create({
        prestamoId: Number(id),
        monto: Number(pagoData.monto),
        fechaPago: pagoData.fechaPago,
        notas: pagoData.notas
      });
      
      // Recargar datos
      await loadData();
      
      // Limpiar formulario
      setPagoData({
        monto: '',
        fechaPago: new Date().toISOString().split('T')[0],
        notas: ''
      });
      setShowPagoForm(false);
    } catch (err) {
      alert('Error al registrar el pago');
      console.error(err);
    }
  };

  const handleExtenderPrestamo = async (e) => {
    e.preventDefault();
    const monto = Number(montoExtendido);
    if (!monto || monto <= 0) {
      setExtensionError('El monto de extensión debe ser un valor positivo.');
      return;
    }
    if (!mantenerCuotaActual) {
      const mpc = Number(montoPorCuota);
      if (!mpc || mpc <= 0) {
        setExtensionError('El monto por cuota debe ser un valor positivo.');
        return;
      }
    }
    const { totalPagado } = calcularProgreso();
    if (totalPagado < prestamo.totalObjetivo / 2) {
      setExtensionError('Debe haber pagado al menos el 50% del préstamo para poder extenderlo.');
      return;
    }
    try {
      setExtensionLoading(true);
      setExtensionError(null);
      const mpc = mantenerCuotaActual ? null : Number(montoPorCuota);
      await prestamoApi.extender(id, monto, mpc);
      await loadData();
      setMontoExtendido('');
      setMontoPorCuota('');
      setMantenerCuotaActual(true);
      setShowExtensionForm(false);
      alert('¡Préstamo extendido exitosamente! Las nuevas cuotas han sido generadas.');
    } catch (err) {
      const mensaje = err?.response?.data?.message || err?.message;
      setExtensionError(mensaje || 'Error al extender el préstamo. Verifica los datos.');
      console.error(err);
    } finally {
      setExtensionLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatMontoCuota = (cuota) => {
    const cancelado = cuota.montoCancelado || 0;
    if (cuota.estado === 'CUBIERTA') {
      return <span style={{ color: '#198754' }}>{formatMoney(cuota.montoObjetivo)}</span>;
    }
    if (cancelado > 0) {
      return (
        <span>
          <span style={{ color: '#0d6efd', fontWeight: 600 }}>{formatMoney(cancelado)}</span>
          <span style={{ color: '#6c757d' }}> / {formatMoney(cuota.montoObjetivo)}</span>
        </span>
      );
    }
    return <span>{formatMoney(cuota.montoObjetivo)}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CR');
  };

  const getEstadoCuotaBadge = (estado) => {
    const badges = {
      PENDIENTE: { class: 'badge-warning', text: 'Pendiente' },
      CUBIERTA:  { class: 'badge-success', text: 'Cubierta' },
      VENCIDA:   { class: 'badge-danger',  text: 'Vencida' }
    };
    const badge = badges[estado] || { class: 'badge-secondary', text: estado };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const calcularProgreso = () => {
    const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
    const porcentaje = (totalPagado / prestamo.totalObjetivo) * 100;
    return {
      totalPagado,
      porcentaje: Math.min(porcentaje, 100)
    };
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando préstamo...</div>
      </div>
    );
  }

  if (error || !prestamo) {
    return (
      <div className="container">
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => navigate('/prestamos')} className="btn btn-primary">
            Volver a Préstamos
          </button>
        </div>
      </div>
    );
  }

  const progreso = calcularProgreso();

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/prestamos')} className="btn-back">
            ← Volver
          </button>
          <h1>Préstamo #{prestamo.prestamoId}</h1>
          {cliente && (
            <p className="subtitle">
              Cliente: {cliente.nombre}
            </p>
          )}
        </div>
        <button 
          onClick={() => setShowPagoForm(!showPagoForm)}
          className="btn btn-primary"
        >
          {showPagoForm ? 'Cancelar' : '+ Registrar Pago'}
        </button>
        {prestamo.tipoAcuerdo === 'QUINCENAS_DOBLES' && !prestamo.esExtendido && (
          <button
            onClick={() => { setShowExtensionForm(!showExtensionForm); setExtensionError(null); }}
            className="btn btn-secondary"
            style={{ marginLeft: '0.5rem' }}
          >
            {showExtensionForm ? 'Cancelar Extensión' : '🔄 Extender Préstamo'}
          </button>
        )}
      </div>

      {/* Formulario de extensión de préstamo */}
      {showExtensionForm && (
        <div className="card mb-4" style={{ borderLeft: '4px solid #6c757d' }}>
          <div className="card-header">
            <h3>🔄 Extender Préstamo</h3>
          </div>
          <div className="card-body">
            {extensionError && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f8d7da', borderRadius: '6px', color: '#842029' }}>
                {extensionError}
              </div>
            )}
            <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
              Puedes extender este préstamo si has pagado al menos el <strong>50%</strong> del total.
              El monto de extensión se sumará al capital, y se generarán nuevas cuotas.
            </p>
            <form onSubmit={handleExtenderPrestamo} className="form-container">
              <div className="form-row">
                <div className="form-group">
                  <label>Monto a extender (₡) *</label>
                  <input
                    type="number"
                    value={montoExtendido}
                    onChange={(e) => setMontoExtendido(e.target.value)}
                    required
                    min="1"
                    placeholder="Ej: 100000"
                  />
                  {montoExtendido && Number(montoExtendido) > 0 && (
                    <small style={{ color: '#388e3c' }}>
                      Monto adicional a pagar: {formatMoney(Number(montoExtendido) * 2)}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Nuevo total del préstamo (₡)</label>
                  <input
                    type="text"
                    readOnly
                    value={
                      montoExtendido && Number(montoExtendido) > 0
                        ? formatMoney((prestamo.montoPrestado + Number(montoExtendido)) * 2)
                        : '-'
                    }
                    style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Monto de las nuevas cuotas */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mantenerCuotaActual}
                    onChange={(e) => { setMantenerCuotaActual(e.target.checked); setMontoPorCuota(''); }}
                  />
                  Mantener el monto de cuota actual
                  {mantenerCuotaActual && cuotas.length > 0 && (
                    <span style={{ color: '#6c757d', fontSize: '0.85rem', fontWeight: 400 }}>
                      ({formatMoney(cuotas[0]?.montoObjetivo)} / quincena)
                    </span>
                  )}
                </label>
              </div>

              {!mantenerCuotaActual && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Nuevo monto por cuota (₡) *</label>
                    <input
                      type="number"
                      value={montoPorCuota}
                      onChange={(e) => setMontoPorCuota(e.target.value)}
                      min="1"
                      placeholder="Ej: 5000"
                      required={!mantenerCuotaActual}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cuotas pendientes que se generarán</label>
                    <input
                      type="text"
                      readOnly
                      style={{ background: '#f8f9fa', cursor: 'not-allowed' }}
                      value={(() => {
                        const ext = Number(montoExtendido);
                        const mpc = Number(montoPorCuota);
                        if (!ext || ext <= 0 || !mpc || mpc <= 0) return '-';
                        // Nuevas cuotas = totalNuevo - montoObjetivo de todas las cuotas conservadas
                        // (CUBIERTA + parciales PENDIENTE). NO usar totalPagado porque
                        // los abonos parciales ya están dentro de montoObjetivo de las parciales
                        // y se restív doble si se usa la fórmula (totalNuevo - pagado - parcialObjetivo).
                        const totalNuevo = (prestamo.montoPrestado + ext) * 2;
                        const objetivoKept = cuotas
                          .filter(c => c.estado === 'CUBIERTA' || (c.estado === 'PENDIENTE' && c.montoCancelado > 0))
                          .reduce((sum, c) => sum + c.montoObjetivo, 0);
                        const remaining = Math.max(0, totalNuevo - objetivoKept);
                        if (remaining <= 0) return 'Saldo ya cubierto';
                        const n = Math.ceil(remaining / mpc);
                        const residuo = remaining - mpc * (n - 1);
                        return `${n} cuota${n !== 1 ? 's' : ''}${residuo !== mpc ? ` (última: ${formatMoney(residuo)})` : ''}`;
                      })()}
                    />
                  </div>
                </div>
              )}

              {/* Preview de cuotas a generar con mantener cuota actual */}
              {mantenerCuotaActual && montoExtendido && Number(montoExtendido) > 0 && cuotas.length > 0 && (() => {
                const mpc = cuotas[0]?.montoObjetivo || 0;
                const adicional = Number(montoExtendido) * 2;
                const n = Math.ceil(adicional / mpc);
                const residuo = adicional - mpc * (n - 1);
                return (
                  <p style={{ color: '#495057', fontSize: '0.875rem', background: '#e9ecef', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    Se generarán <strong>{n} cuota{n !== 1 ? 's' : ''}</strong> de <strong>{formatMoney(mpc)}</strong>
                    {residuo !== mpc ? ` (última: ${formatMoney(residuo)})` : ''}, continuando desde la última cuota existente.
                  </p>
                );
              })()}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => { setShowExtensionForm(false); setExtensionError(null); }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={extensionLoading}>
                  {extensionLoading ? 'Procesando...' : 'Confirmar Extensión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulario de pago */}}
      {showPagoForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>Registrar Pago</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleRegistrarPago} className="form-container">
              <div className="form-row">
                <div className="form-group">
                  <label>Monto (₡) *</label>
                  <input
                    type="number"
                    value={pagoData.monto}
                    onChange={(e) => setPagoData({...pagoData, monto: e.target.value})}
                    required
                    min="1"
                    placeholder="Ej: 50000"
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Pago *</label>
                  <input
                    type="date"
                    value={pagoData.fechaPago}
                    onChange={(e) => setPagoData({...pagoData, fechaPago: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={pagoData.notas}
                  onChange={(e) => setPagoData({...pagoData, notas: e.target.value})}
                  placeholder="Notas adicionales (opcional)"
                  rows="2"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowPagoForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Información del préstamo */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Información del Préstamo</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Monto Prestado:</span>
                <span className="value">{formatMoney(prestamo.montoPrestado)}</span>
              </div>
              <div className="info-item">
                <span className="label">Interés:</span>
                <span className="value">{(prestamo.interesBase * 100).toFixed(2)}%</span>
              </div>
              <div className="info-item">
                <span className="label">Total a Pagar:</span>
                <span className="value total-amount">{formatMoney(prestamo.totalObjetivo)}</span>
              </div>
              <div className="info-item">
                <span className="label">Tipo de Acuerdo:</span>
                <span className="value">{prestamo.tipoAcuerdo}</span>
              </div>
              <div className="info-item">
                <span className="label">Fecha Inicio:</span>
                <span className="value">{formatDate(prestamo.fechaInicio)}</span>
              </div>
              <div className="info-item">
                <span className="label">Estado:</span>
                <span className={`badge badge-${prestamo.estado === 'ACTIVO' ? 'success' : 'secondary'}`}>
                  {prestamo.estado}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Extensión:</span>
                {prestamo.esExtendido ? (
                  <span className="badge" style={{ background: '#6f42c1', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                    ✅ Préstamo extendido
                  </span>
                ) : (
                  <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>No extendido</span>
                )}
              </div>
              {prestamo.esExtendido && prestamo.montoExtendido > 0 && (
                <div className="info-item">
                  <span className="label">Monto extendido:</span>
                  <span className="value" style={{ color: '#6f42c1' }}>{formatMoney(prestamo.montoExtendido)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Progreso de Pago</h3>
          </div>
          <div className="card-body">
            <div className="progress-section">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${progreso.porcentaje}%` }}
                >
                  {progreso.porcentaje.toFixed(1)}%
                </div>
              </div>
              <div className="progress-info">
                <div className="info-item">
                  <span className="label">Total Pagado:</span>
                  <span className="value success">{formatMoney(progreso.totalPagado)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Restante:</span>
                  <span className="value danger">
                    {formatMoney(prestamo.totalObjetivo - progreso.totalPagado)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Total Pagos:</span>
                  <span className="value">{pagos.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cuotas */}
      <div className="card mt-4">
        <div className="card-header">
          <h3>Cuotas ({cuotas.length})</h3>
        </div>
        <div className="card-body">
          {cuotas.length === 0 ? (
            <p className="text-muted">No hay cuotas generadas para este préstamo</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha Vencimiento</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha Cubierta</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {cuotas.map(cuota => (
                    <tr key={cuota.cuotaId} style={
                      cuota.estado === 'CUBIERTA'
                        ? { background: '#f0fff4' }
                        : cuota.esCuotaExtendida
                        ? { background: '#f3eeff' }
                        : {}
                    }>
                      <td>{cuota.numeroCuota}</td>
                      <td>{formatDate(cuota.fechaVencimiento)}</td>
                      <td>{formatMontoCuota(cuota)}</td>
                      <td>{getEstadoCuotaBadge(cuota.estado)}</td>
                      <td>
                        {cuota.fechaCubierta ? formatDate(cuota.fechaCubierta) : '-'}
                      </td>
                      <td>
                        {cuota.esCuotaExtendida ? (
                          <span className="badge" style={{ background: '#6f42c1', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>
                            Extendida
                          </span>
                        ) : (
                          <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>Original</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="card mt-4">
        <div className="card-header">
          <h3>Historial de Pagos ({pagos.length})</h3>
        </div>
        <div className="card-body">
          {pagos.length === 0 ? (
            <p className="text-muted">No hay pagos registrados aún</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(pago => (
                    <tr key={pago.pagoId}>
                      <td>{formatDate(pago.fechaPago)}</td>
                      <td className="success">{formatMoney(pago.monto)}</td>
                      <td>{pago.notas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrestamoDetailPage;
