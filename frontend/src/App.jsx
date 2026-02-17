import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ClientesPage from './pages/ClientesPage'
import ClienteFormPage from './pages/ClienteFormPage'
import ClienteDetailPage from './pages/ClienteDetailPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="text-2xl font-bold flex items-center gap-2">
                💰 CashSpring
              </Link>
              <Link 
                to="/clientes/nuevo" 
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                + Nuevo Cliente
              </Link>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<ClientesPage />} />
            <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
            <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
            <Route path="/clientes/:id" element={<ClienteDetailPage />} />
          </Routes>
        </main>

        <footer className="bg-gray-800 text-gray-300 text-center py-4 mt-12">
          <p>&copy; 2026 CashSpring - Sistema de Préstamos</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
