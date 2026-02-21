import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/prestamos`;

const axiosInstance = axios.create({
  baseURL: API_URL,
  auth: {
    username: import.meta.env.VITE_API_USERNAME || 'admin',
    password: import.meta.env.VITE_API_PASSWORD || 'admin123'
  }
});

export const prestamoApi = {
  getAll: async () => {
    const response = await axiosInstance.get('');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/${id}`);
    return response.data;
  },

  create: async (prestamoData) => {
    const response = await axiosInstance.post('', prestamoData);
    return response.data;
  },

  update: async (id, prestamoData) => {
    const response = await axiosInstance.put(`/${id}`, prestamoData);
    return response.data;
  },

  extender: async (id, montoExtendido, montoPorCuota) => {
    const body = { montoExtendido };
    if (montoPorCuota && montoPorCuota > 0) body.montoPorCuota = montoPorCuota;
    const response = await axiosInstance.post(`/${id}/extender`, body);
    return response.data;
  }
};
