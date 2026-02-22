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

export const pagoApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/pagos');
    return response.data;
  },

  getByPrestamo: async (prestamoId) => {
    const response = await axiosInstance.get(`/prestamos/${prestamoId}/pagos`);
    return response.data;
  },

  getSolicitudesPendientes: async () => {
    const response = await axiosInstance.get('/pagos/solicitudes-pendientes');
    return response.data;
  },

  create: async (pagoData) => {
    const response = await axiosInstance.post('/pagos', pagoData);
    return response.data;
  },

  update: async (pagoId, pagoData) => {
    const response = await axiosInstance.put(`/pagos/${pagoId}`, pagoData);
    return response.data;
  },

  aprobar: async (pagoId) => {
    const response = await axiosInstance.post(`/pagos/${pagoId}/aprobar`);
    return response.data;
  },

  rechazar: async (pagoId) => {
    await axiosInstance.delete(`/pagos/${pagoId}/rechazar`);
  },

  revertir: async (pagoId) => {
    await axiosInstance.delete(`/pagos/${pagoId}/revertir`);
  }
};
