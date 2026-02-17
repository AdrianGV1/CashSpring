import React, { useState, useEffect } from 'react';
import { clienteApi } from '../services/api';

const PrestamoForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState(null);
  const [formData, setFormData] = useState({
    clienteId: '',
    montoPrestado: '',
    interesBase: '0.20',
    fechaInicio: new Date().toISOString().split('T')[0],
    tipoAcuerdo: 'PAGO_EN_MES',
    montoCuota1: '',
    montoCuota2: '',
    cantidadCuotas: ''
  });

  useEffect(() => {
    loadClientes();
    if (initialData) {
      setFormData({
        ...initialData,
        fechaInicio: initialData.fechaInicio || new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
      setErrorClientes(null);
      const response = await clienteApi.getAll();
      setClientes(response.data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setErrorClientes('Error al cargar la lista de clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Preparar datos según el tipo de acuerdo
    const dataToSend = {
      clienteId: Number(formData.clienteId),
      montoPrestado: Number(formData.montoPrestado),
      interesBase: formData.interesBase,
      fechaInicio: formData.fechaInicio,
      tipoAcuerdo: formData.tipoAcuerdo
    };

    // Agregar campos específicos según el tipo de acuerdo
    if (formData.tipoAcuerdo === 'PAGO_EN_MES') {
      if (formData.montoCuota1) dataToSend.montoCuota1 = Number(formData.montoCuota1);
      if (formData.montoCuota2) dataToSend.montoCuota2 = Number(formData.montoCuota2);
    } else if (formData.tipoAcuerdo === 'QUINCENAS_DOBLES') {
      if (formData.cantidadCuotas) dataToSend.cantidadCuotas = Number(formData.cantidadCuotas);
    }

    onSubmit(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      {loadingClientes && (
        <div className="loading" style={{ textAlign: 'center', padding: '1rem' }}>
          Cargando clientes...
        </div>
      )}

      {errorClientes && (
        <div className="error-banner" style={{ marginBottom: '1rem' }}>
          {errorClientes}
        </div>
      )}

      {!loadingClientes && clientes.length === 0 && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          No hay clientes registrados. Por favor, crea un cliente primero.
        </div>
      )}

      <div className="form-group">
        <label>Cliente *</label>
        <select
          name="clienteId"
          value={formData.clienteId}
          onChange={handleChange}
          required
          disabled={initialData || loadingClientes || clientes.length === 0}
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map(cliente => (
            <option key={cliente.clienteId} value={cliente.clienteId}>
              {cliente.nombre} {cliente.apellido} - {cliente.cedula || 'Sin cédula'}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Monto Prestado (₡) *</label>
          <input
            type="number"
            name="montoPrestado"
            value={formData.montoPrestado}
            onChange={handleChange}
            required
            min="1"
            placeholder="Ej: 100000"
          />
        </div>

        <div className="form-group">
          <label>Interés Base *</label>
          <input
            type="number"
            name="interesBase"
            value={formData.interesBase}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            max="1"
            placeholder="Ej: 0.20"
          />
          <small>Decimal entre 0 y 1 (0.20 = 20%)</small>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Fecha Inicio *</label>
          <input
            type="date"
            name="fechaInicio"
            value={formData.fechaInicio}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Tipo de Acuerdo *</label>
          <select
            name="tipoAcuerdo"
            value={formData.tipoAcuerdo}
            onChange={handleChange}
            required
          >
            <option value="PAGO_EN_MES">Pago en mes (2 cuotas)</option>
            <option value="QUINCENAS_SIMPLES">Quincenas simples (4 cuotas)</option>
            <option value="QUINCENAS_DOBLES">Quincenas dobles (personalizado)</option>
          </select>
        </div>
      </div>

      {/* Campos específicos para PAGO_EN_MES */}
      {formData.tipoAcuerdo === 'PAGO_EN_MES' && (
        <div className="form-section">
          <h4>Distribución de Cuotas (opcional)</h4>
          <p className="help-text">Si no especificas, se divide 50/50 automáticamente</p>
          <div className="form-row">
            <div className="form-group">
              <label>Monto Cuota 1 (₡)</label>
              <input
                type="number"
                name="montoCuota1"
                value={formData.montoCuota1}
                onChange={handleChange}
                min="0"
                placeholder="Dejar vacío para auto"
              />
            </div>
            <div className="form-group">
              <label>Monto Cuota 2 (₡)</label>
              <input
                type="number"
                name="montoCuota2"
                value={formData.montoCuota2}
                onChange={handleChange}
                min="0"
                placeholder="Dejar vacío para auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Campos específicos para QUINCENAS_DOBLES */}
      {formData.tipoAcuerdo === 'QUINCENAS_DOBLES' && (
        <div className="form-section">
          <h4>Configuración de Quincenas</h4>
          <div className="form-group">
            <label>Cantidad de Cuotas (quincenas)</label>
            <input
              type="number"
              name="cantidadCuotas"
              value={formData.cantidadCuotas}
              onChange={handleChange}
              min="1"
              placeholder="Ej: 6"
            />
            <small>El sistema calculará el monto de cada cuota automáticamente</small>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          {initialData ? 'Actualizar' : 'Crear'} Préstamo
        </button>
      </div>
    </form>
  );
};

export default PrestamoForm;
