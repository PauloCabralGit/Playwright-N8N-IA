import { NextRequest, NextResponse } from 'next/server';
import { getN8nConfig, setN8nConfig } from '@/app/lib/n8n-config';
import type { N8nSettings } from '@/components/dashboard/types';
import { getCurrentTenant, publishTenantWorkflow } from '@/app/lib/tenant-auth';

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
    { key: 'webhookUrl', label: 'Webhook URL do n8n' },
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

    if (field.key === 'webhookUrl' && !isValidUrl(value)) {
      issues.push(`${field.label} está com URL inválida`);
      continue;
    }

    if (field.key === 'discordWebhook' && value && !/^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\/[^/]+\/[^/]+$/i.test(value)) {
      issues.push(`${field.label} está com formato inválido`);
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

async function validateGitHubAccess(body: Partial<N8nSettings>) {
  const owner = String(body.githubOwner || '').trim();
  const repo = String(body.githubRepo || '').trim();
  const token = String(body.githubToken || '').trim();

  if (!owner || !repo || !token) {
    return ['GitHub Owner, Repo ou Token estão ausentes'];
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return [`GitHub Owner/Repo/Token não permitiu acesso ao repositório (${response.status}). ${text.slice(0, 120)}`];
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      appPublicUrl,
      webhookUrl,
      apiKey,
      discordWebhook,
      githubOwner,
      githubRepo,
      githubBranch,
      githubToken,
      runConnectionTest,
    } = body;

    const issues = validateSettings({
      appPublicUrl,
      webhookUrl,
      apiKey,
      discordWebhook,
      githubOwner,
      githubRepo,
      githubBranch,
      githubToken,
    });

    const githubIssues = await validateGitHubAccess({
      githubOwner,
      githubRepo,
      githubToken,
    });

    if (issues.length > 0 || githubIssues.length > 0) {
      return NextResponse.json(
        { error: 'Configurações inválidas.', issues: [...issues, ...githubIssues] },
        { status: 400 }
      );
    }

    if (discordWebhook) {
      try {
        new URL(discordWebhook);
      } catch {
        return NextResponse.json(
          { error: 'Discord webhook URL inválida.' },
          { status: 400 }
        );
      }
    }

    const tenant = await getCurrentTenant(request);

    // Save configuration using shared config module
    const savedConfig = {
      tenantId: tenant?.id || '',
      tenantSlug: tenant?.slug || '',
      companyName: tenant?.companyName || '',
      cnpj: tenant?.cnpj || '',
      address: tenant?.address || '',
      webhookBaseUrl: tenant?.webhookBaseUrl || '',
      webhookPath: tenant?.webhookPath || '',
      appPublicUrl: appPublicUrl || '',
      webhookUrl,
      apiKey,
      discordWebhook: discordWebhook || '',
      githubOwner: githubOwner || '',
      githubRepo: githubRepo || '',
      githubBranch: githubBranch || 'main',
      githubToken: githubToken || '',
      loadedAt: (await getN8nConfig()).loadedAt,
      updatedAt: new Date().toISOString(),
    };

    await setN8nConfig(savedConfig, request);

    let publishedWorkflow: { workflowDownloadUrl?: string } | null = null;
    if (tenant) {
      publishedWorkflow = await publishTenantWorkflow(tenant.id);
    }

    if (runConnectionTest) {
      const testResponse = await fetch(new URL('/api/settings/n8n/test', request.url).toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          settings: savedConfig,
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

    console.log('n8n Configuration saved:', { webhookUrl, apiKey: '***' });

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: savedConfig,
      workflow: publishedWorkflow || undefined,
    });
  } catch (error) {
    console.error('Error saving n8n configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
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
    webhookPath: config.webhookPath || '',
    workflowPublishedAt: config.workflowPublishedAt || '',
    workflowDownloadUrl: config.workflowDownloadUrl || '',
    appPublicUrl: config.appPublicUrl,
    webhookUrl: config.webhookUrl,
    apiKey: config.apiKey,
    discordWebhook: config.discordWebhook,
    githubOwner: config.githubOwner,
    githubRepo: config.githubRepo,
    githubBranch: config.githubBranch,
    githubToken: config.githubToken,
    loadedAt: config.loadedAt,
    updatedAt: config.updatedAt,
  });
}
