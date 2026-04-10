import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount, getTenantByIdPublic } from '@/app/lib/tenant-auth';

export async function GET(request: NextRequest) {
  const account = await getCurrentAccount(request);
  const tenant = account ? await getTenantByIdPublic(account.tenantId) : null;

  if (!account) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    account: {
      id: account.id,
      email: account.email,
      companyName: account.companyName,
      cnpj: account.cnpj,
      address: account.address,
      tenantId: account.tenantId,
    },
    tenant: tenant || null,
  });
}
