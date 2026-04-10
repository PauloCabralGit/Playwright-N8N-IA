import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getCurrentSessionToken, SESSION_COOKIE_NAME } from '@/app/lib/tenant-auth';

export async function POST(request: NextRequest) {
  const token = getCurrentSessionToken(request);
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true, authenticated: false });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
