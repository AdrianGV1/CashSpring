import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  auth: {
    username: 'admin',
    password: 'admin123'
  }
});

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
