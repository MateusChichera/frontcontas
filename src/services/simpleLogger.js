// Serviço de logging simples que grava diretamente no arquivo
class SimpleLogger {
    constructor() {
        this.logEndpoint = '/api/log'; // Usar o mesmo endpoint da API
    }

    async log(action, details = '', usuario = '') {
        try {
            // Enviar para o backend que vai gravar no arquivo
            const response = await fetch(this.logEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    details,
                    usuario,
                    timestamp: new Date().toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })
                })
            });
            
            if (!response.ok) {
                console.error('Erro ao enviar log:', response.status);
            }
        } catch (error) {
            console.error('Erro ao enviar log:', error);
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
}

// Exportar instância única
const logger = new SimpleLogger();
export default logger;
