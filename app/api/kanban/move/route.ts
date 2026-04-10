import { NextRequest } from 'next/server';
import { getCurrentTenant } from '@/app/lib/tenant-auth';
import { moveBoardCard, upsertBoardCard } from '@/app/lib/board-store';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function resolveWebhookUrl(baseUrl: string) {
  const resolvedBaseUrl = new URL(baseUrl);
  return resolvedBaseUrl;
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
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
  const url = resolveWebhookUrl(webhookUrl);
  url.searchParams.set("responseMode", "onReceived");
  url.searchParams.set("responseCode", "200");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes("No item to return was found")) {
      return {};
    }
    throw new Error(`n8n error ${res.status}: ${text}`);
  }

  return res.json().catch(() => ({}));
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id: string;
      status: string;
      action?: string;
      card?: Record<string, unknown>;
      configSnapshot?: {
        webhookUrl?: string;
      };
    };

    if (!body.id || !body.status) {
      return json({ error: "id and status are required" }, 400);
    }

    const tenant = await getCurrentTenant(request);
    if (!tenant) {
      return json({ error: "Usuário não autenticado." }, 401);
    }

    if (body.card && typeof body.card === "object") {
      await upsertBoardCard(tenant.id, body.card as any);
    }

    if ((body.action || '').toLowerCase() === 'move') {
      await moveBoardCard(tenant.id, body.id, body.status as any);
    }

    const webhookUrl = body.configSnapshot?.webhookUrl?.trim() || "";

    if (!isValidUrl(webhookUrl)) {
      return json({ error: "Webhook URL inválida ou ausente no payload atual." }, 400);
    }

    const n8nResult = await callN8n(webhookUrl, body);

    return json({ ok: true, n8n: n8nResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 502);
  }
}
