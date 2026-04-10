import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetRequest } from '@/app/lib/tenant-auth';

type ForgotPasswordBody = {
  email: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ForgotPasswordBody;
    const email = String(body.email || '').trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Informe o e-mail.' }, { status: 400 });
    }

    const result = await createPasswordResetRequest(email);

    return NextResponse.json({
      ok: true,
      message: 'Se a conta existir, um link de redefinição foi gerado.',
      resetUrl: result.resetUrl || '',
      resetToken: process.env.NODE_ENV === 'production' ? '' : (result.resetToken || ''),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível solicitar a troca de senha.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
