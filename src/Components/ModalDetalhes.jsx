import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import '../css/Modal.css'; 


const formatDateForApi = (dateString) => {
    if (!dateString) return '';
   
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const ModalDetalhes = ({ cliente, dataInicial, dataFinal }) => {
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

            console.log(`Buscando vendas para API com DataInicial=${apiDataInicial} e DataFinal=${apiDataFinal}`);

            const res = await api.get(
                `/Vendas?DataInicial=${encodeURIComponent(apiDataInicial)}&DataFinal=${encodeURIComponent(apiDataFinal)}`
            );

           
            const todasVendas = res.data.Vendas || [];
            const vendasFiltradasPorCliente = todasVendas.filter((venda) => venda.Cliente === cliente);
            
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
                
                const vendaDate = new Date(venda.Data).toLocaleDateString('pt-BR');
                return vendaDate.includes(lowerCaseSearchTerm);
            } else if (filterType === 'item') {
               
                return venda.Itens.some(item =>
                    item.Descricao.toLowerCase().includes(lowerCaseSearchTerm)
                );
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
    };

   
    const handleClose = () => setIsOpen(false);

    const handlePrint = () => {
        if (!modalRef.current) return;

        const contentHtml = modalRef.current.innerHTML;
        const printWindow = window.open('', '', 'width=900,height=650');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Detalhes – ${cliente}</title><style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; font-size: 12px; }
            th { background: #f0f0f0; }
            .venda-card { margin-bottom: 20px; }
            .venda-card-footer { text-align: right; font-weight: 600; margin-top: 8px; }
            .total-value { font-size: 1.2em; }
            /* Oculta elementos de controle e botões na impressão */
            .filter-controls, .hide-print { display: none !important; }
            @media print { @page { margin: 20mm; } }
        </style></head><body>`);
        printWindow.document.write(contentHtml);
        
        printWindow.document.write('<div style="position:fixed;bottom:10px;right:20px;font-size:12px;">Infomaster</div>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();

        printWindow.focus();

       
        try {
            printWindow.history.replaceState(null, '', ' ');
        } catch (_) {}
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
                            <h2>Detalhes – {cliente}</h2>
                            <div style={{display:'flex',gap:'10px'}}>
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
                            vendas.map((venda) => (
                                <div key={`${venda.Venda}-${venda.Terminal}`} className="venda-card">
                                    <h3>
                                        Venda #{venda.Venda} | Terminal {venda.Terminal} | Data{' '}
                                        {new Date(venda.Data).toLocaleDateString('pt-BR')}
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
                                            {venda.Itens.map((item) => (
                                                <tr key={`${venda.Venda}-${venda.Terminal}-${item.Item}`}>
                                                    <td>{item.Item}</td>
                                                    <td>{item.EAN}</td>
                                                    <td>{item.Descricao}</td>
                                                    <td>{item.Quantidade}</td>
                                                    <td>{item.Unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td>{item.Total?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="venda-card-footer">
                                        Total:&nbsp;
                                        <span className="total-value">
                                            {venda.Total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ModalDetalhes;