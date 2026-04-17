import type { NextRequest } from 'next/server';
import { getN8nConfig, getN8nWebhookUrl } from '@/app/lib/n8n-config';
import { getCurrentTenant } from '@/app/lib/tenant-auth';
import { addScenarioToBoardCard } from '@/app/lib/board-store';
import type { DeliveryCard } from '@/components/dashboard/types';

const GITHUB_USER_AGENT = 'orionsystem-cloudflare-worker';

export type ScenarioStatus = 'Backlog' | 'Ready' | 'In Progress' | 'Review' | 'Done';
export type ScenarioCategory = 'Funcional' | 'Performance';

export interface ScenarioDTO {
  id: string;
  title: string;
  module: string;
  category: ScenarioCategory;
  priority: 'Baixa' | 'Média' | 'Alta';
  status: ScenarioStatus;
  objective?: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  tags?: string[];
  owner?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

async function callN8n(webhookUrl: string, body: Record<string, unknown>) {
  const url = new URL(webhookUrl);
  url.searchParams.set('responseMode', 'onReceived');
  url.searchParams.set('responseCode', '200');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes('No item to return was found')) {
      return {};
    }
    throw new Error(`n8n error ${res.status}: ${text}`);
  }

  return res.json().catch(() => ({}));
}

function toGherkin(scenario: ScenarioDTO) {
  const featureName = scenario.module || 'Geral';
  const tagId = scenario.id.toLowerCase();
  const tagCategory = scenario.category.toLowerCase();

  const preconditions = (scenario.preconditions || 'que as pré-condições do cenário estejam atendidas')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const steps = (scenario.steps || 'o usuário executa o fluxo principal')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const expected = (scenario.expectedResult || 'o resultado esperado deve ser apresentado')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return [
    '# language: pt',
    `Feature: ${featureName}`,
    '',
    `  @${tagId} @${tagCategory}`,
    `  Cenário: ${scenario.title || scenario.id}`,
    ...(scenario.objective ? [`    # Objetivo: ${scenario.objective}`] : []),
    ...preconditions.map((line, i) => `${i === 0 ? '    Dado' : '    E'} ${line}`),
    ...steps.map((line, i) => `${i === 0 ? '    Quando' : '    E'} ${line}`),
    ...expected.map((line, i) => `${i === 0 ? '    Então' : '    E'} ${line}`),
    '',
  ].join('\n');
}

async function saveFeatureToGitHub(scenario: ScenarioDTO) {
  const config = await getN8nConfig();
  const owner = config.githubOwner;
  const repo = config.githubRepo;
  const branch = config.githubBranch || 'main';
  const token = config.githubToken;

  if (!owner || !repo || !token) {
    throw new Error('GitHub integration is not configured.');
  }

  const dir = scenario.category === 'Performance' ? 'features/performance' : 'features/funcionais';
  const path = `${dir}/${scenario.id.toLowerCase()}.feature`;
  const gherkin = toGherkin(scenario);
  const content = Buffer.from(gherkin, 'utf8').toString('base64');

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': GITHUB_USER_AGENT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `test(bdd): sync ${scenario.id} feature file`,
      content,
      branch,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`GitHub error ${response.status}: ${JSON.stringify(data)}`);
  }

  return {
    path,
    branch,
    github: data,
  };
}

export async function GET(request: NextRequest) {
  const config = await getN8nConfig(request);
  const webhookBaseUrl = await getN8nWebhookUrl();
  const mocked: ScenarioDTO[] = [
    {
      id: 'CT-FUNC-21',
      title: 'Consulta de lead com dados válidos',
      module: 'Lead',
      category: 'Funcional',
      priority: 'Alta',
      status: 'Backlog',
      objective: 'Garantir que a consulta de lead exiba os dados corretos.',
      tags: ['lead', 'smoke'],
      owner: 'Paulo',
    },
    {
      id: 'CT-PERF-03',
      title: 'Abertura de lista de campanha',
      module: 'Campanhas',
      category: 'Performance',
      priority: 'Média',
      status: 'In Progress',
      objective: 'Validar o tempo de resposta da listagem de campanhas.',
      tags: ['k6', 'campanhas'],
      owner: 'Carlos',
    },
  ];

  return json({
    items: mocked,
    config: {
      github: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch: config.githubBranch,
        enabled: Boolean(config.githubToken),
      },
      n8n: {
        webhookBaseUrl: webhookBaseUrl || '',
        enabled: Boolean(webhookBaseUrl),
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScenarioDTO & {
      syncToGitHub?: boolean;
      syncToN8n?: boolean;
      configSnapshot?: {
        webhookUrl?: string;
      };
      cardId?: string;
      card?: DeliveryCard;
      acceptanceCriteria?: string[];
      businessGoal?: string;
      qaNotes?: string;
    };

    if (!body.id || !body.title) {
      return json({ error: 'id and title are required' }, 400);
    }

    const scenario: ScenarioDTO = {
      ...body,
      status: body.status || 'Backlog',
      priority: body.priority || 'Média',
      category: body.category || 'Funcional',
      module: body.module || 'Geral',
      tags: body.tags || [],
    };

    const tenant = await getCurrentTenant(request);

    if (body.cardId && tenant) {
      await addScenarioToBoardCard(tenant.id, body.cardId, {
        id: scenario.id,
        title: scenario.title,
        source: 'IA',
        status: 'Draft',
      });
    }

    const result: Record<string, unknown> = {
      scenario,
    };

    if (body.syncToGitHub) {
      result.github = await saveFeatureToGitHub(scenario);
    }

    const webhookUrl = body.configSnapshot?.webhookUrl?.trim() || '';

    if (body.syncToN8n) {
      if (!isValidUrl(webhookUrl)) {
        throw new Error('Webhook URL inválida ou ausente no payload atual.');
      }

      const discordWebhook = (await getN8nConfig(request, tenant?.id)).discordWebhook || '';
      result.n8n = await callN8n(webhookUrl, {
        type: 'task_ia',
        action: 'task_ia',
        command: 'task_ia',
        scenario,
        card: body.card || null,
        acceptanceCriteria: Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria : [],
        businessGoal: body.businessGoal || scenario.objective || '',
        qaNotes: body.qaNotes || scenario.preconditions || '',
        settings: body.configSnapshot || {},
        configSnapshot: body.configSnapshot || {},
        github: result.github || null,
        tenantId: tenant?.id || '',
        tenantSlug: tenant?.slug || '',
        discordWebhook,
        source: 'site',
      });
    }

    return json(result, 201);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}
