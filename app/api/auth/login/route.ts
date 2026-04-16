import { NextRequest, NextResponse } from 'next/server';
import { authenticateAccount, SESSION_COOKIE_NAME } from '@/app/lib/tenant-auth';

type LoginBody = {
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  let stage = 'request:parse';

  try {
    const body = (await request.json()) as LoginBody;
    stage = 'request:validate';

    const email = String(body.email || '').trim();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    stage = 'account:authenticate';
    const result = await authenticateAccount(email, password);
    if (!result) {
      return NextResponse.json({ ok: false, error: 'Credenciais inválidas.' }, { status: 401 });
    }

    stage = 'session:set-cookie';
    const response = NextResponse.json({
      ok: true,
      account: {
        id: result.account.id,
        email: result.account.email,
        companyName: result.account.companyName,
        cnpj: result.account.cnpj,
        address: result.account.address,
        tenantId: result.account.tenantId,
      },
      tenant: result.tenant,
    });

    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao autenticar.';
    console.error('Login failed at stage:', stage, error);
    return NextResponse.json({ ok: false, error: message, stage }, { status: 500 });
  }
}
