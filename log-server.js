const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const logsDir = '/root/frontcontas/logs';

// Garantir que o diretório de logs existe
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const getLogFileName = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(logsDir, `sistema_${dateStr}.txt`);
};

const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Endpoint para receber logs do frontend
app.post('/log', (req, res) => {
    try {
        const { action, details, usuario } = req.body;
        const timestamp = formatTimestamp();
        const logEntry = `[${timestamp}] ${action}${details ? ' - ' + details : ''}${usuario ? ' - Usuário: ' + usuario : ''}\n`;
        
        fs.appendFileSync(getLogFileName(), logEntry, 'utf8');
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao escrever no log:', error);
        res.status(500).json({ error: 'Erro ao escrever no log' });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Servidor de logs rodando na porta ${PORT}`);
});
