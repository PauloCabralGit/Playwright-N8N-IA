'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!token.trim()) {
      setStatus('error');
      setMessage('Informe o token de redefinição.');
      return;
    }

    if (password.trim().length < 8) {
      setStatus('error');
      setMessage('A nova senha deve ter ao menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('As senhas não conferem.');
      return;
    }

    setStatus('loading');
    setMessage('Redefinindo senha...');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        setStatus('error');
        setMessage(payload?.error || 'Não foi possível redefinir a senha.');
        return;
      }

      setStatus('success');
      setMessage(payload?.message || 'Senha alterada com sucesso.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível redefinir a senha.');
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
        <Card className="w-full rounded-[32px] border-white/10 bg-white/10 backdrop-blur-2xl">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black">Redefinir senha</div>
                <div className="text-sm text-slate-400">Use o token do link de recuperação para criar uma nova senha.</div>
              </div>
            </div>

            {message && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : status === 'error' ? 'border-red-400 bg-red-500/10 text-red-200' : 'border-cyan-400 bg-cyan-500/10 text-cyan-200'}`}>
                {message}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Token</label>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  placeholder="Cole o token do link"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Nova senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  placeholder="Nova senha"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Confirmar senha</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  placeholder="Repita a nova senha"
                />
              </div>

              <Button
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500"
                onClick={handleSubmit}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Redefinindo...' : 'Salvar nova senha'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

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
