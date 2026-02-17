import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clienteApi } from '../services/api';
import { prestamoApi } from '../services/prestamoApi';
import { cuotaApi } from '../services/cuotaApi';
import { pagoApi } from '../services/pagoApi';

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
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [clientes, prestamos, cuotas, pagos] = await Promise.all([
        clienteApi.getAll(),
        prestamoApi.getAll(),
        cuotaApi.getAll(),
        pagoApi.getAll()
      ]);

      // Calcular estadísticas
      const prestamosActivos = prestamos.filter(p => p.estado === 'ACTIVO');
      const cuotasPendientes = cuotas.filter(c => c.estado === 'PENDIENTE');
      const cuotasVencidas = cuotas.filter(c => {
        if (c.estado === 'PAGADA') return false;
        return new Date(c.fechaVencimiento) < new Date();
      });

      const totalPorCobrar = prestamosActivos.reduce((sum, p) => {
        const pagado = pagos
          .filter(pago => pago.prestamoId === p.prestamoId)
          .reduce((s, pago) => s + pago.monto, 0);
        return sum + (p.totalObjetivo - pagado);
      }, 0);

      const totalRecaudado = pagos.reduce((sum, p) => sum + p.monto, 0);

      setStats({
        totalClientes: clientes.filter(c => c.activo).length,
        totalPrestamosActivos: prestamosActivos.length,
        cuotasPendientes: cuotasPendientes.length,
        cuotasVencidas: cuotasVencidas.length,
        totalPorCobrar,
        totalRecaudado
      });

      // Últimas actividades (últimos 5 pagos)
      const ultimosPagos = pagos
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

    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setLoading(false);
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
    return (
      <div className="container">
        <div className="loading">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Resumen general de tu negocio</p>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/clientes')} style={{cursor: 'pointer'}}>
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalClientes}</div>
          <div className="stat-label">Clientes Activos</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/prestamos')} style={{cursor: 'pointer'}}>
          <div className="stat-icon">💰</div>
          <div className="stat-value">{stats.totalPrestamosActivos}</div>
          <div className="stat-label">Préstamos Activos</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/cuotas')} style={{cursor: 'pointer'}}>
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats.cuotasPendientes}</div>
          <div className="stat-label">Cuotas Pendientes</div>
        </div>

        <div 
          className="stat-card stat-card-danger" 
          onClick={() => navigate('/cuotas')} 
          style={{cursor: 'pointer'}}
        >
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{stats.cuotasVencidas}</div>
          <div className="stat-label">Cuotas Vencidas</div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid-2 mt-4">
        <div className="card">
          <div className="card-header">
            <h3>Por Cobrar</h3>
          </div>
          <div className="card-body">
            <div className="financial-stat">
              <div className="financial-amount danger">
                {formatMoney(stats.totalPorCobrar)}
              </div>
              <p className="text-muted">Total pendiente de cobro</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recaudado</h3>
          </div>
          <div className="card-body">
            <div className="financial-stat">
              <div className="financial-amount success">
                {formatMoney(stats.totalRecaudado)}
              </div>
              <p className="text-muted">Total recaudado históricamente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Últimas actividades */}
      <div className="card mt-4">
        <div className="card-header">
          <h3>Últimos Pagos Recibidos</h3>
        </div>
        <div className="card-body">
          {ultimasActividades.length === 0 ? (
            <p className="text-muted">No hay actividad reciente</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Préstamo</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasActividades.map(pago => (
                    <tr key={pago.pagoId}>
                      <td>{formatDate(pago.fechaPago)}</td>
                      <td>{pago.clienteNombre}</td>
                      <td>#{pago.prestamoId}</td>
                      <td className="success">{formatMoney(pago.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="quick-actions mt-4">
        <h3>Acciones Rápidas</h3>
        <div className="actions-grid">
          <button 
            onClick={() => navigate('/clientes/nuevo')}
            className="action-btn"
          >
            <span className="action-icon">👤</span>
            Nuevo Cliente
          </button>
          <button 
            onClick={() => navigate('/prestamos/nuevo')}
            className="action-btn"
          >
            <span className="action-icon">💵</span>
            Nuevo Préstamo
          </button>
          <button 
            onClick={() => navigate('/cuotas')}
            className="action-btn"
          >
            <span className="action-icon">📋</span>
            Ver Cuotas
          </button>
          <button 
            onClick={() => navigate('/pagos')}
            className="action-btn"
          >
            <span className="action-icon">💳</span>
            Ver Pagos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
