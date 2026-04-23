import { NextRequest, NextResponse } from 'next/server';
import {
  buildTenantWebhookUrl,
  createAccountAndTenant,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SECONDS,
} from '@/app/lib/tenant-auth';

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

    const webhookUrl = buildTenantWebhookUrl(body.webhookBaseUrl);

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
          workflowPublishedAt: signupResult.tenant.workflowPublishedAt || '',
          workflowDownloadUrl: signupResult.tenant.workflowDownloadUrl || '',
        },
        workflowDownloadUrl: signupResult.tenant.workflowDownloadUrl || '',
        test: null,
        warnings: [
          'Conta criada. A publicacao do workflow e o registro de comandos do Discord podem ser feitos depois nas configuracoes.',
        ],
      },
      { status: 201 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, signupResult.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
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
