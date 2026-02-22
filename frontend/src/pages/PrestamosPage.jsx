import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { prestamoApi } from '../services/prestamoApi';
import PrestamoCard from '../components/PrestamoCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { ErrorAlert } from '../components/Alert';
import useAutoRefresh from '../hooks/useAutoRefresh';

const PrestamosPage = () => {
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useAutoRefresh(() => loadData(true));

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      const data = await prestamoApi.getAll();
      setPrestamos(data);
    } catch (err) {
      if (!silent) setError('Error al cargar préstamos. Verifica que el backend esté corriendo.');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const prestamosFiltrados = prestamos.filter(prestamo => {
    if (filtro === 'TODOS') return true;
    return prestamo.estado === filtro;
  });

  if (loading) {
    return <Loading message="Cargando préstamos..." fullScreen={true} />;
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <ErrorAlert 
          title="Error al cargar préstamos"
          message={error}
        />
        <button onClick={loadData} className="btn btn-primary btn-block mt-4">
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Préstamos</h1>
          <p className="subtitle">Gestiona los préstamos de tus clientes</p>
        </div>
        <button 
          onClick={() => navigate('/prestamos/nuevo')}
          className="btn btn-primary"
        >
          + Nuevo Préstamo
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filtro === 'TODOS' ? 'active' : ''}`}
            onClick={() => setFiltro('TODOS')}
          >
            Todos ({prestamos.length})
          </button>
          <button 
            className={`filter-btn ${filtro === 'ACTIVO' ? 'active' : ''}`}
            onClick={() => setFiltro('ACTIVO')}
          >
            Activos ({prestamos.filter(p => p.estado === 'ACTIVO').length})
          </button>
          <button 
            className={`filter-btn ${filtro === 'PAGADO' ? 'active' : ''}`}
            onClick={() => setFiltro('PAGADO')}
          >
            Pagados ({prestamos.filter(p => p.estado === 'PAGADO').length})
          </button>
        </div>
      </div>

      {prestamosFiltrados.length === 0 ? (
        <EmptyState
          icon="💰"
          title={`No hay préstamos ${filtro !== 'TODOS' ? filtro.toLowerCase() + 's' : ''}`}
          message={filtro === 'TODOS' 
            ? 'Aún no tienes préstamos registrados. ¡Crea tu primer préstamo para comenzar!' 
            : `No hay préstamos en estado ${filtro.toLowerCase()}`
          }
          action={
            <button 
              onClick={() => navigate('/prestamos/nuevo')}
              className="btn btn-primary"
            >
              ➕ Crear Préstamo
            </button>
          }
        />
      ) : (
        <div className="cards-grid">
          {prestamosFiltrados.map(prestamo => (
            <PrestamoCard
              key={prestamo.prestamoId}
              prestamo={prestamo}
              clienteNombre={prestamo.clienteNombre || 'Cliente desconocido'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PrestamosPage;
