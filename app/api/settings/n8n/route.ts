import { NextRequest, NextResponse } from 'next/server';
import { getN8nConfig, setN8nConfig } from '@/app/lib/n8n-config';
import type { N8nSettings } from '@/components/dashboard/types';
import { buildTenantWebhookUrl, getCurrentTenant, publishTenantWorkflow } from '@/app/lib/tenant-auth';
import { registerDiscordSlashCommands, resolveDiscordApplicationFromBotToken } from '@/app/lib/discord-bot';

function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateSettings(body: Partial<N8nSettings>) {
  const issues: string[] = [];
  const requiredFields: { key: keyof N8nSettings; label: string }[] = [
    { key: 'appPublicUrl', label: 'URL pública do app' },
    { key: 'webhookBaseUrl', label: 'Base URL do webhook' },
    { key: 'apiKey', label: 'API Key do n8n' },
    { key: 'githubOwner', label: 'GitHub Owner' },
    { key: 'githubRepo', label: 'GitHub Repo' },
    { key: 'githubBranch', label: 'GitHub Branch' },
    { key: 'githubToken', label: 'GitHub Token' },
  ];

  for (const field of requiredFields) {
    const value = String(body[field.key] || '').trim();
    if (!value) {
      issues.push(`${field.label} está vazio`);
      continue;
    }

    if (field.key === 'appPublicUrl' && !isValidUrl(value)) {
      issues.push(`${field.label} está com URL inválida`);
      continue;
    }

    if ((field.key === 'appPublicUrl' || field.key === 'webhookBaseUrl') && !isValidUrl(value)) {
      issues.push(`${field.label} está com URL inválida`);
      continue;
    }

    if (field.key === 'apiKey' && !/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      issues.push(`${field.label} está com formato inválido`);
      continue;
    }

    if (field.key === 'githubToken' && !/^(ghp_|github_pat_)/i.test(value)) {
      issues.push(`${field.label} está com formato inválido`);
      continue;
    }
  }

  return issues;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenant = await getCurrentTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 });
    }

    const currentConfig = await getN8nConfig(request, tenant.id);
    const resolvedWebhookBaseUrl = tenant.webhookBaseUrl || currentConfig.webhookBaseUrl || (() => {
      try {
        return currentConfig.webhookUrl ? new URL(currentConfig.webhookUrl).origin : '';
      } catch {
        return '';
      }
    })();
    const resolvedWebhookUrl = resolvedWebhookBaseUrl ? buildTenantWebhookUrl(resolvedWebhookBaseUrl) : String(body.webhookUrl ?? currentConfig.webhookUrl ?? '').trim();
    const mergedConfig = {
      ...currentConfig,
      ...body,
      companyName: String(body.companyName ?? currentConfig.companyName ?? '').trim(),
      cnpj: String(body.cnpj ?? currentConfig.cnpj ?? '').trim(),
      address: String(body.address ?? currentConfig.address ?? '').trim(),
      appPublicUrl: String(body.appPublicUrl ?? currentConfig.appPublicUrl ?? '').trim(),
      webhookUrl: resolvedWebhookUrl,
      apiKey: String(body.apiKey ?? currentConfig.apiKey ?? '').trim(),
      githubOwner: String(body.githubOwner ?? currentConfig.githubOwner ?? '').trim(),
      githubRepo: String(body.githubRepo ?? currentConfig.githubRepo ?? '').trim(),
      githubBranch: String(body.githubBranch ?? currentConfig.githubBranch ?? 'main').trim() || 'main',
      githubToken: String(body.githubToken ?? currentConfig.githubToken ?? '').trim(),
    };

    const issues = validateSettings(mergedConfig);

    const githubIssues: string[] = [];

    if (issues.length > 0 || githubIssues.length > 0) {
      return NextResponse.json(
        { error: 'Configurações inválidas.', issues: [...issues, ...githubIssues] },
        { status: 400 }
      );
    }

    if (mergedConfig.discordWebhook) {
      try {
        new URL(mergedConfig.discordWebhook);
      } catch {
        return NextResponse.json(
          { error: 'Discord webhook URL inválida.' },
          { status: 400 }
        );
      }
    }

    if (!String(mergedConfig.discordBotToken || '').trim()) {
      return NextResponse.json(
        { error: 'Discord Bot Token está vazio.' },
        { status: 400 }
      );
    }

    // Save configuration using shared config module
    const savedConfig = {
      tenantId: tenant.id || '',
      tenantSlug: tenant.slug || '',
      companyName: mergedConfig.companyName,
      cnpj: mergedConfig.cnpj,
      address: mergedConfig.address,
      webhookBaseUrl: resolvedWebhookBaseUrl,
      webhookPath: tenant.webhookPath || currentConfig.webhookPath || '',
      appPublicUrl: mergedConfig.appPublicUrl,
      webhookUrl: resolvedWebhookUrl,
      apiKey: mergedConfig.apiKey,
      discordWebhook: mergedConfig.discordWebhook,
      discordApplicationId: mergedConfig.discordApplicationId,
      discordPublicKey: mergedConfig.discordPublicKey,
      discordBotToken: mergedConfig.discordBotToken,
      discordGuildId: mergedConfig.discordGuildId,
      discordCommandName: mergedConfig.discordCommandName,
      githubOwner: mergedConfig.githubOwner,
      githubRepo: mergedConfig.githubRepo,
      githubBranch: mergedConfig.githubBranch,
      githubToken: mergedConfig.githubToken,
      loadedAt: currentConfig.loadedAt,
      updatedAt: new Date().toISOString(),
    };

    try {
      const resolvedDiscord = await resolveDiscordApplicationFromBotToken(savedConfig.discordBotToken);
      if (resolvedDiscord.applicationId) {
        savedConfig.discordApplicationId = resolvedDiscord.applicationId;
      }
      if (resolvedDiscord.publicKey) {
        savedConfig.discordPublicKey = resolvedDiscord.publicKey;
      }
    } catch (error) {
      console.warn('Unable to resolve Discord application from bot token:', error);
    }

    try {
      await setN8nConfig(savedConfig, request);
    } catch (error) {
      console.error('Failed to persist n8n configuration:', error);
      return NextResponse.json(
        {
          error: 'Failed to save configuration',
          details: error instanceof Error ? error.message : 'Unknown persistence error',
        },
        { status: 500 }
      );
    }

    let publishedWorkflow: { workflowDownloadUrl?: string } | null = null;
    if (tenant) {
      try {
        publishedWorkflow = await publishTenantWorkflow(tenant.id);
      } catch (error) {
        console.error('Failed to publish tenant workflow:', error);
      }
    }

    if (savedConfig.discordApplicationId && savedConfig.discordBotToken) {
      try {
        await registerDiscordSlashCommands(savedConfig);
      } catch (error) {
        console.warn('Failed to register Discord commands:', error);
      }
    }

    if (body.runConnectionTest) {
      const testResponse = await fetch(new URL('/api/settings/n8n/test', request.url).toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      body: JSON.stringify({
          settings: savedConfig,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          source: 'site',
        }),
        cache: 'no-store',
      });

      const testPayload = await testResponse.json().catch(() => ({}));
      if (!testResponse.ok || !testPayload?.ok) {
        return NextResponse.json(
          {
            error: testPayload?.error || 'Connection test failed',
            issues: testPayload?.issues || [],
            workflow: publishedWorkflow || undefined,
          },
          { status: testResponse.status || 400 }
        );
      }
    }

    console.log('n8n Configuration saved:', {
      webhookUrl: savedConfig.webhookUrl,
      apiKey: '***',
      tenantId: tenant.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: savedConfig,
      workflow: publishedWorkflow || undefined,
      warnings: [],
    });
  } catch (error) {
    console.error('Error saving n8n configuration:', error);
    return NextResponse.json(
      {
        error: 'Failed to save configuration',
        details: error instanceof Error ? error.message : 'Unknown error while saving configuration',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') || request.nextUrl.searchParams.get('tenant') || undefined;
  const config = await getN8nConfig(request, tenantId);
    return NextResponse.json({
      tenantId: config.tenantId || '',
      tenantSlug: config.tenantSlug || '',
      companyName: config.companyName || '',
      cnpj: config.cnpj || '',
      address: config.address || '',
      webhookBaseUrl: config.webhookBaseUrl || '',
      workflowPublishedAt: config.workflowPublishedAt || '',
      workflowDownloadUrl: config.workflowDownloadUrl || '',
      appPublicUrl: config.appPublicUrl || '',
      webhookUrl: config.webhookUrl,
    apiKey: config.apiKey,
    discordWebhook: config.discordWebhook,
    discordApplicationId: config.discordApplicationId,
    discordPublicKey: config.discordPublicKey,
    discordBotToken: config.discordBotToken,
    discordGuildId: config.discordGuildId,
    discordCommandName: config.discordCommandName,
    githubOwner: config.githubOwner,
    githubRepo: config.githubRepo,
    githubBranch: config.githubBranch,
    githubToken: config.githubToken,
    loadedAt: config.loadedAt,
    updatedAt: config.updatedAt,
  });
}
