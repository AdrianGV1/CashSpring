import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { clienteApi } from '../services/api';

export default function ClienteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCliente();
  }, [id]);

  const loadCliente = async () => {
    try {
      setLoading(true);
      const response = await clienteApi.getById(id);
      setCliente(response.data);
    } catch (err) {
      setError('Cliente no encontrado');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await clienteApi.delete(id);
        navigate('/');
      } catch (err) {
        alert('Error al eliminar el cliente');
        console.error(err);
      }
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

  if (error || !cliente) {
    return (
      <div className='alert alert-error'>
        <p>{error || 'Cliente no encontrado'}</p>
        <Link to='/' className='btn btn-primary mt-4'>Volver a la lista</Link>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Detalles del Cliente</h1>
        <Link to='/' className='btn btn-secondary'>← Volver</Link>
      </div>

      <div className='card'>
        <div className='grid md:grid-cols-2 gap-6'>
          <div>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>{cliente.nombre}</h2>

            <div className='space-y-3'>
              <div>
                <p className='text-sm text-gray-500'>Teléfono</p>
                <p className='text-lg'>📞 {cliente.telefono}</p>
              </div>

              {cliente.cedula && (
                <div>
                  <p className='text-sm text-gray-500'>Cédula</p>
                  <p className='text-lg'>🪪 {cliente.cedula}</p>
                </div>
              )}

              {cliente.direccionReferencia && (
                <div>
                  <p className='text-sm text-gray-500'>Dirección</p>
                  <p className='text-lg'>📍 {cliente.direccionReferencia}</p>
                </div>
              )}

              {cliente.notas && (
                <div>
                  <p className='text-sm text-gray-500'>Notas</p>
                  <p className='text-gray-700'>{cliente.notas}</p>
                </div>
              )}

              <div>
                <p className='text-sm text-gray-500'>Estado</p>
                <p>
                  {cliente.activo ? (
                    <span className='bg-green-100 text-green-800 px-3 py-1 rounded'>✓ Activo</span>
                  ) : (
                    <span className='bg-gray-100 text-gray-800 px-3 py-1 rounded'>Inactivo</span>
                  )}
                </p>
              </div>
            </div>

            {cliente.latitud && cliente.longitud && (
              <div className='mt-6'>
                <p className='text-sm text-gray-500 mb-2'>Navegación</p>
                <div className='flex gap-2 flex-wrap'>
                  <a href={cliente.googleMapsUrl} target='_blank' rel='noopener noreferrer' 
                     className='btn btn-success'>🗺️ Google Maps</a>
                  <a href={cliente.wazeUrl} target='_blank' rel='noopener noreferrer' 
                     className='btn btn-primary'>🚗 Waze</a>
                  <a href={cliente.whatsappLocationUrl} target='_blank' rel='noopener noreferrer' 
                     className='btn btn-success'>💬 Compartir</a>
                </div>
              </div>
            )}
          </div>

          <div>
            {cliente.latitud && cliente.longitud ? (
              <div>
                <p className='text-sm text-gray-500 mb-2'>Ubicación</p>
                <div className='map-container'>
                  <MapContainer center={[cliente.latitud, cliente.longitud]} zoom={15} 
                                style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OpenStreetMap' 
                               url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                    <Marker position={[cliente.latitud, cliente.longitud]} />
                  </MapContainer>
                </div>
                <p className='text-xs text-gray-500 mt-2'>
                  Coordenadas: {cliente.latitud.toFixed(6)}, {cliente.longitud.toFixed(6)}
                </p>
              </div>
            ) : (
              <div className='text-center py-12 bg-gray-50 rounded'>
                <p className='text-gray-500'>Sin ubicación registrada</p>
              </div>
            )}
          </div>
        </div>

        <div className='flex gap-2 mt-6 pt-6 border-t border-gray-200'>
          <Link to={/clientes//editar} className='btn btn-primary'>✏️ Editar</Link>
          <button onClick={handleDelete} className='btn btn-danger'>🗑️ Eliminar</button>
        </div>
      </div>
    </div>
  );
}
