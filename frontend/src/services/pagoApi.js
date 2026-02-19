import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

const axiosInstance = axios.create({
  baseURL: API_URL,
  auth: {
    username: import.meta.env.VITE_API_USERNAME || 'admin',
    password: import.meta.env.VITE_API_PASSWORD || 'admin123'
  }
});

export const pagoApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/pagos');
    return response.data;
  },

  getByPrestamo: async (prestamoId) => {
    const response = await axiosInstance.get(`/prestamos/${prestamoId}/pagos`);
    return response.data;
  },

  create: async (pagoData) => {
    const response = await axiosInstance.post('/pagos', pagoData);
    return response.data;
  },

  update: async (pagoId, pagoData) => {
    const response = await axiosInstance.put(`/pagos/${pagoId}`, pagoData);
    return response.data;
  }
};
