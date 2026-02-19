import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  auth: {
    username: import.meta.env.VITE_API_USERNAME || 'admin',
    password: import.meta.env.VITE_API_PASSWORD || 'admin123'
  }
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const clienteApi = {
  getAll: () => api.get('/api/clientes'),
  getById: (id) => api.get(`/api/clientes/${id}`),
  create: (clienteData) => api.post('/api/clientes', clienteData),
  update: (id, clienteData) => api.put(`/api/clientes/${id}`, clienteData),
  delete: (id) => api.delete(`/api/clientes/${id}`)
};

export default api;
