import { Link } from 'react-router-dom';

export default function ClienteCard({ cliente }) {
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{cliente.nombre}</h3>
          <p className="text-gray-600">📞 {cliente.telefono}</p>
          {cliente.cedula && <p className="text-sm text-gray-500">🪪 {cliente.cedula}</p>}
        </div>
        {cliente.activo ? (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">✓ Activo</span>
        ) : (
          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Inactivo</span>
        )}
      </div>

      {cliente.notas && (
        <p className="text-sm text-gray-500 italic mb-3">{cliente.notas.substring(0, 100)}...</p>
      )}

      {cliente.ubicacion && (
        <div className="flex gap-2 flex-wrap mb-3">
          {cliente.googleMapsUrl && (
            <a href={cliente.googleMapsUrl} target="_blank" rel="noopener noreferrer"
               className="btn btn-success text-sm">🗺️ Google Maps</a>
          )}
          {cliente.appleMapsUrl && (
            <a href={cliente.appleMapsUrl} target="_blank" rel="noopener noreferrer"
               className="btn btn-primary text-sm">🍎 Apple Maps</a>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <Link to={`/clientes/${cliente.id}`} className="btn btn-secondary text-sm flex-1">Ver</Link>
        <Link to={`/clientes/${cliente.id}/editar`} className="btn btn-primary text-sm">✏️ Editar</Link>
      </div>
    </div>
  );
}
