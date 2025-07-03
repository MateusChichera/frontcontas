import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../css/Login.css';

const Login = () => {
  const [cnpj, setCnpj] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const logoPath = process.env.PUBLIC_URL + '/logo/logo1.png';
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const resposta = await api.post('/token', { cnpj, nome });
      if (resposta.status === 200) {
        const token = resposta.data.Token;
        if (token) {
          localStorage.setItem('token', token);
          navigate('/');
        } else {
          setErro('Token inválido recebido.');
        }
      } else {
        setErro('Erro ao conectar. Código: ' + resposta.status);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Falha no login. Verifique os dados e tente novamente.';
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
            <label>CNPJ</label>
            <input
              type="text"
              value={cnpj}
              onChange={e => setCnpj(e.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
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
