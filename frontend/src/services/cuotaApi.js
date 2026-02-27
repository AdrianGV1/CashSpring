import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

const getAuthCredentials = () => {
  const username = localStorage.getItem('username');
  const password = localStorage.getItem('password');
  if (username && password) return { username, password };
  return {
    username: import.meta.env.VITE_API_USERNAME || 'admin',
    password: import.meta.env.VITE_API_PASSWORD || 'admin123'
  };
};

const axiosInstance = axios.create({ baseURL: API_URL });

axiosInstance.interceptors.request.use(
  config => { config.auth = getAuthCredentials(); return config; },
  error => Promise.reject(error)
);

export const cuotaApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/cuotas');
    return response.data;
  },

  getByPrestamo: async (prestamoId) => {
    const response = await axiosInstance.get(`/prestamos/${prestamoId}/cuotas`);
    return response.data;
  },

  getByPrestamoAndEstado: async (prestamoId, estado) => {
    const response = await axiosInstance.get(`/prestamos/${prestamoId}/cuotas/filtrar`, {
      params: { estado }
    });
    return response.data;
  },

  create: async (cuotaData) => {
    const response = await axiosInstance.post('/cuotas', cuotaData);
    return response.data;
  },

  update: async (cuotaId, cuotaData) => {
    const response = await axiosInstance.put(`/cuotas/${cuotaId}`, cuotaData);
    return response.data;
  }
};
