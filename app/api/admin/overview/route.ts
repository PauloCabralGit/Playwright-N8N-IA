import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/app/lib/postgres';
import { getCurrentAccount } from '@/app/lib/tenant-auth';

export async function GET(request: NextRequest) {
  const account = await getCurrentAccount(request);
  if (!account) {
    return NextResponse.json({ ok: false, error: 'Usuário não autenticado.' }, { status: 401 });
  }

  const [accountsResult, tenantsResult, cardsResult, historyResult] = await Promise.all([
    dbQuery(
      `SELECT id, email, company_name, cnpj, address, tenant_id, created_at, updated_at
       FROM accounts
       ORDER BY created_at DESC`,
    ),
    dbQuery(
      `SELECT id, slug, company_name, cnpj, address, app_public_url, webhook_base_url, webhook_path,
              webhook_url, api_key, discord_webhook, github_owner, github_repo, github_branch, github_token,
              workflow_json, workflow_published_at, workflow_download_url, loaded_at, updated_at, created_at
       FROM tenants
       ORDER BY created_at DESC`,
    ),
    dbQuery(
      `SELECT tenant_id, card_id, card, updated_at
       FROM board_cards
       ORDER BY updated_at DESC`,
    ),
    dbQuery(
      `SELECT id, tenant_id, card_id, action, before_card, after_card, created_at
       FROM card_history
       ORDER BY created_at DESC`,
    ),
  ]);

  return NextResponse.json({
    ok: true,
    counts: {
      accounts: accountsResult.rowCount || 0,
      tenants: tenantsResult.rowCount || 0,
      cards: cardsResult.rowCount || 0,
      history: historyResult.rowCount || 0,
    },
    accounts: accountsResult.rows,
    tenants: tenantsResult.rows,
    cards: cardsResult.rows,
    history: historyResult.rows,
  });
}
