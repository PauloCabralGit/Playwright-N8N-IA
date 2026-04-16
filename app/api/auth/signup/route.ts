import { NextRequest, NextResponse } from 'next/server';
import {
  buildTenantWebhookUrl,
  createAccountAndTenant,
  publishTenantWorkflow,
  SESSION_COOKIE_NAME,
  upsertTenantProfile,
} from '@/app/lib/tenant-auth';
import { registerDiscordSlashCommands, resolveDiscordApplicationFromBotToken } from '@/app/lib/discord-bot';
import type { N8nSettings } from '@/components/dashboard/types';

type SignupBody = {
  email: string;
  password: string;
  companyName: string;
  cnpj: string;
  address: string;
  appPublicUrl: string;
  webhookBaseUrl: string;
  webhookPath: string;
  apiKey: string;
  discordWebhook?: string;
  discordApplicationId?: string;
  discordPublicKey?: string;
  discordBotToken: string;
  discordGuildId?: string;
  discordCommandName?: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken: string;
};

function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

async function testWebhook(settings: Partial<N8nSettings>) {
  const webhookUrl = String(settings.webhookUrl || '').trim();

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'n8n_connection_test',
      settings,
      source: 'site',
      timestamp: new Date().toISOString(),
    }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && Boolean(data?.ok), status: response.status, data };
}

export async function POST(request: NextRequest) {
  let stage = 'request:parse';

  try {
    const body = (await request.json()) as SignupBody;
    stage = 'request:validate';

    const required: Array<keyof SignupBody> = [
      'email',
      'password',
      'companyName',
      'cnpj',
      'address',
      'appPublicUrl',
      'webhookBaseUrl',
      'apiKey',
      'githubOwner',
      'githubRepo',
      'githubBranch',
      'githubToken',
    ];

    const missing = required.filter((field) => !String(body[field] || '').trim());
    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'Campos obrigatorios ausentes.', issues: missing },
        { status: 400 },
      );
    }

    if (!isValidUrl(body.appPublicUrl)) {
      return NextResponse.json({ ok: false, error: 'URL publica invalida.' }, { status: 400 });
    }

    if (!isValidUrl(body.webhookBaseUrl)) {
      return NextResponse.json({ ok: false, error: 'Webhook base URL invalida.' }, { status: 400 });
    }

    stage = 'account:create';
    const signupResult = await createAccountAndTenant({
      email: body.email,
      password: body.password,
      companyName: body.companyName,
      cnpj: body.cnpj,
      address: body.address,
      appPublicUrl: body.appPublicUrl,
      webhookBaseUrl: body.webhookBaseUrl,
      webhookPath: body.webhookPath || '',
      apiKey: body.apiKey,
      discordWebhook: body.discordWebhook || '',
      discordApplicationId: body.discordApplicationId || '',
      discordPublicKey: body.discordPublicKey || '',
      discordBotToken: body.discordBotToken,
      discordGuildId: body.discordGuildId || '',
      discordCommandName: body.discordCommandName || 'qa',
      githubOwner: body.githubOwner,
      githubRepo: body.githubRepo,
      githubBranch: body.githubBranch,
      githubToken: body.githubToken,
    });

    try {
      stage = 'discord:resolve-app';
      if (signupResult.tenant.discordBotToken) {
        const resolvedDiscord = await resolveDiscordApplicationFromBotToken(signupResult.tenant.discordBotToken);
        if (resolvedDiscord.applicationId || resolvedDiscord.publicKey) {
          signupResult.tenant.discordApplicationId =
            resolvedDiscord.applicationId || signupResult.tenant.discordApplicationId;
          signupResult.tenant.discordPublicKey = resolvedDiscord.publicKey || signupResult.tenant.discordPublicKey;
          stage = 'tenant:update-discord';
          await upsertTenantProfile(signupResult.tenant);
        }
      }
    } catch (error) {
      console.warn('Unable to resolve Discord application during signup:', error);
    }

    const webhookUrl = buildTenantWebhookUrl(body.webhookBaseUrl);

    let publishedWorkflow: Awaited<ReturnType<typeof publishTenantWorkflow>> | null = null;
    let testResult: Awaited<ReturnType<typeof testWebhook>> | null = null;

    try {
      stage = 'workflow:publish';
      publishedWorkflow = await publishTenantWorkflow(signupResult.account.tenantId);
      stage = 'discord:register-commands';
      await registerDiscordSlashCommands(signupResult.tenant);
      stage = 'webhook:test';
      testResult = await testWebhook({
        ...signupResult.tenant,
        webhookUrl,
        tenantId: signupResult.account.tenantId,
        tenantSlug: signupResult.tenant.slug,
      });
    } catch (error) {
      console.error('Signup post-processing failed:', error);
    }

    const response = NextResponse.json(
      {
        ok: true,
        account: {
          id: signupResult.account.id,
          email: signupResult.account.email,
          companyName: signupResult.account.companyName,
          cnpj: signupResult.account.cnpj,
          address: signupResult.account.address,
          tenantId: signupResult.account.tenantId,
        },
        tenant: {
          ...signupResult.tenant,
          webhookUrl,
          workflowPublishedAt: publishedWorkflow?.tenant.workflowPublishedAt || signupResult.tenant.workflowPublishedAt || '',
          workflowDownloadUrl: publishedWorkflow?.workflowDownloadUrl || signupResult.tenant.workflowDownloadUrl || '',
        },
        workflowDownloadUrl: publishedWorkflow?.workflowDownloadUrl || signupResult.tenant.workflowDownloadUrl || '',
        test: testResult?.data || null,
        warnings:
          testResult && !testResult.ok
            ? ['Conta criada, mas o teste do webhook falhou. Voce ainda pode fazer login e revisar as integracoes.']
            : [],
      },
      { status: 201 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, signupResult.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Ja existe uma conta com esse e-mail.')) {
      return NextResponse.json(
        {
          ok: false,
          code: 'EMAIL_EXISTS',
          error: 'Esse e-mail ja esta cadastrado. Faca login para continuar.',
        },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido ao criar conta.';
    console.error('Signup failed at stage:', stage, error);
    return NextResponse.json({ ok: false, error: message, stage }, { status: 500 });
  }
}
