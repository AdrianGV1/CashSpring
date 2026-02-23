import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { prestamoApi } from '../services/prestamoApi';
import { cuotaApi } from '../services/cuotaApi';
import { pagoApi } from '../services/pagoApi';
import { clienteApi } from '../services/api';
import { reporteApi } from '../services/reporteApi';
import { isSupervisor, isAdmin } from '../services/authHelper';
import useAutoRefresh from '../hooks/useAutoRefresh';

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
  const [showExtensionWarning, setShowExtensionWarning] = useState(false);
  const [pagoData, setPagoData] = useState({
    monto: '',
    fechaPago: new Date().toISOString().split('T')[0],
    notas: ''
  });
  const [pagoError, setPagoError] = useState(null);
  const [reverting, setReverting] = useState(null);
  const [showLiquidarForm, setShowLiquidarForm] = useState(false);
  const [liquidarLoading, setLiquidarLoading] = useState(false);
  const [liquidarError, setLiquidarError] = useState(null);
  const [fechaLiquidacion, setFechaLiquidacion] = useState(new Date().toISOString().split('T')[0]);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  useAutoRefresh(() => loadData(true));

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      
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
      setCliente(clienteResp);

    } catch (err) {
      if (!silent) setError('Error al cargar los datos del préstamo');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    setPagoError(null);
    
    // Si es supervisor, pedir confirmación
    if (isSupervisor()) {
      const confirmar = window.confirm(
        '¿Está seguro de enviar esta solicitud de pago?\n\n' +
        `Monto: ₡${Number(pagoData.monto).toLocaleString('es-CR')}\n` +
        'La solicitud quedará pendiente hasta que un administrador la apruebe.'
      );
      if (!confirmar) {
        return;
      }
    }
    
    // Filtrar solo pagos aprobados
    const pagosAprobados = pagos.filter(p => p.estadoAprobacion === 'APROBADO');
    const montoPendiente = prestamo.totalObjetivo - pagosAprobados.reduce((sum, p) => sum + p.monto, 0);
    const montoIngresado = Number(pagoData.monto);
    if (montoIngresado > montoPendiente) {
      setPagoError(`El monto excede el saldo pendiente. Máximo permitido: ₡${montoPendiente.toLocaleString('es-CR')}`);
      return;
    }
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
      setPagoError(null);
      setShowPagoForm(false);
      
      // Mostrar mensaje de éxito según el rol
      if (isSupervisor()) {
        alert('✅ Solicitud de pago enviada exitosamente.\n\nLa solicitud quedará pendiente hasta que un administrador la apruebe.');
      } else {
        alert('✅ Pago registrado exitosamente.');
      }
    } catch (err) {
      setPagoError('Error al registrar el pago. Verifica los datos.');
      console.error(err);
    }
  };

  const handleRevertirPago = async (pagoId) => {
    const confirmar = window.confirm(
      '⚠️ ¿Está seguro de que desea revertir este pago?\n\n' +
      'Esta acción:\n' +
      '- Eliminará el pago del sistema\n' +
      '- Revertirá las cuotas que fueron cubiertas por este pago\n' +
      '- Actualizará el estado del préstamo si es necesario\n\n' +
      'Esta acción NO se puede deshacer.'
    );

    if (!confirmar) return;

    try {
      setReverting(pagoId);
      await pagoApi.revertir(pagoId);
      alert('✅ Pago revertido exitosamente.\n\nLas cuotas han sido restauradas a su estado anterior.');
      await loadData();
    } catch (err) {
      console.error('Error al revertir pago:', err);
      alert('❌ Error al revertir el pago: ' + (err.response?.data?.message || err.message));
    } finally {
      setReverting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      await reporteApi.descargarReportePrestamo(id);
      alert('✅ PDF exportado exitosamente');
    } catch (err) {
      alert('❌ Error al exportar PDF');
      console.error(err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleLiquidarPrestamo = async (e) => {
    e.preventDefault();
    const montoLiq = prestamo.montoLiquidacion || 0;
    const confirmar = window.confirm(
      `¿Confirmar la liquidación del préstamo?\n\n` +
      `Monto a pagar: ₡${montoLiq.toLocaleString('es-CR')}\n` +
      `(${formatMoney(prestamo.montoPrestado)} de capital + 20% de interés)\n\n` +
      `Las cuotas pendientes quedarán en ₡0 y el préstamo será marcado como LIQUIDADO.`
    );
    if (!confirmar) return;
    try {
      setLiquidarLoading(true);
      setLiquidarError(null);
      await prestamoApi.liquidar(id, fechaLiquidacion);
      await loadData();
      setShowLiquidarForm(false);
      alert('✅ Préstamo liquidado exitosamente.');
    } catch (err) {
      const mensaje = err?.response?.data?.message || err?.message;
      setLiquidarError(mensaje || 'Error al liquidar el préstamo. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLiquidarLoading(false);
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

  const getTipoAcuerdoText = (tipo) => {
    const tipos = {
      PENALIZACION_POR_DIA: 'QUINCENA ÚNICA',
      PAGO_EN_MES: 'VARIAS QUINCENAS',
      QUINCENAS_DOBLES: 'DOBLE',
    };
    return tipos[tipo] || tipo;
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
    // Filtrar solo pagos aprobados
    const pagosAprobados = pagos.filter(p => p.estadoAprobacion === 'APROBADO');
    const totalPagado = pagosAprobados.reduce((sum, pago) => sum + pago.monto, 0);
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
  const estaLiquidado = prestamo.estado === 'LIQUIDADO';
  const estaCompleto = estaLiquidado || progreso.totalPagado >= prestamo.totalObjetivo;

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

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleExportPdf}
            className="btn btn-secondary"
            disabled={exportingPdf}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: exportingPdf ? 'not-allowed' : 'pointer',
              backgroundColor: exportingPdf ? '#cccccc' : '#6c757d',
              color: '#fff',
              transition: 'background-color 0.2s'
            }}
          >
            {exportingPdf ? '⏳ Exportando...' : '📄 Exportar PDF'}
          </button>
          
          {!estaCompleto && (
            <button
              onClick={() => {
                setShowLiquidarForm(!showLiquidarForm);
                setLiquidarError(null);
                setShowPagoForm(false);
                setShowExtensionForm(false);
              }}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                backgroundColor: showLiquidarForm ? '#6c757d' : '#dc3545',
                color: '#fff',
                transition: 'background-color 0.2s'
              }}
              title="Liquidar el préstamo pagando el capital + 20% de interés"
            >
              {showLiquidarForm ? 'Cancelar Liquidación' : '💰 Liquidar Préstamo'}
            </button>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {!estaCompleto && (
          <button 
            onClick={() => setShowPagoForm(!showPagoForm)}
            className="btn btn-primary"
          >
            {showPagoForm ? 'Cancelar' : '+ Registrar Pago'}
          </button>
        )}
        {prestamo.tipoAcuerdo === 'QUINCENAS_DOBLES' && !prestamo.esExtendido && !estaCompleto && (() => {
          const puedeExtender = progreso.porcentaje >= 50;
          return (
            <button
              onClick={() => {
                if (!puedeExtender) {
                  setShowExtensionWarning(true);
                  return;
                }
                setShowExtensionWarning(false);
                setShowExtensionForm(!showExtensionForm);
                setExtensionError(null);
              }}
              style={{
                marginLeft: '0.5rem',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: puedeExtender ? 'pointer' : 'not-allowed',
                backgroundColor: puedeExtender ? '#198754' : '#6c757d',
                color: '#fff',
                opacity: puedeExtender ? 1 : 0.8,
                transition: 'background-color 0.2s'
              }}
              title={
                puedeExtender
                  ? 'Extender préstamo'
                  : `Debes pagar al menos el 50% para extender (pagado: ${progreso.porcentaje.toFixed(1)}%)`
              }
            >
              {showExtensionForm ? 'Cancelar Extensión' : '🔄 Extender Préstamo'}
            </button>
          );
        })()}
      </div>

      {/* Banner de préstamo LIQUIDADO */}
      {estaLiquidado && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)',
            border: '2px solid #ffc107',
            borderRadius: '10px',
            padding: '1.1rem 1.4rem',
            marginBottom: '1.25rem',
            boxShadow: '0 2px 8px rgba(255,193,7,0.22)'
          }}
        >
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#664d03' }}>
              ¡Préstamo Liquidado Anticipadamente!
            </p>
            <p style={{ margin: '0.2rem 0 0', color: '#856404', fontSize: '0.9rem' }}>
              Este préstamo fue liquidado pagando <strong>{formatMoney(prestamo.montoLiquidacion)}</strong>
              {' '}(capital + 20% de interés). El saldo pendiente es <strong>₡0</strong>.
            </p>
          </div>
          <span
            style={{
              background: '#ffc107',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em'
            }}
          >
            ⚡ LIQUIDADO
          </span>
        </div>
      )}

      {/* Banner de préstamo completado (pago normal 100%) */}
      {!estaLiquidado && estaCompleto && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            border: '2px solid #10b981',
            borderRadius: '10px',
            padding: '1.1rem 1.4rem',
            marginBottom: '1.25rem',
            boxShadow: '0 2px 8px rgba(16,185,129,0.18)'
          }}
        >
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>🎉</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#065f46' }}>
              ¡Préstamo pagado al 100%!
            </p>
            <p style={{ margin: '0.2rem 0 0', color: '#047857', fontSize: '0.9rem' }}>
              Este préstamo ha sido completado exitosamente. Total pagado: <strong>{formatMoney(progreso.totalPagado)}</strong>.
              No se pueden registrar más pagos.
            </p>
          </div>
          <span
            style={{
              background: '#10b981',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em'
            }}
          >
            ✔ COMPLETADO
          </span>
        </div>
      )}

      {/* Formulario de liquidación */}
      {showLiquidarForm && !estaCompleto && (
        <div className="card mb-4" style={{ borderLeft: '4px solid #dc3545' }}>
          <div className="card-header">
            <h3>💰 Liquidar Préstamo</h3>
          </div>
          <div className="card-body">
            {liquidarError && (
              <div style={{ color: '#842029', background: '#f8d7da', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {liquidarError}
              </div>
            )}
            <p style={{ color: '#495057', marginBottom: '1rem' }}>
              Al liquidar el préstamo pagas el <strong>monto original + 20% de interés</strong>, sin importar las cuotas restantes.
              Las cuotas ya pagadas son ganancia adicional y <strong>no</strong> se descuentan del monto de liquidación.
            </p>
            <div className="info-grid" style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="info-item">
                <span className="label">Monto original prestado:</span>
                <span className="value">{formatMoney(prestamo.montoPrestado)}</span>
              </div>
              <div className="info-item">
                <span className="label">Interés de liquidación (20%):</span>
                <span className="value" style={{ color: '#dc3545' }}>
                  {formatMoney((prestamo.montoLiquidacion || 0) - prestamo.montoPrestado)}
                </span>
              </div>
              <div className="info-item">
                <span className="label">💰 Monto a pagar para liquidar:</span>
                <span className="value" style={{ color: '#dc3545', fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatMoney(prestamo.montoLiquidacion || 0)}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Total ya pagado (cuotas):</span>
                <span className="value" style={{ color: '#198754' }}>{formatMoney(progreso.totalPagado)}</span>
              </div>
              <div className="info-item">
                <span className="label">Cuotas pagadas hasta hoy:</span>
                <span className="value">
                  {cuotas.filter(c => c.estado === 'CUBIERTA').length} de {cuotas.length}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Cuotas pendientes (quedarán en ₡0):</span>
                <span className="value" style={{ color: '#6c757d' }}>
                  {cuotas.filter(c => c.estado !== 'CUBIERTA').length}
                </span>
              </div>
            </div>
            <form onSubmit={handleLiquidarPrestamo} className="form-container">
              <div className="form-group">
                <label>Fecha de Liquidación *</label>
                <input
                  type="date"
                  value={fechaLiquidacion}
                  onChange={(e) => setFechaLiquidacion(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => { setShowLiquidarForm(false); setLiquidarError(null); }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={liquidarLoading}
                  style={{
                    padding: '0.5rem 1.25rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: liquidarLoading ? 'not-allowed' : 'pointer',
                    backgroundColor: '#dc3545',
                    color: '#fff'
                  }}
                >
                  {liquidarLoading
                    ? 'Procesando...'
                    : `Confirmar Liquidación — ${formatMoney(prestamo.montoLiquidacion || 0)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advertencia de extensión bloqueada */}
      {showExtensionWarning && !showExtensionForm && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderLeft: '5px solid #ffc107',
            borderRadius: '6px',
            padding: '0.85rem 1.1rem',
            marginBottom: '1rem',
            color: '#664d03'
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong>No es posible extender el préstamo aún.</strong>
            <br />
            <span>
              Debes haber pagado al menos el <strong>50%</strong> del total del préstamo para poder extenderlo.
              Progreso actual: <strong>{progreso.porcentaje.toFixed(1)}%</strong> de {formatMoney(prestamo.totalObjetivo)} ({formatMoney(progreso.totalPagado)} pagado).
            </span>
          </div>
          <button
            onClick={() => setShowExtensionWarning(false)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '1.1rem',
              cursor: 'pointer',
              color: '#664d03',
              lineHeight: 1
            }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

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

      {/* Formulario de pago */}
      {showPagoForm && !estaCompleto && (
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
                    onChange={(e) => { setPagoError(null); setPagoData({...pagoData, monto: e.target.value}); }}
                    required
                    min="1"
                    max={prestamo.totalObjetivo - progreso.totalPagado}
                    placeholder="Ej: 50000"
                  />
                  <small style={{ color: '#6c757d' }}>
                    Saldo pendiente: ₡{(prestamo.totalObjetivo - progreso.totalPagado).toLocaleString('es-CR')}
                  </small>
                </div>
                <div className="form-group">
                  <label>Fecha de Pago *</label>
                  <input
                    type="date"
                    value={pagoData.fechaPago}
                    onChange={(e) => setPagoData({...pagoData, fechaPago: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
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
              {pagoError && (
                <div style={{ color: '#842029', background: '#f8d7da', borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  {pagoError}
                </div>
              )}
              <div className="form-actions">
                <button type="button" onClick={() => { setShowPagoForm(false); setPagoError(null); }} className="btn btn-secondary">
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
                <span className="value">{getTipoAcuerdoText(prestamo.tipoAcuerdo)}</span>
              </div>
              <div className="info-item">
                <span className="label">Fecha Inicio:</span>
                <span className="value">{formatDate(prestamo.fechaInicio)}</span>
              </div>
              <div className="info-item">
                <span className="label">Estado:</span>
                <span className={`badge badge-${
                  prestamo.estado === 'ACTIVO' ? 'success' :
                  prestamo.estado === 'PAGADO' ? 'info' :
                  prestamo.estado === 'ATRASADO' ? 'danger' :
                  prestamo.estado === 'LIQUIDADO' ? 'warning' : 'secondary'
                }`}>
                  {prestamo.estado === 'ACTIVO' ? 'Activo' :
                   prestamo.estado === 'PAGADO' ? 'Pagado' :
                   prestamo.estado === 'ATRASADO' ? 'Atrasado' :
                   prestamo.estado === 'LIQUIDADO' ? '⚡ Liquidado' : prestamo.estado}
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
                  style={{
                    width: `${progreso.porcentaje}%`,
                    background: estaCompleto
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : undefined
                  }}
                >
                  {estaCompleto ? '✔ 100%' : `${progreso.porcentaje.toFixed(1)}%`}
                </div>
              </div>
              <div className="progress-info">
                <div className="info-item">
                  <span className="label">Total Pagado:</span>
                  <span className="value success">{formatMoney(progreso.totalPagado)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Restante:</span>
                  {estaCompleto ? (
                    <span style={{ color: '#10b981', fontWeight: 700 }}>¡Saldado! ₡0</span>
                  ) : (
                    <span className="value danger">
                      {formatMoney(prestamo.totalObjetivo - progreso.totalPagado)}
                    </span>
                  )}
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
                    <th>Estado</th>
                    <th>Notas</th>
                    {isAdmin() && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(pago => (
                    <tr key={pago.pagoId}>
                      <td>{formatDate(pago.fechaPago)}</td>
                      <td className="success">{formatMoney(pago.monto)}</td>
                      <td>
                        {pago.estadoAprobacion === 'APROBADO' ? (
                          <span className="badge badge-success">✅ Aprobado</span>
                        ) : (
                          <span className="badge badge-warning">⏳ En Espera</span>
                        )}
                      </td>
                      <td>{pago.notas || '-'}</td>
                      {isAdmin() && (
                        <td>
                          {pago.estadoAprobacion === 'APROBADO' ? (
                            <button
                              onClick={() => handleRevertirPago(pago.pagoId)}
                              disabled={reverting === pago.pagoId}
                              className="btn btn-sm btn-danger"
                              title="Revertir este pago"
                            >
                              {reverting === pago.pagoId ? '⏳' : '↩️'} Revertir
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Pendiente de aprobación</span>
                          )}
                        </td>
                      )}
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
