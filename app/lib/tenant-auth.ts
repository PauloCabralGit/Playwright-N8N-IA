import { createHash, randomBytes, randomUUID, pbkdf2Sync, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import type { N8nSettings } from '@/components/dashboard/types';
import { dbQuery, dbTransaction } from '@/app/lib/postgres';
import workflowTemplate from '@/updated_flow.json';

export const SESSION_COOKIE_NAME = 'qa_session';
const PASSWORD_PBKDF2_ITERATIONS = 100000;
export const SESSION_IDLE_TIMEOUT_SECONDS = 30;
const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_SECONDS * 1000;
const SESSION_TOUCH_THROTTLE_MS = 60 * 1000;

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
  discordApplicationId: string;
  discordPublicKey: string;
  discordBotToken: string;
  discordGuildId: string;
  discordCommandName: string;
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

function safeTrim(value: string | null | undefined) {
  return String(value || '').trim();
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

function resolveTenantWebhookPath(inputPath: string, tenantSlug: string) {
  return normalizeWebhookPath(inputPath || tenantSlug);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, PASSWORD_PBKDF2_ITERATIONS, 32, 'sha256').toString('hex');
  return `pbkdf2$${PASSWORD_PBKDF2_ITERATIONS}$${salt}$${hash}`;
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

function resolveWebhookBaseUrlFromValue(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    return url.origin.replace(/\/+$/, '');
  } catch {
    return trimmed;
  }
}

function buildWebhookUrl(webhookBaseUrl: string, path: string) {
  const base = resolveWebhookBaseUrlFromValue(webhookBaseUrl);
  return base ? `${base}/webhook/${path}` : '';
}

function normalizeDiscordCommandName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'qa';
}

export function buildTenantWebhookUrl(webhookBaseUrl: string) {
  return buildWebhookUrl(webhookBaseUrl, 'qa-platform/unified-sync');
}

export function buildDiscordWebhookUrl(webhookBaseUrl: string) {
  return buildWebhookUrl(webhookBaseUrl, 'discord-qa');
}

export function buildTenantHealthcheckUrl(webhookUrl: string, tenantSlug?: string) {
  const base = new URL(webhookUrl);
  const path = tenantSlug ? `qa-platform/${tenantSlug}/healthcheck` : 'qa-platform/healthcheck';
  return new URL(`/webhook/${path}`, base.origin).toString();
}

function defaultTenantSettings(input: SignupInput, tenantId: string, tenantSlug: string): TenantProfile {
  const webhookPath = resolveTenantWebhookPath(input.webhookPath, tenantSlug);
  return {
    id: tenantId,
    slug: tenantSlug,
    companyName: safeTrim(input.companyName),
    cnpj: safeTrim(input.cnpj),
    address: safeTrim(input.address),
    appPublicUrl: safeTrim(input.appPublicUrl),
    webhookBaseUrl: safeTrim(input.webhookBaseUrl).replace(/\/+$/, ''),
    webhookPath,
    webhookUrl: buildWebhookUrl(input.webhookBaseUrl, webhookPath),
    apiKey: safeTrim(input.apiKey),
    discordWebhook: safeTrim(input.discordWebhook),
    discordApplicationId: safeTrim(input.discordApplicationId),
    discordPublicKey: safeTrim(input.discordPublicKey),
    discordBotToken: safeTrim(input.discordBotToken),
    discordGuildId: safeTrim(input.discordGuildId),
    discordCommandName: normalizeDiscordCommandName(input.discordCommandName || 'qa'),
    githubOwner: safeTrim(input.githubOwner),
    githubRepo: safeTrim(input.githubRepo),
    githubBranch: safeTrim(input.githubBranch) || 'main',
    githubToken: safeTrim(input.githubToken),
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
    discordApplicationId: String(row.discord_application_id || ''),
    discordPublicKey: String(row.discord_public_key || ''),
    discordBotToken: String(row.discord_bot_token || ''),
    discordGuildId: String(row.discord_guild_id || ''),
    discordCommandName: String(row.discord_command_name || 'qa'),
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
  return structuredClone(workflowTemplate) as {
    nodes: Array<{ name: string; parameters?: Record<string, unknown> }>;
    connections: Record<string, unknown>;
    [key: string]: unknown;
  };
}

type WorkflowConnections = Record<string, { main?: Array<unknown> } | undefined>;

function buildResetPasswordUrl(rawToken: string) {
  const url = new URL('/reset-password', 'http://localhost');
  url.searchParams.set('token', rawToken);
  return url.pathname + url.search;
}

export function getCurrentSessionToken(request?: NextRequest) {
  return request?.cookies.get(SESSION_COOKIE_NAME)?.value || '';
}

function parseTimestamp(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isSessionExpired(lastSeenAt: string) {
  const lastSeen = parseTimestamp(lastSeenAt);
  if (!lastSeen) return true;
  return Date.now() - lastSeen > SESSION_IDLE_TIMEOUT_MS;
}

async function touchSession(token: string, lastSeenAt: string) {
  if (!token) return;
  const lastSeen = parseTimestamp(lastSeenAt);
  if (lastSeen && Date.now() - lastSeen < SESSION_TOUCH_THROTTLE_MS) {
    return;
  }

  await dbQuery(`UPDATE sessions SET last_seen_at = $2 WHERE token = $1`, [token, new Date().toISOString()]);
}

export async function getCurrentAccount(request?: NextRequest) {
  const token = getCurrentSessionToken(request);
  if (!token) return null;

  const result = await dbQuery<{ last_seen_at: string } & Record<string, unknown>>(
    `SELECT a.*
            , s.last_seen_at
     FROM sessions s
     JOIN accounts a ON a.id = s.account_id
     WHERE s.token = $1
     LIMIT 1`,
    [token],
  );

  const row = result.rows[0] as ({ last_seen_at?: string } & Record<string, unknown>) | undefined;
  const lastSeenAt = String(row?.last_seen_at || '');
  if (!row || isSessionExpired(lastSeenAt)) {
    await deleteSession(token);
    return null;
  }

  await touchSession(token, lastSeenAt);
  return mapAccount(row);
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

export async function getAccountByTenantIdPublic(tenantId: string) {
  const result = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM accounts WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  return mapAccount(result.rows[0]);
}

export async function getTenantByDiscordApplicationIdPublic(applicationId: string) {
  const result = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM tenants WHERE discord_application_id = $1 LIMIT 1`,
    [applicationId],
  );
  return mapTenant(result.rows[0]);
}

export async function upsertTenantProfile(tenant: TenantProfile) {
  await dbQuery(
    `INSERT INTO tenants (
      id, slug, company_name, cnpj, address, app_public_url, webhook_base_url, webhook_path, webhook_url,
      api_key, discord_webhook, discord_application_id, discord_public_key, discord_bot_token, discord_guild_id, discord_command_name,
      github_owner, github_repo, github_branch, github_token, workflow_json,
      workflow_published_at, workflow_download_url, loaded_at, updated_at, created_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
      $22,$23,$24,$25,$26
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
      discord_application_id = EXCLUDED.discord_application_id,
      discord_public_key = EXCLUDED.discord_public_key,
      discord_bot_token = EXCLUDED.discord_bot_token,
      discord_guild_id = EXCLUDED.discord_guild_id,
      discord_command_name = EXCLUDED.discord_command_name,
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
      tenant.discordApplicationId || '',
      tenant.discordPublicKey || '',
      tenant.discordBotToken || '',
      tenant.discordGuildId || '',
      tenant.discordCommandName || 'qa',
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
            api_key, discord_webhook, discord_application_id, discord_public_key, discord_bot_token, discord_guild_id, discord_command_name,
            github_owner, github_repo, github_branch, github_token, workflow_json,
            workflow_published_at, workflow_download_url, loaded_at, updated_at, created_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,
            $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
            $22,$23,$24,$25,$26
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
            tenant.discordApplicationId || '',
            tenant.discordPublicKey || '',
            tenant.discordBotToken || '',
            tenant.discordGuildId || '',
            tenant.discordCommandName || 'qa',
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

      return { account, sessionToken: token, tenant: null };
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

  const fallbackAppPublicUrl =
    (process.env.APP_PUBLIC_URL || 'https://orionsystem.orionsystem.workers.dev').trim();
  const resolvedAppPublicUrl = (tenant.appPublicUrl || fallbackAppPublicUrl).trim();
  const appPublicUrl = resolvedAppPublicUrl.replace(/\/+$/, '');
  const configEndpoint = `={{ '${appPublicUrl}/api/settings/n8n/config?tenant=' + encodeURIComponent($json.tenantId || $json.tenantSlug || '') }}`;

  const removedNodes = new Set([
    'Webhook Healthcheck',
    'Load Config Secondary',
    'Normalizar Payload1',
    'Webhook Next Status',
    'Webhook Next Created',
  ]);

  const nodes = template.nodes
    .filter((node) => !removedNodes.has(node.name))
    .map((node) => {
    const next = { ...node, parameters: { ...(node.parameters || {}) } };

    if (next.name === 'Load Config') {
      next.parameters = {
        ...next.parameters,
        url: configEndpoint,
      };
    }

    if (next.name === 'Webhook Discord' || next.name === 'Webhook Discord1') {
      next.parameters = {
        ...next.parameters,
        path: 'discord-qa',
      };
    }

    for (const [key, value] of Object.entries(next.parameters)) {
      if (typeof value === 'string' && value.includes("$('Webhook Discord1')")) {
        next.parameters[key] = value.replaceAll("$('Webhook Discord1')", "$('Webhook Discord')");
      }
    }

    return next;
  });

  const sanitizedConnections = Object.fromEntries(
    Object.entries(template.connections as WorkflowConnections)
      .filter(([name]) => !removedNodes.has(name))
      .map(([name, value]) => {
        if (!value?.main) {
          return [name, value];
        }

        const main = value.main
          .map((group) => (Array.isArray(group) ? group.filter((link) => link && typeof link === 'object' && !removedNodes.has(String((link as { node?: string }).node || ''))) : group))
          .filter((group) => Array.isArray(group) ? group.length > 0 : true);

        return [name, { ...value, main }];
      })
      .filter(([, value]) => Boolean(value))
  );

  const routeOutputs = (sanitizedConnections as WorkflowConnections)?.['Roteador Acao']?.main?.[0] as Array<unknown> | undefined;
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
    name: `${tenant.companyName} - QA Discord + Banco de Dados`,
    nodes,
    connections: sanitizedConnections,
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
