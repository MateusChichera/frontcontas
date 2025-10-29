import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import logger from '../services/directLogger';
import '../css/Clientes.css';

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchNome, setSearchNome] = useState('');
    const [filtroStatus, setFiltroStatus] = useState(''); // '' = todos, '1' = normal, '2' = bloqueado
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [quantidadeTotal, setQuantidadeTotal] = useState(0);
    const [atualizando, setAtualizando] = useState(null); // Para indicar qual cliente está sendo atualizado

    const itensPorPagina = 20;

    // Filtrar clientes localmente por nome e status
    const clientesFiltrados = useMemo(() => {
        let filtrados = clientes;

        // Filtro por nome, CPF ou código
        if (searchNome.trim()) {
            const searchTerm = searchNome.trim();
            // Verificar se é numérico (CPF ou código)
            const isNumeric = /^\d+$/.test(searchTerm);
            
            filtrados = filtrados.filter((c) => {
                // Buscar por nome (sempre)
                const matchesNome = c.Nome?.toLowerCase().includes(searchTerm.toLowerCase());
                
                if (isNumeric) {
                    // Se for numérico, buscar também por CPF e código
                    const matchesCpf = c.Cpf?.includes(searchTerm);
                    const matchesCodigo = c.Codigo?.toString().includes(searchTerm);
                    return matchesNome || matchesCpf || matchesCodigo;
                } else {
                    // Se não for numérico, buscar apenas por nome
                    return matchesNome;
                }
            });
        }

        // Filtro por status
        if (filtroStatus !== '') {
            filtrados = filtrados.filter((c) => c.Status === parseInt(filtroStatus));
        }

        return filtrados;
    }, [clientes, searchNome, filtroStatus]);

    // Calcular total de páginas
    const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina);

    // Obter clientes da página atual
    const clientesPagina = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        return clientesFiltrados.slice(inicio, fim);
    }, [clientesFiltrados, paginaAtual, itensPorPagina]);

    // Buscar clientes da API
    const buscarClientes = async () => {
        setLoading(true);
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        
        try {
            logger.logRelatorio(usuario, 'Consulta de Clientes', '');
            const response = await api.get('/consulta/clientes');
            
            if (response.data && response.data.Clientes) {
                setClientes(response.data.Clientes);
                setQuantidadeTotal(response.data.QuantidadeClientes || response.data.Clientes.length);
            } else {
                setClientes([]);
                setQuantidadeTotal(0);
            }
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            setClientes([]);
            setQuantidadeTotal(0);
            logger.logErro('Busca de Clientes', error.message || 'Erro desconhecido');
            alert('Erro ao carregar clientes. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Atualizar status do cliente
    const atualizarStatusCliente = async (codigo, novoStatus) => {
        setAtualizando(codigo);
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        
        try {
            await api.post('/atualizar/cliente', {
                Codigo: codigo,
                Status: novoStatus
            });

            // Atualizar o status localmente
            setClientes((prev) =>
                prev.map((c) =>
                    c.Codigo === codigo ? { ...c, Status: novoStatus } : c
                )
            );

            logger.logRelatorio(
                usuario,
                novoStatus === 2 ? 'Bloquear Cliente' : 'Desbloquear Cliente',
                `Código: ${codigo}, Status alterado para: ${novoStatus === 2 ? 'Bloqueado' : 'Ativo'}`
            );
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            logger.logErro('Atualização de Cliente', error.message || 'Erro desconhecido');
            alert('Erro ao atualizar status do cliente. Tente novamente.');
        } finally {
            setAtualizando(null);
        }
    };

    // Buscar clientes ao montar o componente
    useEffect(() => {
        buscarClientes();
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        logger.logRelatorio(usuario, 'Acesso - Clientes', 'Página de consulta de clientes acessada');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Resetar para primeira página quando filtros mudarem e logar busca
    useEffect(() => {
        setPaginaAtual(1);
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        
        // Logar quando houver busca ou filtro
        if (searchNome.trim() || filtroStatus !== '') {
            const filtroDetalhes = [];
            if (searchNome.trim()) {
                filtroDetalhes.push(`Busca: ${searchNome.trim()}`);
            }
            if (filtroStatus !== '') {
                const statusLabel = filtroStatus === '0' ? 'Ativo' : filtroStatus === '2' ? 'Bloqueado' : filtroStatus;
                filtroDetalhes.push(`Status: ${statusLabel}`);
            }
            
            if (filtroDetalhes.length > 0) {
                logger.logRelatorio(usuario, 'Busca de Clientes', filtroDetalhes.join(', '));
            }
        }
    }, [searchNome, filtroStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    const getStatusLabel = (status) => {
        switch (status) {
            case 0:
                return 'ATIVO';
            case 1:
                return 'Consumidor';
            case 2:
                return 'Bloqueado';
            default:
                return 'Desconhecido';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 0:
                return 'status-ativo';
            case 1:
                return 'status-consumidor';
            case 2:
                return 'status-bloqueado';
            default:
                return 'status-desconhecido';
        }
    };

    return (
        <div className="clientes-container">
            <h1 className="clientes-title">Consulta de Clientes</h1>

            <div className="filters-section">
                <div className="input-group">
                    <label htmlFor="searchNome">Buscar por Nome, CPF ou Código:</label>
                    <input
                        type="text"
                        id="searchNome"
                        placeholder="Digite nome, CPF ou código..."
                        value={searchNome}
                        onChange={(e) => setSearchNome(e.target.value)}
                        className="filter-input"
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="filtroStatus">Status:</label>
                    <select
                        id="filtroStatus"
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Selecione...</option>
                        <option value="0">Ativo</option>
                        <option value="2">Bloqueado</option>
                    </select>
                </div>

                <button onClick={buscarClientes} className="search-button" disabled={loading}>
                    {loading ? 'Carregando...' : 'Atualizar'}
                </button>
            </div>

            {loading && <p className="loading-message">Carregando clientes...</p>}

            {!loading && clientes.length === 0 ? (
                <p className="no-data-message">Nenhum cliente encontrado.</p>
            ) : (
                <>
                    <div className="info-section">
                        <p>
                            Total de clientes: <strong>{quantidadeTotal}</strong> | 
                            Exibindo: <strong>{clientesFiltrados.length}</strong> após filtros
                        </p>
                    </div>

                    <div className="table-container">
                        <table className="clientes-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nome</th>
                                    <th>CPF</th>
                                    <th>Status</th>
                                    <th className="hide-print">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesPagina.map((cliente) => (
                                    <tr key={cliente.Codigo}>
                                        <td>{cliente.Codigo}</td>
                                        <td>{cliente.Nome || '-'}</td>
                                        <td>{cliente.Cpf || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(cliente.Status)}`}>
                                                {getStatusLabel(cliente.Status)}
                                            </span>
                                        </td>
                                        <td className="hide-print">
                                            {cliente.Status === 2 ? (
                                                <button
                                                    className="action-button action-desbloquear"
                                                    onClick={() => atualizarStatusCliente(cliente.Codigo, 0)}
                                                    disabled={atualizando === cliente.Codigo}
                                                    title="Desbloquear cliente"
                                                >
                                                    {atualizando === cliente.Codigo ? (
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                    ) : (
                                                        <i className="fas fa-unlock"></i>
                                                    )}{' '}
                                                    Desbloquear
                                                </button>
                                            ) : (
                                                <button
                                                    className="action-button action-bloquear"
                                                    onClick={() => atualizarStatusCliente(cliente.Codigo, 2)}
                                                    disabled={atualizando === cliente.Codigo}
                                                    title="Bloquear cliente"
                                                >
                                                    {atualizando === cliente.Codigo ? (
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                    ) : (
                                                        <i className="fas fa-lock"></i>
                                                    )}{' '}
                                                    Bloquear
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas > 1 && (
                        <div className="pagination hide-print">
                            <button
                                className="pagination-button"
                                onClick={() => {
                                    const paginaAnterior = paginaAtual;
                                    const novaPagina = Math.max(1, paginaAtual - 1);
                                    setPaginaAtual(novaPagina);
                                    const usuario = localStorage.getItem('usuario') || 'Desconhecido';
                                    logger.logRelatorio(usuario, 'Navegação - Clientes', `Página anterior: ${paginaAnterior} → ${novaPagina}`);
                                }}
                                disabled={paginaAtual === 1}
                            >
                                <i className="fas fa-chevron-left"></i> Anterior
                            </button>
                            <span className="pagination-info">
                                Página {paginaAtual} de {totalPaginas}
                            </span>
                            <button
                                className="pagination-button"
                                onClick={() => {
                                    const paginaAnterior = paginaAtual;
                                    const novaPagina = Math.min(totalPaginas, paginaAtual + 1);
                                    setPaginaAtual(novaPagina);
                                    const usuario = localStorage.getItem('usuario') || 'Desconhecido';
                                    logger.logRelatorio(usuario, 'Navegação - Clientes', `Próxima página: ${paginaAnterior} → ${novaPagina}`);
                                }}
                                disabled={paginaAtual === totalPaginas}
                            >
                                Próxima <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Clientes;
