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
    if (!dateString) return '';
    const [y, m, d] = dateString.split('T')[0].split('-');
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-CR');
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      ACTIVO: { class: 'badge-secondary', text: 'Activo' },
      PAGADO: { class: 'badge-success', text: 'Pagado' },
      LIQUIDADO: { class: 'badge-info', text: 'Liquidado' },
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

  const esActivo = prestamo.estado === 'ACTIVO';
  const esPagado = prestamo.estado === 'PAGADO';
  const esLiquidado = prestamo.estado === 'LIQUIDADO';
  const esAtrasado = prestamo.estado === 'ATRASADO';

  const cardBorderStyle = esPagado
    ? { border: '2px solid #10b981', opacity: 0.92 }
    : esLiquidado
    ? { border: '2px solid #3b82f6', opacity: 0.92 }
    : esAtrasado
    ? { border: '2px solid #ef4444', opacity: 0.92 }
    : esActivo
    ? { border: '2px solid #9ca3af', opacity: 0.92 }
    : {};

  const cardHeaderBg = esPagado
    ? { background: '#f0fdf4' }
    : esLiquidado
    ? { background: '#eff6ff' }
    : esAtrasado
    ? { background: '#fef2f2' }
    : esActivo
    ? { background: '#f3f4f6' }
    : {};

  return (
    <div
      className="card prestamo-card"
      style={cardBorderStyle}
    >
      {esPagado && (
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
      {esLiquidado && (
        <div
          style={{
            background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '0.78rem',
            padding: '0.3rem 0',
            letterSpacing: '0.08em',
            borderRadius: '6px 6px 0 0'
          }}
        >
          💧 PRÉSTAMO LIQUIDADO
        </div>
      )}
      {esActivo && (
        <div
          style={{
            background: 'linear-gradient(90deg, #6b7280, #4b5563)',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '0.78rem',
            padding: '0.3rem 0',
            letterSpacing: '0.08em',
            borderRadius: '6px 6px 0 0'
          }}
        >
          ● PRÉSTAMO ACTIVO
        </div>
      )}
      {esAtrasado && (
        <div
          style={{
            background: 'linear-gradient(90deg, #ef4444, #dc2626)',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '0.78rem',
            padding: '0.3rem 0',
            letterSpacing: '0.08em',
            borderRadius: '6px 6px 0 0'
          }}
        >
          ⚠ PRÉSTAMO ATRASADO
        </div>
      )}
      <div className="card-header" style={cardHeaderBg}>
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
          
          {prestamo.penalizacionAcumulada > 0 && (
            <div className="info-item" style={{ gridColumn: '1 / -1', backgroundColor: '#fff5f5', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ffcccc' }}>
              <span className="label" style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠️ Penalización:</span>
              <span className="value" style={{ color: '#dc3545', fontWeight: 'bold' }}>
                {formatMoney(prestamo.penalizacionAcumulada)}
              </span>
            </div>
          )}
          
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
