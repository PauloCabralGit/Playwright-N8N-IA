import { Pool } from 'pg';

type TenantRow = {
  id: string;
  slug: string;
  company_name: string;
  cnpj: string;
  address: string;
  app_public_url: string;
  webhook_base_url: string;
  webhook_path: string;
  webhook_url: string;
  api_key: string;
  discord_webhook: string;
  github_owner: string;
  github_repo: string;
  github_branch: string;
  github_token: string;
  workflow_json: Record<string, unknown> | null;
  workflow_published_at: string;
  workflow_download_url: string;
  loaded_at: string;
  updated_at: string;
  created_at: string;
};

type AccountRow = {
  id: string;
  email: string;
  password_hash: string;
  company_name: string;
  cnpj: string;
  address: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
};

function getDatabaseUrl(name: 'SOURCE_DATABASE_URL' | 'TARGET_DATABASE_URL' | 'DATABASE_URL') {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function formatTenantId(value: string | undefined) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    throw new Error('Informe o tenantId como argumento ou via TENANT_ID.');
  }
  return trimmed;
}

async function main() {
  const tenantId = formatTenantId(process.argv[2] || process.env.TENANT_ID);
  const sourceUrl = getDatabaseUrl('SOURCE_DATABASE_URL');
  const targetUrl = process.env.TARGET_DATABASE_URL || getDatabaseUrl('DATABASE_URL');

  const sourcePool = new Pool({ connectionString: sourceUrl });
  const targetPool = new Pool({ connectionString: targetUrl });

  try {
    const tenantResult = await sourcePool.query<TenantRow>(
      `SELECT id, slug, company_name, cnpj, address, app_public_url, webhook_base_url, webhook_path, webhook_url,
              api_key, discord_webhook, github_owner, github_repo, github_branch, github_token, workflow_json,
              workflow_published_at, workflow_download_url, loaded_at, updated_at, created_at
       FROM tenants
       WHERE id = $1
       LIMIT 1`,
      [tenantId],
    );

    const tenant = tenantResult.rows[0];
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} não encontrado na SOURCE_DATABASE_URL.`);
    }

    const accountResult = await sourcePool.query<AccountRow>(
      `SELECT id, email, password_hash, company_name, cnpj, address, tenant_id, created_at, updated_at
       FROM accounts
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenantId],
    );
    const account = accountResult.rows[0] || null;

    await targetPool.query(
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
        tenant.company_name,
        tenant.cnpj,
        tenant.address,
        tenant.app_public_url,
        tenant.webhook_base_url,
        tenant.webhook_path,
        tenant.webhook_url,
        tenant.api_key,
        tenant.discord_webhook,
        tenant.github_owner,
        tenant.github_repo,
        tenant.github_branch,
        tenant.github_token,
        tenant.workflow_json ? JSON.stringify(tenant.workflow_json) : JSON.stringify({}),
        tenant.workflow_published_at,
        tenant.workflow_download_url,
        tenant.loaded_at,
        tenant.updated_at,
        tenant.created_at,
      ],
    );

    if (account) {
      await targetPool.query(
        `INSERT INTO accounts (
          id, email, password_hash, company_name, cnpj, address, tenant_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (tenant_id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          company_name = EXCLUDED.company_name,
          cnpj = EXCLUDED.cnpj,
          address = EXCLUDED.address,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at`,
        [
          account.id,
          account.email,
          account.password_hash,
          account.company_name,
          account.cnpj,
          account.address,
          account.tenant_id,
          account.created_at,
          account.updated_at,
        ],
      );
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          tenantId,
          sourceUrl: sourceUrl.replace(/\/\/[^@]+@/, '//***@'),
          targetUrl: targetUrl.replace(/\/\/[^@]+@/, '//***@'),
          copiedAccount: Boolean(account),
        },
        null,
        2,
      ),
    );
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
