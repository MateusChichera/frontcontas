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

// Endpoint para receber logs do frontend (formato novo: { log: "[timestamp] action - details - Usuário: user" })
// Nota: O nginx remove /api/ ao fazer proxy, então aceita ambos os formatos
app.post(['/api/log-endpoint', '/log-endpoint'], (req, res) => {
    try {
        const { log } = req.body;
        if (!log) {
            return res.status(400).json({ error: 'Log não fornecido' });
        }
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const logFile = path.join(logsDir, `sistema_${dateStr}.txt`);
        
        fs.appendFileSync(logFile, log + '\n', 'utf8');
        console.log('Log gravado:', log.trim());
        
        res.json({ success: true, message: 'Log salvo com sucesso' });
    } catch (error) {
        console.error('Erro ao processar log:', error);
        res.status(500).json({ error: 'Erro ao processar log' });
    }
});

// Endpoint para ler logs (compatível com get-logs.php)
// Nota: O nginx remove /api/ ao fazer proxy, então aceita ambos os formatos
app.get(['/api/get-logs', '/get-logs'], (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `sistema_${date}.txt`);
        
        if (!fs.existsSync(logFile)) {
            return res.json({ logs: [] });
        }
        
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        const logs = [];
        lines.forEach(line => {
            // Parse do formato: [timestamp] action - details - Usuário: user
            // Regex melhorada para capturar logs com múltiplos hífens
            const match = line.match(/^\[([^\]]+)\]\s+(.+?)(?:\s+-\s+Usuário:\s+(.+))?$/);
            if (match) {
                const timestamp = match[1];
                const rest = match[2]; // Tudo entre timestamp e "Usuário:"
                const usuario = match[3] || '';
                
                // Separar action e details
                // Se há " - " no texto, a primeira parte é action, resto é details
                const parts = rest.split(/\s+-\s+/);
                const action = parts[0] || '';
                const details = parts.slice(1).join(' - ') || '';
                
                logs.push({
                    timestamp: timestamp,
                    action: action,
                    details: details,
                    usuario: usuario,
                    logEntry: line
                });
            } else {
                // Se não matchar, ainda salvar a linha completa
                logs.push({
                    timestamp: '',
                    action: 'DESCONHECIDO',
                    details: line,
                    usuario: '',
                    logEntry: line
                });
            }
        });
        
        // Ordenar por timestamp (mais recentes primeiro)
        logs.sort((a, b) => {
            try {
                // Converter timestamp brasileiro para Date
                const parseTimestamp = (ts) => {
                    const match = ts.match(/(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})/);
                    if (match) {
                        const [, day, month, year, hour, minute, second] = match;
                        return new Date(year, month - 1, day, hour, minute, second);
                    }
                    return new Date(ts);
                };
                const dateA = parseTimestamp(a.timestamp);
                const dateB = parseTimestamp(b.timestamp);
                return dateB - dateA;
            } catch {
                return 0;
            }
        });
        
        res.json({ logs });
    } catch (error) {
        console.error('Erro ao ler logs:', error);
        res.status(500).json({ error: 'Erro ao ler logs' });
    }
});

// Endpoint para receber logs do frontend (formato antigo)
// Nota: O nginx remove /api/ ao fazer proxy, então aceita ambos os formatos
app.post(['/api/log', '/log'], (req, res) => {
    try {
        const { action, details, usuario, timestamp } = req.body;
        writeLog(action, details, usuario, timestamp);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao processar log:', error);
        res.status(500).json({ error: 'Erro ao processar log' });
    }
});

// Middleware para repassar todas as requisições /api para o backend (exceto rotas de log)
// IMPORTANTE: Este middleware deve ser o ÚLTIMO para não interferir com os handlers específicos acima
app.use('/api', async (req, res, next) => {
    // Verificar se é uma rota de log - se for, deixar os handlers específicos tratarem
    // Nota: Como o nginx remove /api/, as rotas chegam sem /api/
    const urlPath = req.path || req.originalUrl.split('?')[0]; // Remove query string
    const isLogRoute = urlPath === '/log-endpoint' || 
                       urlPath === '/get-logs' || 
                       urlPath === '/log' ||
                       urlPath.includes('/api/log-endpoint') ||
                       urlPath.includes('/api/get-logs') ||
                       urlPath.includes('/api/log');
    
    if (isLogRoute) {
        // Deixa os handlers específicos tratarem (já registrados acima)
        return next();
    }
    
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
