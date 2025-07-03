import axios from 'axios';


const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      
      if (!error.config.url.includes('/login')) {
         console.log('Token expirado ou inválido. Deslogando...');

      }
    }
    return Promise.reject(error);
  }
);

export default api;