// Logger que grava no servidor via Node.js endpoint
class DirectLogger {
    constructor() {
        this.logEndpoint = 'http://localhost:3003/log-endpoint';
        this.getLogsEndpoint = 'http://localhost:3003/get-logs';
    }

    async writeToServer(logEntry) {
        try {
            const response = await fetch(this.logEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ log: logEntry })
            });

            if (response.ok) {
                console.log('Log enviado para servidor:', logEntry.trim());
            } else {
                console.error('Erro ao enviar log para servidor:', response.status);
            }
        } catch (error) {
            console.error('Erro de conexão com servidor:', error);
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
        const timestamp = this.formatTimestamp();
        const logEntry = `[${timestamp}] ${action}${details ? ' - ' + details : ''}${usuario ? ' - Usuário: ' + usuario : ''}`;
        
        // Salvar no servidor
        await this.writeToServer(logEntry);
        
        // Também salvar no localStorage como backup local
        const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
        logs.push({
            timestamp,
            action,
            details,
            usuario,
            logEntry
        });
        localStorage.setItem('audit_logs', JSON.stringify(logs));
        
        console.log('Log salvo para usuário:', usuario, 'Ação:', action);
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

    // Método para exportar todos os logs
    async exportLogs() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`http://localhost:3003/get-logs?date=${today}`);
            
            if (response.ok) {
                const data = await response.json();
                const logs = data.logs || [];
                const content = logs.map(log => log.logEntry).join('\n');
                
                // Criar download
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `sistema_${today}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                throw new Error('Erro ao carregar logs do servidor');
            }
        } catch (error) {
            console.error('Erro ao exportar logs:', error);
            // Fallback para localStorage
            const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
            const content = logs.map(log => log.logEntry).join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `sistema_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    // Método para limpar logs de auditoria (apenas para admin)
    clearAuditLogs() {
        localStorage.removeItem('audit_logs');
        console.log('Logs de auditoria limpos');
    }

    // Método para obter informações sobre os logs
    getLogInfo() {
        const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
        const usuarios = [...new Set(logs.map(log => log.usuario))];
        return {
            totalLogs: logs.length,
            usuarios: usuarios,
            ultimoLog: logs[logs.length - 1]?.timestamp || 'Nenhum'
        };
    }
}

// Exportar instância única
const logger = new DirectLogger();
export default logger;
