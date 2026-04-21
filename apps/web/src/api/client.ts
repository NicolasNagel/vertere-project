import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (import.meta.env.DEV) console.error('API error:', err.response?.data ?? err.message);
    return Promise.reject(err);
  },
);
