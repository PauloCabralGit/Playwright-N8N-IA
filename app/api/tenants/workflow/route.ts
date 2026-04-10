import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenant, readPublishedWorkflow } from '@/app/lib/tenant-auth';

export async function GET(request: NextRequest) {
  const currentTenant = await getCurrentTenant(request);
  const tenantId = request.nextUrl.searchParams.get('tenantId') || currentTenant?.id;

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: 'Tenant não encontrado.' }, { status: 404 });
  }

  const workflow = await readPublishedWorkflow(tenantId);
  if (!workflow) {
    return NextResponse.json({ ok: false, error: 'Workflow não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    tenantId,
    workflow,
  });
}
