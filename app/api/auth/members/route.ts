import { NextRequest, NextResponse } from 'next/server';

import { dbQuery } from '@/app/lib/postgres';
import { getCurrentAccount } from '@/app/lib/tenant-auth';
import type { TeamMember } from '@/components/dashboard/types';

function inferRole(email: string): TeamMember['role'] {
  const normalized = email.toLowerCase();
  if (normalized.includes('qa')) return 'QA';
  if (normalized.includes('dev')) return 'Dev';
  if (normalized.includes('gest') || normalized.includes('admin')) return 'Gestor';
  return 'PO';
}

function resolveName(email: string, companyName: string) {
  const localPart = email.split('@')[0] || '';
  const cleaned = localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return cleaned || companyName || 'Membro da Organizacao';
}

export async function GET(request: NextRequest) {
  const account = await getCurrentAccount(request);

  if (!account) {
    return NextResponse.json({ ok: false, error: 'Usuario nao autenticado.' }, { status: 401 });
  }

  const result = await dbQuery<{
    id: string;
    email: string;
    company_name: string;
    cnpj: string;
  }>(
    `SELECT id, email, company_name, cnpj
     FROM accounts
     WHERE cnpj = $1 OR company_name = $2
     ORDER BY created_at ASC`,
    [account.cnpj, account.companyName],
  );

  const seen = new Set<string>();
  const items: TeamMember[] = result.rows
    .map((row) => ({
      id: String(row.id || ''),
      email: String(row.email || ''),
      name: resolveName(String(row.email || ''), String(row.company_name || '')),
      role: inferRole(String(row.email || '')),
    }))
    .filter((item) => {
      const key = `${item.email}:${item.id}`;
      if (!item.id || !item.email || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  if (!items.some((item) => item.id === account.id)) {
    items.unshift({
      id: account.id,
      email: account.email,
      name: resolveName(account.email, account.companyName),
      role: inferRole(account.email),
    });
  }

  return NextResponse.json({
    ok: true,
    items,
  });
}
