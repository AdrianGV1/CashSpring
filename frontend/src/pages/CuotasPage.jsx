import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cuotaApi } from '../services/cuotaApi';

const CuotasPage = () => {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const cuotasData = await cuotaApi.getAll();
      setCuotas(cuotasData);

    } catch (err) {
      setError('Error al cargar cuotas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) =>
    new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('es-CR');

  const getEstadoBadge = (estado) => {
    const badges = {
      PENDIENTE: { cls: 'badge-warning', text: 'Pendiente' },
      PAGADA:    { cls: 'badge-success', text: 'Pagada' },
      VENCIDA:   { cls: 'badge-danger',  text: 'Vencida' },
    };
    const b = badges[estado] || { cls: 'badge-secondary', text: estado };
    return <span className={`badge ${b.cls}`}>{b.text}</span>;
  };

  const isVencida = (fechaVencimiento, estado) => {
    if (estado === 'PAGADA') return false;
    return new Date(fechaVencimiento) < new Date();
  };

  const cuotasFiltradas = cuotas.filter((c) => {
    if (filtro === 'TODOS') return true;
    if (filtro === 'VENCIDAS') return isVencida(c.fechaVencimiento, c.estado);
    return c.estado === filtro;
  });

  const cuotasOrdenadas = [...cuotasFiltradas].sort(
    (a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento)
  );

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
          <button onClick={loadData} className="btn btn-primary">Reintentar</button>
        </div>
      </div>
    );
  }

  const cuotasVencidas  = cuotas.filter((c) => isVencida(c.fechaVencimiento, c.estado)).length;
  const cuotasPendientes = cuotas.filter((c) => c.estado === 'PENDIENTE').length;
  const cuotasPagadas   = cuotas.filter((c) => c.estado === 'PAGADA').length;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Cuotas</h1>
          <p className="subtitle">Seguimiento de cuotas de todos los prestamos</p>
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
        <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f8d7da', borderRadius: '6px', color: '#842029' }}>
          Hay {cuotasVencidas} cuota{cuotasVencidas > 1 ? 's' : ''} vencida{cuotasVencidas > 1 ? 's' : ''}
        </div>
      )}

      {cuotasOrdenadas.length === 0 ? (
        <div className="empty-state">
          <h3>No hay cuotas {filtro !== 'TODOS' ? filtro.toLowerCase() + 's' : ''}</h3>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Prestamo</th>
                  <th># Cuota</th>
                  <th>Vencimiento</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha Cubierta</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuotasOrdenadas.map((cuota) => {
                  const vencida = isVencida(cuota.fechaVencimiento, cuota.estado);

                  return (
                    <tr key={cuota.cuotaId} style={vencida ? { background: '#fff5f5' } : {}}>
                      <td>{cuota.clienteNombre || 'N/A'}</td>
                      <td>
                        <button
                          className="btn-link"
                          onClick={() => navigate(`/prestamos/${cuota.prestamoId}`)}
                          style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', padding: 0 }}
                        >
                          #{cuota.prestamoId}
                        </button>
                      </td>
                      <td>{cuota.numeroCuota}</td>
                      <td>
                        {formatDate(cuota.fechaVencimiento)}
                        {vencida && (
                          <span style={{ color: '#dc3545', fontWeight: 600, marginLeft: '0.4rem' }}>!</span>
                        )}
                      </td>
                      <td>{formatMoney(cuota.montoObjetivo)}</td>
                      <td>{getEstadoBadge(cuota.estado)}</td>
                      <td>{cuota.fechaCubierta ? formatDate(cuota.fechaCubierta) : '-'}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => navigate(`/prestamos/${cuota.prestamoId}`)}
                        >
                          Ver prestamo
                        </button>
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