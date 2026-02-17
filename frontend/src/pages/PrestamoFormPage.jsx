import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { prestamoApi } from '../services/prestamoApi';
import PrestamoForm from '../components/PrestamoForm';

const PrestamoFormPage = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (prestamoData) => {
    try {
      setLoading(true);
      setError(null);
      await prestamoApi.create(prestamoData);
      navigate('/prestamos');
    } catch (err) {
      setError('Error al crear el préstamo. Verifica los datos ingresados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/prestamos');
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Nuevo Préstamo</h1>
        <p className="subtitle">Crea un nuevo préstamo para un cliente</p>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      <div className="form-card">
        <PrestamoForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading">Creando préstamo...</div>
        </div>
      )}
    </div>
  );
};

export default PrestamoFormPage;
