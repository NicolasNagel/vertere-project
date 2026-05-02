import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vertere_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (import.meta.env.DEV) console.error('API error:', err.response?.data ?? err.message);
    if (err.response?.status === 401) {
      localStorage.removeItem('vertere_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
