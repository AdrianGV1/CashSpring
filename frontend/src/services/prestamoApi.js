import axios from 'axios';

const API_URL = 'http://localhost:8080/api/prestamos';

const axiosInstance = axios.create({
  baseURL: API_URL,
  auth: {
    username: 'admin',
    password: 'admin123'
  }
});

export const prestamoApi = {
  getAll: async () => {
    const response = await axiosInstance.get('');
    return response.data;
  },

  create: async (prestamoData) => {
    const response = await axiosInstance.post('', prestamoData);
    return response.data;
  },

  update: async (id, prestamoData) => {
    const response = await axiosInstance.put(`/${id}`, prestamoData);
    return response.data;
  }
};
