'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setStatus('error');
      setMessage('Informe o e-mail da conta.');
      return;
    }

    setStatus('loading');
    setMessage('Gerando solicitação...');
    setResetUrl('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        setStatus('error');
        setMessage(payload?.error || 'Não foi possível solicitar a redefinição.');
        return;
      }

      setStatus('success');
      setMessage(payload?.message || 'Solicitação gerada.');
      if (payload?.resetUrl) {
        setResetUrl(payload.resetUrl);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível solicitar a redefinição.');
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
        <Card className="w-full rounded-[32px] border-white/10 bg-white/10 backdrop-blur-2xl">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-200">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black">Esqueci minha senha</div>
                <div className="text-sm text-slate-400">Solicite um link para redefinir sua senha.</div>
              </div>
            </div>

            {message && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : status === 'error' ? 'border-red-400 bg-red-500/10 text-red-200' : 'border-cyan-400 bg-cyan-500/10 text-cyan-200'}`}>
                {message}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">E-mail da conta</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  placeholder="voce@empresa.com"
                />
              </div>

              <Button
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500"
                onClick={handleSubmit}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Processando...' : 'Gerar link de redefinição'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {resetUrl && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Link de redefinição</div>
                <Link href={resetUrl} className="mt-2 block break-all text-sm text-fuchsia-200 hover:text-fuchsia-100">
                  {resetUrl}
                </Link>
              </div>
            )}

            <div className="mt-6 text-sm text-slate-400">
              <Link href="/login" className="text-fuchsia-300 hover:text-fuchsia-200">
                Voltar para o login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
