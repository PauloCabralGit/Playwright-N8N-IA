#!/usr/bin/env node
/**
 * Exemplo de integração n8n com sistema de controle de execução
 * Demonstra polling para aguardar conclusão e análise detalhada de erros
 */

const axios = require('axios');

class TestExecutionManager {
    constructor(baseUrl = 'http://localhost:9999') {
        this.baseUrl = baseUrl;
        this.maxRetries = 60; // 5 minutos máximo (60 * 5 segundos)
        this.retryInterval = 5000; // 5 segundos entre verificações
    }

    /**
     * Inicia um teste e aguarda sua conclusão
     */
    async executeTestAndWait(testData) {
        console.log('🚀 Iniciando teste...', testData);

        try {
            // 1. Iniciar o teste
            const startResponse = await axios.post(`${this.baseUrl}/run-tests`, testData);

            if (startResponse.status !== 200) {
                throw new Error(`Erro ao iniciar teste: ${startResponse.status} - ${startResponse.data.message}`);
            }

            const executionId = startResponse.data.execution_id;
            console.log(`✅ Teste iniciado: ${executionId}`);

            // 2. Aguardar conclusão com polling
            const result = await this.waitForCompletion(executionId);

            // 3. Analisar resultado
            return this.analyzeResult(result, executionId);

        } catch (error) {
            console.error('❌ Erro na execução:', error.message);
            throw error;
        }
    }

    /**
     * Aguarda a conclusão do teste usando polling
     */
    async waitForCompletion(executionId) {
        console.log(`⏳ Aguardando conclusão de ${executionId}...`);

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Verificar status atual
                const statusResponse = await axios.get(`${this.baseUrl}/current-status`);

                if (!statusResponse.data.execution_in_progress) {
                    console.log(`✅ Sistema liberado após ${attempt} verificações`);
                    break;
                }

                console.log(`🔄 Tentativa ${attempt}/${this.maxRetries} - Execução em andamento`);

                if (attempt < this.maxRetries) {
                    await this.sleep(this.retryInterval);
                }

            } catch (error) {
                console.error(`Erro na verificação ${attempt}:`, error.message);
            }
        }

        // 3. Obter resultado detalhado
        try {
            const detailsResponse = await axios.get(`${this.baseUrl}/execution-details/${executionId}`);
            return detailsResponse.data;
        } catch (error) {
            throw new Error(`Erro ao obter detalhes da execução ${executionId}: ${error.message}`);
        }
    }

    /**
     * Analisa o resultado e estrutura a resposta
     */
    analyzeResult(result, executionId) {
        console.log(`📊 Analisando resultado de ${executionId}...`);

        const analysis = {
            execution_id: executionId,
            status: result.status,
            timestamp: result.timestamp,
            duration: this.calculateDuration(result),
            success: result.status === 'success',
            details: {
                message: result.message,
                return_code: result.return_code,
                results_dir: result.results_dir,
                error_analysis: null
            }
        };

        // Análise detalhada de erro se houve falha
        if (result.status === 'error') {
            analysis.details.error_analysis = {
                location: result.error_location,
                details: result.error_details,
                category: this.categorizeError(result.error_location),
                suggested_actions: this.getSuggestedActions(result.error_location)
            };

            console.log(`🔍 Erro detectado em: ${result.error_location}`);
        }

        return analysis;
    }

    /**
     * Calcula duração da execução
     */
    calculateDuration(result) {
        if (result.start_time && result.end_time) {
            const start = new Date(result.start_time);
            const end = new Date(result.end_time);
            const durationMs = end - start;
            return {
                milliseconds: durationMs,
                seconds: Math.round(durationMs / 1000),
                minutes: Math.round(durationMs / 60000 * 100) / 100
            };
        }
        return null;
    }

    /**
     * Categoriza o tipo de erro
     */
    categorizeError(errorLocation) {
        const categories = {
            'browser_error': 'Problema de Navegador',
            'element_error': 'Elemento não encontrado',
            'timeout_error': 'Tempo esgotado',
            'login_error': 'Erro de autenticação',
            'navigation_error': 'Erro de navegação',
            'javascript_error': 'Erro de JavaScript',
            'execution_timeout': 'Timeout de execução',
            'system_error': 'Erro do sistema',
            'unknown_error': 'Erro desconhecido'
        };

        return categories[errorLocation] || 'Erro não categorizado';
    }

    /**
     * Sugere ações baseadas no tipo de erro
     */
    getSuggestedActions(errorLocation) {
        const actions = {
            'browser_error': [
                'Verificar se o Chrome está instalado',
                'Verificar versão do ChromeDriver',
                'Reiniciar o navegador'
            ],
            'element_error': [
                'Verificar se o elemento existe na página',
                'Aguardar carregamento da página',
                'Verificar seletor CSS/XPath'
            ],
            'timeout_error': [
                'Aumentar tempo de espera',
                'Verificar conexão de internet',
                'Verificar se página carregou completamente'
            ],
            'login_error': [
                'Verificar credenciais',
                'Verificar ambiente (dev/preprod/prod)',
                'Verificar se usuário tem permissão'
            ],
            'execution_timeout': [
                'O teste demorou mais que 10 minutos',
                'Verificar se há elementos que travam',
                'Otimizar velocidade do teste'
            ]
        };

        return actions[errorLocation] || ['Analisar logs detalhadamente', 'Verificar ambiente de teste'];
    }

    /**
     * Função auxiliar para sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exemplo de uso
async function example() {
    const manager = new TestExecutionManager();

    const testData = {
        ambiente: 'preprod',
        email: 'paulo.cabral.3@globalhitss.com.br.preprod',
        senha: '@@Amosurfar2027',
        massa: '16064201606'
    };

    try {
        const result = await manager.executeTestAndWait(testData);

        console.log('\n🎯 RESULTADO FINAL:');
        console.log(`Status: ${result.success ? '✅ SUCESSO' : '❌ FALHOU'}`);
        console.log(`Duração: ${result.duration?.minutes || 'N/A'} minutos`);

        if (result.details.error_analysis) {
            console.log(`\n🔍 ANÁLISE DE ERRO:`);
            console.log(`Categoria: ${result.details.error_analysis.category}`);
            console.log(`Localização: ${result.details.error_analysis.location}`);
            console.log(`\n💡 Ações sugeridas:`);
            result.details.error_analysis.suggested_actions.forEach((action, index) => {
                console.log(`   ${index + 1}. ${action}`);
            });
        }

        return result;

    } catch (error) {
        console.error('❌ Erro na execução do exemplo:', error.message);
        throw error;
    }
}

// Executar exemplo se chamado diretamente
if (require.main === module) {
    example().catch(console.error);
}

module.exports = TestExecutionManager;
