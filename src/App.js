import './App.css';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import Titulos from './Components/Titulos';
import Login from './Components/Login';

const logoPath = process.env.PUBLIC_URL + '/logo/logo1.png';

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

  
   
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('titulos_dataInicial');
        navigate('/login');
    };

   
    const RequireAuth = ({ children }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            return <Navigate to="/login" replace />;
        }
        return children;
    };

    return (
        <div className="app-container">
          {location.pathname !== '/login' && (
            <button
              className={`toggle-btn hide-print ${sidebarOpen ? 'open' : 'closed'}`}
              onClick={() => setSidebarOpen(prev => !prev)}
              style={{ left: sidebarOpen ? '260px' : '15px', top: '25px' }}
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
                  <nav className="sidebar-nav">
                      <Link to="/" className="nav-link"><i className="fas fa-home"></i> <span>Home</span></Link>
                      <Link to="/titulos" className="nav-link"><i className="fas fa-file-invoice"></i> <span>Títulos</span></Link>
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
                marginLeft: location.pathname !== '/login' && sidebarOpen ? '220px' : '0',
                width: location.pathname !== '/login' && sidebarOpen ? 'calc(100% - 220px)' : '100%',
              }}
             >
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<RequireAuth><div className="home-container"><h2 className="welcome-title">Bem-vindo!</h2></div></RequireAuth>} />
                    <Route path="/titulos" element={<RequireAuth><Titulos /></RequireAuth>} />
                </Routes>
            </main>
          </div>
          {location.pathname !== '/login' && (
            <footer
              className="footer"
              style={{
                marginLeft: sidebarOpen ? '220px' : '0',
                width: sidebarOpen ? 'calc(100% - 220px)' : '100%',
              }}
            >
              © Infomaster 2025
            </footer>
          )}
        </div>
    );
}

export default App;