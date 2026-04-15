import { NextRequest, NextResponse } from 'next/server';
import type { N8nSettings } from '@/components/dashboard/types';
import { buildTenantWebhookUrl } from '@/app/lib/tenant-auth';

type TestRequestBody = {
  settings?: Partial<N8nSettings>;
  tenantId?: string;
  tenantSlug?: string;
};

function isValidUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateSettings(settings: Partial<N8nSettings>) {
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
    const value = String(settings[field.key] || '').trim();
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
    }

    if (field.key === 'apiKey' && !/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      issues.push(`${field.label} está com formato inválido`);
    }

    if (field.key === 'githubToken' && !/^(ghp_|github_pat_)/i.test(value)) {
      issues.push(`${field.label} está com formato inválido`);
    }
  }

  const discordWebhook = String(settings.discordWebhook || '').trim();
  if (discordWebhook && !/^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\/[^/]+\/[^/]+$/i.test(discordWebhook)) {
    issues.push('Discord Webhook está com formato inválido');
  }

  return issues;
}

async function validateGitHubAccess(settings: Partial<N8nSettings>) {
  const owner = String(settings.githubOwner || '').trim();
  const repo = String(settings.githubRepo || '').trim();
  const token = String(settings.githubToken || '').trim();

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
    const body = (await request.json()) as TestRequestBody;
    const settings = body.settings || {};
    const issues = validateSettings(settings);

    const githubIssues = await validateGitHubAccess(settings);

    if (issues.length > 0 || githubIssues.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'Configurações inválidas.', issues: [...issues, ...githubIssues] },
        { status: 400 }
      );
    }

    const webhookBaseUrl = String(settings.webhookBaseUrl || '').trim();
    const webhookUrl = String(settings.webhookUrl || '').trim() || buildTenantWebhookUrl(webhookBaseUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'n8n_connection_test',
        settings,
        tenantId: body.tenantId || settings.tenantId || '',
        tenantSlug: body.tenantSlug || settings.tenantSlug || '',
        source: 'site',
        timestamp: new Date().toISOString(),
      }),
      cache: 'no-store',
    });

    const text = await response.text().catch(() => '');

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Webhook respondeu com ${response.status}.`,
          details: text.slice(0, 500),
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Conexão com o webhook confirmada.',
      details: text.slice(0, 500),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao testar conexão.';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
