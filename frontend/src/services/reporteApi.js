import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

// Función para obtener las credenciales actuales
const getAuthCredentials = () => {
  const username = localStorage.getItem('username');
  const password = localStorage.getItem('password');
  
  if (username && password) {
    return { username, password };
  }
  
  return {
    username: import.meta.env.VITE_API_USERNAME || 'admin',
    password: import.meta.env.VITE_API_PASSWORD || 'admin123'
  };
};

const axiosInstance = axios.create({
  baseURL: API_URL
});

// Interceptor para agregar autenticación en cada petición
axiosInstance.interceptors.request.use(
  config => {
    const credentials = getAuthCredentials();
    config.auth = credentials;
    return config;
  },
  error => Promise.reject(error)
);

// Función auxiliar para descargar el PDF
const downloadPdf = async (url, filename) => {
  const response = await axiosInstance.get(url, {
    responseType: 'blob'
  });
  
  // Crear un enlace temporal para descargar el archivo
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(link.href);
};

export const reporteApi = {
  /**
   * Genera y descarga un PDF con toda la información de un cliente
   * @param {number} clienteId - ID del cliente
   */
  descargarReporteCliente: async (clienteId) => {
    const filename = `reporte-cliente-${clienteId}-${new Date().toISOString().split('T')[0]}.pdf`;
    await downloadPdf(`/reportes/cliente/${clienteId}`, filename);
  },

  /**
   * Genera y descarga un PDF con el detalle de un préstamo
   * @param {number} prestamoId - ID del préstamo
   */
  descargarReportePrestamo: async (prestamoId) => {
    const filename = `reporte-prestamo-${prestamoId}-${new Date().toISOString().split('T')[0]}.pdf`;
    await downloadPdf(`/reportes/prestamo/${prestamoId}`, filename);
  },

  /**
   * Genera y descarga un PDF con las cuotas próximas a vencer
   * @param {number} dias - Número de días hacia adelante (default: 7)
   */
  descargarReporteCuotasProximas: async (dias = 7) => {
    const filename = `cuotas-proximas-${dias}dias-${new Date().toISOString().split('T')[0]}.pdf`;
    await downloadPdf(`/reportes/cuotas-proximas?dias=${dias}`, filename);
  },

  /**
   * Genera y descarga un PDF con el resumen de préstamos activos
   */
  descargarReportePrestamosActivos: async () => {
    const filename = `prestamos-activos-${new Date().toISOString().split('T')[0]}.pdf`;
    await downloadPdf(`/reportes/prestamos-activos`, filename);
  },

  /**
   * Genera y descarga un PDF con el resumen de préstamos atrasados
   */
  descargarReportePrestamosAtrasados: async () => {
    const filename = `prestamos-atrasados-${new Date().toISOString().split('T')[0]}.pdf`;
    await downloadPdf(`/reportes/prestamos-atrasados`, filename);
  }
};
