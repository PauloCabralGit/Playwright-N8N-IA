import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordWithToken } from '@/app/lib/tenant-auth';

type ResetPasswordBody = {
  token: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResetPasswordBody;
    const token = String(body.token || '').trim();
    const password = String(body.password || '').trim();

    if (!token || !password) {
      return NextResponse.json({ ok: false, error: 'Token e nova senha são obrigatórios.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: 'A nova senha deve ter ao menos 8 caracteres.' }, { status: 400 });
    }

    const result = await resetPasswordWithToken(token, password);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Senha atualizada com sucesso. Faça login novamente.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível redefinir a senha.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
