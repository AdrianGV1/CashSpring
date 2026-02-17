import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { prestamoApi } from '../services/prestamoApi';
import { clienteApi } from '../services/api';
import PrestamoCard from '../components/PrestamoCard';

const PrestamosPage = () => {
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState({});
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
      const [prestamosData, clientesData] = await Promise.all([
        prestamoApi.getAll(),
        clienteApi.getAll()
      ]);
      
      setPrestamos(prestamosData);
      
      // Crear mapa de clientes para fácil acceso
      const clientesMap = {};
      clientesData.forEach(cliente => {
        clientesMap[cliente.clienteId] = `${cliente.nombre} ${cliente.apellido}`;
      });
      setClientes(clientesMap);
      
    } catch (err) {
      setError('Error al cargar préstamos. Verifica que el backend esté corriendo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const prestamosFiltrados = prestamos.filter(prestamo => {
    if (filtro === 'TODOS') return true;
    return prestamo.estado === filtro;
  });

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando préstamos...</div>
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
            className={`filter-btn ${filtro === 'FINALIZADO' ? 'active' : ''}`}
            onClick={() => setFiltro('FINALIZADO')}
          >
            Finalizados ({prestamos.filter(p => p.estado === 'FINALIZADO').length})
          </button>
        </div>
      </div>

      {prestamosFiltrados.length === 0 ? (
        <div className="empty-state">
          <h3>No hay préstamos {filtro !== 'TODOS' ? filtro.toLowerCase() + 's' : ''}</h3>
          <p>Crea tu primer préstamo para comenzar</p>
          <button 
            onClick={() => navigate('/prestamos/nuevo')}
            className="btn btn-primary"
          >
            + Crear Préstamo
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {prestamosFiltrados.map(prestamo => (
            <PrestamoCard
              key={prestamo.prestamoId}
              prestamo={prestamo}
              clienteNombre={clientes[prestamo.clienteId] || 'Cliente desconocido'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PrestamosPage;
