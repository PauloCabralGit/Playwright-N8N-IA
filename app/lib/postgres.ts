import type { Client, QueryResult, QueryResultRow } from 'pg';

type GlobalWithPostgres = typeof globalThis & {
  __qaPgClient?: Promise<Client>;
  __qaPgSchemaReady?: Promise<void>;
  __qaPgSchemaVersion?: string;
};

const SCHEMA_VERSION = '2026-04-14-discord-bot-fields';

function getDatabaseUrl() {
  const url =
    process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_CONNECTION_STRING ||
    process.env.PG_CONNECTION_STRING;

  return url || '';
}

function describeConnectionString(connectionString: string) {
  if (!connectionString) {
    return {
      present: false,
      protocol: '',
      hostname: '',
      port: '',
      database: '',
      username: '',
    };
  }

  try {
    const parsed = new URL(connectionString);
    return {
      present: true,
      protocol: parsed.protocol.replace(/:$/, ''),
      hostname: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname.replace(/^\/+/, ''),
      username: parsed.username,
    };
  } catch {
    return {
      present: true,
      protocol: 'unparseable',
      hostname: '',
      port: '',
      database: '',
      username: '',
    };
  }
}

async function resolveDatabaseUrl() {
  const localUrl = getDatabaseUrl();
  if (localUrl) {
    return localUrl;
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cloudflareContext = await getCloudflareContext({ async: true });
    const binding = (cloudflareContext.env as { HYPERDRIVE?: { connectionString?: string } }).HYPERDRIVE;
    const connectionString = String(binding?.connectionString || '').trim();
    if (connectionString) {
      return connectionString;
    }
  } catch {
    // Ignore runtime lookup failures and fall back to the local env error below.
  }

  throw new Error('DATABASE_URL is required to use Postgres persistence.');
}

function shouldUseSsl(connectionString: string) {
  if (!connectionString) return false;

  try {
    const parsed = new URL(connectionString);
    const hostname = parsed.hostname.toLowerCase();
    const isHyperdrive =
      hostname.endsWith('.hyperdrive.local') ||
      hostname === 'hyperdrive.local';

    if (isHyperdrive) {
      return false;
    }
  } catch {
    // Fall through to default behavior below.
  }

  return process.env.NODE_ENV === 'production';
}

async function loadClientConstructor() {
  const pgModule = await import('pg');
  const candidate =
    pgModule.Client ||
    (pgModule.default as { Client?: typeof Client } | undefined)?.Client;

  if (typeof candidate !== 'function') {
    throw new Error('Postgres Client constructor is unavailable in this runtime.');
  }

  return candidate as typeof Client;
}

async function createClient() {
  const connectionString = await resolveDatabaseUrl();
  const ClientConstructor = await loadClientConstructor();
  const client = new ClientConstructor({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  return client;
}

async function getSharedClient() {
  const globalScope = globalThis as GlobalWithPostgres;

  if (!globalScope.__qaPgClient) {
    globalScope.__qaPgClient = createClient();
  }

  return globalScope.__qaPgClient;
}

async function ensureSchema() {
  if (process.env.ENABLE_RUNTIME_SCHEMA_MIGRATIONS !== 'true') {
    return;
  }

  const globalScope = globalThis as GlobalWithPostgres;
  if (globalScope.__qaPgSchemaVersion !== SCHEMA_VERSION) {
    globalScope.__qaPgSchemaReady = undefined;
    globalScope.__qaPgSchemaVersion = SCHEMA_VERSION;
  }

  if (!globalScope.__qaPgSchemaReady) {
    globalScope.__qaPgSchemaReady = (async () => {
      const client = await createClient();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            company_name TEXT NOT NULL,
            cnpj TEXT NOT NULL,
            address TEXT NOT NULL,
            app_public_url TEXT NOT NULL,
            webhook_base_url TEXT NOT NULL,
            webhook_path TEXT NOT NULL,
            webhook_url TEXT NOT NULL,
            api_key TEXT NOT NULL,
            discord_webhook TEXT NOT NULL DEFAULT '',
            discord_application_id TEXT NOT NULL DEFAULT '',
            discord_public_key TEXT NOT NULL DEFAULT '',
            discord_bot_token TEXT NOT NULL DEFAULT '',
            discord_guild_id TEXT NOT NULL DEFAULT '',
            discord_command_name TEXT NOT NULL DEFAULT 'qa',
            github_owner TEXT NOT NULL,
            github_repo TEXT NOT NULL,
            github_branch TEXT NOT NULL DEFAULT 'main',
            github_token TEXT NOT NULL,
            workflow_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            workflow_published_at TEXT NOT NULL DEFAULT '',
            workflow_download_url TEXT NOT NULL DEFAULT '',
            loaded_at TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT ''
          );

          ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS workflow_json JSONB NOT NULL DEFAULT '{}'::jsonb;
          ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS discord_application_id TEXT NOT NULL DEFAULT '';
          ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS discord_public_key TEXT NOT NULL DEFAULT '';
          ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS discord_bot_token TEXT NOT NULL DEFAULT '';
          ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS discord_guild_id TEXT NOT NULL DEFAULT '';
          ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS discord_command_name TEXT NOT NULL DEFAULT 'qa';
          ALTER TABLE tenants
            ADD COLUMN IF NOT EXISTS discord_webhook TEXT NOT NULL DEFAULT '';

          CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            company_name TEXT NOT NULL,
            cnpj TEXT NOT NULL,
            address TEXT NOT NULL,
            tenant_id TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
          CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
          CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

          CREATE TABLE IF NOT EXISTS board_cards (
            tenant_id TEXT NOT NULL,
            card_id TEXT NOT NULL,
            card JSONB NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (tenant_id, card_id)
          );

          CREATE INDEX IF NOT EXISTS idx_board_cards_tenant_id ON board_cards(tenant_id);

          CREATE TABLE IF NOT EXISTS card_history (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            card_id TEXT NOT NULL,
            action TEXT NOT NULL,
            before_card JSONB NOT NULL DEFAULT '{}'::jsonb,
            after_card JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_card_history_tenant_id ON card_history(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_card_history_card_id ON card_history(card_id);

          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used_at TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_account_id ON password_reset_tokens(account_id);
          CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
          CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_at ON password_reset_tokens(used_at);
        `);
      } finally {
        await client.end().catch(() => {});
      }
    })();
  }

  return globalScope.__qaPgSchemaReady;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  await ensureSchema();
  const client = await getSharedClient();
  try {
    return await client.query<T>(text, values);
  } catch (error) {
    const globalScope = globalThis as GlobalWithPostgres;
    globalScope.__qaPgClient = undefined;
    throw error;
  }
}

export async function dbTransaction<T>(handler: (client: Client) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getSharedClient();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    const globalScope = globalThis as GlobalWithPostgres;
    globalScope.__qaPgClient = undefined;
    throw error;
  }
}

export function requireDatabaseUrl() {
  return getDatabaseUrl();
}

export async function getDatabaseDiagnostics() {
  const localUrl = getDatabaseUrl();
  const diagnostics = {
    source: localUrl ? 'env' : 'cloudflare',
    envKeysPresent: {
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: Boolean(
        process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE,
      ),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
      POSTGRES_CONNECTION_STRING: Boolean(process.env.POSTGRES_CONNECTION_STRING),
      PG_CONNECTION_STRING: Boolean(process.env.PG_CONNECTION_STRING),
    },
    local: describeConnectionString(localUrl),
    cloudflare: {
      bindingPresent: false,
      connection: describeConnectionString(''),
      error: '',
    },
  };

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cloudflareContext = await getCloudflareContext({ async: true });
    const binding = (cloudflareContext.env as { HYPERDRIVE?: { connectionString?: string } }).HYPERDRIVE;
    const connectionString = String(binding?.connectionString || '').trim();
    diagnostics.cloudflare.bindingPresent = Boolean(binding);
    diagnostics.cloudflare.connection = describeConnectionString(connectionString);
  } catch (error) {
    diagnostics.cloudflare.error = error instanceof Error ? error.message : 'Unknown Cloudflare context error.';
  }

  return diagnostics;
}
