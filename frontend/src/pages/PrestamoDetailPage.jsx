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
      
      const [prestamoData, cuotasData, pagosData] = await Promise.all([
        prestamoApi.getAll(),
        cuotaApi.getByPrestamo(id),
        pagoApi.getByPrestamo(id)
      ]);

      const prestamoActual = prestamoData.find(p => p.prestamoId === Number(id));
      if (!prestamoActual) {
        throw new Error('Préstamo no encontrado');
      }

      setPrestamo(prestamoActual);
      setCuotas(cuotasData);
      setPagos(pagosData);

      // Cargar datos del cliente
      const clienteData = await clienteApi.getById(prestamoActual.clienteId);
      setCliente(clienteData);

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

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CR');
  };

  const getEstadoCuotaBadge = (estado) => {
    const badges = {
      PENDIENTE: { class: 'badge-warning', text: 'Pendiente' },
      PAGADA: { class: 'badge-success', text: 'Pagada' },
      VENCIDA: { class: 'badge-danger', text: 'Vencida' }
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
              Cliente: {cliente.nombre} {cliente.apellido}
            </p>
          )}
        </div>
        <button 
          onClick={() => setShowPagoForm(!showPagoForm)}
          className="btn btn-primary"
        >
          {showPagoForm ? 'Cancelar' : '+ Registrar Pago'}
        </button>
      </div>

      {/* Formulario de pago */}
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
                  </tr>
                </thead>
                <tbody>
                  {cuotas.map(cuota => (
                    <tr key={cuota.cuotaId}>
                      <td>{cuota.numeroCuota}</td>
                      <td>{formatDate(cuota.fechaVencimiento)}</td>
                      <td>{formatMoney(cuota.montoObjetivo)}</td>
                      <td>{getEstadoCuotaBadge(cuota.estado)}</td>
                      <td>
                        {cuota.fechaCubierta ? formatDate(cuota.fechaCubierta) : '-'}
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
