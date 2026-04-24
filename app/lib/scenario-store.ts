import { dbQuery, dbTransaction } from '@/app/lib/postgres';
import { getTenantByIdPublic } from '@/app/lib/tenant-auth';
import type { Scenario, ScenarioExecution } from '@/components/dashboard/types';
import type { Client } from 'pg';

const GITHUB_USER_AGENT = 'orionsystem-cloudflare-worker';

function defaultExecution(estimatedMinutes = 10): ScenarioExecution {
  return {
    estimatedMinutes,
    actualMinutes: 0,
    status: 'Not Run',
    notes: '',
    executedBy: '',
    evidences: [],
    bugSource: 'None',
    bugTitle: '',
    bugDescription: '',
  };
}

function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    execution: scenario.execution
      ? {
          ...defaultExecution(scenario.execution.estimatedMinutes || 10),
          ...scenario.execution,
          evidences: [...(scenario.execution.evidences || [])],
        }
      : defaultExecution(10),
  };
}

type ScenarioRow = {
  card_id: string;
  scenario_id: string;
  scenario: Scenario;
  updated_at: string;
};

type ScenarioExecutionRow = {
  card_id: string;
  scenario_id: string;
  execution: ScenarioExecution;
};

type ScenarioBugRow = {
  scenario_id: string;
  bug_source: ScenarioExecution['bugSource'];
  bug_title: string;
  bug_description: string;
};

type ScenarioEvidenceRow = {
  scenario_id: string;
  evidence_index: number;
  evidence_value: string;
};

function isMissingScenarioArtifactsRelation(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  const message = String(candidate?.message || '');
  const referencesScenarioArtifactsRelation =
    /relation\s+"?scenario_records"?\s+does not exist/i.test(message) ||
    /relation\s+"?scenario_execution_records"?\s+does not exist/i.test(message) ||
    /relation\s+"?scenario_bug_records"?\s+does not exist/i.test(message) ||
    /relation\s+"?scenario_evidence_records"?\s+does not exist/i.test(message) ||
    /scenario_records/i.test(message) ||
    /scenario_execution_records/i.test(message) ||
    /scenario_bug_records/i.test(message) ||
    /scenario_evidence_records/i.test(message);

  return (
    candidate?.code === '42P01' ||
    referencesScenarioArtifactsRelation
  );
}

function logScenarioArtifactsFallback(action: string, error: unknown, details: Record<string, string>) {
  const message = error instanceof Error ? error.message : String(error || 'unknown error');
  console.warn(`Scenario artifacts unavailable during ${action}; falling back to legacy card JSON mode.`, {
    ...details,
    error: message,
  });
}

export function getScenarioFeaturePath(scenario: Scenario) {
  const category = String(scenario.category || '').toLowerCase();
  const dir = category === 'performance' ? 'features/performance' : 'features/funcionais';
  return `${dir}/${scenario.id.toLowerCase()}.feature`;
}

async function deleteGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  path: string,
) {
  const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': GITHUB_USER_AGENT,
    },
  });

  if (getResponse.status === 404) {
    return;
  }

  const getPayload = await getResponse.json().catch(() => ({}));
  if (!getResponse.ok) {
    throw new Error(`GitHub lookup error ${getResponse.status}: ${JSON.stringify(getPayload)}`);
  }

  const sha = String((getPayload as { sha?: string }).sha || '');
  if (!sha) {
    return;
  }

  const deleteResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': GITHUB_USER_AGENT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `test(bdd): remove ${path}`,
      sha,
      branch,
    }),
  });

  const deletePayload = await deleteResponse.json().catch(() => ({}));
  if (!deleteResponse.ok && deleteResponse.status !== 404) {
    throw new Error(`GitHub delete error ${deleteResponse.status}: ${JSON.stringify(deletePayload)}`);
  }
}

async function deleteScenarioFromGitHub(tenantId: string, scenario: Scenario) {
  const tenant = await getTenantByIdPublic(tenantId);
  if (!tenant?.githubOwner || !tenant.githubRepo || !tenant.githubToken) {
    return;
  }

  const branch = tenant.githubBranch || 'main';
  const primaryPath = getScenarioFeaturePath(scenario);
  const fallbackPaths = scenario.category
    ? []
    : ['features/funcionais', 'features/performance'].map((dir) => `${dir}/${scenario.id.toLowerCase()}.feature`);

  const uniquePaths = [primaryPath, ...fallbackPaths].filter((path, index, all) => all.indexOf(path) === index);
  for (const path of uniquePaths) {
    await deleteGitHubFile(tenant.githubOwner, tenant.githubRepo, branch, tenant.githubToken, path);
  }
}

async function upsertScenarioRecordsForCardClient(client: Client, tenantId: string, cardId: string, scenarios: Scenario[]) {
  const normalized = scenarios.map(normalizeScenario);
  const nextIds = normalized.map((scenario) => scenario.id);

  if (nextIds.length > 0) {
    await client.query(
      `DELETE FROM scenario_records
       WHERE tenant_id = $1
         AND card_id = $2
         AND NOT (scenario_id = ANY($3::text[]))`,
      [tenantId, cardId, nextIds],
    );
  } else {
    await client.query('DELETE FROM scenario_records WHERE tenant_id = $1 AND card_id = $2', [tenantId, cardId]);
  }

  for (const scenario of normalized) {
    const execution = scenario.execution || defaultExecution(10);

    await client.query(
      `INSERT INTO scenario_records (tenant_id, card_id, scenario_id, scenario, source_type, updated_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6)
       ON CONFLICT (tenant_id, scenario_id)
       DO UPDATE SET
         card_id = EXCLUDED.card_id,
         scenario = EXCLUDED.scenario,
         source_type = EXCLUDED.source_type,
         updated_at = EXCLUDED.updated_at`,
      [
        tenantId,
        cardId,
        scenario.id,
        JSON.stringify(scenario),
        scenario.source || 'Manual',
        new Date().toISOString(),
      ],
    );

    await client.query(
      `INSERT INTO scenario_execution_records (tenant_id, card_id, scenario_id, execution, status, executed_by, updated_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)
       ON CONFLICT (tenant_id, scenario_id)
       DO UPDATE SET
         card_id = EXCLUDED.card_id,
         execution = EXCLUDED.execution,
         status = EXCLUDED.status,
         executed_by = EXCLUDED.executed_by,
         updated_at = EXCLUDED.updated_at`,
      [
        tenantId,
        cardId,
        scenario.id,
        JSON.stringify(execution),
        execution.status,
        execution.executedBy || '',
        new Date().toISOString(),
      ],
    );

    await client.query(
      `INSERT INTO scenario_bug_records (tenant_id, scenario_id, bug_source, bug_title, bug_description, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, scenario_id)
       DO UPDATE SET
         bug_source = EXCLUDED.bug_source,
         bug_title = EXCLUDED.bug_title,
         bug_description = EXCLUDED.bug_description,
         updated_at = EXCLUDED.updated_at`,
      [
        tenantId,
        scenario.id,
        execution.bugSource,
        execution.bugTitle,
        execution.bugDescription,
        new Date().toISOString(),
      ],
    );

    await client.query(
      'DELETE FROM scenario_evidence_records WHERE tenant_id = $1 AND scenario_id = $2',
      [tenantId, scenario.id],
    );

    for (const [index, evidence] of (execution.evidences || []).entries()) {
      await client.query(
        `INSERT INTO scenario_evidence_records (tenant_id, scenario_id, evidence_index, evidence_value, updated_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenantId, scenario.id, index, evidence, new Date().toISOString()],
      );
    }
  }

  if (nextIds.length > 0) {
    await client.query(
      `DELETE FROM scenario_execution_records
       WHERE tenant_id = $1
         AND card_id = $2
         AND NOT (scenario_id = ANY($3::text[]))`,
      [tenantId, cardId, nextIds],
    );
  } else {
    await client.query('DELETE FROM scenario_execution_records WHERE tenant_id = $1 AND card_id = $2', [tenantId, cardId]);
  }

  await client.query(
    `DELETE FROM scenario_bug_records
     WHERE tenant_id = $1
       AND scenario_id NOT IN (
         SELECT scenario_id FROM scenario_records WHERE tenant_id = $1
       )`,
    [tenantId],
  );

  await client.query(
    `DELETE FROM scenario_evidence_records
     WHERE tenant_id = $1
       AND scenario_id NOT IN (
         SELECT scenario_id FROM scenario_records WHERE tenant_id = $1
       )`,
    [tenantId],
  );
}

export async function loadScenarioRecordsByTenant(tenantId: string) {
  let result;
  let executionResult;
  let bugResult;
  let evidenceResult;

  try {
    [result, executionResult, bugResult, evidenceResult] = await Promise.all([
      dbQuery<ScenarioRow>(
        `SELECT card_id, scenario_id, scenario, updated_at
         FROM scenario_records
         WHERE tenant_id = $1
         ORDER BY updated_at DESC, scenario_id DESC`,
        [tenantId],
      ),
      dbQuery<ScenarioExecutionRow>(
        `SELECT card_id, scenario_id, execution
         FROM scenario_execution_records
         WHERE tenant_id = $1`,
        [tenantId],
      ),
      dbQuery<ScenarioBugRow>(
        `SELECT scenario_id, bug_source, bug_title, bug_description
         FROM scenario_bug_records
         WHERE tenant_id = $1`,
        [tenantId],
      ),
      dbQuery<ScenarioEvidenceRow>(
        `SELECT scenario_id, evidence_index, evidence_value
         FROM scenario_evidence_records
         WHERE tenant_id = $1
         ORDER BY scenario_id, evidence_index`,
        [tenantId],
      ),
    ]);
  } catch (error) {
    if (isMissingScenarioArtifactsRelation(error)) {
      logScenarioArtifactsFallback('load', error, { tenantId });
      return new Map<string, Scenario[]>();
    }
    throw error;
  }

  const executionByScenario = new Map(
    executionResult.rows.map((row) => [row.scenario_id, { ...defaultExecution(row.execution?.estimatedMinutes || 10), ...row.execution }]),
  );
  const bugByScenario = new Map(
    bugResult.rows.map((row) => [
      row.scenario_id,
      {
        bugSource: row.bug_source || 'None',
        bugTitle: row.bug_title || '',
        bugDescription: row.bug_description || '',
      },
    ]),
  );
  const evidenceByScenario = new Map<string, string[]>();
  for (const row of evidenceResult.rows) {
    const evidences = evidenceByScenario.get(row.scenario_id) || [];
    evidences.push(row.evidence_value);
    evidenceByScenario.set(row.scenario_id, evidences);
  }

  const byCard = new Map<string, Scenario[]>();
  for (const row of result.rows) {
    const list = byCard.get(row.card_id) || [];
    const scenario = normalizeScenario(row.scenario);
    const execution = executionByScenario.get(row.scenario_id) || scenario.execution || defaultExecution(10);
    const bug = bugByScenario.get(row.scenario_id);
    const evidences = evidenceByScenario.get(row.scenario_id);

    scenario.execution = {
      ...execution,
      bugSource: bug?.bugSource || execution.bugSource || 'None',
      bugTitle: bug?.bugTitle || execution.bugTitle || '',
      bugDescription: bug?.bugDescription || execution.bugDescription || '',
      evidences: evidences || execution.evidences || [],
    };

    list.push(scenario);
    byCard.set(row.card_id, list);
  }

  return byCard;
}

export async function syncScenarioRecordsForCard(tenantId: string, cardId: string, scenarios: Scenario[]) {
  try {
    await dbTransaction(async (client) => {
      await upsertScenarioRecordsForCardClient(client, tenantId, cardId, scenarios);
    });
  } catch (error) {
    if (isMissingScenarioArtifactsRelation(error)) {
      logScenarioArtifactsFallback('sync', error, { tenantId, cardId });
      return;
    }
    throw error;
  }
}

export async function deleteRemovedScenarios(tenantId: string, beforeScenarios: Scenario[], afterScenarios: Scenario[]) {
  const nextIds = new Set(afterScenarios.map((scenario) => scenario.id));
  const removed = beforeScenarios.filter((scenario) => !nextIds.has(scenario.id));

  for (const scenario of removed) {
    await deleteScenarioFromGitHub(tenantId, scenario);
  }
}

export async function deleteAllScenarioRecordsForCard(tenantId: string, cardId: string) {
  try {
    const existing = await dbQuery<{ scenario: Scenario }>(
      'SELECT scenario FROM scenario_records WHERE tenant_id = $1 AND card_id = $2',
      [tenantId, cardId],
    );

    await dbQuery('DELETE FROM scenario_execution_records WHERE tenant_id = $1 AND card_id = $2', [tenantId, cardId]);
    await dbQuery(
      `DELETE FROM scenario_bug_records
       WHERE tenant_id = $1
         AND scenario_id IN (
           SELECT scenario_id FROM scenario_records WHERE tenant_id = $1 AND card_id = $2
         )`,
      [tenantId, cardId],
    );
    await dbQuery(
      `DELETE FROM scenario_evidence_records
       WHERE tenant_id = $1
         AND scenario_id IN (
           SELECT scenario_id FROM scenario_records WHERE tenant_id = $1 AND card_id = $2
         )`,
      [tenantId, cardId],
    );
    await dbQuery('DELETE FROM scenario_records WHERE tenant_id = $1 AND card_id = $2', [tenantId, cardId]);

    for (const row of existing.rows) {
      await deleteScenarioFromGitHub(tenantId, normalizeScenario(row.scenario));
    }
  } catch (error) {
    if (isMissingScenarioArtifactsRelation(error)) {
      logScenarioArtifactsFallback('delete_all', error, { tenantId, cardId });
      return;
    }
    throw error;
  }
}

export async function backfillScenarioRecordsForCard(tenantId: string, cardId: string, scenarios: Scenario[]) {
  let countResult;
  try {
    countResult = await dbQuery<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM scenario_records WHERE tenant_id = $1 AND card_id = $2',
      [tenantId, cardId],
    );
  } catch (error) {
    if (isMissingScenarioArtifactsRelation(error)) {
      logScenarioArtifactsFallback('backfill', error, { tenantId, cardId });
      return;
    }
    throw error;
  }

  if (Number(countResult.rows[0]?.count || 0) > 0) {
    return;
  }

  if (scenarios.length === 0) {
    return;
  }

  await syncScenarioRecordsForCard(tenantId, cardId, scenarios);
}
