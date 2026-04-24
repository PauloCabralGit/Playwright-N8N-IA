import { NextRequest, NextResponse } from 'next/server';
import { getBoardCards, upsertBoardCard, moveBoardCard, deleteBoardCard, setBoardCards } from '@/app/lib/board-store';
import { getTenantByIdPublic, getTenantBySlug } from '@/app/lib/tenant-auth';
import type { ColumnId, DeliveryCard } from '@/components/dashboard/types';

function resolveTenantId(request: NextRequest, body?: Record<string, unknown>) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = String(
    body?.tenantId ||
      searchParams.get('tenantId') ||
      searchParams.get('tenant') ||
      '',
  ).trim();
  const tenantSlug = String(
    body?.tenantSlug ||
      searchParams.get('tenantSlug') ||
      searchParams.get('slug') ||
      '',
  ).trim();
  return { tenantId, tenantSlug };
}

async function getTenantFromRequest(request: NextRequest, body?: Record<string, unknown>) {
  const { tenantId, tenantSlug } = resolveTenantId(request, body);
  if (tenantId) {
    const tenant = await getTenantByIdPublic(tenantId);
    if (tenant) return tenant;
  }
  if (tenantSlug) {
    return getTenantBySlug(tenantSlug);
  }
  return null;
}

function toWorkflowRow(card: DeliveryCard) {
  const acceptanceCriteria = Array.isArray(card.acceptanceCriteria) ? card.acceptanceCriteria : [];
  const scenarioList = Array.isArray(card.scenarios) ? card.scenarios : [];
  const isPerformance =
    card.column === 'testing' ||
    /perf/i.test(card.id) ||
    /performance/i.test(card.module) ||
    /performance/i.test(card.title);

  return {
    _sheet: isPerformance ? 'Testes Performance' : 'Testes Funcionais',
    ID: card.id,
    Categoria: isPerformance ? 'Performance' : 'Funcional',
    'Módulo': card.module || card.epic || 'Geral',
    'Título': card.title || card.id,
    Objetivo: card.businessGoal || '',
    'Pré-condição / Cenário': card.qaNotes || '',
    Passos: acceptanceCriteria.join('\n'),
    'Resultado Esperado': acceptanceCriteria.join('\n'),
    Status: card.column || 'backlog',
    Tags: scenarioList.map((scenario) => scenario.id).filter(Boolean).join(', '),
    card,
    scenarios: scenarioList,
  };
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: 'Tenant não encontrado.' }, { status: 404 });
    }

    const items = await getBoardCards(tenant.id);
    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      items: items.map(toWorkflowRow),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar cards.';

    console.error('N8N board cards GET failed', {
      error: message,
      path: request.nextUrl.pathname,
      tenantId: request.nextUrl.searchParams.get('tenantId') || request.nextUrl.searchParams.get('tenant') || '',
      tenantSlug:
        request.nextUrl.searchParams.get('tenantSlug') ||
        request.nextUrl.searchParams.get('slug') ||
        '',
    });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenant = await getTenantFromRequest(request, body);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: 'Tenant não encontrado.' }, { status: 404 });
    }

    const card = body.card as DeliveryCard | undefined;
    if (!card?.id) {
      return NextResponse.json({ ok: false, error: 'Card inválido.' }, { status: 400 });
    }

    const result = await upsertBoardCard(tenant.id, card);
    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      items: result.map(toWorkflowRow),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao salvar card.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const tenant = await getTenantFromRequest(request, body);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: 'Tenant não encontrado.' }, { status: 404 });
    }

    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID ausente.' }, { status: 400 });
    }

    if (String(body.action || '').toLowerCase() === 'move' || body.status) {
      await moveBoardCard(tenant.id, id, String(body.status || body.column || '') as ColumnId);
    }

    if (body.field) {
      const cards = await getBoardCards(tenant.id);
      const next = cards.map((card) =>
        card.id === id
          ? {
              ...card,
              [String(body.field)]: body.value ?? '',
            }
          : card,
      );
      await setBoardCards(tenant.id, next);
      return NextResponse.json({
        ok: true,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        items: next.map(toWorkflowRow),
      });
    }

    if (body.card && typeof body.card === 'object') {
      const cards = await upsertBoardCard(tenant.id, body.card as DeliveryCard);
      return NextResponse.json({
        ok: true,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        items: cards.map(toWorkflowRow),
      });
    }

    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao atualizar card.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tenant = await getTenantFromRequest(request, body);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: 'Tenant não encontrado.' }, { status: 404 });
    }

    const id = String(body.id || request.nextUrl.searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID ausente.' }, { status: 400 });
    }

    const items = await deleteBoardCard(tenant.id, id);
    return NextResponse.json({
      ok: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      items: items.map(toWorkflowRow),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao deletar card.' },
      { status: 500 },
    );
  }
}
