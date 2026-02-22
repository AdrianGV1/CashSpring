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
      PAGADO: { class: 'badge-info', text: 'Pagado' },
      ATRASADO: { class: 'badge-danger', text: 'Atrasado' },
      CANCELADO: { class: 'badge-danger', text: 'Cancelado' }
    };
    const badge = badges[estado] || { class: 'badge-secondary', text: estado };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const getTipoAcuerdoText = (tipo) => {
    const tipos = {
      PENALIZACION_POR_DIA: 'QUINCENA ÚNICA',
      PAGO_EN_MES: 'VARIAS QUINCENAS',
      QUINCENAS_DOBLES: 'DOBLE',
    };
    return tipos[tipo] || tipo;
  };

  const esFinalizado = prestamo.estado === 'PAGADO';

  return (
    <div
      className="card prestamo-card"
      style={esFinalizado ? { border: '2px solid #10b981', opacity: 0.92 } : {}}
    >
      {esFinalizado && (
        <div
          style={{
            background: 'linear-gradient(90deg, #10b981, #059669)',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '0.78rem',
            padding: '0.3rem 0',
            letterSpacing: '0.08em',
            borderRadius: '6px 6px 0 0'
          }}
        >
          ✔ PRÉSTAMO PAGADO COMPLETO
        </div>
      )}
      <div className="card-header" style={esFinalizado ? { background: '#f0fdf4' } : {}}>
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
