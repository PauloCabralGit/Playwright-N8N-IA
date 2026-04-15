import type { N8nSettings } from '@/components/dashboard/types';
import { ed25519 } from '@noble/curves/ed25519';

type DiscordCommandOption = {
  type: 3;
  name: string;
  description: string;
  required?: boolean;
  choices?: Array<{ name: string; value: string }>;
};

type DiscordCommandPayload = {
  name: string;
  description: string;
  options: DiscordCommandOption[];
  dm_permission: boolean;
};

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_AUTH_BASE = 'https://discord.com/oauth2/authorize';
const DEFAULT_COMMAND_NAME = 'qa';

function normalizeCommandName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || DEFAULT_COMMAND_NAME;
}

function getDiscordCommandOptions(): DiscordCommandOption[] {
  return [
    {
      type: 3,
      name: 'action',
      description: 'Ação a executar',
      required: true,
      choices: [
        { name: 'buscar', value: 'buscar' },
        { name: 'ia', value: 'ia' },
        { name: 'criar', value: 'adicionar' },
        { name: 'editar', value: 'editar' },
        { name: 'status', value: 'status' },
        { name: 'deletar', value: 'deletar' },
        { name: 'ping', value: 'pingqa' },
      ],
    },
    { type: 3, name: 'texto', description: 'Texto de busca ou prompt', required: false },
    { type: 3, name: 'id', description: 'ID do cenário', required: false },
    { type: 3, name: 'field', description: 'Campo a editar', required: false },
    { type: 3, name: 'value', description: 'Novo valor', required: false },
    { type: 3, name: 'status', description: 'Novo status', required: false },
    { type: 3, name: 'group', description: 'Grupo ou aba', required: false },
  ];
}

function buildCommandPayload(name: string, description: string, options: DiscordCommandOption[]): DiscordCommandPayload {
  return {
    name: normalizeCommandName(name),
    description,
    options,
    dm_permission: false,
  };
}

async function getDiscordCurrentApplication(botToken: string) {
  const response = await fetch(`${DISCORD_API_BASE}/oauth2/applications/@me`, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Discord application lookup failed (${response.status})`);
  }

  return response.json() as Promise<{ id?: string; verify_key?: string; name?: string }>;
}

async function readDiscordError(response: Response) {
  const text = await response.text().catch(() => '');
  if (!text) {
    return { message: '', code: response.status };
  }

  try {
    const parsed = JSON.parse(text) as { message?: string; code?: number };
    return {
      message: String(parsed.message || text).slice(0, 240),
      code: typeof parsed.code === 'number' ? parsed.code : response.status,
    };
  } catch {
    return {
      message: text.slice(0, 240),
      code: response.status,
    };
  }
}

export async function resolveDiscordApplicationFromBotToken(botToken: string) {
  const appInfo = await getDiscordCurrentApplication(botToken);
  const applicationId = String(appInfo.id || '').trim();
  const publicKey = String(appInfo.verify_key || '').trim();
  return {
    applicationId,
    publicKey,
    name: String(appInfo.name || '').trim(),
  };
}

export function buildDiscordCommandPayloads(settings: Partial<N8nSettings>): DiscordCommandPayload[] {
  const rootCommand = normalizeCommandName(settings.discordCommandName || DEFAULT_COMMAND_NAME);
  return [
    buildCommandPayload(rootCommand, 'Interagir com a base de cenários e IA do QA', getDiscordCommandOptions()),
    buildCommandPayload('buscar', 'Buscar cenários', [
      { type: 3, name: 'texto', description: 'Texto de busca', required: false },
    ]),
    buildCommandPayload('ia', 'Consultar IA sobre cenários', [
      { type: 3, name: 'texto', description: 'Prompt para IA', required: false },
    ]),
    buildCommandPayload('criar', 'Criar cenário', [
      { type: 3, name: 'texto', description: 'Descrição do cenário', required: false },
    ]),
    buildCommandPayload('editar', 'Editar cenário', [
      { type: 3, name: 'id', description: 'ID do cenário', required: false },
      { type: 3, name: 'field', description: 'Campo a editar', required: false },
      { type: 3, name: 'value', description: 'Novo valor', required: false },
    ]),
    buildCommandPayload('status', 'Atualizar status do cenário', [
      { type: 3, name: 'id', description: 'ID do cenário', required: false },
      { type: 3, name: 'status', description: 'Novo status', required: false },
    ]),
    buildCommandPayload('deletar', 'Remover cenário', [
      { type: 3, name: 'id', description: 'ID do cenário', required: false },
    ]),
    buildCommandPayload('ping', 'Testar a integração', []),
  ];
}

export function normalizeDiscordInteractionPayload(raw: Record<string, unknown>) {
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : {}) as Record<string, unknown>;
  const options = Array.isArray(data.options) ? data.options as Array<Record<string, unknown>> : [];
  const optionMap = Object.fromEntries(
    options.map((option) => [String(option.name || ''), option.value])
  );

  const actionValue = String(optionMap.action || data.name || raw.command || '').trim().toLowerCase();
  const map: Record<string, string> = {
    buscar: 'buscar',
    ia: 'ia',
    criar: 'adicionar',
    adicionar: 'adicionar',
    editar: 'editar',
    status: 'status',
    deletar: 'deletar',
    ping: 'pingqa',
  };

  return {
    ...raw,
    command: String(data.name || raw.command || DEFAULT_COMMAND_NAME).trim().toLowerCase() || DEFAULT_COMMAND_NAME,
    action: map[actionValue] || 'unknown',
    text: String(optionMap.texto || optionMap.text || raw.text || ''),
    id: String(optionMap.id || raw.id || ''),
    field: String(optionMap.field || raw.field || ''),
    value: String(optionMap.value || raw.value || ''),
    status: String(optionMap.status || raw.status || ''),
    group: String(optionMap.group || raw.group || ''),
    source: 'discord',
    responseTarget: 'discord',
  };
}

export async function registerDiscordSlashCommands(settings: Partial<N8nSettings>) {
  const botToken = String(settings.discordBotToken || '').trim();
  if (!botToken) {
    return { ok: false, skipped: true, reason: 'Discord bot credentials are missing.' };
  }

  const appInfo = await resolveDiscordApplicationFromBotToken(botToken);
  const applicationId = String(appInfo.applicationId || settings.discordApplicationId || '').trim();
  if (!applicationId) {
    return { ok: false, skipped: false, error: 'Discord application id não pôde ser resolvido.' };
  }

  const guildId = String(settings.discordGuildId || '').trim();
  const guildUrl = guildId
    ? `${DISCORD_API_BASE}/applications/${applicationId}/guilds/${guildId}/commands`
    : `${DISCORD_API_BASE}/applications/${applicationId}/commands`;

  const commandBodies = buildDiscordCommandPayloads(settings);

  const publishCommands = async (url: string) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandBodies),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await readDiscordError(response);
      return {
        ok: false,
        status: response.status,
        error: error.message,
        code: error.code,
      };
    }

    return { ok: true };
  };

  const guildResult = guildId ? await publishCommands(guildUrl) : null;
  if (guildResult?.ok) {
    return { ok: true, skipped: false, resolvedApplicationId: applicationId, resolvedApplicationName: appInfo.name || '' };
  }

  const shouldFallbackToGlobal =
    !guildId ||
    guildResult?.code === 50001 ||
    guildResult?.status === 403 ||
    guildResult?.status === 50013;

  if (shouldFallbackToGlobal) {
    const globalUrl = `${DISCORD_API_BASE}/applications/${applicationId}/commands`;
    const globalResult = await publishCommands(globalUrl);
    if (globalResult.ok) {
      return {
        ok: true,
        skipped: false,
        resolvedApplicationId: applicationId,
        resolvedApplicationName: appInfo.name || '',
        fallbackUsed: guildId ? 'global' : 'global',
      };
    }

    return {
      ok: false,
      skipped: false,
      status: globalResult.status,
      error: globalResult.error,
      resolvedApplicationId: applicationId,
      resolvedApplicationName: appInfo.name || '',
      fallbackUsed: guildId ? 'global' : 'global',
    };
  }

  if (guildResult && !guildResult.ok) {
    return {
      ok: false,
      skipped: false,
      status: guildResult.status,
      error: guildResult.error,
      resolvedApplicationId: applicationId,
      resolvedApplicationName: appInfo.name || '',
    };
  }

  return { ok: true, skipped: false, resolvedApplicationId: applicationId, resolvedApplicationName: appInfo.name || '' };
}

export async function verifyDiscordInteractionSignature(params: {
  signature: string;
  timestamp: string;
  rawBody: string;
  publicKeyHex: string;
}) {
  const { signature, timestamp, rawBody, publicKeyHex } = params;
  if (!signature || !timestamp || !rawBody || !publicKeyHex) {
    return false;
  }

  try {
    const keyBytes = Buffer.from(publicKeyHex.trim(), 'hex');
    const sigBytes = Buffer.from(signature.trim(), 'hex');
    const data = Buffer.from(timestamp + rawBody);
    return ed25519.verify(sigBytes, data, keyBytes);
  } catch {
    return false;
  }
}

export function buildDiscordInteractionFollowupUrl(applicationId: string, interactionToken: string) {
  return `${DISCORD_API_BASE}/webhooks/${applicationId}/${interactionToken}`;
}

export function buildDiscordInviteUrl(applicationId: string) {
  const url = new URL(DISCORD_AUTH_BASE);
  url.searchParams.set('client_id', applicationId.trim());
  url.searchParams.set('scope', 'bot applications.commands');
  url.searchParams.set('permissions', '274877975552');
  return url.toString();
}
