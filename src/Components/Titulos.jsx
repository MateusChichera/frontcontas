import React, { useState, useEffect, useMemo } from 'react';
import ModalDetalhes from './ModalDetalhes';
import api from '../services/api';
import logger from '../services/directLogger';
import '../css/Titulos.css';
import '../css/Modal.css';



const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const formatDateForApi = (dateString) => {
    if (!dateString) return '';

    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const Titulos = () => {

    const today = useMemo(() => new Date(), []);
    const thirtyDaysLater = useMemo(() => {
        const date = new Date(today);
        date.setDate(date.getDate() + 30);
        return date;
    }, [today]);

    const [titulos, setTitulos] = useState([]);
    const [dataInicial, setDataInicial] = useState(() => {
        return localStorage.getItem('titulos_dataInicial') || formatDateForInput(today);
    });
    const [dataFinal, setDataFinal] = useState(() => {
        return localStorage.getItem('titulos_dataFinal') || formatDateForInput(thirtyDaysLater);
    });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoBusca, setTipoBusca] = useState('abertos'); // 'abertos' ou 'pagos'

    // Pega o convênio selecionado
    const getConvenio = () => JSON.parse(localStorage.getItem('convenio_selecionado') || 'null');

    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 20;

    const filteredTitulos = useMemo(() => {
        if (!searchTerm) return titulos;
        return titulos.filter((t) =>
            t.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.Cliente?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [titulos, searchTerm]);

    const totalPaginas = Math.ceil(filteredTitulos.length / itensPorPagina);

    const titulosPagina = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        return filteredTitulos.slice(inicio, fim);
    }, [filteredTitulos, paginaAtual]);

    // Resetar para primeira página ao mudar busca ou filtros
    useEffect(() => {
        setPaginaAtual(1);
    }, [searchTerm, titulos]);

    const totalTitulos = useMemo(() =>
        filteredTitulos.reduce((s, t) => s + (t.titulos || t.Titulos || 0), 0)
        , [filteredTitulos]);

    const totalValor = useMemo(() =>
        filteredTitulos.reduce((s, t) => s + (t.total || t.Total || 0), 0)
        , [filteredTitulos]);

    const formatDateDisplay = (isoDate) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleExportExcel = () => {
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        const periodo = `${dataInicial} a ${dataFinal}`;
        const convenio = getConvenio();
        logger.logImpressao(usuario, `Exportação CSV Títulos ${tipoBusca}`, `Período: ${periodo} - Convênio: ${convenio?.nome}`);

        const header = ['Cliente', 'CPF', 'Cod. Atividade', 'Títulos', 'Valor Total'];
        const rows = filteredTitulos.map((t) => [
            t.cliente || t.Cliente,
            t.cpf || t.Cpf,
            t.atividade || t.Atividade,
            t.titulos || t.Titulos,
            ((t.total || t.Total) ?? 0).toFixed(2).replace('.', ',')
        ]);

        const csvContent = [header, ...rows]
            .map((row) => row.join(';'))
            .join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadLink = document.createElement('a');
        const periodoArquivo = `${formatDateDisplay(dataInicial)}_a_${formatDateDisplay(dataFinal)}`;
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `Titulos_${tipoBusca}_${periodoArquivo}.csv`;
        downloadLink.click();
    };

    const handlePrint = () => {
        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        const periodo = `${dataInicial} a ${dataFinal}`;
        const convenio = getConvenio();
        logger.logImpressao(usuario, `Relatório Títulos ${tipoBusca}`, `Período: ${periodo} - Convênio: ${convenio?.nome}`);

        const originalTable = document.querySelector('.titulos-table').cloneNode(true);
        originalTable.querySelectorAll('.hide-print').forEach(el => el.remove());
        const tableHtml = originalTable.outerHTML;
        const subTitulo = tipoBusca === 'abertos' ? 'Títulos em Aberto' : 'Títulos Pagos';
        const headerTitle = `Fechamento Convênio - ${subTitulo} - ${convenio?.nome} - ${formatDateDisplay(dataInicial)} a ${formatDateDisplay(dataFinal)}`;
        const footerText = `${new Date().toLocaleString('pt-BR')} - InfoMaster`;

        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.title = headerTitle;

        const printStyles = `
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; font-size: 12px; }
            th { background: #f0f0f0; }
            @media print { @page { margin: 20mm; } }
        `;

        printWindow.document.write(`<!DOCTYPE html><html><head><title>${headerTitle}</title><style>${printStyles}</style></head><body>`);
        printWindow.document.write(`<h2 style="text-align:center; margin-bottom: 5px;">${headerTitle}</h2>`);
        printWindow.document.write(tableHtml);
        printWindow.document.write(`<div style="position:fixed;bottom:10px;right:20px;font-size:12px;">${footerText}</div>`);
        printWindow.document.write(`</body></html>`);
        printWindow.document.close();
        printWindow.focus();

        try {
            printWindow.history.replaceState(null, '', ' ');
        } catch (_) { }

        printWindow.print();
        printWindow.close();
    };

    const handleSearch = async () => {
        const convenio = getConvenio();
        if (!convenio) {
            alert('Por favor, selecione um convênio na barra lateral.');
            return;
        }

        setLoading(true);
        const apiDataInicial = formatDateForApi(dataInicial);
        const apiDataFinal = formatDateForApi(dataFinal);

        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        const periodo = `${dataInicial} a ${dataFinal}`;
        logger.logRelatorio(usuario, `Títulos ${tipoBusca}`, `Periodo: ${periodo}, Convenio: ${convenio.nome}`);

        try {
            const endpoint = tipoBusca === 'abertos' ? '/movimento/titulos' : '/movimento/titulos-pagos';
            const response = await api.get(
                `${endpoint}?convenio=${convenio.codigo}&datainicial=${apiDataInicial}&datafinal=${apiDataFinal}&vencimento=0`
            );
            // O backend pode retornar titulos ou Titulos, vamos normalizar
            const data = response.data.titulos || response.data.Titulos || [];
            setTitulos(data);
        } catch (error) {
            console.error('Erro ao buscar Titulos:', error);
            setTitulos([]);
            logger.logErro(`Busca de Títulos ${tipoBusca}`, error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleSearch();

        const handleConvenioChange = () => {
            handleSearch();
        };

        window.addEventListener('convenioChanged', handleConvenioChange);
        return () => window.removeEventListener('convenioChanged', handleConvenioChange);
    }, [tipoBusca]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="titulos-container">
            <h1 className="titulos-title">Consulta de Títulos</h1>

            <div className="tabs-selection hide-print">
                <button
                    className={`tab-button ${tipoBusca === 'abertos' ? 'active' : ''}`}
                    onClick={() => setTipoBusca('abertos')}
                >
                    Em Aberto
                </button>
                <button
                    className={`tab-button ${tipoBusca === 'pagos' ? 'active' : ''}`}
                    onClick={() => setTipoBusca('pagos')}
                >
                    Pagos
                </button>
            </div>

            <div className="filters-section">
                <div className="input-group">
                    <label htmlFor="dataInicial">Data Inicial:</label>
                    <input
                        type="date"
                        id="dataInicial"
                        value={dataInicial}
                        onChange={(e) => {
                            setDataInicial(e.target.value);
                            localStorage.setItem('titulos_dataInicial', e.target.value);
                        }}
                        className="date-input"
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="dataFinal">Data Final:</label>
                    <input
                        type="date"
                        id="dataFinal"
                        value={dataFinal}
                        onChange={(e) => {
                            setDataFinal(e.target.value);
                            localStorage.setItem('titulos_dataFinal', e.target.value);
                        }}
                        className="date-input"
                    />
                </div>
                <div className="input-group">
                    <label>Tipo de Busca:</label>
                    <input type="radio" checked disabled style={{ marginRight: '5px' }} /> Emissão
                </div>
                <button onClick={handleSearch} className="search-button" disabled={loading}>
                    {loading ? 'Buscando...' : `Buscar Títulos ${tipoBusca === 'abertos' ? 'Abertos' : 'Pagos'}`}
                </button>
            </div>

            {loading && <p className="loading-message">Carregando Títulos...</p>}

            {!loading && titulos.length === 0 ? (
                <p className="no-data-message">Nenhum título encontrado para o convênio e período selecionado.</p>
            ) : (
                <>
                    <div className="table-container">
                        <input
                            type="text"
                            placeholder={`Buscar Cliente`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="filter-input"
                        />
                        <table className="titulos-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>CPF</th>
                                    <th>Cod. Atividade</th>
                                    <th>Títulos</th>
                                    <th>Valor Total</th>
                                    <th className="hide-print">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {titulosPagina.map((titulo, index) => (
                                    <tr key={(titulo.cliente || titulo.Cliente) + index}>
                                        <td>{titulo.cliente || titulo.Cliente}</td>
                                        <td>{titulo.cpf || titulo.Cpf}</td>
                                        <td>{titulo.atividade || titulo.Atividade}</td>
                                        <td>{titulo.titulos || titulo.Titulos}</td>
                                        <td>{(titulo.total || titulo.Total)?.toFixed(2).replace('.', ',')}</td>
                                        <td className="hide-print">
                                            <ModalDetalhes
                                                cliente={titulo.cliente || titulo.Cliente}
                                                dataInicial={dataInicial}
                                                dataFinal={dataFinal}
                                                convenio={getConvenio()?.codigo}
                                                tipoBusca={tipoBusca}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="3"><strong>Totais</strong></td>
                                    <td><strong>{totalTitulos}</strong></td>
                                    <td><strong>{totalValor.toFixed(2).replace('.', ',')}</strong></td>
                                    <td className="hide-print"></td>
                                </tr>
                            </tfoot>
                        </table>

                        {totalPaginas > 1 && (
                            <div className="pagination hide-print">
                                <button
                                    className="pagination-button"
                                    onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                                    disabled={paginaAtual === 1}
                                >
                                    <i className="fas fa-chevron-left"></i> Anterior
                                </button>
                                <span className="pagination-info">
                                    Página {paginaAtual} de {totalPaginas}
                                </span>
                                <button
                                    className="pagination-button"
                                    onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                                    disabled={paginaAtual === totalPaginas}
                                >
                                    Próxima <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="footer-buttons hide-print">
                        <button onClick={handlePrint} className="print-button">
                            <i className="fas fa-print"></i> Imprimir
                        </button>
                        <button onClick={handleExportExcel} className="export-button">
                            <i className="fas fa-file-excel"></i> Excel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Titulos;