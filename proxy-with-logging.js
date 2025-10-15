const express = require('express');
const axios = require('axios');
const https = require('https');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: true
}));

const BACKEND_URL = 'https://187.10.42.252:9000';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// Garantir que o diretório de logs existe
const logsDir = '/root/frontcontas/logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Função para gravar logs
const writeLog = (action, details, usuario, timestamp) => {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const logFile = path.join(logsDir, `sistema_${dateStr}.txt`);
        const logEntry = `[${timestamp}] ${action}${details ? ' - ' + details : ''}${usuario ? ' - Usuário: ' + usuario : ''}\n`;
        
        fs.appendFileSync(logFile, logEntry, 'utf8');
        console.log('Log gravado:', logEntry.trim());
    } catch (error) {
        console.error('Erro ao gravar log:', error);
    }
};

// Endpoint para receber logs do frontend
app.post('/api/log', (req, res) => {
    try {
        const { action, details, usuario, timestamp } = req.body;
        writeLog(action, details, usuario, timestamp);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao processar log:', error);
        res.status(500).json({ error: 'Erro ao processar log' });
    }
});

// Middleware para repassar todas as requisições /api para o backend
app.use('/api', async (req, res) => {
    try {
        // Constrói a URL final do backend (remove /api da URL)
        const url = BACKEND_URL + req.originalUrl.replace(/^\/api/, '');
        
        console.log(`Proxy: ${req.method} ${req.originalUrl} -> ${url}`);
        
        // Configuração da requisição Axios
        const axiosConfig = {
            method: req.method,
            url,
            data: req.body,
            headers: {
                ...req.headers,
                host: undefined
            },
            httpsAgent
        };

        const response = await axios(axiosConfig);
        res.status(response.status).send(response.data);
    } catch (err) {
        if (err.response) {
            res.status(err.response.status).send(err.response.data);
        } else {
            res.status(500).send({ error: 'Erro no proxy: ' + (err.message || 'unknown') });
        }
    }
});

// Inicia o proxy na porta 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy com logging rodando em http://0.0.0.0:${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/api`);
});
