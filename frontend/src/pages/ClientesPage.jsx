import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clienteApi } from '../services/api';
import ClienteCard from '../components/ClienteCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { ErrorAlert } from '../components/Alert';

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
    return <Loading message="Cargando clientes..." fullScreen={true} />;
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <ErrorAlert 
          title="Error al cargar clientes"
          message={error}
        />
        <button onClick={loadClientes} className='btn btn-primary btn-block mt-4'>
          🔄 Reintentar
        </button>
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
        <EmptyState
          icon={searchTerm ? '🔍' : '👥'}
          title={searchTerm ? 'No se encontraron resultados' : 'No hay clientes'}
          message={searchTerm 
            ? `No se encontraron clientes que coincidan con "${searchTerm}"`
            : 'No tienes clientes registrados. ¡Crea tu primer cliente para empezar!'
          }
          action={!searchTerm && (
            <Link to='/clientes/nuevo' className='btn btn-primary'>
              ➕ Crear Primer Cliente
            </Link>
          )}
        />
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
