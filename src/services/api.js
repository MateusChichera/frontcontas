import axios from 'axios';


const getBaseUrl = () => {
  const hostname = window.location.hostname;

  // Se for localhost ou IP local, usa a configuração do .env ou padrão
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return process.env.REACT_APP_API_URL || 'http://localhost:9000';
  }

  // Para produção em VPS:
  // Se o site é cliente1.infomaster.inf.br, podemos tentar inferir que o back é back-cliente1.infomaster.inf.br
  // Ou se for um subdomínio fixo mas com back em outra porta/subdomínio
  // Aqui você pode ajustar a lógica de acordo com sua infra
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    // Exemplo: se acessar rpp.cliente.com o back seria back-rpp.cliente.com:9000
    // No seu caso específico do Nginx fixo rizzopp.infomaster.inf.br:
    if (hostname === 'rizzopp.infomaster.inf.br') {
      return 'https://backrizzopp.infomaster.inf.br:9000';
    }

    // Lógica genérica para novos clientes:
    return `${window.location.protocol}//back${hostname}:9000`;
  }

  return process.env.REACT_APP_API_URL || 'https://backrizzopp.infomaster.inf.br:9000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
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