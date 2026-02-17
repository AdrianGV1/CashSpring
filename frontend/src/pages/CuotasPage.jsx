import React, { useState, useEffect } from 'react';
import { cuotaApi } from '../services/cuotaApi';
import { prestamoApi } from '../services/prestamoApi';
import { clienteApi } from '../services/api';

const CuotasPage = () => {
  const [cuotas, setCuotas] = useState([]);
  const [prestamos, setPrestamos] = useState({});
  const [clientes, setClientes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [cuotasData, prestamosData, clientesData] = await Promise.all([
        cuotaApi.getAll(),
        prestamoApi.getAll(),
        clienteApi.getAll()
      ]);

      setCuotas(cuotasData);

      // Crear mapas para fácil acceso
      const prestamosMap = {};
      prestamosData.forEach(prestamo => {
        prestamosMap[prestamo.prestamoId] = prestamo;
      });
      setPrestamos(prestamosMap);

      const clientesMap = {};
      clientesData.forEach(cliente => {
        clientesMap[cliente.clienteId] = cliente;
      });
      setClientes(clientesMap);

    } catch (err) {
      setError('Error al cargar cuotas');
      console.error(err);
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

  const getEstadoBadge = (estado) => {
    const badges = {
      PENDIENTE: { class: 'badge-warning', text: 'Pendiente' },
      PAGADA: { class: 'badge-success', text: 'Pagada' },
      VENCIDA: { class: 'badge-danger', text: 'Vencida' }
    };
    const badge = badges[estado] || { class: 'badge-secondary', text: estado };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const isVencida = (fechaVencimiento, estado) => {
    if (estado === 'PAGADA') return false;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    return vencimiento < hoy;
  };

  const cuotasFiltradas = cuotas.filter(cuota => {
    if (filtro === 'TODOS') return true;
    if (filtro === 'VENCIDAS') {
      return isVencida(cuota.fechaVencimiento, cuota.estado);
    }
    return cuota.estado === filtro;
  });

  // Ordenar por fecha de vencimiento
  const cuotasOrdenadas = [...cuotasFiltradas].sort((a, b) => {
    return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento);
  });

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando cuotas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={loadData} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const cuotasVencidas = cuotas.filter(c => isVencida(c.fechaVencimiento, c.estado)).length;
  const cuotasPendientes = cuotas.filter(c => c.estado === 'PENDIENTE').length;
  const cuotasPagadas = cuotas.filter(c => c.estado === 'PAGADA').length;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Cuotas</h1>
          <p className="subtitle">Seguimiento de cuotas de todos los préstamos</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filtro === 'TODOS' ? 'active' : ''}`}
            onClick={() => setFiltro('TODOS')}
          >
            Todas ({cuotas.length})
          </button>
          <button 
            className={`filter-btn ${filtro === 'PENDIENTE' ? 'active' : ''}`}
            onClick={() => setFiltro('PENDIENTE')}
          >
            Pendientes ({cuotasPendientes})
          </button>
          <button 
            className={`filter-btn ${filtro === 'PAGADA' ? 'active' : ''}`}
            onClick={() => setFiltro('PAGADA')}
          >
            Pagadas ({cuotasPagadas})
          </button>
          <button 
            className={`filter-btn ${filtro === 'VENCIDAS' ? 'active' : ''}`}
            onClick={() => setFiltro('VENCIDAS')}
          >
            Vencidas ({cuotasVencidas})
          </button>
        </div>
      </div>

      {cuotasVencidas > 0 && filtro === 'TODOS' && (
        <div className="alert alert-danger">
          ⚠️ Hay {cuotasVencidas} cuota{cuotasVencidas > 1 ? 's' : ''} vencida{cuotasVencidas > 1 ? 's' : ''}
        </div>
      )}

      {cuotasOrdenadas.length === 0 ? (
        <div className="empty-state">
          <h3>No hay cuotas {filtro !== 'TODOS' ? filtro.toLowerCase() : ''}</h3>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Préstamo</th>
                  <th># Cuota</th>
                  <th>Fecha Vencimiento</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha Cubierta</th>
                </tr>
              </thead>
              <tbody>
                {cuotasOrdenadas.map(cuota => {
                  const prestamo = prestamos[cuota.prestamoId];
                  const cliente = prestamo ? clientes[prestamo.clienteId] : null;
                  const vencida = isVencida(cuota.fechaVencimiento, cuota.estado);

                  return (
                    <tr key={cuota.cuotaId} className={vencida ? 'row-vencida' : ''}>
                      <td>
                        {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'N/A'}
                      </td>
                      <td>#{cuota.prestamoId}</td>
                      <td>{cuota.numeroCuota}</td>
                      <td>
                        {formatDate(cuota.fechaVencimiento)}
                        {vencida && <span className="text-danger"> ⚠️</span>}
                      </td>
                      <td>{formatMoney(cuota.montoObjetivo)}</td>
                      <td>{getEstadoBadge(cuota.estado)}</td>
                      <td>
                        {cuota.fechaCubierta ? formatDate(cuota.fechaCubierta) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuotasPage;
