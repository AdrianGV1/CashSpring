import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ClientesPage from './pages/ClientesPage'
import ClienteDetailPage from './pages/ClienteDetailPage'
import PrestamosPage from './pages/PrestamosPage'
import PrestamoFormPage from './pages/PrestamoFormPage'
import PrestamoDetailPage from './pages/PrestamoDetailPage'
import CuotasPage from './pages/CuotasPage'
import LoginPage from './pages/LoginPage'
import { ProtectedRoute, logout, getUsername } from './components/ProtectedRoute'
import RelojFecha from './components/RelojFecha'

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">
          CashSpring
        </Link>
        
        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
            Inicio
          </Link>
          <Link to="/clientes" className={`nav-link ${isActive('/clientes') ? 'active' : ''}`}>
            Clientes
          </Link>
          <Link to="/prestamos" className={`nav-link ${isActive('/prestamos') ? 'active' : ''}`}>
            Prestamos
          </Link>
          <Link to="/cuotas" className={`nav-link ${isActive('/cuotas') ? 'active' : ''}`}>
            Cuotas
          </Link>
        </div>

        <div className="nav-actions">
          <div className="user-menu">
            <RelojFecha />
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 0.5rem' }}>|</span>
            <span className="username">👤 {getUsername()}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              🚪 Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app">
      {!isLoginPage && <Navigation />}

      <main className={isLoginPage ? '' : 'main-content'}>
        <Routes>
          {/* Ruta pública de login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Clientes */}
          <Route path="/clientes" element={
            <ProtectedRoute>
              <ClientesPage />
            </ProtectedRoute>
          } />
          <Route path="/clientes/:id" element={
            <ProtectedRoute>
              <ClienteDetailPage />
            </ProtectedRoute>
          } />
          
          {/* Préstamos */}
          <Route path="/prestamos" element={
            <ProtectedRoute>
              <PrestamosPage />
            </ProtectedRoute>
          } />
          <Route path="/prestamos/nuevo" element={
            <ProtectedRoute>
              <PrestamoFormPage />
            </ProtectedRoute>
          } />
          <Route path="/prestamos/:id" element={
            <ProtectedRoute>
              <PrestamoDetailPage />
            </ProtectedRoute>
          } />
          
          {/* Cuotas */}
          <Route path="/cuotas" element={
            <ProtectedRoute>
              <CuotasPage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>

      {!isLoginPage && (
        <footer className="footer">
          <p>2026 CashSpring - Sistema de Microfinanzas</p>
        </footer>
      )}
    </div>
  );
}

export default App
