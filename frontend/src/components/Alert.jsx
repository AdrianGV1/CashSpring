export function Alert({ type = 'info', title, message, onClose }) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`alert-modern alert-${type}-modern`}>
      <div className="alert-icon">{icons[type]}</div>
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{message}</div>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          className="alert-close"
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: '1.25rem',
            opacity: 0.6
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function SuccessAlert({ message, title = 'Éxito' }) {
  return <Alert type="success" title={title} message={message} />;
}

export function ErrorAlert({ message, title = 'Error' }) {
  return <Alert type="error" title={title} message={message} />;
}

export function WarningAlert({ message, title = 'Advertencia' }) {
  return <Alert type="warning" title={title} message={message} />;
}

export function InfoAlert({ message, title = 'Información' }) {
  return <Alert type="info" title={title} message={message} />;
}
