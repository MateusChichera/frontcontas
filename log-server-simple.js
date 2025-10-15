const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Criar diretório de logs se não existir
const logsDir = '/root/frontcontas/logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Função para parsear datas brasileiras (DD/MM/YYYY, HH:MM:SS)
function parseBrazilianDate(timestamp) {
    try {
        // Formato: "14/10/2025, 17:24:25"
        const match = timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (match) {
            const [, day, month, year, hour, minute, second] = match;
            return new Date(year, month - 1, day, hour, minute, second);
        }
        
        // Fallback para Date padrão
        return new Date(timestamp);
    } catch (error) {
        console.error('Erro ao parsear data:', timestamp, error);
        return new Date();
    }
}

// Endpoint para salvar logs
app.post('/log-endpoint', (req, res) => {
    try {
        const { log } = req.body;
        
        if (!log) {
            return res.status(400).json({ error: 'Log não fornecido' });
        }

        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `sistema_${today}.txt`);
        
        // Adicionar log ao arquivo
        fs.appendFileSync(logFile, log + '\n');
        
        console.log('Log salvo:', log);
        res.json({ success: true, message: 'Log salvo com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar log:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Endpoint para ler logs
app.get('/get-logs', (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `sistema_${date}.txt`);
        
        if (!fs.existsSync(logFile)) {
            return res.json({ logs: [] });
        }

        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        const logs = lines.map(line => {
            // Extrair timestamp primeiro
            const timestampMatch = line.match(/^\[([^\]]+)\]/);
            if (!timestampMatch) {
                return {
                    timestamp: new Date().toLocaleString('pt-BR'),
                    action: 'LOG',
                    details: line,
                    usuario: '',
                    logEntry: line
                };
            }
            
            const timestamp = timestampMatch[1];
            const restOfLine = line.replace(/^\[[^\]]+\]\s*/, '');
            
            // Tentar extrair usuário do final da linha
            const userMatch = restOfLine.match(/- Usuário:\s+(.+)$/);
            const usuario = userMatch ? userMatch[1] : '';
            
            // Remover a parte do usuário para extrair ação e detalhes
            const withoutUser = userMatch ? restOfLine.replace(/\s+-\s+Usuário:\s+.+$/, '') : restOfLine;
            
            // Extrair ação (primeira palavra, incluindo acentos)
            const actionMatch = withoutUser.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]+)/);
            const action = actionMatch ? actionMatch[1] : 'LOG';
            
            // Extrair detalhes (tudo após a ação)
            const details = actionMatch ? withoutUser.replace(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]+\s*-\s*/, '') : withoutUser;
            
            return {
                timestamp,
                action,
                details,
                usuario,
                logEntry: line
            };
        });

        // Ordenar por timestamp (mais recentes primeiro)
        logs.sort((a, b) => {
            // Converter timestamp brasileiro para Date
            const dateA = parseBrazilianDate(a.timestamp);
            const dateB = parseBrazilianDate(b.timestamp);
            return dateB - dateA; // Mais recentes primeiro
        });

        res.json({ logs });
    } catch (error) {
        console.error('Erro ao ler logs:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de logs rodando na porta ${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  POST http://localhost:${PORT}/log-endpoint`);
    console.log(`  GET  http://localhost:${PORT}/get-logs?date=YYYY-MM-DD`);
});
