import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrestamoCard = ({ prestamo, clienteNombre }) => {
  const navigate = useNavigate();

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
      ACTIVO: { class: 'badge-success', text: 'Activo' },
      FINALIZADO: { class: 'badge-secondary', text: 'Finalizado' },
      CANCELADO: { class: 'badge-danger', text: 'Cancelado' }
    };
    const badge = badges[estado] || { class: 'badge-secondary', text: estado };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const getTipoAcuerdoText = (tipo) => {
    const tipos = {
      PENALIZACION_POR_DIA: 'Penalización por día',
      PAGO_EN_MES: 'Pago en mes (2 cuotas)',
      QUINCENAS_DOBLES: 'Quincenas dobles',
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="card prestamo-card">
      <div className="card-header">
        <div>
          <h3>{clienteNombre}</h3>
          <p className="text-muted">Préstamo #{prestamo.prestamoId}</p>
        </div>
        {getEstadoBadge(prestamo.estado)}
      </div>
      
      <div className="card-body">
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Monto Prestado:</span>
            <span className="value">{formatMoney(prestamo.montoPrestado)}</span>
          </div>
          
          <div className="info-item">
            <span className="label">Total a Pagar:</span>
            <span className="value total-amount">{formatMoney(prestamo.totalObjetivo)}</span>
          </div>
          
          <div className="info-item">
            <span className="label">Interés:</span>
            <span className="value">{(prestamo.interesBase * 100).toFixed(2)}%</span>
          </div>
          
          <div className="info-item">
            <span className="label">Tipo de Acuerdo:</span>
            <span className="value">{getTipoAcuerdoText(prestamo.tipoAcuerdo)}</span>
          </div>
          
          <div className="info-item">
            <span className="label">Fecha Inicio:</span>
            <span className="value">{formatDate(prestamo.fechaInicio)}</span>
          </div>
          
          <div className="info-item">
            <span className="label">Cuotas:</span>
            <span className="value">{prestamo.cuotas?.length || 0}</span>
          </div>
        </div>
      </div>
      
      <div className="card-footer">
        <button 
          onClick={() => navigate(`/prestamos/${prestamo.prestamoId}`)}
          className="btn btn-primary btn-sm"
        >
          Ver Detalles
        </button>
      </div>
    </div>
  );
};

export default PrestamoCard;
