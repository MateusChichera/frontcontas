import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import logger from '../services/directLogger';
import '../css/Clientes.css';

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchNome, setSearchNome] = useState('');
    const [filtroStatus, setFiltroStatus] = useState(''); // '' = todos, 0 = Liberado Padrão, 1 = s/ Desc, 2 = Bloqueado
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
                const nomeClie = c.nome || c.Nome || '';
                const matchesNome = nomeClie.toLowerCase().includes(searchTerm.toLowerCase());

                if (isNumeric) {
                    const matchesCpf = (c.cpf || c.Cpf || '').includes(searchTerm);
                    const matchesCodigo = (c.codigo || c.Codigo || '').toString().includes(searchTerm);
                    return matchesNome || matchesCpf || matchesCodigo;
                } else {
                    return matchesNome;
                }
            });
        }

        if (filtroStatus !== '') {
            filtrados = filtrados.filter((c) => {
                const status = c.status !== undefined ? c.status : c.Status;
                return status === parseInt(filtroStatus);
            });
        }

        return filtrados;
    }, [clientes, searchNome, filtroStatus]);

    const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina);

    const clientesPagina = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        return clientesFiltrados.slice(inicio, fim);
    }, [clientesFiltrados, paginaAtual]);
    // Pega o convênio selecionado
    const getConvenio = () => JSON.parse(localStorage.getItem('convenio_selecionado') || 'null');

    // Buscar clientes da API
    const buscarClientes = async () => {
        const convenio = getConvenio();
        if (!convenio) {
            setClientes([]);
            setQuantidadeTotal(0);
            return;
        }

        setLoading(true);
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';

        try {
            logger.logRelatorio(usuario, 'Consulta de Funcionários', `Convênio: ${convenio.nome}`);
            const response = await api.get(`/consulta/clientes?convenio=${convenio.codigo}`);

            const data = response.data.clientes || response.data.Clientes || [];
            if (data) {
                setClientes(data);
                setQuantidadeTotal(response.data.quantidadeClientes || response.data.QuantidadeClientes || data.length);
            } else {
                setClientes([]);
                setQuantidadeTotal(0);
            }
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            setClientes([]);
            setQuantidadeTotal(0);
            logger.logErro('Busca de Funcionários', error.message || 'Erro desconhecido');
            alert('Erro ao carregar funcionários. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Atualizar status do cliente
    const atualizarStatusCliente = async (clienteObj, novoStatus) => {
        const convenio = getConvenio();
        if (!convenio) return;

        const codigo = clienteObj.codigo || clienteObj.Codigo;
        setAtualizando(codigo);
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';

        try {
            // Nova rota exige convenio na query e body específico
            await api.post(`/atualizar/cliente?convenio=${convenio.codigo}`, {
                codigo: codigo,
                nome: clienteObj.nome || clienteObj.Nome,
                cpf: clienteObj.cpf || clienteObj.Cpf,
                status: novoStatus
            });

            // Atualizar o status localmente
            setClientes((prev) =>
                prev.map((c) => {
                    const cCod = c.codigo || c.Codigo;
                    return cCod === codigo ? { ...c, status: novoStatus, Status: novoStatus } : c;
                })
            );

            logger.logRelatorio(
                usuario,
                novoStatus === 2 ? 'Bloquear Funcionário' : 'Liberar Funcionário',
                `Código: ${codigo}, Status alterado para: ${novoStatus}`
            );
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            logger.logErro('Atualização de Funcionário', error.message || 'Erro desconhecido');
            alert('Erro ao atualizar status. Tente novamente.');
        } finally {
            setAtualizando(null);
        }
    };

    // Buscar clientes ao montar o componente ou mudar convênio
    useEffect(() => {
        buscarClientes();

        const handleConvenioChange = () => {
            buscarClientes();
        };

        window.addEventListener('convenioChanged', handleConvenioChange);
        return () => window.removeEventListener('convenioChanged', handleConvenioChange);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setPaginaAtual(1);
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';

        if (searchNome.trim() || filtroStatus !== '') {
            const filtroDetalhes = [];
            if (searchNome.trim()) {
                filtroDetalhes.push(`Busca: ${searchNome.trim()}`);
            }
            if (filtroStatus !== '') {
                const statusLabel = filtroStatus === '0' ? 'Liberado Padrão' : filtroStatus === '1' ? 'Liberado s/ Desc' : 'Bloqueado';
                filtroDetalhes.push(`Status: ${statusLabel}`);
            }

            if (filtroDetalhes.length > 0) {
                logger.logRelatorio(usuario, 'Busca de Clientes', filtroDetalhes.join(', '));
            }
        }
    }, [searchNome, filtroStatus]);

    const getStatusLabel = (status) => {
        switch (status) {
            case 0:
                return 'LIBERADO - PADRÃO';
            case 1:
                return 'LIBERADO - S/ DESC';
            case 2:
                return 'BLOQUEADO';
            default:
                return 'Desconhecido';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 0:
                return 'status-ativo';
            case 1:
                return 'status-sem-desconto';
            case 2:
                return 'status-bloqueado';
            default:
                return 'status-desconhecido';
        }
    };

    return (
        <div className="clientes-container">
            <h1 className="clientes-title">Consulta de Funcionários</h1>

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
                        <option value="">Todos</option>
                        <option value="0">Liberado Padrão</option>
                        <option value="1">Liberado s/ Desc</option>
                        <option value="2">Bloqueado</option>
                    </select>
                </div>

                <button onClick={buscarClientes} className="search-button" disabled={loading}>
                    {loading ? 'Carregando...' : 'Atualizar'}
                </button>
            </div>

            {loading && <p className="loading-message">Carregando...</p>}

            {!loading && clientes.length === 0 ? (
                <p className="no-data-message">Nenhum funcionário encontrado.</p>
            ) : (
                <>
                    <div className="info-section">
                        <p>
                            Total: <strong>{quantidadeTotal}</strong> |
                            Filtrados: <strong>{clientesFiltrados.length}</strong>
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
                                {clientesPagina.map((cliente) => {
                                    const cCod = cliente.codigo || cliente.Codigo;
                                    const cNome = cliente.nome || cliente.Nome || '-';
                                    const cCpf = cliente.cpf || cliente.Cpf || '-';
                                    const cStatus = cliente.status !== undefined ? cliente.status : cliente.Status;

                                    return (
                                        <tr key={cCod}>
                                            <td>{cCod}</td>
                                            <td>{cNome}</td>
                                            <td>{cCpf}</td>
                                            <td>
                                                <span className={`status-badge ${getStatusClass(cStatus)}`}>
                                                    {getStatusLabel(cStatus)}
                                                </span>
                                            </td>
                                            <td className="hide-print">
                                                {cStatus === 2 ? (
                                                    <button
                                                        className="action-button action-desbloquear"
                                                        onClick={() => atualizarStatusCliente(cliente, 0)}
                                                        disabled={atualizando === cCod}
                                                        title="Liberar"
                                                    >
                                                        {atualizando === cCod ? (
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                        ) : (
                                                            <i className="fas fa-check"></i>
                                                        )}{' '}
                                                        Liberar
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="action-button action-bloquear"
                                                        onClick={() => atualizarStatusCliente(cliente, 2)}
                                                        disabled={atualizando === cCod}
                                                        title="Bloquear"
                                                    >
                                                        {atualizando === cCod ? (
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                        ) : (
                                                            <i className="fas fa-lock"></i>
                                                        )}{' '}
                                                        Bloquear
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas > 1 && (
                        <div className="pagination hide-print">
                            <button
                                className="pagination-button"
                                onClick={() => {
                                    const novaPagina = Math.max(1, paginaAtual - 1);
                                    setPaginaAtual(novaPagina);
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
                                    const novaPagina = Math.min(totalPaginas, paginaAtual + 1);
                                    setPaginaAtual(novaPagina);
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
