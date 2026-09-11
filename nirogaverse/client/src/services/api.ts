import axios from 'axios';
import { NiroModule } from '../store/chatStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/niro',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for LLM calls which can be slow
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const niroApi = {
  getSessions: (module: NiroModule) => api.get('/niro/sessions', { params: { module } }),
  createSession: (module: NiroModule) => api.post('/niro/sessions', { module }),
  getSession: (sessionId: string) => api.get(`/niro/sessions/${sessionId}`),
  sendMessage: (data: { sessionId: string; message: string }) =>
    api.post('/niro/message', data, { timeout: 120000 }), // Extra timeout: report gen does 4+ LLM calls
  deleteSession: (sessionId: string) => api.delete(`/niro/sessions/${sessionId}`),
};

export default api;
