import './App.css';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Titulos from './Components/Titulos';
import Clientes from './Components/Clientes';
import Login from './Components/Login';
import LogViewer from './Components/LogViewer';
import logger from './services/directLogger';

const logoPath = process.env.PUBLIC_URL + '/logo/logo1.png';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [convenios, setConvenios] = useState([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const convs = JSON.parse(localStorage.getItem('convenios') || '[]');
    const sel = JSON.parse(localStorage.getItem('convenio_selecionado') || 'null');
    setConvenios(convs);
    setConvenioSelecionado(sel);
  }, [location.pathname]);

  const handleSelectConvenio = (e) => {
    const cod = parseInt(e.target.value);
    const conv = convenios.find(c => c.codigo === cod);
    if (conv) {
      localStorage.setItem('convenio_selecionado', JSON.stringify(conv));
      setConvenioSelecionado(conv);
      // Disparar um evento customizado para avisar os componentes que o convênio mudou
      window.dispatchEvent(new Event('convenioChanged'));
    }
  };

  useEffect(() => {
    const checkExpiration = () => {
      const expiration = localStorage.getItem('expiration');
      if (expiration) {
        // Formato: "21/07/2025 14:38:56.38"
        const [datePart, timePart] = expiration.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        const ms = timePart.split('.')[1] || '0';
        const expDate = new Date(year, month - 1, day, hour, minute, second, ms);
        if (Date.now() > expDate.getTime()) {
          alert('Sua sessão expirou! Faça login novamente.');
          localStorage.removeItem('token');
          localStorage.removeItem('expiration');
          localStorage.removeItem('convenio_selecionado');
          localStorage.removeItem('convenios');
          navigate('/login');
        }
      }
    };
    checkExpiration();
    const interval = setInterval(checkExpiration, 30000); // checa a cada 30s
    return () => clearInterval(interval);
  }, [navigate]);



  const handleLogout = () => {
    // Log do logout
    const usuario = localStorage.getItem('usuario') || 'Desconhecido';
    logger.logLogout(usuario);

    // Limpar apenas dados de sessão, preservar logs de auditoria
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('expiration');
    localStorage.removeItem('titulos_dataInicial');
    localStorage.removeItem('convenio_selecionado');
    localStorage.removeItem('convenios');
    navigate('/login');
  };

  return (
    <div className="app-container">
      {location.pathname !== '/login' && (
        <button
          className={`toggle-btn hide-print ${sidebarOpen ? 'open' : 'closed'}`}
          onClick={() => setSidebarOpen(prev => !prev)}
          style={{ left: sidebarOpen ? '224px' : '15px', top: '25px' }}
        >
          <i className={`fas ${sidebarOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
        </button>
      )}

      <div className="app-layout">

        {location.pathname !== '/login' && (
          <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
            <div className="logo-container">
              <img src={logoPath} alt="Logo" className="logo-img" />
            </div>

            {convenios.length > 0 && (
              <div className="convenio-selector-sidebar">
                <label><i className="fas fa-handshake"></i> Convênio:</label>
                <select
                  value={convenioSelecionado?.codigo || ''}
                  onChange={handleSelectConvenio}
                  className="convenio-select"
                >
                  <option value="" disabled>Selecione um convênio</option>
                  {convenios.map(c => (
                    <option key={c.codigo} value={c.codigo}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <nav className="sidebar-nav">
              <Link to="/" className="nav-link"><i className="fas fa-home"></i> <span>Home</span></Link>
              <Link to="/titulos" className="nav-link"><i className="fas fa-file-invoice"></i> <span>Títulos</span></Link>
              <Link to="/clientes" className="nav-link"><i className="fas fa-users"></i> <span>Funcionários</span></Link>
            </nav>

            <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '1rem' }}>
              <button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <i className="fas fa-sign-out-alt"></i> <span>Sair</span>
              </button>
            </div>
          </aside>
        )}

        <main
          className="main-content"
          style={{
            marginLeft: location.pathname !== '/login' && sidebarOpen ? '240px' : '0',
            width: location.pathname !== '/login' && sidebarOpen ? 'calc(100% - 240px)' : '100%',
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><div className="home-container"><h2 className="welcome-title">Bem-vindo!</h2></div></RequireAuth>} />
            <Route path="/titulos" element={<RequireAuth><Titulos /></RequireAuth>} />
            <Route path="/clientes" element={<RequireAuth><Clientes /></RequireAuth>} />
          </Routes>
        </main>
      </div>
      {location.pathname !== '/login' && (
        <footer
          className="footer"
          style={{
            marginLeft: sidebarOpen ? '240px' : '0',
            width: sidebarOpen ? 'calc(100% - 240px)' : '100%',
          }}
        >
          © InfoMaster 2026
        </footer>
      )}

      {/* LogViewer só visível quando não estiver na tela de login */}
      {location.pathname !== '/login' && <LogViewer />}
    </div>
  );
}

export default App;

// Componente para proteção de rotas - Fora do componente App para evitar re-montagens
const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  const expiration = localStorage.getItem('expiration');
  let expired = false;
  if (expiration) {
    const [datePart, timePart] = expiration.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    const ms = timePart.split('.')[1] || '0';
    const expDate = new Date(year, month - 1, day, hour, minute, second, ms);
    if (Date.now() > expDate.getTime()) {
      expired = true;
    }
  }
  if (!token || expired) {
    localStorage.removeItem('token');
    localStorage.removeItem('expiration');
    return <Navigate to="/login" replace />;
  }
  return children;
};