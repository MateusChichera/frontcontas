import React, { useState, useEffect } from 'react';
import logger from '../services/directLogger';
import '../css/LogViewer.css';

const LogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    // Verificar se o usuário é Administrador PharmaW
    const isAdmin = () => {
        const usuario = localStorage.getItem('usuario');
        return usuario === 'Administrador PharmaW';
    };

    useEffect(() => {
        // Sempre carregar logs, independente do usuário
        loadLogs();
    }, []);

    useEffect(() => {
        filterLogs();
    }, [logs, searchTerm, dateFilter, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadLogs = async () => {
        try {
            // Primeiro tentar carregar do servidor Node.js
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`http://localhost:3003/get-logs?date=${today}`);
            
            if (response.ok) {
                const data = await response.json();
                const serverLogs = data.logs || [];
                console.log('Logs carregados do servidor:', serverLogs.length, 'logs');
                console.log('Usuários únicos:', [...new Set(serverLogs.map(log => log.usuario))]);
                setLogs(serverLogs);
            } else {
                throw new Error('Erro ao carregar logs do servidor');
            }
        } catch (error) {
            console.error('Erro ao carregar logs do servidor, usando localStorage:', error);
            // Fallback para localStorage
            const storedLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
            console.log('Logs carregados do localStorage:', storedLogs.length, 'logs');
            setLogs(storedLogs.reverse());
        }
    };

    const filterLogs = () => {
        let filtered = [...logs];

        // Filtro por texto
        if (searchTerm) {
            filtered = filtered.filter(log => 
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.usuario.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro por data
        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp).toDateString();
                return logDate === filterDate;
            });
        }

        // Filtro por ação
        if (actionFilter) {
            filtered = filtered.filter(log => log.action === actionFilter);
        }

        setFilteredLogs(filtered);
    };

    const exportLogs = () => {
        logger.exportLogs();
    };

    const getUniqueActions = () => {
        const actions = [...new Set(logs.map(log => log.action))];
        return actions.sort();
    };

    // Só renderiza se for administrador
    if (!isAdmin()) {
        return null;
    }

    if (!isOpen) {
        return (
            <button 
                className="log-viewer-button" 
                onClick={() => setIsOpen(true)}
                title="Ver Logs de Auditoria"
            >
                📋 Logs
            </button>
        );
    }

    return (
        <div className="log-viewer-overlay" onClick={() => setIsOpen(false)}>
            <div className="log-viewer-content" onClick={(e) => e.stopPropagation()}>
                <div className="log-viewer-header">
                    <h2>Logs de Auditoria</h2>
                    <div className="log-viewer-actions">
                        <button onClick={loadLogs} className="refresh-button">🔄 Atualizar</button>
                        <button onClick={exportLogs} className="export-button">📥 Exportar</button>
                        <button onClick={() => setIsOpen(false)} className="close-button">×</button>
                    </div>
                </div>
                
                {/* Filtros */}
                <div className="log-filters">
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="Buscar por texto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="filter-input"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="filter-date"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Todas as ações</option>
                            {getUniqueActions().map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <button 
                            onClick={() => {
                                setSearchTerm('');
                                setDateFilter('');
                                setActionFilter('');
                            }}
                            className="clear-filters-button"
                        >
                            🗑️ Limpar Filtros
                        </button>
                    </div>
                </div>
                
                <div className="log-viewer-body">
                    <div className="log-stats">
                        Mostrando {filteredLogs.length} de {logs.length} logs
                        <br />
                        <small style={{color: '#666'}}>
                            📍 Armazenados em: Servidor (/root/frontcontas/logs/)
                        </small>
                    </div>
                    
                    {filteredLogs.length === 0 ? (
                        <p className="no-logs">
                            {logs.length === 0 ? 'Nenhum log encontrado' : 'Nenhum log corresponde aos filtros'}
                        </p>
                    ) : (
                        <div className="logs-list">
                            {/* Cabeçalho das colunas */}
                            <div className="log-header">
                                <div className="log-timestamp-header">Timestamp</div>
                                <div className="log-action-header">Ação</div>
                                <div className="log-details-header">Descrição</div>
                                <div className="log-user-header">Usuário</div>
                            </div>
                            
                            {/* Lista de logs */}
                            {filteredLogs.map((log, index) => (
                                <div key={index} className="log-entry">
                                    <div className="log-timestamp">{log.timestamp}</div>
                                    <div className="log-action" style={{color: '#007bff', fontWeight: 'bold'}}>{log.action}</div>
                                    <div className="log-details">{log.details}</div>
                                    <div className="log-user" style={{color: '#28a745', fontWeight: 'bold'}}>{log.usuario}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogViewer;
