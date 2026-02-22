import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteApi } from '../services/api';
import { prestamoApi } from '../services/prestamoApi';
import { cuotaApi } from '../services/cuotaApi';
import { pagoApi } from '../services/pagoApi';
import { isAdmin } from '../services/authHelper';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { Alert } from '../components/Alert';
import useAutoRefresh from '../hooks/useAutoRefresh';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalPrestamosActivos: 0,
    cuotasPendientes: 0,
    cuotasVencidas: 0,
    totalPorCobrar: 0,
    totalRecaudado: 0
  });
  const [loading, setLoading] = useState(true);
  const [ultimasActividades, setUltimasActividades] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [alert, setAlert] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const navigate = useNavigate();
  const userIsAdmin = isAdmin();

  useEffect(() => {
    loadData();
  }, []);

  useAutoRefresh(() => loadData(true));

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const [clientes, prestamos, cuotas, pagos] = await Promise.all([
        clienteApi.getAll(),
        prestamoApi.getAll(),
        cuotaApi.getAll(),
        pagoApi.getAll()
      ]);

      // Si es admin, cargar solicitudes pendientes
      if (userIsAdmin) {
        try {
          const solicitudes = await pagoApi.getSolicitudesPendientes();
          setSolicitudesPendientes(solicitudes || []);
        } catch (err) {
          console.error('Error cargando solicitudes:', err);
          setSolicitudesPendientes([]);
        }
      }

      // Calcular estadísticas
      const prestamosActivos = prestamos.filter(p => p.estado === 'ACTIVO');
      const cuotasPendientes = cuotas.filter(c => c.estado === 'PENDIENTE');
      const cuotasVencidas = cuotas.filter(c => {
        if (c.estado === 'PAGADA') return false;
        return new Date(c.fechaVencimiento) < new Date();
      });

      // Filtrar solo pagos aprobados para cálculos
      const pagosAprobados = pagos.filter(p => p.estadoAprobacion === 'APROBADO');

      const totalPorCobrar = prestamosActivos.reduce((sum, p) => {
        const pagado = pagosAprobados
          .filter(pago => pago.prestamoId === p.prestamoId)
          .reduce((s, pago) => s + pago.monto, 0);
        return sum + (p.totalObjetivo - pagado);
      }, 0);

      const totalRecaudado = pagosAprobados.reduce((sum, p) => sum + p.monto, 0);

      setStats({
        totalClientes: clientes.filter(c => c.activo).length,
        totalPrestamosActivos: prestamosActivos.length,
        cuotasPendientes: cuotasPendientes.length,
        cuotasVencidas: cuotasVencidas.length,
        totalPorCobrar,
        totalRecaudado
      });

      // Si no es admin, mostrar últimos pagos aprobados (comportamiento original)
      if (!userIsAdmin) {
        const ultimosPagos = pagosAprobados
          .sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago))
          .slice(0, 5)
          .map(pago => {
            const prestamo = prestamos.find(p => p.prestamoId === pago.prestamoId);
            const cliente = prestamo ? clientes.find(c => c.clienteId === prestamo.clienteId) : null;
            return {
              ...pago,
              clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'N/A'
            };
          });

        setUltimasActividades(ultimosPagos);
      }

    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAprobar = async (pagoId) => {
    if (!confirm('¿Confirmar aprobación de este pago?')) return;
    
    try {
      setProcesando(pagoId);
      await pagoApi.aprobar(pagoId);
      setAlert({ type: 'success', message: 'Pago aprobado correctamente' });
      await loadData(true);
    } catch (error) {
      console.error('Error al aprobar pago:', error);
      setAlert({ type: 'error', message: 'Error al aprobar el pago: ' + (error.response?.data?.message || error.message) });
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (pagoId) => {
    if (!confirm('¿Confirmar rechazo de este pago? Esta acción no se puede deshacer.')) return;
    
    try {
      setProcesando(pagoId);
      await pagoApi.rechazar(pagoId);
      setAlert({ type: 'success', message: 'Pago rechazado correctamente' });
      await loadData(true);
    } catch (error) {
      console.error('Error al rechazar pago:', error);
      setAlert({ type: 'error', message: 'Error al rechazar el pago: ' + (error.response?.data?.message || error.message) });
    } finally {
      setProcesando(null);
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

  if (loading) {
    return <Loading message="Cargando información..." fullScreen={true} />;
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>🏠 Inicio</h1>
          <p className="subtitle">Resumen general de tu negocio de microfinanzas</p>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="stats-grid">
        <div className="stat-card stat-card-blue" onClick={() => navigate('/clientes')} style={{cursor: 'pointer'}}>
          <div className="stat-icon-modern">
            <span className="icon-bg blue">👥</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalClientes}</div>
            <div className="stat-label">Clientes Activos</div>
          </div>
          <div className="stat-trend">→</div>
        </div>

        <div className="stat-card stat-card-green" onClick={() => navigate('/prestamos')} style={{cursor: 'pointer'}}>
          <div className="stat-icon-modern">
            <span className="icon-bg green">💰</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalPrestamosActivos}</div>
            <div className="stat-label">Préstamos Activos</div>
          </div>
          <div className="stat-trend">→</div>
        </div>

        <div className="stat-card stat-card-orange" onClick={() => navigate('/cuotas')} style={{cursor: 'pointer'}}>
          <div className="stat-icon-modern">
            <span className="icon-bg orange">📅</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.cuotasPendientes}</div>
            <div className="stat-label">Cuotas Pendientes</div>
          </div>
          <div className="stat-trend">→</div>
        </div>

        <div 
          className="stat-card stat-card-danger" 
          onClick={() => navigate('/cuotas')} 
          style={{cursor: 'pointer'}}
        >
          <div className="stat-icon-modern">
            <span className="icon-bg red">⚠️</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.cuotasVencidas}</div>
            <div className="stat-label">Cuotas Vencidas</div>
          </div>
          <div className="stat-trend">→</div>
        </div>
      </div>

      {/* Resumen financiero - Solo para Admin */}
      {userIsAdmin && (
        <div className="grid-2 mt-4">
          <div className="card card-financial card-danger-light">
            <div className="card-header">
              <h3><span className="card-title-icon">💸</span> Por Cobrar</h3>
            </div>
            <div className="card-body">
              <div className="financial-stat">
                <div className="financial-amount danger">
                  {formatMoney(stats.totalPorCobrar)}
                </div>
                <p className="text-muted">
                  <span className="info-icon">ℹ️</span>
                  Total pendiente de cobro en préstamos activos
                </p>
              </div>
            </div>
          </div>

          <div className="card card-financial card-success-light">
            <div className="card-header">
              <h3><span className="card-title-icon">✅</span> Recaudado</h3>
            </div>
            <div className="card-body">
              <div className="financial-stat">
                <div className="financial-amount success">
                  {formatMoney(stats.totalRecaudado)}
                </div>
                <p className="text-muted">
                  <span className="info-icon">📈</span>
                  Total recaudado históricamente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Solicitudes de Pago (Solo ADMIN) */}
      {userIsAdmin && (
        <div className="card mt-4">
          <div className="card-header">
            <h3><span className="card-title-icon">⏳</span> Solicitudes de Pago Pendientes</h3>
          </div>
          <div className="card-body">
            {solicitudesPendientes.length === 0 ? (
              <EmptyState 
                icon="✅"
                title="Sin solicitudes pendientes"
                message="Todas las solicitudes han sido procesadas"
              />
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th><span className="th-icon">📅</span> Fecha</th>
                      <th><span className="th-icon">👤</span> Cliente</th>
                      <th><span className="th-icon">📋</span> Cédula</th>
                      <th><span className="th-icon">💳</span> Préstamo</th>
                      <th><span className="th-icon">💵</span> Monto</th>
                      <th><span className="th-icon">⚙️</span> Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesPendientes.map(pago => (
                      <tr key={pago.pagoId}>
                        <td><span className="badge badge-date">{formatDate(pago.fechaPago)}</span></td>
                        <td className="font-medium">{pago.clienteNombre}</td>
                        <td><span className="badge badge-secondary">{pago.clienteCedula}</span></td>
                        <td><span className="badge badge-secondary">#{pago.prestamoId}</span></td>
                        <td><span className="text-success font-bold">{formatMoney(pago.monto)}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleAprobar(pago.pagoId)}
                              disabled={procesando === pago.pagoId}
                              className="btn btn-sm btn-success"
                              title="Aprobar pago"
                            >
                              {procesando === pago.pagoId ? '⏳' : '✓'} Aprobar
                            </button>
                            <button
                              onClick={() => handleRechazar(pago.pagoId)}
                              disabled={procesando === pago.pagoId}
                              className="btn btn-sm btn-danger"
                              title="Rechazar pago"
                            >
                              {procesando === pago.pagoId ? '⏳' : '✗'} Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
