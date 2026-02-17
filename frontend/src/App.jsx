import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ClientesPage from './pages/ClientesPage'
import ClienteFormPage from './pages/ClienteFormPage'
import ClienteDetailPage from './pages/ClienteDetailPage'
import PrestamosPage from './pages/PrestamosPage'
import PrestamoFormPage from './pages/PrestamoFormPage'
import PrestamoDetailPage from './pages/PrestamoDetailPage'
import CuotasPage from './pages/CuotasPage'
import PagosPage from './pages/PagosPage'

function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">
          💰 CashSpring
        </Link>
        
        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
            🏠 Dashboard
          </Link>
          <Link to="/clientes" className={`nav-link ${isActive('/clientes') ? 'active' : ''}`}>
            👥 Clientes
          </Link>
          <Link to="/prestamos" className={`nav-link ${isActive('/prestamos') ? 'active' : ''}`}>
            💰 Préstamos
          </Link>
          <Link to="/cuotas" className={`nav-link ${isActive('/cuotas') ? 'active' : ''}`}>
            📅 Cuotas
          </Link>
          <Link to="/pagos" className={`nav-link ${isActive('/pagos') ? 'active' : ''}`}>
            💳 Pagos
          </Link>
        </div>

        <Link to="/clientes/nuevo" className="btn btn-primary btn-sm">
          + Nuevo Cliente
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navigation />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* Clientes */}
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
            <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
            <Route path="/clientes/:id" element={<ClienteDetailPage />} />
            
            {/* Préstamos */}
            <Route path="/prestamos" element={<PrestamosPage />} />
            <Route path="/prestamos/nuevo" element={<PrestamoFormPage />} />
            <Route path="/prestamos/:id" element={<PrestamoDetailPage />} />
            
            {/* Cuotas */}
            <Route path="/cuotas" element={<CuotasPage />} />
            
            {/* Pagos */}
            <Route path="/pagos" element={<PagosPage />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2026 CashSpring - Sistema de Microfinanzas</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
