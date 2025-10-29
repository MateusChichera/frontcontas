// Logger que grava no servidor via Node.js endpoint
class DirectLogger {
    constructor() {
        // Usar endpoint do proxy Node.js (via /api)
        const baseUrl = window.location.origin;
        this.logEndpoint = `${baseUrl}/api/log-endpoint`;
        this.getLogsEndpoint = `${baseUrl}/api/get-logs`;
    }

    async writeToServer(logEntry) {
        try {
            console.log('Enviando log para:', this.logEndpoint);
            const response = await fetch(this.logEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ log: logEntry }),
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro ao enviar log para servidor:', response.status, errorText);
                
                // Tentar salvar localmente em caso de erro (para não perder logs)
                try {
                    const failedLogs = JSON.parse(localStorage.getItem('failed_logs') || '[]');
                    failedLogs.push({
                        log: logEntry,
                        timestamp: new Date().toISOString(),
                        error: `HTTP ${response.status}: ${errorText}`
                    });
                    // Manter apenas últimos 100 falhas
                    if (failedLogs.length > 100) {
                        failedLogs.splice(0, failedLogs.length - 100);
                    }
                    localStorage.setItem('failed_logs', JSON.stringify(failedLogs));
                } catch (e) {
                    console.error('Erro ao salvar log local:', e);
                }
            } else {
                console.log('Log salvo com sucesso no servidor');
            }
        } catch (error) {
            console.error('Erro de conexão ao enviar log:', error);
            // Tentar salvar localmente em caso de erro
            try {
                const failedLogs = JSON.parse(localStorage.getItem('failed_logs') || '[]');
                failedLogs.push({
                    log: logEntry,
                    timestamp: new Date().toISOString(),
                    error: error.message || 'Erro desconhecido'
                });
                if (failedLogs.length > 100) {
                    failedLogs.splice(0, failedLogs.length - 100);
                }
                localStorage.setItem('failed_logs', JSON.stringify(failedLogs));
                console.log('Log salvo localmente devido a erro');
            } catch (e) {
                console.error('Erro ao salvar log local:', e);
            }
        }
    }

    formatTimestamp() {
        return new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    async log(action, details = '', usuario = '') {
        try {
            const timestamp = this.formatTimestamp();
            const logEntry = `[${timestamp}] ${action}${details ? ' - ' + details : ''}${usuario ? ' - Usuário: ' + usuario : ''}`;
            
            // Enviar apenas para o servidor PHP
            await this.writeToServer(logEntry);
            console.log('Log enviado com sucesso:', action);
        } catch (error) {
            console.error('Erro ao criar log:', error);
        }
    }

    // Métodos específicos para diferentes ações
    logLogin(usuario, sucesso = true) {
        this.log('LOGIN', `${sucesso ? 'Sucesso' : 'Falha'}`, usuario);
    }

    logLogout(usuario) {
        this.log('LOGOUT', '', usuario);
    }

    logRelatorio(usuario, tipo, periodo) {
        this.log('RELATÓRIO', `Tipo: ${tipo} - Período: ${periodo}`, usuario);
    }

    logDetalhes(usuario, cliente, periodo) {
        this.log('DETALHES', `Cliente: ${cliente} - Período: ${periodo}`, usuario);
    }

    logImpressao(usuario, tipo, detalhes) {
        this.log('IMPRESSÃO', `Tipo: ${tipo} - ${detalhes}`, usuario);
    }

    logErro(acao, erro) {
        this.log('ERRO', `${acao} - ${erro}`);
    }

    // Método para exportar logs do servidor PHP
    async exportLogs() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${this.getLogsEndpoint}?date=${today}`);
            
            if (response.ok) {
                const data = await response.json();
                const logs = data.logs || [];
                const content = logs.map(log => log.logEntry).join('\n');
                
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `sistema_${today}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Erro ao exportar logs:', error);
        }
    }
}

// Exportar instância única
const logger = new DirectLogger();
export default logger;
