import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { pagoApi } from '../services/pagoApi';
import { reporteApi } from '../services/reporteApi';
import { isAdmin } from '../services/authHelper';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { Alert } from '../components/Alert';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { getCacheWithTTL, setCacheWithTTL } from '../services/cache';

const CACHE_KEY = 'dashboard_summary_v1';
const TTL_MS = 5 * 60 * 1000; 

function mapSummaryToStats(summary) {
  return {
    totalClientes:
      summary.clientesActivos ??
      summary.totalClientes ??
      summary.totalClientesActivos ??
      0,

    totalPrestamosActivos:
      summary.prestamosActivos ??
      summary.totalPrestamosActivos ??
      0,

    cuotasPendientes:
      summary.cuotasPendientes ??
      summary.totalCuotasPendientes ??
      0,

    cuotasVencidas:
      summary.cuotasVencidas ??
      summary.totalCuotasVencidas ??
      0,

    totalPorCobrar:
      summary.totalPorCobrar ??
      summary.porCobrar ??
      0,

    totalRecaudado:
      summary.totalRecaudado ??
      summary.recaudado ??
      0
  };
}

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
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [alert, setAlert] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(null);

  const navigate = useNavigate();
  const userIsAdmin = isAdmin();

  useEffect(() => {
    loadData();
  }, []);

  useAutoRefresh(() => loadData(true));

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      if (!silent) {
        const cached = getCacheWithTTL(CACHE_KEY);
        if (cached) {
          setStats(mapSummaryToStats(cached));
          setLoading(false);
        }
      }

      const summary = await api.get('/api/dashboard/summary').then(r => r.data);

      setStats(mapSummaryToStats(summary));
      setCacheWithTTL(CACHE_KEY, summary, TTL_MS);

      if (userIsAdmin) {
        try {
          const solicitudes = await pagoApi.getSolicitudesPendientes();
          setSolicitudesPendientes(solicitudes || []);
        } catch (err) {
          console.error('Error cargando solicitudes:', err);
          setSolicitudesPendientes([]);
        }
      }
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
      setAlert({
        type: 'error',
        message: 'No se pudo cargar el dashboard: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAprobar = async (pagoId) => {
    const pago = solicitudesPendientes.find(p => p.pagoId === pagoId);
    const esLiquidacion = pago?.esLiquidacion;
    const msg = esLiquidacion
      ? `¿Aprobar la LIQUIDACIÓN del préstamo #${pago?.prestamoId}?\nEsto marcará el préstamo como LIQUIDADO y cubrirá todas las cuotas pendientes.`
      : '¿Confirmar aprobación de este pago?';
    if (!confirm(msg)) return;

    try {
      setProcesando(pagoId);
      await pagoApi.aprobar(pagoId);
      setAlert({ type: 'success', message: esLiquidacion ? 'Liquidación aprobada y ejecutada correctamente' : 'Pago aprobado correctamente' });
      await loadData(true);
    } catch (error) {
      console.error('Error al aprobar pago:', error);
      setAlert({
        type: 'error',
        message: 'Error al aprobar el pago: ' + (error.response?.data?.message || error.message)
      });
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
      setAlert({
        type: 'error',
        message: 'Error al rechazar el pago: ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setProcesando(null);
    }
  };

  const handleExportReporte = async (tipoReporte, dias = null) => {
    try {
      setExportingPdf(tipoReporte);

      switch (tipoReporte) {
        case 'cuotasProximas':
          await reporteApi.descargarReporteCuotasProximas(dias);
          break;
        case 'prestamosActivos':
          await reporteApi.descargarReportePrestamosActivos();
          break;
        case 'prestamosAtrasados':
          await reporteApi.descargarReportePrestamosAtrasados();
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }

      setAlert({ type: 'success', message: 'PDF exportado exitosamente' });
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      setAlert({ type: 'error', message: 'Error al exportar PDF' });
    } finally {
      setExportingPdf(null);
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
        </div>
      </div>

      {/* Alertas */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Estadísticas principales */}
      <div className="stats-grid">
        <div className="stat-card stat-card-blue" onClick={() => navigate('/clientes')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-modern">
            <span className="icon-bg blue">👥</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalClientes}</div>
            <div className="stat-label">Clientes Activos</div>
          </div>
          <div className="stat-trend">→</div>
        </div>

        <div className="stat-card stat-card-green" onClick={() => navigate('/prestamos')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-modern">
            <span className="icon-bg green">💰</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalPrestamosActivos}</div>
            <div className="stat-label">Préstamos Activos</div>
          </div>
          <div className="stat-trend">→</div>
        </div>

        <div className="stat-card stat-card-orange" onClick={() => navigate('/cuotas')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-modern">
            <span className="icon-bg orange">📅</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.cuotasPendientes}</div>
            <div className="stat-label">Cuotas Pendientes</div>
          </div>
          <div className="stat-trend">→</div>
        </div>

        <div className="stat-card stat-card-danger" onClick={() => navigate('/cuotas')} style={{ cursor: 'pointer' }}>
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

      {/* Solicitudes de Pago (Solo ADMIN) */}
      {userIsAdmin && (
        <div className="card mt-4">
          <div className="card-header">
            <h3><span className="card-title-icon">💬</span> Solicitudes de Pago Pendientes</h3>
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
                        <td>
                          <span className="badge badge-secondary">#{pago.prestamoId}</span>
                          {pago.esLiquidacion && (
                            <span style={{ marginLeft: '0.4rem', backgroundColor: '#dc3545', color: '#fff', padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                              LIQUIDACIÓN
                            </span>
                          )}
                        </td>
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

      {/* Sección de Reportes en PDF */}
      <div className="card mt-4">
        <div className="card-header">
          <h3><span className="card-title-icon">📊</span> Reportes y Exportaciones</h3>
        </div>
        <div className="card-body">
          <p style={{ marginBottom: '1.5rem', color: '#6c757d' }}>
            Genera y descarga reportes en PDF con información detallada del negocio
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#f8f9fa' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>📅 Cuotas Próximas</h4>
              <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
                Reporte de cuotas próximas a vencer
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleExportReporte('cuotasProximas', 7)}
                  className="btn btn-secondary btn-sm"
                  disabled={exportingPdf === 'cuotasProximas' ? exportingPdf : false}
                  style={{ flex: '1', minWidth: '80px' }}
                >
                  {exportingPdf === 'cuotasProximas' ? '⏳...' : '7 días'}
                </button>
                <button
                  onClick={() => handleExportReporte('cuotasProximas', 15)}
                  className="btn btn-secondary btn-sm"
                  disabled={exportingPdf === 'cuotasProximas'}
                  style={{ flex: '1', minWidth: '80px' }}
                >
                  15 días
                </button>
                <button
                  onClick={() => handleExportReporte('cuotasProximas', 30)}
                  className="btn btn-secondary btn-sm"
                  disabled={exportingPdf === 'cuotasProximas'}
                  style={{ flex: '1', minWidth: '80px' }}
                >
                  30 días
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#f8f9fa' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>💰 Préstamos Activos</h4>
              <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
                Listado completo de préstamos activos con resumen financiero
              </p>
              <button
                onClick={() => handleExportReporte('prestamosActivos')}
                className="btn btn-primary btn-sm"
                disabled={exportingPdf === 'prestamosActivos'}
                style={{ width: '100%' }}
              >
                {exportingPdf === 'prestamosActivos' ? '⏳ Exportando...' : '📄 Exportar PDF'}
              </button>
            </div>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#f8f9fa' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>⚠️ Préstamos Atrasados</h4>
              <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '1rem' }}>
                Reporte de préstamos con pagos vencidos
              </p>
              <button
                onClick={() => handleExportReporte('prestamosAtrasados')}
                className="btn btn-danger btn-sm"
                disabled={exportingPdf === 'prestamosAtrasados'}
                style={{ width: '100%' }}
              >
                {exportingPdf === 'prestamosAtrasados' ? '⏳ Exportando...' : '📄 Exportar PDF'}
              </button>
            </div>
          </div>

          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d', fontStyle: 'italic' }}>
            💡 Consejo: También puedes exportar información detallada de clientes y préstamos individuales desde sus páginas de detalle
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;