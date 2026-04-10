import { createHash, randomBytes, randomUUID, pbkdf2Sync, timingSafeEqual } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { NextRequest } from 'next/server';
import type { N8nSettings } from '@/components/dashboard/types';
import { dbQuery, dbTransaction } from '@/app/lib/postgres';

export const SESSION_COOKIE_NAME = 'qa_session';

const WORKFLOW_TEMPLATE_FILE = resolve(process.cwd(), 'updated_flow.json');

export type TenantAccount = {
  id: string;
  email: string;
  passwordHash: string;
  companyName: string;
  cnpj: string;
  address: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantProfile = N8nSettings & {
  id: string;
  slug: string;
  companyName: string;
  cnpj: string;
  address: string;
  webhookBaseUrl?: string;
  webhookPath?: string;
  workflowJson?: Record<string, unknown>;
  workflowPublishedAt?: string;
  workflowDownloadUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type SessionRecord = {
  token: string;
  accountId: string;
  createdAt: string;
  lastSeenAt: string;
};

type PasswordResetRequestResult = {
  ok: boolean;
  resetUrl?: string;
  resetToken?: string;
  accountId?: string;
};

type SignupInput = {
  email: string;
  password: string;
  companyName: string;
  cnpj: string;
  address: string;
  appPublicUrl: string;
  webhookBaseUrl: string;
  webhookPath: string;
  apiKey: string;
  discordWebhook: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken: string;
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tenant'
  );
}

function buildSlugCandidate(base: string, suffix: number) {
  return suffix <= 0 ? base : `${base}-${suffix}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWebhookPath(value: string) {
  return value
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token.trim()).digest('hex');
}

function verifyPassword(password: string, stored: string) {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = Buffer.from(parts[3], 'hex');
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
  return timingSafeEqual(expected, actual);
}

function buildWebhookUrl(webhookBaseUrl: string, webhookPath: string) {
  const base = webhookBaseUrl.trim().replace(/\/+$/, '');
  const path = normalizeWebhookPath(webhookPath);
  return `${base}/webhook/${path}`;
}

export function buildTenantWebhookUrl(webhookBaseUrl: string, webhookPath: string) {
  return buildWebhookUrl(webhookBaseUrl, webhookPath);
}

export function buildTenantHealthcheckUrl(webhookUrl: string, tenantSlug?: string) {
  const base = new URL(webhookUrl);
  const path = tenantSlug ? `qa-platform/${tenantSlug}/healthcheck` : 'qa-platform/healthcheck';
  return new URL(`/webhook/${path}`, base.origin).toString();
}

function defaultTenantSettings(input: SignupInput, tenantId: string, tenantSlug: string): TenantProfile {
  return {
    id: tenantId,
    slug: tenantSlug,
    companyName: input.companyName.trim(),
    cnpj: input.cnpj.trim(),
    address: input.address.trim(),
    appPublicUrl: input.appPublicUrl.trim(),
    webhookBaseUrl: input.webhookBaseUrl.trim().replace(/\/+$/, ''),
    webhookPath: normalizeWebhookPath(input.webhookPath),
    webhookUrl: buildWebhookUrl(input.webhookBaseUrl, input.webhookPath),
    apiKey: input.apiKey.trim(),
    discordWebhook: input.discordWebhook.trim(),
    githubOwner: input.githubOwner.trim(),
    githubRepo: input.githubRepo.trim(),
    githubBranch: input.githubBranch.trim() || 'main',
    githubToken: input.githubToken.trim(),
    loadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

async function generateUniqueTenantSlug(baseValue: string) {
  const base = slugify(baseValue);
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = buildSlugCandidate(base, suffix);
    const existing = await dbQuery(`SELECT 1 FROM tenants WHERE slug = $1 LIMIT 1`, [candidate]);
    if ((existing.rowCount || 0) === 0) {
      return candidate;
    }
  }

  return `${base}-${randomBytes(3).toString('hex')}`;
}

function mapTenant(row: Record<string, unknown> | null | undefined): TenantProfile | null {
  if (!row) return null;
  const workflowJson = row.workflow_json && typeof row.workflow_json === 'object'
    ? (row.workflow_json as Record<string, unknown>)
    : undefined;
  return {
    id: String(row.id || ''),
    slug: String(row.slug || ''),
    companyName: String(row.company_name || ''),
    cnpj: String(row.cnpj || ''),
    address: String(row.address || ''),
    appPublicUrl: String(row.app_public_url || ''),
    webhookBaseUrl: String(row.webhook_base_url || ''),
    webhookPath: String(row.webhook_path || ''),
    webhookUrl: String(row.webhook_url || ''),
    apiKey: String(row.api_key || ''),
    discordWebhook: String(row.discord_webhook || ''),
    githubOwner: String(row.github_owner || ''),
    githubRepo: String(row.github_repo || ''),
    githubBranch: String(row.github_branch || 'main'),
    githubToken: String(row.github_token || ''),
    workflowJson,
    workflowPublishedAt: String(row.workflow_published_at || ''),
    workflowDownloadUrl: String(row.workflow_download_url || ''),
    loadedAt: String(row.loaded_at || ''),
    updatedAt: String(row.updated_at || ''),
    createdAt: String(row.created_at || ''),
  };
}

function mapAccount(row: Record<string, unknown> | null | undefined): TenantAccount | null {
  if (!row) return null;
  return {
    id: String(row.id || ''),
    email: String(row.email || ''),
    passwordHash: String(row.password_hash || ''),
    companyName: String(row.company_name || ''),
    cnpj: String(row.cnpj || ''),
    address: String(row.address || ''),
    tenantId: String(row.tenant_id || ''),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

function readWorkflowTemplate() {
  return JSON.parse(readFileSync(WORKFLOW_TEMPLATE_FILE, 'utf8')) as {
    nodes: Array<{ name: string; parameters?: Record<string, unknown> }>;
    connections: Record<string, unknown>;
    [key: string]: unknown;
  };
}

function buildResetPasswordUrl(rawToken: string) {
  const url = new URL('/reset-password', 'http://localhost');
  url.searchParams.set('token', rawToken);
  return url.pathname + url.search;
}

export function getCurrentSessionToken(request?: NextRequest) {
  return request?.cookies.get(SESSION_COOKIE_NAME)?.value || '';
}

export async function getCurrentAccount(request?: NextRequest) {
  const token = getCurrentSessionToken(request);
  if (!token) return null;

  const result = await dbQuery<{ account_id: string } & Record<string, unknown>>(
    `SELECT a.*
     FROM sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.token = $1
     LIMIT 1`,
    [token],
  );

  return mapAccount(result.rows[0] as Record<string, unknown> | undefined);
}

export async function getCurrentTenant(request?: NextRequest) {
  const account = await getCurrentAccount(request);
  if (!account) return null;
  return getTenantByIdPublic(account.tenantId);
}

export async function getTenantBySlug(slug: string) {
  const result = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM tenants WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return mapTenant(result.rows[0]);
}

export async function getTenantByIdPublic(tenantId: string) {
  const result = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId],
  );
  return mapTenant(result.rows[0]);
}

export async function upsertTenantProfile(tenant: TenantProfile) {
  await dbQuery(
    `INSERT INTO tenants (
      id, slug, company_name, cnpj, address, app_public_url, webhook_base_url, webhook_path, webhook_url,
      api_key, discord_webhook, github_owner, github_repo, github_branch, github_token, workflow_json,
      workflow_published_at, workflow_download_url, loaded_at, updated_at, created_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      $10,$11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,$21
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      company_name = EXCLUDED.company_name,
      cnpj = EXCLUDED.cnpj,
      address = EXCLUDED.address,
      app_public_url = EXCLUDED.app_public_url,
      webhook_base_url = EXCLUDED.webhook_base_url,
      webhook_path = EXCLUDED.webhook_path,
      webhook_url = EXCLUDED.webhook_url,
      api_key = EXCLUDED.api_key,
      discord_webhook = EXCLUDED.discord_webhook,
      github_owner = EXCLUDED.github_owner,
      github_repo = EXCLUDED.github_repo,
      github_branch = EXCLUDED.github_branch,
      github_token = EXCLUDED.github_token,
      workflow_json = EXCLUDED.workflow_json,
      workflow_published_at = EXCLUDED.workflow_published_at,
      workflow_download_url = EXCLUDED.workflow_download_url,
      loaded_at = EXCLUDED.loaded_at,
      updated_at = EXCLUDED.updated_at,
      created_at = EXCLUDED.created_at`,
    [
      tenant.id,
      tenant.slug,
      tenant.companyName,
      tenant.cnpj,
      tenant.address,
      tenant.appPublicUrl,
      tenant.webhookBaseUrl || '',
      tenant.webhookPath || '',
      tenant.webhookUrl,
      tenant.apiKey,
      tenant.discordWebhook || '',
      tenant.githubOwner,
      tenant.githubRepo,
      tenant.githubBranch,
      tenant.githubToken,
      tenant.workflowJson ? JSON.stringify(tenant.workflowJson) : JSON.stringify({}),
      tenant.workflowPublishedAt || '',
      tenant.workflowDownloadUrl || '',
      tenant.loadedAt || '',
      tenant.updatedAt || new Date().toISOString(),
      tenant.createdAt || new Date().toISOString(),
    ],
  );

  return tenant;
}

export async function getTenantSettings(request?: NextRequest, tenantId?: string) {
  const account = await getCurrentAccount(request);
  const resolvedTenantId = tenantId || account?.tenantId;
  if (!resolvedTenantId) return null;
  return getTenantByIdPublic(resolvedTenantId);
}

export async function createAccountAndTenant(input: SignupInput) {
  const email = normalizeEmail(input.email);
  const existing = await dbQuery(`SELECT 1 FROM accounts WHERE email = $1 LIMIT 1`, [email]);
  if ((existing.rowCount || 0) > 0) {
    throw new Error('Já existe uma conta com esse e-mail.');
  }

  const tenantId = randomUUID();
  const account: TenantAccount = {
    id: randomUUID(),
    email,
    passwordHash: hashPassword(input.password),
    companyName: input.companyName.trim(),
    cnpj: input.cnpj.trim(),
    address: input.address.trim(),
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const tenantSlug = await generateUniqueTenantSlug(
      `${input.companyName || input.email}${attempt > 0 ? ` ${attempt + 1}` : ''}`,
    );
    const tenant = defaultTenantSettings(input, tenantId, tenantSlug);

    try {
      const sessionToken = await dbTransaction(async (client) => {
        await client.query(
          `INSERT INTO tenants (
            id, slug, company_name, cnpj, address, app_public_url, webhook_base_url, webhook_path, webhook_url,
            api_key, discord_webhook, github_owner, github_repo, github_branch, github_token, workflow_json,
            workflow_published_at, workflow_download_url, loaded_at, updated_at, created_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,
            $10,$11,$12,$13,$14,$15,$16,
            $17,$18,$19,$20,$21
          )`,
          [
            tenant.id,
            tenant.slug,
            tenant.companyName,
            tenant.cnpj,
            tenant.address,
            tenant.appPublicUrl,
            tenant.webhookBaseUrl || '',
            tenant.webhookPath || '',
            tenant.webhookUrl,
            tenant.apiKey,
            tenant.discordWebhook || '',
            tenant.githubOwner,
            tenant.githubRepo,
            tenant.githubBranch,
            tenant.githubToken,
            tenant.workflowJson ? JSON.stringify(tenant.workflowJson) : JSON.stringify({}),
            tenant.workflowPublishedAt || '',
            tenant.workflowDownloadUrl || '',
            tenant.loadedAt || '',
            tenant.updatedAt || new Date().toISOString(),
            tenant.createdAt || new Date().toISOString(),
          ],
        );

        await client.query(
          `INSERT INTO accounts (
            id, email, password_hash, company_name, cnpj, address, tenant_id, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            account.id,
            account.email,
            account.passwordHash,
            account.companyName,
            account.cnpj,
            account.address,
            account.tenantId,
            account.createdAt,
            account.updatedAt,
          ],
        );

        const token = randomUUID();
        const now = new Date().toISOString();
        await client.query(
          `INSERT INTO sessions (token, account_id, created_at, last_seen_at)
           VALUES ($1,$2,$3,$4)`,
          [token, account.id, now, now],
        );

        return token;
      });

      return { account, tenant, sessionToken };
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError?.code === '23505' && pgError?.constraint === 'tenants_slug_key') {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Não foi possível gerar um slug único para o tenant.');
}

export async function authenticateAccount(email: string, password: string) {
  const result = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM accounts WHERE email = $1 LIMIT 1`,
    [normalizeEmail(email)],
  );
  const account = mapAccount(result.rows[0]);
  if (!account) return null;
  if (!verifyPassword(password, account.passwordHash)) return null;

  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomUUID();
    try {
      await dbQuery(
        `INSERT INTO sessions (token, account_id, created_at, last_seen_at)
         VALUES ($1,$2,$3,$4)`,
        [token, account.id, now, now],
      );

      const tenant = await getTenantByIdPublic(account.tenantId).catch(() => null);
      return { account, sessionToken: token, tenant };
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Não foi possível criar a sessão de login.');
}

export async function deleteSession(token: string) {
  await dbQuery(`DELETE FROM sessions WHERE token = $1`, [token]);
}

export async function createPasswordResetRequest(email: string): Promise<PasswordResetRequestResult> {
  const normalizedEmail = normalizeEmail(email);
  const result = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM accounts WHERE email = $1 LIMIT 1`,
    [normalizedEmail],
  );
  const account = mapAccount(result.rows[0]);

  if (!account) {
    return { ok: true };
  }

  const rawToken = `${randomUUID().replace(/-/g, '')}${randomBytes(12).toString('hex')}`;
  const tokenHash = hashResetToken(rawToken);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

  await dbQuery(
    `INSERT INTO password_reset_tokens (id, account_id, token_hash, expires_at, used_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), account.id, tokenHash, expiresAt, '', createdAt],
  );

  return {
    ok: true,
    accountId: account.id,
    resetToken: rawToken,
    resetUrl: buildResetPasswordUrl(rawToken),
  };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const tokenHash = hashResetToken(token);
  const now = new Date().toISOString();
  const result = await dbQuery<Record<string, unknown>>(
    `SELECT prt.*, a.email
     FROM password_reset_tokens prt
     JOIN accounts a ON a.id = prt.account_id
     WHERE prt.token_hash = $1
       AND prt.used_at = ''
       AND prt.expires_at > $2
     LIMIT 1`,
    [tokenHash, now],
  );

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: 'Token inválido ou expirado.' };
  }

  const accountId = String(row.account_id || '');
  const passwordHash = hashPassword(newPassword);
  const tokenId = String(row.id || '');

  await dbTransaction(async (client) => {
    await client.query(`UPDATE accounts SET password_hash = $1, updated_at = $2 WHERE id = $3`, [
      passwordHash,
      now,
      accountId,
    ]);

    await client.query(`UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2`, [now, tokenId]);

    await client.query(`DELETE FROM sessions WHERE account_id = $1`, [accountId]);
  });

  return { ok: true };
}

export async function updateTenantForRequest(request: NextRequest | undefined, patch: Partial<TenantProfile>) {
  const account = await getCurrentAccount(request);
  if (!account) {
    throw new Error('Usuário não autenticado.');
  }

  const current = await getTenantByIdPublic(account.tenantId);
  if (!current) {
    throw new Error('Tenant não encontrado.');
  }

  const next: TenantProfile = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await upsertTenantProfile(next);
  return next;
}

export function buildTenantWorkflow(tenant: TenantProfile) {
  const template = readWorkflowTemplate();

  const appPublicUrl = tenant.appPublicUrl.replace(/\/+$/, '');
  const configEndpoint = `${appPublicUrl}/api/settings/n8n/config?tenant=${encodeURIComponent(tenant.id)}`;
  const paths = {
    discord: `discord-qa/${tenant.slug}`,
    healthcheck: `qa-platform/${tenant.slug}/healthcheck`,
    sync: `qa-platform/${tenant.slug}/google-sheets-sync`,
    status: `qa-platform/${tenant.slug}/scenario-status-update`,
    created: `qa-platform/${tenant.slug}/scenario-created`,
  };

  const nodes = template.nodes.map((node) => {
    const next = { ...node, parameters: { ...(node.parameters || {}) } };

    if (next.name === 'Load Config' || next.name === 'Load Config Secondary') {
      next.parameters = {
        ...next.parameters,
        url: configEndpoint,
      };
    }

    if (next.name === 'Webhook Discord') {
      next.parameters = {
        ...next.parameters,
        path: paths.discord,
      };
    }

    if (next.name === 'Webhook Healthcheck') {
      next.parameters = {
        ...next.parameters,
        path: paths.healthcheck,
      };
    }

    if (next.name === 'Webhook Discord1') {
      next.parameters = {
        ...next.parameters,
        path: paths.sync,
      };
    }

    if (next.name === 'Webhook Next Status') {
      next.parameters = {
        ...next.parameters,
        path: paths.status,
      };
    }

    if (next.name === 'Webhook Next Created') {
      next.parameters = {
        ...next.parameters,
        path: paths.created,
      };
    }

    if (next.name === 'Normalizar Payload' || next.name === 'Normalizar Payload1') {
      const code = String(next.parameters.jsCode || '');
      next.parameters = {
        ...next.parameters,
        jsCode: code.replace(
          /update_status:\s*['"]status['"],/,
          "update_status: 'status',\n  n8n_connection_test: 'pingqa',",
        ),
      };
    }

    return next;
  });

  const routeOutputs = (template.connections as Record<string, any>)?.['Roteador Acao']?.main?.[0];
  if (Array.isArray(routeOutputs) && routeOutputs[7]) {
    routeOutputs[7] = [
      {
        node: 'Healthcheck Response',
        type: 'main',
        index: 0,
      },
    ];
  }

  return {
    ...template,
    name: `${tenant.companyName} - QA Discord`,
    nodes,
  };
}

export async function publishTenantWorkflow(tenantId: string) {
  const tenant = await getTenantByIdPublic(tenantId);
  if (!tenant) {
    throw new Error('Tenant não encontrado.');
  }

  const workflow = buildTenantWorkflow(tenant);
  const nextTenant: TenantProfile = {
    ...tenant,
    workflowJson: workflow as Record<string, unknown>,
    workflowPublishedAt: new Date().toISOString(),
    workflowDownloadUrl: `/api/tenants/workflow?tenantId=${encodeURIComponent(tenant.id)}`,
    updatedAt: new Date().toISOString(),
  };

  await upsertTenantProfile(nextTenant);

  return {
    workflow,
    workflowDownloadUrl: nextTenant.workflowDownloadUrl,
    tenant: nextTenant,
  };
}

export async function readPublishedWorkflow(tenantId: string) {
  const tenant = await getTenantByIdPublic(tenantId);
  if (!tenant) return null;
  return tenant.workflowJson || buildTenantWorkflow(tenant);
}
