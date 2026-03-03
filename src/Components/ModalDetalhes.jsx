import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import logger from '../services/directLogger';
import '../css/Modal.css';


const formatDateForApi = (dateString) => {
    if (!dateString) return '';

    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';

    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const ModalDetalhes = ({ cliente, dataInicial, dataFinal, convenio, tipoBusca }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [vendas, setVendas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('data');
    const [loading, setLoading] = useState(false);

    const modalRef = useRef(null);
    const [allVendasForClient, setAllVendasForClient] = useState([]);

    const buscarDetalhes = async () => {
        setLoading(true);
        try {
            const apiDataInicial = formatDateForApi(dataInicial);
            const apiDataFinal = formatDateForApi(dataFinal);

            // Se for títulos pagos, talvez a rota de vendas mude ou precise de flag. 
            // Por enquanto mantemos /movimento/vendas mas passamos convenio se houver.
            let url = `/movimento/vendas?datainicial=${encodeURIComponent(apiDataInicial)}&datafinal=${encodeURIComponent(apiDataFinal)}`;
            if (convenio) {
                url += `&convenio=${convenio}`;
            }

            const res = await api.get(url);

            const todasVendas = res.data.vendas || res.data.Vendas || [];
            const vendasFiltradasPorCliente = todasVendas.filter((venda) => {
                const vendaCliente = venda.cliente || venda.Cliente;
                return vendaCliente === cliente;
            });

            setAllVendasForClient(vendasFiltradasPorCliente);
            setVendas(vendasFiltradasPorCliente);

        } catch (err) {
            console.error('Erro ao buscar detalhes do cliente:', err);
            setVendas([]);
            setAllVendasForClient([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!searchTerm) {
            setVendas(allVendasForClient);
            return;
        }

        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const filtered = allVendasForClient.filter(venda => {
            if (filterType === 'data') {
                const dataVenda = venda.data || venda.Data;
                const vendaDate = new Date(dataVenda).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                return vendaDate.includes(lowerCaseSearchTerm);
            } else if (filterType === 'item') {
                const itens = venda.itens || venda.Itens || [];
                return itens.some(item => {
                    const desc = item.descricao || item.Descricao || '';
                    return desc.toLowerCase().includes(lowerCaseSearchTerm);
                });
            }
            return false;
        });
        setVendas(filtered);
    }, [searchTerm, filterType, allVendasForClient]);

    const handleOpen = () => {
        setSearchTerm('');
        setFilterType('data');
        buscarDetalhes();
        setIsOpen(true);

        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        const periodo = `${formatDateForDisplay(dataInicial)} a ${formatDateForDisplay(dataFinal)}`;
        logger.logDetalhes(usuario, cliente, periodo);
    };

    const handleClose = () => setIsOpen(false);

    const handlePrint = () => {
        if (!modalRef.current) return;

        const usuario = localStorage.getItem('usuario') || 'Desconhecido';
        const periodo = `${formatDateForDisplay(dataInicial)} a ${formatDateForDisplay(dataFinal)}`;
        logger.logImpressao(usuario, 'Detalhes Cliente', `Cliente: ${cliente} - Período: ${periodo}`);

        const contentHtml = modalRef.current.innerHTML;
        const printWindow = window.open('', '', 'width=900,height=650');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${cliente} | Período: ${formatDateForDisplay(dataInicial)} a ${formatDateForDisplay(dataFinal)}</title><style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; font-size: 12px; }
            th { background: #f0f0f0; }
            .venda-card { margin-bottom: 20px; }
            .venda-card-footer { text-align: right; font-weight: 600; margin-top: 8px; }
            .total-value { font-size: 1.2em; }
            .filter-controls, .hide-print { display: none !important; }
            @media print { @page { margin: 20mm; } }
        </style></head><body>`);
        printWindow.document.write(contentHtml);

        printWindow.document.write('<div style="position:fixed;bottom:10px;right:20px;font-size:12px;">InfoMaster</div>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();

        printWindow.focus();
        try {
            printWindow.history.replaceState(null, '', ' ');
        } catch (_) { }
        printWindow.print();
        printWindow.close();
    };

    return (
        <>
            <button className="details-button" onClick={handleOpen}>Detalhes</button>

            {isOpen && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalhes – {cliente} | {tipoBusca === 'pagos' ? 'Pagos' : 'Abertos'} | Período: {formatDateForDisplay(dataInicial)} a {formatDateForDisplay(dataFinal)}</h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="print-button-modal hide-print" onClick={handlePrint}>🖨️</button>
                                <button className="close-button hide-print" onClick={handleClose}>×</button>
                            </div>
                        </div>

                        <div className="filter-controls">
                            <input
                                type="text"
                                placeholder={`Buscar por ${filterType === 'data' ? 'data (DD/MM/AAAA)' : 'nome do item'}`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="filter-input"
                            />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="filter-select"
                            >
                                <option value="data">Filtrar por Data</option>
                                <option value="item">Filtrar por Item</option>
                            </select>
                        </div>

                        {loading ? (
                            <p className="loading-message-modal">Carregando detalhes...</p>
                        ) : vendas.length === 0 ? (
                            <p className="no-data-message-modal">Nenhuma venda encontrada para o cliente ou filtro.</p>
                        ) : (
                            vendas.map((venda) => {
                                const idVenda = venda.venda || venda.Venda;
                                const terminal = venda.terminal || venda.Terminal;
                                const dataVenda = venda.data || venda.Data;
                                const itens = venda.itens || venda.Itens || [];
                                const totalVenda = venda.total || venda.Total;

                                return (
                                    <div key={`${idVenda}-${terminal}`} className="venda-card">
                                        <h3>
                                            Venda #{idVenda} | Terminal {terminal} | Data{' '}
                                            {new Date(dataVenda).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </h3>

                                        <table className="items-table">
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th>EAN</th>
                                                    <th>Descrição</th>
                                                    <th>Quantidade</th>
                                                    <th>Unitário</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itens.map((item, idx) => {
                                                    const codItem = item.item || item.Item;
                                                    const ean = item.ean || item.EAN;
                                                    const desc = item.descricao || item.Descricao;
                                                    const qtd = item.quantidade || item.Quantidade;
                                                    const unit = item.unitario || item.Unitario;
                                                    const tot = item.total || item.Total;

                                                    return (
                                                        <tr key={`${idVenda}-${terminal}-${codItem}-${idx}`}>
                                                            <td>{codItem}</td>
                                                            <td>{ean}</td>
                                                            <td>{desc}</td>
                                                            <td>{qtd}</td>
                                                            <td>{unit?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            <td>{tot?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        <div className="venda-card-footer">
                                            Total:&nbsp;
                                            <span className="total-value">
                                                {totalVenda?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ModalDetalhes;