// Serviço de logging para o sistema (frontend)
class Logger {
    constructor() {
        // Usar o servidor de logs diretamente via HTTP
        this.logServerUrl = `http://rizzopp.infomaster.inf.br:3002`;
    }

    async log(action, details = '', usuario = '') {
        try {
            await fetch(`${this.logServerUrl}/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    details,
                    usuario
                })
            });
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
const logger = new Logger();
export default logger;
