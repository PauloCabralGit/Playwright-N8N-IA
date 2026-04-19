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

type ParsedGeneratedScenario = {
  title: string;
  objective: string;
  steps: string;
  expectedResult: string;
};

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGitHubFeaturePath(scenario: ScenarioDTO) {
  const dir = scenario.category === 'Performance' ? 'features/performance' : 'features/funcionais';
  return `${dir}/${scenario.id.toLowerCase()}.feature`;
}

function decodeGitHubContent(content: string, encoding: string) {
  if (encoding === 'base64') {
    return Buffer.from(content, 'base64').toString('utf8');
  }

  return content;
}

function parseGherkinScenarios(text: string): ParsedGeneratedScenario[] {
  const lines = text.split(/\r?\n/);
  const featureTitle =
    lines.find((line) => line.trim().startsWith('Feature:'))?.replace(/^.*Feature:\s*/, '').trim() || '';

  const scenarios: ParsedGeneratedScenario[] = [];
  let currentTitle = '';
  let currentGiven: string[] = [];
  let currentWhen: string[] = [];
  let currentThen: string[] = [];
  let currentSection: 'given' | 'when' | 'then' | null = null;

  const flush = () => {
    if (!currentTitle) return;
    scenarios.push({
      title: currentTitle,
      objective: featureTitle ? `Cobrir o comportamento descrito em ${featureTitle}.` : '',
      steps: [...currentGiven, ...currentWhen].join('\n').trim(),
      expectedResult: currentThen.join('\n').trim(),
    });
    currentTitle = '';
    currentGiven = [];
    currentWhen = [];
    currentThen = [];
    currentSection = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^Scenario(?: Outline)?:/i.test(line)) {
      flush();
      currentTitle = line.replace(/^Scenario(?: Outline)?:\s*/i, '').trim();
      continue;
    }

    if (/^Given\b/i.test(line)) {
      currentSection = 'given';
      currentGiven.push(line);
      continue;
    }

    if (/^When\b/i.test(line)) {
      currentSection = 'when';
      currentWhen.push(line);
      continue;
    }

    if (/^Then\b/i.test(line)) {
      currentSection = 'then';
      currentThen.push(line);
      continue;
    }

    if (/^And\b/i.test(line)) {
      if (currentSection === 'then') currentThen.push(line);
      else if (currentSection === 'when') currentWhen.push(line);
      else currentGiven.push(line);
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      if (currentSection === 'then') currentThen.push(line);
      else if (currentSection === 'when') currentWhen.push(line);
      else currentGiven.push(line);
    }
  }

  flush();
  return scenarios;
}

async function fetchGeneratedScenariosFromGitHub(
  request: NextRequest,
  tenantId: string | undefined,
  scenarioBatch: ScenarioDTO[],
) {
  const config = await getN8nConfig(request, tenantId);
  const owner = String(config.githubOwner || '').trim();
  const repo = String(config.githubRepo || '').trim();
  const token = String(config.githubToken || '').trim();
  const branch = String(config.githubBranch || 'main').trim() || 'main';

  if (!owner || !repo || !token || scenarioBatch.length === 0) {
    return [];
  }

  const paths = scenarioBatch
    .map((scenario) => getGitHubFeaturePath(scenario))
    .filter((path, index, all) => all.indexOf(path) === index);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parsedCollections: ParsedGeneratedScenario[] = [];

    for (const path of paths) {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': GITHUB_USER_AGENT,
          },
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as { content?: string; encoding?: string };
      const content = String(payload.content || '').replace(/\n/g, '');
      if (!content) {
        continue;
      }

      const decoded = decodeGitHubContent(content, String(payload.encoding || ''));
      parsedCollections.push(...parseGherkinScenarios(decoded));
    }

    if (parsedCollections.length > 0) {
      return parsedCollections;
    }

    await sleep(1500);
  }

  return [];
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
  let stage = 'request:parse';

  try {
    const body = (await request.json()) as ScenarioDTO & {
      syncToGitHub?: boolean;
      syncToN8n?: boolean;
      configSnapshot?: {
        webhookUrl?: string;
      };
      scenarioBatch?: ScenarioDTO[];
      scenarioCountHint?: number;
      generationMode?: string;
      generationInstructions?: string;
      cardId?: string;
      card?: DeliveryCard;
      acceptanceCriteria?: string[];
      businessGoal?: string;
      qaNotes?: string;
    };

    stage = 'request:validate';
    const hasScenarioBatch = Array.isArray(body.scenarioBatch) && body.scenarioBatch.length > 0;
    if ((!body.id || !body.title) && !hasScenarioBatch) {
      return json({ error: 'id and title are required when scenarioBatch is absent', stage }, 400);
    }

    stage = 'scenario:normalize';
    const scenario: ScenarioDTO = {
      ...body,
      status: body.status || 'Backlog',
      priority: body.priority || 'Média',
      category: body.category || 'Funcional',
      module: body.module || 'Geral',
      tags: body.tags || [],
    };
    const scenarioBatch = hasScenarioBatch
      ? body.scenarioBatch!.map((item) => ({
          ...item,
          status: item.status || 'Backlog',
          priority: item.priority || body.priority || 'MÃ©dia',
          category: item.category || body.category || 'Funcional',
          module: item.module || body.module || 'Geral',
          tags: item.tags || [],
        }))
      : [scenario];

    stage = 'tenant:resolve';
    const tenant = await getCurrentTenant(request);

    if (body.cardId && tenant && !body.card) {
      stage = 'board:add-scenario';
      await addScenarioToBoardCard(tenant.id, body.cardId, {
        id: scenario.id,
        title: scenario.title,
        source: 'IA',
        status: 'Draft',
      });
    }

    const result: Record<string, unknown> = {
      scenario,
      scenarios: scenarioBatch,
    };

    if (body.syncToGitHub) {
      stage = 'github:save-feature';
      result.github = await saveFeatureToGitHub(scenario);
    }

    stage = 'n8n:webhook-resolve';
    const webhookUrl = body.configSnapshot?.webhookUrl?.trim() || '';

    if (body.syncToN8n) {
      stage = 'n8n:webhook-validate';
      if (!isValidUrl(webhookUrl)) {
        throw new Error('Webhook URL inválida ou ausente no payload atual.');
      }

      stage = 'n8n:config-load';
      const discordWebhook = (await getN8nConfig(request, tenant?.id)).discordWebhook || '';

      stage = 'n8n:call-webhook';
      result.n8n = await callN8n(webhookUrl, {
        type: 'task_ia',
        action: 'task_ia',
        command: 'task_ia',
        scenario,
        scenarioBatch,
        scenarioCountHint: body.scenarioCountHint || scenarioBatch.length,
        generationMode: body.generationMode || 'multi_scenario_from_acceptance_criteria',
        generationInstructions: body.generationInstructions || '',
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

      stage = 'github:read-generated-scenarios';
      result.generatedScenarios = await fetchGeneratedScenariosFromGitHub(request, tenant?.id, scenarioBatch);
    }

    return json(result, 201);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stage,
      },
      500,
    );
  }
}
