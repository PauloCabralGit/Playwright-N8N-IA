import { NextRequest, NextResponse } from 'next/server';
import { getN8nConfig, getPublicAppUrl } from '@/app/lib/n8n-config';

/**
 * Endpoint que retorna todas as configurações necessárias para o n8n
 * O n8n pode chamar este endpoint para carregar suas configurações dinamicamente
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') || request.nextUrl.searchParams.get('tenant') || undefined;
    const n8nSettings = await getN8nConfig(request, tenantId);
    const appPublicUrl = await getPublicAppUrl(request);

    // Retorna um objeto que o n8n pode usar como variáveis globais
    return NextResponse.json({
      tenantId: n8nSettings.tenantId || '',
      tenantSlug: n8nSettings.tenantSlug || '',
      companyName: n8nSettings.companyName || '',
      cnpj: n8nSettings.cnpj || '',
      address: n8nSettings.address || '',
      webhookBaseUrl: n8nSettings.webhookBaseUrl || '',
      webhookPath: n8nSettings.webhookPath || '',
      workflowPublishedAt: n8nSettings.workflowPublishedAt || '',
      workflowDownloadUrl: n8nSettings.workflowDownloadUrl || '',
      APP_PUBLIC_URL: appPublicUrl,
      appPublicUrl,
      
      // Configurações n8n originais
      N8N_WEBHOOK_URL: n8nSettings.webhookUrl,
      N8N_API_KEY: n8nSettings.apiKey,
      n8nWebhookUrl: n8nSettings.webhookUrl,
      n8nApiKey: n8nSettings.apiKey,
      
      // Discord
      DISCORD_WEBHOOK: n8nSettings.discordWebhook,
      discordWebhook: n8nSettings.discordWebhook,

      // GitHub
      GITHUB_OWNER: n8nSettings.githubOwner,
      GITHUB_REPO: n8nSettings.githubRepo,
      GITHUB_BRANCH: n8nSettings.githubBranch,
      GITHUB_TOKEN: n8nSettings.githubToken,
      githubOwner: n8nSettings.githubOwner,
      githubRepo: n8nSettings.githubRepo,
      githubBranch: n8nSettings.githubBranch,
      githubToken: n8nSettings.githubToken,
      
      // Timestamp para validação
      loadedAt: new Date().toISOString(),
      updatedAt: n8nSettings.updatedAt || '',
    });
  } catch (error) {
    console.error('Error fetching n8n configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * Endpoint POST para sincronizar configurações do n8n com a aplicação
 * O n8n pode salvar suas configurações aqui
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar e processar configurações adicionais se enviadas
    // Por enquanto apenas logamos
    console.log('n8n configuration sync received:', {
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration synced successfully',
    });
  } catch (error) {
    console.error('Error syncing n8n configuration:', error);
    return NextResponse.json(
      { error: 'Failed to sync configuration' },
      { status: 500 }
    );
  }
}
