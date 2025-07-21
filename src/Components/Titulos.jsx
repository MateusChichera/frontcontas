import React, { useState, useEffect, useMemo } from 'react';
import ModalDetalhes from './ModalDetalhes';
import api from '../services/api';
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
    // Remover o state de vencimento

    const filteredTitulos = useMemo(() => {
        if (!searchTerm) return titulos;
        return titulos.filter((t) =>
            t.Cliente?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [titulos, searchTerm]);

    
    const totalTitulos = useMemo(() =>
        filteredTitulos.reduce((s, t) => s + (t.Titulos || 0), 0)
    , [filteredTitulos]);

    const totalValor = useMemo(() =>
        filteredTitulos.reduce((s, t) => s + (t.Total || 0), 0)
    , [filteredTitulos]);

   
    const formatDateDisplay = (isoDate) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    
    const handleExportExcel = () => {
        const header = ['Cliente', 'CPF', 'Cod. Atividade', 'Títulos', 'Valor Total'];
        const rows = filteredTitulos.map((t) => [
            t.Cliente,
            t.Cpf,
            t.Atividade,
            t.Titulos,
            (t.Total ?? 0).toFixed(2).replace('.', ',')
        ]);

        const csvContent = [header, ...rows]
            .map((row) => row.join(';'))
            .join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadLink = document.createElement('a');
        const periodo = `${formatDateDisplay(dataInicial)}_a_${formatDateDisplay(dataFinal)}`;
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `Titulos_${periodo}.csv`;
        downloadLink.click();
    };

   
    const handlePrint = () => {
        const originalTable = document.querySelector('.titulos-table').cloneNode(true);
        originalTable.querySelectorAll('.hide-print').forEach(el => el.remove());
        const tableHtml = originalTable.outerHTML;
        const headerTitle = `Fechamento Convênio período ${formatDateDisplay(dataInicial)} a ${formatDateDisplay(dataFinal)}`;
        const footerText = `${new Date().toLocaleString('pt-BR')} - Infomaster`;

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
        printWindow.document.write(`<h2 style="text-align:center;">${headerTitle}</h2>`);
        printWindow.document.write(tableHtml);
        printWindow.document.write(`<div style="position:fixed;bottom:10px;right:20px;font-size:12px;">${footerText}</div>`);
        printWindow.document.write(`</body></html>`);
        printWindow.document.close();
        printWindow.focus();

       
        try {
            printWindow.history.replaceState(null, '', ' ');
        } catch (_) {}

        printWindow.print();
        printWindow.close();
    };


    const handleSearch = async () => {
        setLoading(true); 

       
        const apiDataInicial = formatDateForApi(dataInicial);
        const apiDataFinal = formatDateForApi(dataFinal);

        try {
            const response = await api.get(
                `/movimento/titulos?datainicial=${apiDataInicial}&datafinal=${apiDataFinal}&vencimento=0`
            );
            setTitulos(response.data.Titulos ?? []);
            console.log('Dados recebidos da API:', response.data);
        } catch (error) {
            console.error('Erro ao buscar Titulos:', error);
            setTitulos([]);
        } finally {
            setLoading(false); 
        }
    };

   
    useEffect(() => {
        handleSearch();
    }, []);

    return (
        <div className="titulos-container">
            <h1 className="titulos-title">Consulta de Títulos</h1>

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
                    <input type="radio" checked disabled style={{marginRight: '5px'}} /> Emissão
                </div>
                {/* Remover o bloco dos botões radio de tipo de data */}
                <button onClick={handleSearch} className="search-button" disabled={loading}>
                    {loading ? 'Buscando...' : 'Buscar Títulos'}
                </button>
            </div>

            {loading && <p className="loading-message">Carregando Títulos...</p>}

            {!loading && titulos.length === 0 ? (
                <p className="no-data-message">Nenhum título encontrado para o período selecionado.</p>
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
                            {filteredTitulos.map((titulo, index) => (
                                <tr key={titulo.Cliente + index}>
                                    <td>{titulo.Cliente}</td>
                                    <td>{titulo.Cpf}</td>
                                    <td>{titulo.Atividade}</td>
                                    <td>{titulo.Titulos}</td>
                                    <td>{titulo.Total?.toFixed(2).replace('.', ',')}</td>
                                    <td className="hide-print">
                                        <ModalDetalhes
                                            cliente={titulo.Cliente}
                                            dataInicial={dataInicial}
                                            dataFinal={dataFinal}
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