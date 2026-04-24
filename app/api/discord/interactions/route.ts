import { after, NextRequest, NextResponse } from 'next/server';
import { getN8nConfig } from '@/app/lib/n8n-config';
import { buildDiscordWebhookUrl, getTenantByDiscordApplicationIdPublic } from '@/app/lib/tenant-auth';
import {
  normalizeDiscordInteractionPayload,
  resolveDiscordApplicationFromBotToken,
  verifyDiscordInteractionSignature,
} from '@/app/lib/discord-bot';

export const dynamic = 'force-dynamic';

type NextRequestContextValue = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

type NextRequestContext = {
  get?: () => NextRequestContextValue | undefined;
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isDiscordPlatformWebhook(value: string) {
  try {
    const url = new URL(value);
    return /(^|\.)discord\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function safeParseJson(rawBody: string) {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickDiscordContent(payload: Record<string, unknown> | null, status: number) {
  if (!payload) {
    return status >= 400 ? `Falha ao processar a interacao (${status}).` : 'Processado com sucesso.';
  }

  const contentFromContent = typeof payload.content === 'string' ? payload.content.trim() : '';
  const contentFromMessage = typeof payload.message === 'string' ? payload.message.trim() : '';
  const contentFromError = typeof payload.error === 'string' ? payload.error.trim() : '';
  const content = contentFromContent || contentFromMessage || contentFromError;

  if (content) {
    return content;
  }

  if (payload.ok === false) {
    return `Falha ao processar a interacao (${status}).`;
  }

  return 'Processado com sucesso.';
}

function resolveDiscordWebhookCandidates(config: Awaited<ReturnType<typeof getN8nConfig>>) {
  const explicitDiscordWebhook = String(config.discordWebhook || '').trim();
  const candidates = [
    explicitDiscordWebhook && !isDiscordPlatformWebhook(explicitDiscordWebhook) ? explicitDiscordWebhook : '',
    buildDiscordWebhookUrl(config.webhookBaseUrl || config.webhookUrl),
  ];

  return candidates.filter((candidate, index, all) => {
    if (!candidate || !isValidUrl(candidate)) {
      return false;
    }

    return all.indexOf(candidate) === index;
  });
}

async function callDiscordWebhook(candidates: string[], payload: Record<string, unknown>) {
  let lastError = 'Nenhum webhook configurado.';

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const responsePayload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (response.ok) {
        return { response, responsePayload };
      }

      lastError = `Webhook ${candidate} respondeu com ${response.status}.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Erro desconhecido ao chamar o n8n.';
    }
  }

  throw new Error(lastError);
}

async function sendDiscordFollowup(applicationId: string, interactionToken: string, content: string) {
  if (!applicationId || !interactionToken || !content) {
    return;
  }

  await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
    cache: 'no-store',
  });
}

function scheduleBackgroundTask(task: Promise<unknown>) {
  const requestContext = (globalThis as typeof globalThis & {
    [key: symbol]: NextRequestContext | undefined;
  })[Symbol.for('@next/request-context')];
  const waitUntil = requestContext?.get?.()?.waitUntil;

  if (typeof waitUntil === 'function') {
    waitUntil(task);
    return 'waitUntil';
  }

  after(() => task);
  return 'after';
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature-ed25519') || '';
  const timestamp = request.headers.get('x-signature-timestamp') || '';
  const rawBody = await request.text();
  const body = safeParseJson(rawBody);

  if (!body) {
    console.error('Discord interaction rejected: invalid JSON payload');
    return NextResponse.json({ error: 'Payload invalido.' }, { status: 400 });
  }

  const application = body.application as Record<string, unknown> | undefined;
  const member = body.member as Record<string, unknown> | undefined;
  const user = body.user as Record<string, unknown> | undefined;

  const applicationId = String(body.application_id || application?.id || application?.application_id || '').trim();
  if (!applicationId) {
    console.error('Discord interaction rejected: missing application id');
    return NextResponse.json({ error: 'Discord application id ausente.' }, { status: 400 });
  }

  console.info('Discord interaction received', {
    applicationId,
    interactionType: Number(body.type || 0),
    hasSignature: Boolean(signature),
    hasTimestamp: Boolean(timestamp),
  });

  const tenant = await getTenantByDiscordApplicationIdPublic(applicationId);
  if (!tenant) {
    console.error('Discord interaction rejected: tenant not found for application id', {
      applicationId,
    });
    return NextResponse.json({ error: 'Tenant do Discord nao encontrado.' }, { status: 404 });
  }

  console.info('Discord tenant resolved', {
    applicationId,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    hasDiscordPublicKey: Boolean(String(tenant.discordPublicKey || '').trim()),
    hasDiscordBotToken: Boolean(String(tenant.discordBotToken || '').trim()),
    hasWebhookBaseUrl: Boolean(String(tenant.webhookBaseUrl || '').trim()),
    hasDiscordWebhook: Boolean(String(tenant.discordWebhook || '').trim()),
  });

  let publicKey = String(tenant.discordPublicKey || '').trim();
  if (!publicKey && tenant.discordBotToken) {
    try {
      const resolvedDiscord = await resolveDiscordApplicationFromBotToken(tenant.discordBotToken);
      publicKey = resolvedDiscord.publicKey || publicKey;
      console.info('Discord public key resolved from bot token', {
        applicationId,
        tenantId: tenant.id,
        resolved: Boolean(publicKey),
      });
    } catch (error) {
      console.warn('Unable to resolve Discord public key for interaction verification:', error);
    }
  }

  const verified = await verifyDiscordInteractionSignature({
    signature,
    timestamp,
    rawBody,
    publicKeyHex: publicKey,
  });

  if (!verified) {
    console.error('Discord interaction rejected: invalid signature', {
      applicationId,
      tenantId: tenant.id,
      hasPublicKey: Boolean(publicKey),
      signatureLength: signature.length,
      timestampLength: timestamp.length,
    });
    return NextResponse.json({ error: 'Assinatura do Discord invalida.' }, { status: 401 });
  }

  console.info('Discord signature verified', {
    applicationId,
    tenantId: tenant.id,
  });

  const interactionType = Number(body.type || 0);
  if (interactionType === 1) {
    return NextResponse.json({ type: 1 });
  }

  const interactionToken = String(body.token || '').trim();
  const interactionId = String(body.id || '').trim();
  const normalized = normalizeDiscordInteractionPayload(body);
  const normalizedUser = String((normalized as Record<string, unknown>).user || '').trim();
  const config = await getN8nConfig(request, tenant.id);
  const discordWebhookCandidates = resolveDiscordWebhookCandidates(config);

  console.info('Discord webhook candidates resolved', {
    applicationId,
    tenantId: tenant.id,
    webhookBaseUrl: config.webhookBaseUrl || '',
    webhookUrl: config.webhookUrl || '',
    discordWebhook: config.discordWebhook || '',
    candidates: discordWebhookCandidates,
  });

  if (discordWebhookCandidates.length === 0) {
    console.error('Discord interaction rejected: no webhook candidates', {
      applicationId,
      tenantId: tenant.id,
      webhookBaseUrl: config.webhookBaseUrl || '',
      webhookUrl: config.webhookUrl || '',
      discordWebhook: config.discordWebhook || '',
    });
    return NextResponse.json(
      { error: 'Webhook do Discord nao configurado para o tenant.' },
      { status: 400 },
    );
  }

  const payloadToN8n = {
    ...normalized,
    source: 'discord',
    origin: 'discord',
    responseTarget: 'discord',
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    application_id: applicationId,
    interaction_id: interactionId,
    user:
      ((member?.user as Record<string, unknown> | undefined)?.username as string | undefined) ||
      String(user?.global_name || '') ||
      String(user?.username || '') ||
      normalizedUser ||
      'discord',
  };

  console.info('Discord interaction acknowledged and scheduled for n8n', {
    tenantId: tenant.id,
    applicationId,
    candidates: discordWebhookCandidates,
    interactionType,
  });

  const deliveryMode = scheduleBackgroundTask((async () => {
    try {
      console.info('Discord interaction forwarding to n8n', {
        tenantId: tenant.id,
        applicationId,
        candidates: discordWebhookCandidates,
        interactionType,
      });

      const { response, responsePayload } = await callDiscordWebhook(discordWebhookCandidates, payloadToN8n);
      const content = pickDiscordContent(responsePayload, response.status);
      await sendDiscordFollowup(applicationId, interactionToken, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao chamar o n8n.';
      console.error('Discord interaction failed during background forwarding', {
        tenantId: tenant.id,
        applicationId,
        candidates: discordWebhookCandidates,
        error: message,
      });
      await sendDiscordFollowup(applicationId, interactionToken, `Erro ao processar interacao: ${message}`);
    }
  })());

  console.info('Discord background delivery mode selected', {
    tenantId: tenant.id,
    applicationId,
    deliveryMode,
  });

  return NextResponse.json({ type: 5 });
}
