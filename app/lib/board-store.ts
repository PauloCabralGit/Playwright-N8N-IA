import type { ColumnId, DeliveryCard, Scenario } from '@/components/dashboard/types';
import { randomUUID } from 'crypto';
import { dbQuery } from '@/app/lib/postgres';

const baseExecution = (estimatedMinutes = 10) => ({
  estimatedMinutes,
  actualMinutes: 0,
  status: 'Not Run' as const,
  notes: '',
  executedBy: '',
  evidences: [] as string[],
  bugSource: 'None' as const,
  bugTitle: '',
  bugDescription: '',
});

const SEED_CARDS: DeliveryCard[] = [
  {
    id: 'DEL-201',
    title: 'Consulta de lead no painel comercial',
    epic: 'Onboarding PME',
    module: 'Lead',
    column: 'qa',
    priority: 'Alta',
    owner: 'Paulo',
    ownerId: 'seed-paulo',
    businessGoal:
      'Permitir que o time comercial visualize rapidamente os dados do lead sem sair do fluxo principal de atendimento.',
    acceptanceCriteria: [
      'Usuario autenticado deve conseguir pesquisar um lead por identificador.',
      'O sistema deve exibir nome, telefone, status e origem do lead.',
      'Quando o lead nao existir, a interface deve mostrar mensagem clara sem quebrar o fluxo.',
    ],
    estimatedExecutionMinutes: 35,
    qaNotes: 'Validar interface, API e comportamento para lead inexistente.',
    scenarios: [
      {
        id: 'CT-FUNC-21',
        title: 'Display lead data for a valid identifier',
        source: 'IA',
        status: 'Ready',
        objective: 'Garantir que a consulta apresente os dados principais do lead.',
        expectedResult: 'Nome, telefone e origem sao exibidos corretamente.',
        execution: baseExecution(10),
      },
      {
        id: 'CT-FUNC-22',
        title: 'Show graceful message when lead is not found',
        source: 'Manual',
        status: 'Draft',
        objective: 'Confirmar resposta amigavel para lead inexistente.',
        expectedResult: 'Mensagem clara sem quebrar a interface.',
        execution: baseExecution(8),
      },
    ],
  },
  {
    id: 'DEL-202',
    title: 'Listagem de campanhas com alto volume',
    epic: 'Campanhas',
    module: 'Campanhas',
    column: 'testing',
    priority: 'Média',
    owner: 'Bianca',
    ownerId: 'seed-bianca',
    businessGoal:
      'Garantir que a tela de campanhas escale bem para clientes com alto volume operacional e sem travamentos.',
    acceptanceCriteria: [
      'A listagem deve carregar em tempo aceitavel com grande volume.',
      'A ordenacao nao pode travar a interface.',
    ],
    estimatedExecutionMinutes: 55,
    qaNotes: 'Rodar cenarios manuais e k6 antes do go-live.',
    scenarios: [
      {
        id: 'CT-PERF-03',
        title: 'Load campaign list under heavy volume',
        source: 'IA',
        status: 'Automated',
        category: 'Performance',
        execution: baseExecution(20),
      },
    ],
  },
  {
    id: 'DEL-203',
    title: 'Login com credenciais validas',
    epic: 'Autenticacao',
    module: 'Acesso',
    column: 'done',
    priority: 'Alta',
    owner: 'Amanda',
    ownerId: 'seed-amanda',
    businessGoal: 'Permitir autenticacao estavel e segura para todos os perfis de usuario.',
    acceptanceCriteria: [
      'Usuario valido deve acessar o sistema com sucesso.',
      'Sessao deve ser registrada corretamente.',
    ],
    estimatedExecutionMinutes: 18,
    qaNotes: 'Cobertura de smoke ja validada.',
    scenarios: [
      {
        id: 'CT-FUNC-02',
        title: 'Authenticate a valid user',
        source: 'IA',
        status: 'Automated',
        execution: baseExecution(6),
      },
    ],
  },
];

function cloneCards(cards: DeliveryCard[]): DeliveryCard[] {
  return cards.map((card): DeliveryCard => ({
    ...card,
    acceptanceCriteria: [...card.acceptanceCriteria],
    scenarios: card.scenarios.map((scenario): Scenario => ({
      ...scenario,
      execution: scenario.execution
        ? {
            ...scenario.execution,
            evidences: [...scenario.execution.evidences],
          }
        : undefined,
    })),
  }));
}

function seedCards() {
  return cloneCards(SEED_CARDS);
}

async function ensureTenantCards(tenantId: string) {
  const existing = await dbQuery<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM board_cards WHERE tenant_id = $1',
    [tenantId],
  );

  if (Number(existing.rows[0]?.count || 0) > 0) {
    return;
  }

  const cards = seedCards();
  for (const card of cards) {
    await dbQuery(
      `INSERT INTO board_cards (tenant_id, card_id, card, updated_at)
       VALUES ($1,$2,$3::jsonb,$4)`,
      [tenantId, card.id, JSON.stringify(card), new Date().toISOString()],
    );
  }
}

function toCard(row: { card: DeliveryCard }) {
  const card = row.card;
  return {
    ...card,
    acceptanceCriteria: [...card.acceptanceCriteria],
    scenarios: card.scenarios.map((scenario) => ({
      ...scenario,
      execution: scenario.execution
        ? {
            ...scenario.execution,
            evidences: [...scenario.execution.evidences],
          }
        : undefined,
    })),
  };
}

async function recordCardHistory(
  tenantId: string,
  cardId: string,
  action: string,
  beforeCard: DeliveryCard | null,
  afterCard: DeliveryCard | null,
) {
  await dbQuery(
    `INSERT INTO card_history (
      id, tenant_id, card_id, action, before_card, after_card, created_at
    ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
    [
      randomUUID(),
      tenantId,
      cardId,
      action,
      JSON.stringify(beforeCard || {}),
      JSON.stringify(afterCard || {}),
      new Date().toISOString(),
    ],
  );
}

export async function getBoardCards(tenantId: string) {
  await ensureTenantCards(tenantId);
  const result = await dbQuery<{ card: DeliveryCard }>(
    'SELECT card FROM board_cards WHERE tenant_id = $1 ORDER BY updated_at DESC',
    [tenantId],
  );

  return result.rows.map((row: { card: DeliveryCard }) => toCard(row));
}

export async function setBoardCards(tenantId: string, cards: DeliveryCard[]) {
  await dbQuery('DELETE FROM board_cards WHERE tenant_id = $1', [tenantId]);
  for (const card of cards) {
    await dbQuery(
      `INSERT INTO board_cards (tenant_id, card_id, card, updated_at)
       VALUES ($1,$2,$3::jsonb,$4)`,
      [tenantId, card.id, JSON.stringify(card), new Date().toISOString()],
    );
  }
  return cloneCards(cards);
}

export async function deleteBoardCard(tenantId: string, cardId: string) {
  const cards: DeliveryCard[] = await getBoardCards(tenantId);
  const next = cards.filter((card: DeliveryCard) => card.id !== cardId);
  await setBoardCards(tenantId, next);
  return next;
}

export async function upsertBoardCard(tenantId: string, card: DeliveryCard) {
  const cards: DeliveryCard[] = await getBoardCards(tenantId);
  const index = cards.findIndex((item: DeliveryCard) => item.id === card.id);
  const beforeCard: DeliveryCard | null = index >= 0 ? cards[index] : null;

  if (index >= 0) {
    cards[index] = { ...cards[index], ...card } as DeliveryCard;
  } else {
    cards.unshift(card);
  }

  const next = await setBoardCards(tenantId, cards);
  await recordCardHistory(tenantId, card.id, index >= 0 ? 'update' : 'create', beforeCard, card as DeliveryCard);
  return next;
}

export async function moveBoardCard(tenantId: string, cardId: string, column: ColumnId) {
  const cards: DeliveryCard[] = await getBoardCards(tenantId);
  const beforeCard = cards.find((card: DeliveryCard) => card.id === cardId) || null;
  const next = cards.map((card: DeliveryCard) => (card.id === cardId ? { ...card, column } : card));
  const updated = next.find((card: DeliveryCard) => card.id === cardId) || null;
  const result = await setBoardCards(tenantId, next);
  await recordCardHistory(tenantId, cardId, 'move', beforeCard, updated);
  return result;
}

export async function addScenarioToBoardCard(tenantId: string, cardId: string, scenario: Scenario) {
  const cards: DeliveryCard[] = await getBoardCards(tenantId);
  const beforeCard = cards.find((card: DeliveryCard) => card.id === cardId) || null;
  const next = cards.map((card: DeliveryCard) =>
    card.id === cardId ? { ...card, scenarios: [scenario, ...card.scenarios] } : card,
  );
  const updated = next.find((card: DeliveryCard) => card.id === cardId) || null;
  const result = await setBoardCards(tenantId, next);
  await recordCardHistory(tenantId, cardId, 'add_scenario', beforeCard, updated);
  return result;
}
