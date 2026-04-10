import type { NextRequest } from 'next/server';
import type { N8nSettings } from '@/components/dashboard/types';
import { getTenantSettings, updateTenantForRequest } from '@/app/lib/tenant-auth';

const DEFAULT_CONFIG: N8nSettings = {
  companyName: '',
  cnpj: '',
  address: '',
  appPublicUrl: '',
  webhookBaseUrl: '',
  webhookPath: '',
  webhookUrl: '',
  apiKey: '',
  discordWebhook: '',
  githubOwner: '',
  githubRepo: '',
  githubBranch: 'main',
  githubToken: '',
  tenantId: '',
  tenantSlug: '',
  workflowPublishedAt: '',
  workflowDownloadUrl: '',
  loadedAt: '',
  updatedAt: '',
};

function normalizeConfig(config: Partial<N8nSettings>): N8nSettings {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    appPublicUrl: config.appPublicUrl || '',
    webhookUrl: config.webhookUrl || '',
    apiKey: config.apiKey || '',
    discordWebhook: config.discordWebhook || '',
    githubOwner: config.githubOwner || '',
    githubRepo: config.githubRepo || '',
    githubBranch: config.githubBranch || 'main',
    githubToken: config.githubToken || '',
    loadedAt: config.loadedAt || '',
    updatedAt: config.updatedAt || new Date().toISOString(),
  };
}

export async function getN8nConfig(request?: NextRequest, tenantId?: string): Promise<N8nSettings> {
  const tenant = await getTenantSettings(request, tenantId);
  if (tenant) {
    return normalizeConfig(tenant);
  }

  return { ...DEFAULT_CONFIG };
}

export async function setN8nConfig(config: N8nSettings, request?: NextRequest, tenantId?: string): Promise<void> {
  const tenant = await getTenantSettings(request, tenantId);

  if (tenant) {
    await updateTenantForRequest(request, normalizeConfig({ ...tenant, ...config }));
  }
}

export async function getN8nWebhookUrl(request?: NextRequest, tenantId?: string): Promise<string> {
  return (await getN8nConfig(request, tenantId)).webhookUrl;
}

export async function getN8nApiKey(request?: NextRequest, tenantId?: string): Promise<string> {
  return (await getN8nConfig(request, tenantId)).apiKey;
}

export async function getDiscordWebhook(request?: NextRequest, tenantId?: string): Promise<string> {
  return (await getN8nConfig(request, tenantId)).discordWebhook;
}

export async function getPublicAppUrl(request?: NextRequest, tenantId?: string): Promise<string> {
  const config = await getN8nConfig(request, tenantId);
  if (config.appPublicUrl) {
    return config.appPublicUrl.replace(/\/+$/, '');
  }

  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host')?.trim();

    if (host) {
      const protocol = forwardedProto || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'http');
      return `${protocol}://${host}`.replace(/\/+$/, '');
    }

    return request.nextUrl.origin.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}
