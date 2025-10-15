// Script para testar o sistema de logs
const fetch = require('node-fetch');

const testLogger = async () => {
    try {
        const response = await fetch('http://rizzopp.infomaster.inf.br:3002/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'TESTE_SCRIPT',
                details: 'Teste via script Node.js',
                usuario: 'admin'
            })
        });
        
        const result = await response.json();
        console.log('Resposta do servidor:', result);
    } catch (error) {
        console.error('Erro ao testar logger:', error);
    }
};

testLogger();
