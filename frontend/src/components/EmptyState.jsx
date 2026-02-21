export default function EmptyState({ 
  icon = '📭', 
  title = 'No hay datos', 
  message = 'No se encontraron resultados',
  action = null 
}) {
  return (
    <div className="empty-state-modern">
      <div className="empty-icon-large">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {action && (
        <div className="empty-action">
          {action}
        </div>
      )}
    </div>
  );
}
