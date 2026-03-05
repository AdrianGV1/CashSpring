import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clienteApi } from '../services/api';
import { prestamoApi } from '../services/prestamoApi';
import { reporteApi } from '../services/reporteApi';
import { isAdmin } from '../services/authHelper';
import Loading from '../components/Loading';
import { uploadToCloudinary } from '../services/cloudinaryService';

// Componente para editar/borrar/subir una foto en ClienteDetailPage
const EditFotoField = ({ fotoKey, label, formData, fotosPreviews, uploadingFotos, onSelect, onRemove }) => {
  const currentUrl = formData[fotoKey];
  const previewUrl = fotosPreviews[fotoKey];
  const uploading = uploadingFotos[fotoKey];
  const displaySrc = previewUrl || currentUrl;

  return (
    <div>
      <label className='form-label'>{label}</label>
      {displaySrc && (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.5rem' }}>
          <a href={currentUrl || displaySrc} target='_blank' rel='noopener noreferrer'>
            <img
              src={displaySrc}
              alt={label}
              style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db', display: 'block' }}
            />
          </a>
          {!uploading && (
            <button
              type='button'
              onClick={() => onRemove(fotoKey)}
              title='Eliminar foto'
              style={{
                position: 'absolute', top: -6, right: -6,
                width: 22, height: 22, borderRadius: '50%',
                background: '#ef4444', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          )}
        </div>
      )}
      <div>
        <label style={{
          cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 500,
          background: uploading ? '#f3f4f6' : '#ffffff',
          border: `1px solid ${currentUrl && !previewUrl ? '#16a34a' : '#d1d5db'}`,
          borderRadius: '6px',
          color: uploading ? '#9ca3af' : currentUrl && !previewUrl ? '#16a34a' : '#374151',
          transition: 'all 0.15s ease-in-out',
          userSelect: 'none',
        }}>
          <input type='file' accept='image/*' style={{ display: 'none' }} disabled={uploading} onChange={(e) => onSelect(e, fotoKey)} />
          {uploading ? '⏳ Subiendo...' : currentUrl ? '🔄 Cambiar foto' : '📷 Subir foto'}
        </label>
        {currentUrl && !uploading && (
          <small style={{ color: '#16a34a', display: 'block', marginTop: '0.25rem' }}>✓ Foto guardada</small>
        )}
      </div>
    </div>
  );
};

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
  const [exportingPdf, setExportingPdf] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    cedula: '',
    ubicacion: '',
    ubicacionExtra: '',
    ordenPatronal: '',
    fotoOrdenPatronal: null,
    fotoCedulaFrente: null,
    fotoCedulaDetras: null,
    fotoUbicacion: null,
    fotoUbicacionExtra: null,
    notas: ''
  });
  const [fotosPreviews, setFotosPreviews] = useState({});
  const [uploadingFotos, setUploadingFotos] = useState({});

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
        ubicacionExtra: response.ubicacionExtra || '',
        ordenPatronal: response.ordenPatronal || '',
        fotoOrdenPatronal: response.fotoOrdenPatronal || null,
        fotoCedulaFrente: response.fotoCedulaFrente || null,
        fotoCedulaDetras: response.fotoCedulaDetras || null,
        fotoUbicacion: response.fotoUbicacion || null,
        fotoUbicacionExtra: response.fotoUbicacionExtra || null,
        notas: response.notas || ''
      });
      setFotosPreviews({});
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
      ubicacionExtra: cliente.ubicacionExtra || '',
      ordenPatronal: cliente.ordenPatronal || '',
      fotoOrdenPatronal: cliente.fotoOrdenPatronal || null,
      fotoCedulaFrente: cliente.fotoCedulaFrente || null,
      fotoCedulaDetras: cliente.fotoCedulaDetras || null,
      fotoUbicacion: cliente.fotoUbicacion || null,
      fotoUbicacionExtra: cliente.fotoUbicacionExtra || null,
      notas: cliente.notas || ''
    });
    setFotosPreviews({});
    setUploadingFotos({});
  };

  const handleSave = async () => {
    if (!formData.ubicacionExtra.trim()) {
      alert('La ubicación de trabajo es obligatoria.');
      return;
    }
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

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      await reporteApi.descargarReporteCliente(id);
      alert('✅ PDF exportado exitosamente');
    } catch (err) {
      alert('❌ Error al exportar PDF');
      console.error(err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cedula') {
      const filtered = value.replace(/\D/g, '').slice(0, 9);
      setFormData(prev => ({ ...prev, [name]: filtered }));
      return;
    }
    if (name === 'telefono') {
      const filtered = value.replace(/\D/g, '').slice(0, 8);
      setFormData(prev => ({ ...prev, [name]: filtered }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotosPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
    setUploadingFotos(prev => ({ ...prev, [key]: true }));
    try {
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, [key]: url }));
    } catch (err) {
      console.error('Error al subir foto:', err);
      alert('Error al subir la imagen. Intenta de nuevo.');
      setFotosPreviews(prev => ({ ...prev, [key]: null }));
    } finally {
      setUploadingFotos(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleRemoveFoto = (key) => {
    setFormData(prev => ({ ...prev, [key]: null }));
    setFotosPreviews(prev => ({ ...prev, [key]: null }));
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
        <div className='cliente-header'>
          <h2 className='text-xl font-bold text-gray-800'>
            {isEditing ? '✏️ Editando Cliente' : cliente.nombre}
          </h2>
          {!isEditing && (
            <div className='cliente-header-actions'>
              <button 
                onClick={handleExportPdf} 
                className='btn btn-secondary'
                disabled={exportingPdf}
              >
                {exportingPdf ? '⏳ Exportando...' : '📄 Exportar PDF'}
              </button>
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
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>Ubicación Casa</p>
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

              {cliente.ubicacionExtra && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>Ubicación Trabajo</p>
                  {(cliente.googleMapsUrlExtra || cliente.appleMapsUrlExtra) ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {cliente.googleMapsUrlExtra && (
                        <a 
                          href={cliente.googleMapsUrlExtra} 
                          target='_blank' 
                          rel='noopener noreferrer'
                          className='btn btn-success'
                        >
                          🗺️ Google Maps
                        </a>
                      )}
                      {cliente.appleMapsUrlExtra && (
                        <a 
                          href={cliente.appleMapsUrlExtra} 
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
                      {cliente.ubicacionExtra}
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

              {/* Documentos y Fotos */}
              {(cliente.ordenPatronal || cliente.fotoOrdenPatronal || cliente.fotoCedulaFrente || cliente.fotoCedulaDetras || cliente.fotoUbicacion || cliente.fotoUbicacionExtra) && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>📁 Documentos y Fotos</p>

                  {/* Orden Patronal */}
                  {(cliente.ordenPatronal || cliente.fotoOrdenPatronal) && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>📋 Orden Patronal</p>
                      {cliente.ordenPatronal && (
                        <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>{cliente.ordenPatronal}</p>
                      )}
                      {cliente.fotoOrdenPatronal && (
                        <a href={cliente.fotoOrdenPatronal} target='_blank' rel='noopener noreferrer'
                          style={{ display: 'inline-block' }}>
                          <img src={cliente.fotoOrdenPatronal} alt='Orden Patronal'
                            style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Cédula */}
                  {(cliente.fotoCedulaFrente || cliente.fotoCedulaDetras) && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>🪪 Cédula de Identidad</p>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {cliente.fotoCedulaFrente && (
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Frente</p>
                            <a href={cliente.fotoCedulaFrente} target='_blank' rel='noopener noreferrer'>
                              <img src={cliente.fotoCedulaFrente} alt='Cédula Frente'
                                style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }} />
                            </a>
                          </div>
                        )}
                        {cliente.fotoCedulaDetras && (
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Detrás</p>
                            <a href={cliente.fotoCedulaDetras} target='_blank' rel='noopener noreferrer'>
                              <img src={cliente.fotoCedulaDetras} alt='Cédula Detrás'
                                style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fotos de Ubicaciones */}
                  {(cliente.fotoUbicacion || cliente.fotoUbicacionExtra) && (
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>📍 Fotos de Ubicaciones</p>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {cliente.fotoUbicacion && (
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Casa</p>
                            <a href={cliente.fotoUbicacion} target='_blank' rel='noopener noreferrer'>
                              <img src={cliente.fotoUbicacion} alt='Ubicación Casa'
                                style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }} />
                            </a>
                          </div>
                        )}
                        {cliente.fotoUbicacionExtra && (
                          <div>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Trabajo</p>
                            <a href={cliente.fotoUbicacionExtra} target='_blank' rel='noopener noreferrer'>
                              <img src={cliente.fotoUbicacionExtra} alt='Ubicación Trabajo'
                                style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                  maxLength={8}
                  inputMode='numeric'
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
                  maxLength={9}
                  inputMode='numeric'
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
                  Ubicación Casa (URL o coordenadas)
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
                <label className='form-label'>
                  Ubicación Trabajo (URL o coordenadas) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type='text'
                  name='ubicacionExtra'
                  value={formData.ubicacionExtra}
                  onChange={handleInputChange}
                  className='form-input'
                  placeholder='Ej: https://maps.app.goo.gl/... o 9.322,-83.699'
                  required
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

              {/* Documentos y Fotos */}
              <div>
                <label className='form-label'>📁 Documentos y Fotos</label>

                {/* Orden Patronal */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>📋 Orden Patronal</p>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label className='form-label'>Nombre / Número</label>
                    <input
                      type='text'
                      name='ordenPatronal'
                      value={formData.ordenPatronal || ''}
                      onChange={handleInputChange}
                      className='form-input'
                      placeholder='Ej: Empresa XYZ S.A. / OP-12345'
                    />
                  </div>
                  <EditFotoField fotoKey='fotoOrdenPatronal' label='Foto Orden Patronal' formData={formData} fotosPreviews={fotosPreviews} uploadingFotos={uploadingFotos} onSelect={handleImageSelect} onRemove={handleRemoveFoto} />
                </div>

                {/* Cédula */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>🪪 Cédula de Identidad</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <EditFotoField fotoKey='fotoCedulaFrente' label='Frente' formData={formData} fotosPreviews={fotosPreviews} uploadingFotos={uploadingFotos} onSelect={handleImageSelect} onRemove={handleRemoveFoto} />
                    <EditFotoField fotoKey='fotoCedulaDetras' label='Detrás' formData={formData} fotosPreviews={fotosPreviews} uploadingFotos={uploadingFotos} onSelect={handleImageSelect} onRemove={handleRemoveFoto} />
                  </div>
                </div>

                {/* Fotos Ubicaciones */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>📍 Fotos de Ubicaciones</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <EditFotoField fotoKey='fotoUbicacion' label='Ubicación Casa' formData={formData} fotosPreviews={fotosPreviews} uploadingFotos={uploadingFotos} onSelect={handleImageSelect} onRemove={handleRemoveFoto} />
                    <EditFotoField fotoKey='fotoUbicacionExtra' label='Ubicación Trabajo' formData={formData} fotosPreviews={fotosPreviews} uploadingFotos={uploadingFotos} onSelect={handleImageSelect} onRemove={handleRemoveFoto} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons for edit mode */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
              <button 
                onClick={handleSave} 
                className='btn btn-primary'
                disabled={saving || !formData.nombre || !formData.telefono || !formData.ubicacionExtra}
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
                        {(() => { const [y,m,d] = prestamo.fechaInicio.split('T')[0].split('-'); return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('es-CR'); })()}
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
                            {ultimaFecha ? (() => { const [y,m,d] = ultimaFecha.split('T')[0].split('-'); return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('es-CR'); })() : '—'}
                            <br />
                            <span style={{ fontSize: '0.75rem' }}>Último pago</span>
                          </span>
                        ) : (
                          <span>
                            {proximaFecha ? (() => { const [y,m,d] = proximaFecha.split('T')[0].split('-'); return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('es-CR'); })() : '—'}
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
