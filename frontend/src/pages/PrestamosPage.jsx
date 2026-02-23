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
  const [searchTerm, setSearchTerm] = useState('');
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
      const sorted = [...data].sort((a, b) => b.prestamoId - a.prestamoId);
      setPrestamos(sorted);
    } catch (err) {
      if (!silent) setError('Error al cargar préstamos. Verifica que el backend esté corriendo.');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const prestamosFiltrados = prestamos
    .filter(prestamo => {
      if (filtro === 'TODOS') return true;
      return prestamo.estado === filtro;
    })
    .filter(prestamo => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (prestamo.clienteNombre || '').toLowerCase().includes(term) ||
        String(prestamo.prestamoId).includes(term)
      );
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
      <div className='mb-8'>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className='text-2xl font-bold text-gray-800'>💰 Lista de Préstamos</h1>
          <button
            onClick={() => navigate('/prestamos/nuevo')}
            className="btn btn-primary"
          >
            + Nuevo Préstamo
          </button>
        </div>
        <div className='mb-4'>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre de cliente o # de préstamo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
        <p className='text-gray-600'>
          Total: <strong>{prestamosFiltrados.length}</strong> préstamo{prestamosFiltrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="filters-bar">
        <div className="filter-buttons">
          {[
            { key: 'TODOS',     label: 'Todos',      cls: 'filter-btn-gray'  },
            { key: 'ACTIVO',    label: 'Activos',    cls: 'filter-btn-gray'  },
            { key: 'PAGADO',    label: 'Pagados',    cls: 'filter-btn-green' },
            { key: 'LIQUIDADO', label: 'Liquidados', cls: 'filter-btn-blue'  },
            { key: 'ATRASADO',  label: 'Atrasados',  cls: 'filter-btn-red'   },
          ].map(({ key, label, cls }) => {
            const base = prestamos.filter(p => !searchTerm || (p.clienteNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(p.prestamoId).includes(searchTerm));
            const count = key === 'TODOS' ? base.length : base.filter(p => p.estado === key).length;
            return (
              <button
                key={key}
                className={`filter-btn ${cls} ${filtro === key ? 'active' : ''}`}
                onClick={() => setFiltro(key)}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {prestamosFiltrados.length === 0 ? (
        <EmptyState
          icon={searchTerm ? '🔍' : '💰'}
          title={searchTerm ? 'No se encontraron resultados' : `No hay préstamos${filtro !== 'TODOS' ? ` ${filtro.toLowerCase()}s` : ''}`}
          message={
            searchTerm
              ? `No se encontraron préstamos que coincidan con "${searchTerm}"`
              : filtro === 'TODOS'
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
