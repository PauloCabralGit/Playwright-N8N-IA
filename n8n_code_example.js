#!/usr/bin/env node
/**
 * Código JavaScript para usar diretamente no n8n
 * Copie e cole na função Code do n8n
 */

// Configuração do servidor
const SERVER_URL = 'http://localhost:9998';

/**
 * Verifica se o sistema está ocupado
 */
async function checkSystemStatus() {
  try {
    const response = await fetch(`${SERVER_URL}/current-status`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${data.message || 'Erro desconhecido'}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Erro ao verificar status do sistema: ${error.message}`);
  }
}

/**
 * Inicia a execução do teste
 */
async function startTestExecution(testData) {
  try {
    const response = await fetch(`${SERVER_URL}/run-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${data.message || 'Erro desconhecido'}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Erro ao iniciar teste: ${error.message}`);
  }
}

/**
 * Aguarda a conclusão do teste
 */
async function waitForCompletion(executionId, maxAttempts = 60) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${maxAttempts} - Verificando execução ${executionId}`);

      const response = await fetch(`${SERVER_URL}/execution-details/${executionId}`);
      const data = await response.json();

      if (data.status && data.status !== 'processing') {
        console.log(`✅ Execução ${executionId} concluída com status: ${data.status}`);
        return data;
      }

      // Aguardar 5 segundos antes da próxima verificação
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`Erro na tentativa ${attempt}:`, error.message);
    }
  }

  throw new Error(`Timeout: Execução ${executionId} não concluiu em ${maxAttempts} tentativas`);
}

/**
 * Função principal do n8n
 */
async function main() {
  try {
    console.log('🚀 Iniciando execução controlada de teste...');

    // 1. Verificar se sistema está ocupado
    console.log('🔍 Verificando status do sistema...');
    const status = await checkSystemStatus();

    if (status.execution_in_progress) {
      throw new Error('🚫 Sistema ocupado com outra execução. Apenas uma execução é permitida por vez.');
    }

    console.log('✅ Sistema disponível para execução');

    // 2. Dados do teste
    const testData = {
      ambiente: 'preprod',
      email: 'paulo.cabral.3@globalhitss.com.br.preprod',
      senha: '@@Amosurfar2027',
      massa: '16064201606'
    };

    // 3. Iniciar teste
    console.log('🚀 Iniciando teste...');
    const startResult = await startTestExecution(testData);
    const executionId = startResult.execution_id;

    console.log(`✅ Teste iniciado com ID: ${executionId}`);

    // 4. Aguardar conclusão
    console.log('⏳ Aguardando conclusão do teste...');
    const finalResult = await waitForCompletion(executionId);

    // 5. Retornar resultado
    return {
      success: finalResult.status === 'success',
      execution_id: executionId,
      status: finalResult.status,
      message: finalResult.message,
      timestamp: finalResult.timestamp,
      error_location: finalResult.error_location,
      error_details: finalResult.error_details
    };

  } catch (error) {
    console.error('❌ Erro na execução:', error.message);

    // Retornar erro para o n8n
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Executar função principal
return main();
