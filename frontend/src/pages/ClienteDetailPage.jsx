import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clienteApi } from '../services/api';
import { prestamoApi } from '../services/prestamoApi';
import { isAdmin } from '../services/authHelper';
import Loading from '../components/Loading';

export default function ClienteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrestamos, setLoadingPrestamos] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    cedula: '',
    ubicacion: '',
    notas: ''
  });

  useEffect(() => {
    loadCliente();
    loadPrestamos();
  }, [id]);

  const loadCliente = async () => {
    try {
      setLoading(true);
      const response = await clienteApi.getById(id);
      setCliente(response);
      setFormData({
        nombre: response.nombre || '',
        telefono: response.telefono || '',
        cedula: response.cedula || '',
        ubicacion: response.ubicacion || '',
        notas: response.notas || ''
      });
    } catch (err) {
      setError('Cliente no encontrado');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrestamos = async () => {
    try {
      setLoadingPrestamos(true);
      const response = await prestamoApi.getByCliente(id);
      setPrestamos(response);
    } catch (err) {
      console.error('Error al cargar préstamos:', err);
    } finally {
      setLoadingPrestamos(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original cliente data
    setFormData({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      cedula: cliente.cedula || '',
      ubicacion: cliente.ubicacion || '',
      notas: cliente.notas || ''
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await clienteApi.update(id, {
        ...formData,
        activo: cliente.activo // Keep the same active status
      });
      setCliente(response);
      setIsEditing(false);
      alert('Cliente actualizado correctamente');
    } catch (err) {
      alert('Error al actualizar el cliente');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar al cliente "${cliente.nombre}"?\n\n` +
      '⚠️ Esta acción es irreversible y eliminará:\n' +
      '• El cliente\n' +
      '• Todos sus préstamos pagados\n' +
      '• Todas las cuotas asociadas\n' +
      '• Todos los pagos registrados\n\n' +
      'Solo se puede eliminar si NO tiene préstamos activos o atrasados.'
    );

    if (!confirmDelete) return;

    try {
      setSaving(true);
      await clienteApi.delete(id);
      alert('✅ Cliente eliminado exitosamente');
      navigate('/clientes');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
        'Error al eliminar el cliente. Verifica que no tenga préstamos activos.';
      alert(`❌ ${errorMessage}`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <Loading message="Cargando cliente..." fullScreen={true} />;
  }

  if (error || !cliente) {
    return (
      <div className='alert alert-error'>
        <p>{error || 'Cliente no encontrado'}</p>
        <Link to='/clientes' className='btn btn-primary mt-4'>Volver a la lista</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className='text-2xl font-bold text-gray-800'>👤 Información del Cliente</h1>
        <Link to='/clientes' className='btn btn-secondary'>← Volver</Link>
      </div>

      <div className='card'>
        {/* Header with Edit button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
          <h2 className='text-xl font-bold text-gray-800'>
            {isEditing ? '✏️ Editando Cliente' : cliente.nombre}
          </h2>
          {!isEditing && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleEdit} className='btn btn-primary'>
                ✏️ Editar
              </button>
              {isAdmin() && (
                <button 
                  onClick={handleDelete} 
                  className='btn btn-danger'
                  disabled={saving}
                >
                  🗑️ Eliminar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Read-only mode */}
        {!isEditing ? (
          <div>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Nombre Completo</p>
                <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>{cliente.nombre}</p>
              </div>

              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Teléfono</p>
                <p style={{ fontSize: '1.125rem' }}>📞 {cliente.telefono}</p>
              </div>

              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Cédula</p>
                <p style={{ fontSize: '1.125rem' }}>🪪 {cliente.cedula || '—'}</p>
              </div>

              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Estado</p>
                <div>
                  {cliente.activo ? (
                    <span className='badge badge-success'>✓ Activo</span>
                  ) : (
                    <span className='badge badge-secondary'>Inactivo</span>
                  )}
                </div>
              </div>

              {cliente.ubicacion && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>Ubicación</p>
                  {(cliente.googleMapsUrl || cliente.appleMapsUrl) ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {cliente.googleMapsUrl && (
                        <a 
                          href={cliente.googleMapsUrl} 
                          target='_blank' 
                          rel='noopener noreferrer'
                          className='btn btn-success'
                        >
                          🗺️ Google Maps
                        </a>
                      )}
                      {cliente.appleMapsUrl && (
                        <a 
                          href={cliente.appleMapsUrl} 
                          target='_blank' 
                          rel='noopener noreferrer'
                          className='btn btn-primary'
                        >
                          🍎 Apple Maps
                        </a>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                      {cliente.ubicacion}
                      <br />
                      <span style={{ fontSize: '0.75rem' }}>
                        (No se pudieron generar enlaces de navegación)
                      </span>
                    </p>
                  )}
                </div>
              )}

              {cliente.notas && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Notas</p>
                  <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{cliente.notas}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Edit mode */
          <div>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label className='form-label'>
                  Nombre Completo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type='text'
                  name='nombre'
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className='form-input'
                  required
                />
              </div>

              <div>
                <label className='form-label'>
                  Teléfono <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type='text'
                  name='telefono'
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className='form-input'
                  required
                />
              </div>

              <div>
                <label className='form-label'>Cédula</label>
                <input
                  type='text'
                  name='cedula'
                  value={formData.cedula}
                  onChange={handleInputChange}
                  className='form-input'
                />
              </div>

              <div>
                <label className='form-label'>Estado</label>
                <div>
                  {cliente.activo ? (
                    <span className='badge badge-success'>✓ Activo</span>
                  ) : (
                    <span className='badge badge-secondary'>Inactivo</span>
                  )}
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    El estado no se puede modificar desde aquí
                  </p>
                </div>
              </div>

              <div>
                <label className='form-label'>
                  Ubicación (URL o coordenadas)
                </label>
                <input
                  type='text'
                  name='ubicacion'
                  value={formData.ubicacion}
                  onChange={handleInputChange}
                  className='form-input'
                  placeholder='Ej: https://maps.app.goo.gl/... o 9.322,-83.699'
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Puedes pegar un enlace de Google Maps o coordenadas en formato decimal (lat,lng)
                </p>
              </div>

              <div>
                <label className='form-label'>Notas</label>
                <textarea
                  name='notas'
                  value={formData.notas}
                  onChange={handleInputChange}
                  className='form-input'
                  rows='4'
                  placeholder='Notas adicionales sobre el cliente...'
                />
              </div>
            </div>

            {/* Action buttons for edit mode */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
              <button 
                onClick={handleSave} 
                className='btn btn-primary'
                disabled={saving || !formData.nombre || !formData.telefono}
              >
                {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
              </button>
              <button 
                onClick={handleCancel} 
                className='btn btn-secondary'
                disabled={saving}
              >
                ✖️ Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Préstamos */}
      <div className='card' style={{ marginTop: '2rem' }}>
        <h2 className='text-xl font-bold text-gray-800 mb-4'>📋 Historial de Préstamos</h2>
        
        {loadingPrestamos ? (
          <p className='text-gray-500'>Cargando préstamos...</p>
        ) : prestamos.length === 0 ? (
          <p className='text-gray-500'>No hay préstamos registrados para este cliente.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className='data-table'>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Fecha Solicitud</th>
                  <th>Monto</th>
                  <th>Cuota</th>
                  <th>Próximo/Último Pago</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prestamos.map(prestamo => {
                  // Calcular próxima cuota o última cuota según estado
                  const cuotaPendiente = prestamo.cuotas?.find(c => c.montoCancelado < c.montoObjetivo);
                  const ultimaCuota = prestamo.cuotas?.length > 0 
                    ? prestamo.cuotas[prestamo.cuotas.length - 1] 
                    : null;
                  
                  const proximaFecha = cuotaPendiente?.fechaVencimiento;
                  const ultimaFecha = ultimaCuota?.fechaVencimiento;
                  
                  const montoCuota = prestamo.cuotas?.length > 0 
                    ? prestamo.cuotas[0].montoObjetivo 
                    : 0;

                  return (
                    <tr key={prestamo.prestamoId}>
                      <td>
                        {prestamo.estado === 'ACTIVO' && (
                          <span className='badge badge-success'>✓ Activo</span>
                        )}
                        {prestamo.estado === 'ATRASADO' && (
                          <span className='badge' style={{ backgroundColor: '#f59e0b', color: 'white' }}>⚠ Atrasado</span>
                        )}
                        {prestamo.estado === 'PAGADO' && (
                          <span className='badge badge-secondary'>✓ Pagado</span>
                        )}
                      </td>
                      <td>
                        {new Date(prestamo.fechaInicio).toLocaleDateString('es-ES')}
                      </td>
                      <td>
                        <strong>₡{prestamo.montoPrestado?.toLocaleString()}</strong>
                        <br />
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Total: ₡{prestamo.totalObjetivo?.toLocaleString()}
                        </span>
                      </td>
                      <td>₡{montoCuota?.toLocaleString()}</td>
                      <td>
                        {prestamo.estado === 'PAGADO' ? (
                          <span style={{ color: '#6b7280' }}>
                            {ultimaFecha ? new Date(ultimaFecha).toLocaleDateString('es-ES') : '—'}
                            <br />
                            <span style={{ fontSize: '0.75rem' }}>Último pago</span>
                          </span>
                        ) : (
                          <span>
                            {proximaFecha ? new Date(proximaFecha).toLocaleDateString('es-ES') : '—'}
                            <br />
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Próxima cuota</span>
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link 
                          to={`/prestamos/${prestamo.prestamoId}`}
                          className='btn btn-primary btn-sm'
                        >
                          👁️ Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
