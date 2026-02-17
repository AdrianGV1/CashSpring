import React, { useState, useEffect } from 'react';
import { pagoApi } from '../services/pagoApi';
import { prestamoApi } from '../services/prestamoApi';
import { clienteApi } from '../services/api';

const PagosPage = () => {
  const [pagos, setPagos] = useState([]);
  const [prestamos, setPrestamos] = useState({});
  const [clientes, setClientes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [pagosData, prestamosData, clientesData] = await Promise.all([
        pagoApi.getAll(),
        prestamoApi.getAll(),
        clienteApi.getAll()
      ]);

      setPagos(pagosData);

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
      setError('Error al cargar pagos');
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

  // Ordenar pagos por fecha (más recientes primero)
  const pagosOrdenados = [...pagos].sort((a, b) => {
    return new Date(b.fechaPago) - new Date(a.fechaPago);
  });

  // Calcular totales
  const totalPagos = pagos.reduce((sum, pago) => sum + pago.monto, 0);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando pagos...</div>
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
          <h1>Pagos</h1>
          <p className="subtitle">Historial de todos los pagos recibidos</p>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{pagos.length}</div>
          <div className="stat-label">Total Pagos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatMoney(totalPagos)}</div>
          <div className="stat-label">Monto Total Recibido</div>
        </div>
      </div>

      {pagosOrdenados.length === 0 ? (
        <div className="empty-state">
          <h3>No hay pagos registrados</h3>
          <p>Los pagos se registran desde la página de cada préstamo</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Préstamo</th>
                  <th>Monto</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {pagosOrdenados.map(pago => {
                  const prestamo = prestamos[pago.prestamoId];
                  const cliente = prestamo ? clientes[prestamo.clienteId] : null;

                  return (
                    <tr key={pago.pagoId}>
                      <td>{formatDate(pago.fechaPago)}</td>
                      <td>
                        {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'N/A'}
                      </td>
                      <td>#{pago.prestamoId}</td>
                      <td className="success">{formatMoney(pago.monto)}</td>
                      <td>{pago.notas || '-'}</td>
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

export default PagosPage;
