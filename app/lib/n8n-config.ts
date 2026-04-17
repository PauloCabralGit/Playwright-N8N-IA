import type { NextRequest } from 'next/server';
import type { N8nSettings } from '@/components/dashboard/types';
import {
  buildTenantWebhookUrl,
  getAccountByTenantIdPublic,
  getCurrentAccount,
  getTenantSettings,
  updateTenantForRequest,
} from '@/app/lib/tenant-auth';

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
  discordApplicationId: '',
  discordPublicKey: '',
  discordBotToken: '',
  discordGuildId: '',
  discordCommandName: 'qa',
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

function getEnvConfig(): Partial<N8nSettings> {
  return {
    appPublicUrl: process.env.APP_PUBLIC_URL || '',
    webhookUrl: process.env.N8N_WEBHOOK_URL || '',
    apiKey: process.env.N8N_API_KEY || '',
    discordWebhook: process.env.DISCORD_WEBHOOK || '',
    discordApplicationId: process.env.DISCORD_APPLICATION_ID || '',
    discordPublicKey: process.env.DISCORD_PUBLIC_KEY || '',
    discordBotToken: process.env.DISCORD_BOT_TOKEN || '',
    discordGuildId: process.env.DISCORD_GUILD_ID || '',
    discordCommandName: process.env.DISCORD_COMMAND_NAME || 'qa',
    githubOwner: process.env.GITHUB_OWNER || '',
    githubRepo: process.env.GITHUB_REPO || '',
    githubBranch: process.env.GITHUB_BRANCH || 'main',
    githubToken: process.env.GITHUB_TOKEN || '',
  };
}

function resolveWebhookBaseUrl(webhookBaseUrl?: string, webhookUrl?: string) {
  const base = (webhookBaseUrl || '').trim().replace(/\/+$/, '');
  if (base) return base;

  const fallbackWebhookUrl = (webhookUrl || '').trim();
  if (!fallbackWebhookUrl) return '';

  try {
    return new URL(fallbackWebhookUrl).origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function isPublicAppUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, '');
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return false;
    }
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeConfig(config: Partial<N8nSettings>): N8nSettings {
  const webhookBaseUrl = resolveWebhookBaseUrl(config.webhookBaseUrl, config.webhookUrl);
  const webhookUrl = webhookBaseUrl ? buildTenantWebhookUrl(webhookBaseUrl) : (config.webhookUrl || '');
  return {
    ...DEFAULT_CONFIG,
    ...config,
    appPublicUrl: config.appPublicUrl || '',
    webhookUrl,
    apiKey: config.apiKey || '',
    discordWebhook: config.discordWebhook || '',
    discordApplicationId: config.discordApplicationId || '',
    discordPublicKey: config.discordPublicKey || '',
    discordBotToken: config.discordBotToken || '',
    discordGuildId: config.discordGuildId || '',
    discordCommandName: config.discordCommandName || 'qa',
    githubOwner: config.githubOwner || '',
    githubRepo: config.githubRepo || '',
    githubBranch: config.githubBranch || 'main',
    githubToken: config.githubToken || '',
    loadedAt: config.loadedAt || '',
    updatedAt: config.updatedAt || new Date().toISOString(),
  };
}

export async function getN8nConfig(request?: NextRequest, tenantId?: string): Promise<N8nSettings> {
  const envConfig = getEnvConfig();
  const tenant = await getTenantSettings(request, tenantId);
  const account = await getCurrentAccount(request);
  const fallbackAccount = tenantId ? await getAccountByTenantIdPublic(tenantId) : null;
  const resolvedAccount = account || fallbackAccount;

  if (tenant) {
    const webhookBaseUrl = resolveWebhookBaseUrl(tenant.webhookBaseUrl, tenant.webhookUrl);
    return normalizeConfig({
      ...envConfig,
      ...tenant,
      companyName: tenant.companyName,
      cnpj: tenant.cnpj,
      address: tenant.address,
      appPublicUrl: tenant.appPublicUrl,
      webhookBaseUrl,
      webhookUrl: buildTenantWebhookUrl(webhookBaseUrl),
      apiKey: tenant.apiKey,
      discordWebhook: tenant.discordWebhook,
      discordApplicationId: tenant.discordApplicationId,
      discordPublicKey: tenant.discordPublicKey,
      discordBotToken: tenant.discordBotToken,
      discordGuildId: tenant.discordGuildId,
      discordCommandName: tenant.discordCommandName,
      githubOwner: tenant.githubOwner,
      githubRepo: tenant.githubRepo,
      githubBranch: tenant.githubBranch,
      githubToken: tenant.githubToken,
      tenantId: tenant.tenantId || resolvedAccount?.tenantId || tenant.id || tenantId || '',
    });
  }

  return normalizeConfig({
    ...envConfig,
    companyName: resolvedAccount?.companyName || '',
    cnpj: resolvedAccount?.cnpj || '',
    address: resolvedAccount?.address || '',
    appPublicUrl: envConfig.appPublicUrl || '',
    webhookUrl: envConfig.webhookUrl || '',
    apiKey: envConfig.apiKey || '',
    discordWebhook: envConfig.discordWebhook || '',
    discordApplicationId: envConfig.discordApplicationId || '',
    discordPublicKey: envConfig.discordPublicKey || '',
    discordBotToken: envConfig.discordBotToken || '',
    discordGuildId: envConfig.discordGuildId || '',
    discordCommandName: envConfig.discordCommandName || 'qa',
    githubOwner: envConfig.githubOwner || '',
    githubRepo: envConfig.githubRepo || '',
    githubBranch: envConfig.githubBranch || 'main',
    githubToken: envConfig.githubToken || '',
    tenantId: resolvedAccount?.tenantId || tenantId || '',
  });
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
  const appPublicUrl = String(config.appPublicUrl || '').trim().replace(/\/+$/, '');
  if (isPublicAppUrl(appPublicUrl)) {
    return appPublicUrl;
  }

  const envAppPublicUrl = String(process.env.APP_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (isPublicAppUrl(envAppPublicUrl)) {
    return envAppPublicUrl;
  }

  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host')?.trim();

    if (host) {
      const protocol = forwardedProto || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'http');
      const resolved = `${protocol}://${host}`.replace(/\/+$/, '');
      if (isPublicAppUrl(resolved)) {
        return resolved;
      }
    }

    const origin = request.nextUrl.origin.replace(/\/+$/, '');
    if (isPublicAppUrl(origin)) {
      return origin;
    }
  }

  return '';
}
