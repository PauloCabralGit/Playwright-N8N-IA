import type { ColumnId, DeliveryCard, Scenario } from '@/components/dashboard/types';
import { randomUUID } from 'crypto';
import { dbQuery } from '@/app/lib/postgres';

const SEED_CARDS: DeliveryCard[] = [
  {
    id: 'DEL-201',
    title: 'Consulta de lead no painel comercial',
    epic: 'Onboarding PME',
    module: 'Lead',
    column: 'qa',
    priority: 'Alta',
    owner: 'Paulo',
    businessGoal:
      'Permitir que o time comercial visualize rapidamente os dados do lead sem sair do fluxo principal de atendimento.',
    acceptanceCriteria: [
      'Usuário autenticado deve conseguir pesquisar um lead por identificador.',
      'O sistema deve exibir nome, telefone, status e origem do lead.',
      'Quando o lead não existir, a interface deve mostrar mensagem clara sem quebrar o fluxo.',
    ],
    qaNotes: 'Validar interface, API e comportamento para lead inexistente.',
    scenarios: [
      { id: 'CT-FUNC-21', title: 'Display lead data for a valid identifier', source: 'IA', status: 'Ready' },
      { id: 'CT-FUNC-22', title: 'Show graceful message when lead is not found', source: 'Manual', status: 'Draft' },
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
    businessGoal:
      'Garantir que a tela de campanhas escale bem para clientes com alto volume operacional e sem travamentos.',
    acceptanceCriteria: [
      'A listagem deve carregar em tempo aceitável com grande volume.',
      'A ordenação não pode travar a interface.',
    ],
    qaNotes: 'Rodar cenários manuais e k6 antes do go-live.',
    scenarios: [
      { id: 'CT-PERF-03', title: 'Load campaign list under heavy volume', source: 'IA', status: 'Automated' },
    ],
  },
  {
    id: 'DEL-203',
    title: 'Login com credenciais válidas',
    epic: 'Autenticação',
    module: 'Acesso',
    column: 'done',
    priority: 'Alta',
    owner: 'Amanda',
    businessGoal: 'Permitir autenticação estável e segura para todos os perfis de usuário.',
    acceptanceCriteria: [
      'Usuário válido deve acessar o sistema com sucesso.',
      'Sessão deve ser registrada corretamente.',
    ],
    qaNotes: 'Cobertura de smoke já validada.',
    scenarios: [{ id: 'CT-FUNC-02', title: 'Authenticate a valid user', source: 'IA', status: 'Automated' }],
  },
];

function cloneCards(cards: DeliveryCard[]) {
  return cards.map((card) => ({
    ...card,
    acceptanceCriteria: [...card.acceptanceCriteria],
    scenarios: card.scenarios.map((scenario) => ({ ...scenario })),
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
    scenarios: card.scenarios.map((scenario) => ({ ...scenario })),
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
  const cards = await getBoardCards(tenantId);
  const next = cards.filter((card: DeliveryCard) => card.id !== cardId);
  await setBoardCards(tenantId, next);
  return next;
}

export async function upsertBoardCard(tenantId: string, card: DeliveryCard) {
  const cards = await getBoardCards(tenantId);
  const index = cards.findIndex((item: DeliveryCard) => item.id === card.id);
  const beforeCard = index >= 0 ? cards[index] : null;
  if (index >= 0) {
    cards[index] = { ...cards[index], ...card };
  } else {
    cards.unshift(card);
  }
  const next = await setBoardCards(tenantId, cards);
  await recordCardHistory(tenantId, card.id, index >= 0 ? 'update' : 'create', beforeCard, card);
  return next;
}

export async function moveBoardCard(tenantId: string, cardId: string, column: ColumnId) {
  const cards = await getBoardCards(tenantId);
  const beforeCard = cards.find((card: DeliveryCard) => card.id === cardId) || null;
  const next = cards.map((card: DeliveryCard) => (card.id === cardId ? { ...card, column } : card));
  const updated = next.find((card: DeliveryCard) => card.id === cardId) || null;
  const result = await setBoardCards(tenantId, next);
  await recordCardHistory(tenantId, cardId, 'move', beforeCard, updated);
  return result;
}

export async function addScenarioToBoardCard(tenantId: string, cardId: string, scenario: Scenario) {
  const cards = await getBoardCards(tenantId);
  const beforeCard = cards.find((card: DeliveryCard) => card.id === cardId) || null;
  const next = cards.map((card: DeliveryCard) =>
    card.id === cardId
      ? { ...card, scenarios: [scenario, ...card.scenarios] }
      : card
  );
  const updated = next.find((card: DeliveryCard) => card.id === cardId) || null;
  const result = await setBoardCards(tenantId, next);
  await recordCardHistory(tenantId, cardId, 'add_scenario', beforeCard, updated);
  return result;
}
