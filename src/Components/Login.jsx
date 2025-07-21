import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../css/Login.css';

const Login = () => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const logoPath = process.env.PUBLIC_URL + '/logo/logo1.png';
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const resposta = await api.post('/token', { login, senha });
      if (resposta.status === 200) {
        const token = resposta.data.Token;
        const expiration = resposta.data.Expiration;
        if (token) {
          localStorage.setItem('token', token);
          if (expiration) {
            localStorage.setItem('expiration', expiration);
          }
          navigate('/');
        } else {
          setErro('Token inválido recebido.');
        }
      } else {
        setErro('Erro ao conectar. Código: ' + resposta.status);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Falha no login. Verifique o usuário e senha e tente novamente.';
      setErro(msg);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logoPath} alt="Logo" className="login-logo" />
        <h2>Faça seu login</h2>
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <div className="login-field">
            <label>Login</label>
            <input
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
            />
          </div>
          {erro && <div className="login-error">{erro}</div>}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
