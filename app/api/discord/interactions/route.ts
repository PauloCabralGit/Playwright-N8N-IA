import { after, NextRequest, NextResponse } from 'next/server';
import { getN8nConfig } from '@/app/lib/n8n-config';
import { buildDiscordWebhookUrl, getTenantByDiscordApplicationIdPublic } from '@/app/lib/tenant-auth';
import {
  buildDiscordInteractionFollowupUrl,
  normalizeDiscordInteractionPayload,
  resolveDiscordApplicationFromBotToken,
  verifyDiscordInteractionSignature,
} from '@/app/lib/discord-bot';

export const dynamic = 'force-dynamic';

function safeParseJson(rawBody: string) {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickDiscordContent(payload: Record<string, unknown> | null, status: number) {
  if (!payload) {
    return status >= 400 ? `Falha ao processar a interação (${status}).` : 'Processado com sucesso.';
  }

  const content =
    typeof payload.content === 'string' ? payload.content.trim() : '' ||
    typeof payload.message === 'string' ? payload.message.trim() : '' ||
    typeof payload.error === 'string' ? payload.error.trim() : '';

  if (content) {
    return content;
  }

  if (payload.ok === false) {
    return `Falha ao processar a interação (${status}).`;
  }

  return 'Processado com sucesso.';
}

async function sendDiscordFollowup(applicationId: string, interactionToken: string, content: string) {
  if (!applicationId || !interactionToken || !content) {
    return;
  }

  await fetch(buildDiscordInteractionFollowupUrl(applicationId, interactionToken), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
    cache: 'no-store',
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature-ed25519') || '';
  const timestamp = request.headers.get('x-signature-timestamp') || '';
  const rawBody = await request.text();
  const body = safeParseJson(rawBody);

  if (!body) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const application = body.application as Record<string, unknown> | undefined;
  const member = body.member as Record<string, unknown> | undefined;
  const user = body.user as Record<string, unknown> | undefined;

  const applicationId = String(
    body.application_id ||
      application?.id ||
      application?.application_id ||
      ''
  ).trim();

  if (!applicationId) {
    return NextResponse.json({ error: 'Discord application id ausente.' }, { status: 400 });
  }

  const tenant = await getTenantByDiscordApplicationIdPublic(applicationId);
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant do Discord não encontrado.' }, { status: 404 });
  }

  let publicKey = String(tenant.discordPublicKey || '').trim();
  if (!publicKey && tenant.discordBotToken) {
    try {
      const resolvedDiscord = await resolveDiscordApplicationFromBotToken(tenant.discordBotToken);
      publicKey = resolvedDiscord.publicKey || publicKey;
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
    return NextResponse.json({ error: 'Assinatura do Discord inválida.' }, { status: 401 });
  }

  const interactionType = Number(body.type || 0);
  if (interactionType === 1) {
    return NextResponse.json({ type: 1 });
  }

  const interactionToken = String(body.token || '').trim();
  const interactionId = String(body.id || '').trim();
  const normalized = normalizeDiscordInteractionPayload(body);
  const config = await getN8nConfig(request, tenant.id);
  const discordWebhookUrl = buildDiscordWebhookUrl(config.webhookBaseUrl || config.webhookUrl);

  if (!discordWebhookUrl) {
    return NextResponse.json(
      { error: 'Webhook do Discord não configurado para o tenant.' },
      { status: 400 }
    );
  }

  const initialResponse = NextResponse.json({ type: 5 });

  after(async () => {
    const payloadToN8n = {
      ...normalized,
      source: 'discord',
      origin: 'discord',
      responseTarget: 'api',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      application_id: applicationId,
      interaction_token: interactionToken,
      interaction_id: interactionId,
      user:
        ((member?.user as Record<string, unknown> | undefined)?.username as string | undefined) ||
        String(user?.global_name || '') ||
        String(user?.username || '') ||
        normalized.user ||
        'discord',
    };

    try {
      const response = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadToN8n),
        cache: 'no-store',
      });

      const responsePayload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const content = pickDiscordContent(responsePayload, response.status);

      await sendDiscordFollowup(applicationId, interactionToken, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao chamar o n8n.';
      await sendDiscordFollowup(applicationId, interactionToken, `Erro ao processar interação: ${message}`);
    }
  });

  return initialResponse;
}
