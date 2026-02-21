export default function Loading({ message = 'Cargando...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-content">
          <div className="loading-spinner-modern">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-center">💰</div>
          </div>
          <p className="loading-text">{message}</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-inline">
      <div className="loading-spinner-small">
        <div className="spinner-ring-small"></div>
        <div className="spinner-ring-small"></div>
      </div>
      <p className="loading-text-small">{message}</p>
    </div>
  );
}
