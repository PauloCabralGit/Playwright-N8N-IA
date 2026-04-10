import { NextRequest, NextResponse } from 'next/server';
import {
  buildTenantWebhookUrl,
  createAccountAndTenant,
  publishTenantWorkflow,
  SESSION_COOKIE_NAME,
} from '@/app/lib/tenant-auth';
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
      source: 'qa-platform',
      timestamp: new Date().toISOString(),
    }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && Boolean(data?.ok), status: response.status, data };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupBody;

    const required: Array<keyof SignupBody> = [
      'email',
      'password',
      'companyName',
      'cnpj',
      'address',
      'appPublicUrl',
      'webhookBaseUrl',
      'webhookPath',
      'apiKey',
      'githubOwner',
      'githubRepo',
      'githubBranch',
      'githubToken',
    ];

    const missing = required.filter((field) => !String(body[field] || '').trim());
    if (missing.length > 0) {
      return NextResponse.json({ ok: false, error: 'Campos obrigatórios ausentes.', issues: missing }, { status: 400 });
    }

    if (!isValidUrl(body.appPublicUrl)) {
      return NextResponse.json({ ok: false, error: 'URL pública inválida.' }, { status: 400 });
    }

    if (!isValidUrl(body.webhookBaseUrl)) {
      return NextResponse.json({ ok: false, error: 'Webhook base URL inválida.' }, { status: 400 });
    }

    const signupResult = await createAccountAndTenant({
      email: body.email,
      password: body.password,
      companyName: body.companyName,
      cnpj: body.cnpj,
      address: body.address,
      appPublicUrl: body.appPublicUrl,
      webhookBaseUrl: body.webhookBaseUrl,
      webhookPath: body.webhookPath,
      apiKey: body.apiKey,
      discordWebhook: body.discordWebhook || '',
      githubOwner: body.githubOwner,
      githubRepo: body.githubRepo,
      githubBranch: body.githubBranch,
      githubToken: body.githubToken,
    });

    const webhookUrl = buildTenantWebhookUrl(body.webhookBaseUrl, body.webhookPath);

    const published = await publishTenantWorkflow(signupResult.account.tenantId);
    const testResult = await testWebhook({
      ...signupResult.tenant,
      webhookUrl,
    });

    const response = NextResponse.json(
      {
        ok: testResult.ok,
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
          workflowPublishedAt: published.tenant.workflowPublishedAt,
          workflowDownloadUrl: published.workflowDownloadUrl,
        },
        workflowDownloadUrl: published.workflowDownloadUrl,
        test: testResult.data,
      },
      testResult.ok ? { status: 201 } : { status: testResult.status || 400 }
    );

    if (testResult.ok) {
      response.cookies.set(SESSION_COOKIE_NAME, signupResult.sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao criar conta.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
