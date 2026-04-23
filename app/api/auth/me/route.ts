import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/app/lib/postgres';
import { deleteSession, SESSION_COOKIE_NAME, SESSION_IDLE_TIMEOUT_SECONDS } from '@/app/lib/tenant-auth';

const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_SECONDS * 1000;

function clearSessionResponse() {
  const response = NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value || '';

  if (!token) {
    return clearSessionResponse();
  }

  const result = await dbQuery<Record<string, unknown>>(
    `SELECT
      s.last_seen_at AS session_last_seen_at,
      a.id AS account_id,
      a.email AS account_email,
      a.company_name AS account_company_name,
      a.cnpj AS account_cnpj,
      a.address AS account_address,
      a.tenant_id AS account_tenant_id,
      t.id AS tenant_id,
      t.slug AS tenant_slug,
      t.company_name AS tenant_company_name,
      t.cnpj AS tenant_cnpj,
      t.address AS tenant_address,
      t.app_public_url AS tenant_app_public_url,
      t.webhook_base_url AS tenant_webhook_base_url,
      t.webhook_path AS tenant_webhook_path,
      t.webhook_url AS tenant_webhook_url,
      t.api_key AS tenant_api_key,
      t.discord_webhook AS tenant_discord_webhook,
      t.discord_application_id AS tenant_discord_application_id,
      t.discord_public_key AS tenant_discord_public_key,
      t.discord_bot_token AS tenant_discord_bot_token,
      t.discord_guild_id AS tenant_discord_guild_id,
      t.discord_command_name AS tenant_discord_command_name,
      t.github_owner AS tenant_github_owner,
      t.github_repo AS tenant_github_repo,
      t.github_branch AS tenant_github_branch,
      t.github_token AS tenant_github_token,
      t.workflow_download_url AS tenant_workflow_download_url,
      t.workflow_published_at AS tenant_workflow_published_at,
      t.loaded_at AS tenant_loaded_at,
      t.updated_at AS tenant_updated_at
     FROM sessions s
     JOIN accounts a ON a.id = s.account_id
     LEFT JOIN tenants t ON t.id = a.tenant_id
     WHERE s.token = $1
     LIMIT 1`,
    [token],
  );

  const row = result.rows[0];
  if (!row) {
    return clearSessionResponse();
  }

  const lastSeenAt = String(row.session_last_seen_at || '');
  const lastSeenMs = new Date(lastSeenAt).getTime();
  if (!lastSeenAt || Number.isNaN(lastSeenMs) || Date.now() - lastSeenMs > SESSION_IDLE_TIMEOUT_MS) {
    await deleteSession(token);
    return clearSessionResponse();
  }

  await dbQuery(`UPDATE sessions SET last_seen_at = $2 WHERE token = $1`, [token, new Date().toISOString()]);

  const tenantExists = Boolean(row.tenant_id);

  const response = NextResponse.json({
    ok: true,
    authenticated: true,
    tenantMissing: !tenantExists,
    account: {
      id: String(row.account_id || ''),
      email: String(row.account_email || ''),
      companyName: String(row.account_company_name || ''),
      cnpj: String(row.account_cnpj || ''),
      address: String(row.account_address || ''),
      tenantId: String(row.account_tenant_id || ''),
    },
    tenant: tenantExists
      ? {
          id: String(row.tenant_id || ''),
          slug: String(row.tenant_slug || ''),
          companyName: String(row.tenant_company_name || ''),
          cnpj: String(row.tenant_cnpj || ''),
          address: String(row.tenant_address || ''),
          appPublicUrl: String(row.tenant_app_public_url || ''),
          webhookBaseUrl: String(row.tenant_webhook_base_url || ''),
          webhookPath: String(row.tenant_webhook_path || ''),
          webhookUrl: String(row.tenant_webhook_url || ''),
          apiKey: String(row.tenant_api_key || ''),
          discordWebhook: String(row.tenant_discord_webhook || ''),
          discordApplicationId: String(row.tenant_discord_application_id || ''),
          discordPublicKey: String(row.tenant_discord_public_key || ''),
          discordBotToken: String(row.tenant_discord_bot_token || ''),
          discordGuildId: String(row.tenant_discord_guild_id || ''),
          discordCommandName: String(row.tenant_discord_command_name || 'qa'),
          githubOwner: String(row.tenant_github_owner || ''),
          githubRepo: String(row.tenant_github_repo || ''),
          githubBranch: String(row.tenant_github_branch || 'main'),
          githubToken: String(row.tenant_github_token || ''),
          workflowDownloadUrl: String(row.tenant_workflow_download_url || ''),
          workflowPublishedAt: String(row.tenant_workflow_published_at || ''),
          loadedAt: String(row.tenant_loaded_at || ''),
          updatedAt: String(row.tenant_updated_at || ''),
        }
      : null,
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
