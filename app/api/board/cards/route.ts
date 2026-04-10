import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenant } from '@/app/lib/tenant-auth';
import { getBoardCards } from '@/app/lib/board-store';

export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant(request);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'Usuário não autenticado.' }, { status: 401 });
  }

  const items = await getBoardCards(tenant.id);

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    items,
  });
}
