import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/prestamos`;

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

export const prestamoApi = {
  getAll: async () => {
    const response = await axiosInstance.get('');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/${id}`);
    return response.data;
  },

  getByCliente: async (clienteId) => {
    const response = await axiosInstance.get(`/cliente/${clienteId}`);
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
  },

  liquidar: async (id, fechaLiquidacion) => {
    const body = {};
    if (fechaLiquidacion) body.fechaLiquidacion = fechaLiquidacion;
    const response = await axiosInstance.post(`/${id}/liquidar`, body);
    return response.data;
  },

  pausarPenalizacion: async (id) => {
    const response = await axiosInstance.post(`/${id}/pausar-penalizacion`);
    return response.data;
  },

  reanudarPenalizacion: async (id) => {
    const response = await axiosInstance.post(`/${id}/reanudar-penalizacion`);
    return response.data;
  },

  negociarPenalizacion: async (id, montoNegociado) => {
    const response = await axiosInstance.post(`/${id}/negociar-penalizacion`, { montoNegociado });
    return response.data;
  },

  resetearPenalizacion: async (id) => {
    const response = await axiosInstance.post(`/${id}/resetear-penalizacion`);
    return response.data;
  }
};
