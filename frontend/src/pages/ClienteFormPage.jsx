import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clienteApi } from '../services/api';
import ClienteForm from '../components/ClienteForm';

export default function ClienteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      loadCliente();
    }
  }, [id]);

  const loadCliente = async () => {
    try {
      setLoading(true);
      const response = await clienteApi.getById(id);
      setInitialData(response.data);
    } catch (err) {
      setError('Error al cargar el cliente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      setError(null);

      if (isEditing) {
        await clienteApi.update(id, { ...formData, activo: true });
      } else {
        await clienteApi.create(formData);
      }

      navigate('/clientes');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el cliente');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='text-center'>
        <div className='spinner'></div>
        <p className='text-gray-600 mt-4'>Cargando...</p>
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto'>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>
        {isEditing ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
      </h1>

      {error && (
        <div className='alert alert-error mb-4'>{error}</div>
      )}

      <ClienteForm onSubmit={handleSubmit} initialData={initialData} isLoading={saving} />
    </div>
  );
}
