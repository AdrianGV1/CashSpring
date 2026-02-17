import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clienteApi } from '../services/api';
import ClienteCard from '../components/ClienteCard';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clienteApi.getAll();
      setClientes(response.data);
    } catch (err) {
      setError('Error al cargar clientes. Verifica que el backend esté corriendo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono.includes(searchTerm) ||
    (cliente.cedula && cliente.cedula.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className='text-center'>
        <div className='spinner'></div>
        <p className='text-gray-600 mt-4'>Cargando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='alert alert-error'>
        <p><strong>Error:</strong> {error}</p>
        <button onClick={loadClientes} className='btn btn-primary mt-4'>Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-gray-800 mb-4'>📋 Lista de Clientes</h1>
        <div className='mb-4'>
          <input type='text' placeholder='🔍 Buscar por nombre, teléfono o cédula...'
                 value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                 className='form-input' />
        </div>
        <p className='text-gray-600'>
          Total: <strong>{filteredClientes.length}</strong> cliente{filteredClientes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {filteredClientes.length === 0 ? (
        <div className='text-center py-12'>
          <p className='text-gray-500 text-lg mb-4'>
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </p>
          {!searchTerm && (
            <Link to='/clientes/nuevo' className='btn btn-primary'>+ Crear Primer Cliente</Link>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
          {filteredClientes.map(cliente => (
            <ClienteCard key={cliente.id} cliente={cliente} />
          ))}
        </div>
      )}
    </div>
  );
}
