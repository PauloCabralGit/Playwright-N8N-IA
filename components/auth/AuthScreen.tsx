'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Bot, CheckCircle2, Lock, Sparkles, UserPlus } from 'lucide-react';

import { OrionLogo } from '@/components/dashboard/OrionLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';

type AuthPayload = {
  account: {
    id: string;
    email: string;
    companyName: string;
    cnpj: string;
    address: string;
    tenantId: string;
  };
  tenant?: {
    id: string;
    slug: string;
    companyName: string;
    webhookUrl?: string;
    workflowDownloadUrl?: string;
  };
};

const AUTH_BOOTSTRAP_STORAGE_KEY = 'qa_auth_bootstrap';

type AuthScreenProps = {
  onAuthenticated: (payload: AuthPayload) => void;
  initialMode?: AuthMode;
  showModeSwitch?: boolean;
};

type FormState = {
  email: string;
  password: string;
  companyName: string;
  cnpj: string;
  address: string;
  appPublicUrl: string;
  webhookBaseUrl: string;
  webhookPath: string;
  apiKey: string;
  discordBotToken: string;
  discordGuildId: string;
  discordCommandName: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken: string;
};

const defaultSignupForm: FormState = {
  email: '',
  password: '',
  companyName: '',
  cnpj: '',
  address: '',
  appPublicUrl: '',
  webhookBaseUrl: '',
  webhookPath: '',
  apiKey: '',
  discordBotToken: '',
  discordGuildId: '',
  discordCommandName: 'qa',
  githubOwner: '',
  githubRepo: '',
  githubBranch: 'main',
  githubToken: '',
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function waitForAuthenticatedSession(attempts = 3) {
  for (let index = 0; index < attempts; index += 1) {
    const response = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'same-origin',
    }).catch(() => null);

    if (response?.ok) {
      return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250 * (index + 1)));
  }

  return false;
}

function fieldClassName() {
  return 'rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500';
}

export function AuthScreen({ onAuthenticated, initialMode = 'login', showModeSwitch = true }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupForm, setSignupForm] = useState<FormState>(defaultSignupForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [issues, setIssues] = useState<string[]>([]);

  const persistAuthBootstrap = (payload: AuthPayload) => {
    if (typeof window === 'undefined') return;

    try {
      window.sessionStorage.setItem(AUTH_BOOTSTRAP_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist auth bootstrap', error);
    }
  };

  const webhookPreview = useMemo(() => {
    const base = signupForm.webhookBaseUrl.trim().replace(/\/+$/, '');
    return base ? `${base}/webhook/qa-platform/unified-sync` : 'https://seu-n8n.com/webhook/qa-platform/unified-sync';
  }, [signupForm.webhookBaseUrl]);

  const validateSignup = () => {
    const required: Array<[keyof FormState, string]> = [
      ['email', 'E-mail'],
      ['password', 'Senha'],
      ['companyName', 'Nome da empresa'],
      ['cnpj', 'CNPJ'],
      ['address', 'Endereco'],
      ['appPublicUrl', 'URL publica do app'],
      ['webhookBaseUrl', 'Base URL do webhook'],
      ['apiKey', 'API Key do n8n'],
      ['discordBotToken', 'Discord Bot Token'],
      ['githubOwner', 'GitHub Owner'],
      ['githubRepo', 'GitHub Repo'],
      ['githubBranch', 'GitHub Branch'],
      ['githubToken', 'GitHub Token'],
    ];

    const nextIssues: string[] = [];
    for (const [field, label] of required) {
      if (!String(signupForm[field] || '').trim()) {
        nextIssues.push(`${label} esta vazio`);
      }
    }

    if (signupForm.email && !/^\S+@\S+\.\S+$/.test(signupForm.email.trim())) {
      nextIssues.push('E-mail esta invalido');
    }

    if (signupForm.password.trim().length < 8) {
      nextIssues.push('Senha deve ter ao menos 8 caracteres');
    }

    if (signupForm.appPublicUrl && !isHttpUrl(signupForm.appPublicUrl)) {
      nextIssues.push('URL publica do app esta invalida');
    }

    if (signupForm.webhookBaseUrl && !isHttpUrl(signupForm.webhookBaseUrl)) {
      nextIssues.push('Base URL do webhook esta invalida');
    }

    if (signupForm.discordBotToken.trim().length < 10) {
      nextIssues.push('Discord Bot Token esta invalido');
    }

    if (signupForm.githubToken && !/^(ghp_|github_pat_)/i.test(signupForm.githubToken.trim())) {
      nextIssues.push('GitHub Token esta invalido');
    }

    return nextIssues;
  };

  const handleSignup = async () => {
    const nextIssues = validateSignup();
    if (nextIssues.length > 0) {
      setStatus('error');
      setIssues(nextIssues);
      setMessage('Revise os dados para criar a conta.');
      return;
    }

    setStatus('loading');
    setIssues([]);
    setMessage('Criando conta...');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(signupForm),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        if (payload?.code === 'EMAIL_EXISTS') {
          setMode('login');
          setLoginEmail(signupForm.email.trim());
        }
        setStatus('error');
        setIssues(Array.isArray(payload?.issues) ? payload.issues : []);
        setMessage(payload?.error || 'Nao foi possivel criar a conta.');
        return;
      }

      setStatus('success');
      setMessage('Conta criada com sucesso. Voce pode fazer login agora.');
      onAuthenticated(payload);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel criar a conta.');
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setStatus('error');
      setMessage('Informe e-mail e senha.');
      return;
    }

    setStatus('loading');
    setIssues([]);
    setMessage('Entrando na conta...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        setStatus('error');
        setMessage(payload?.error || 'Credenciais invalidas.');
        return;
      }

      setStatus('success');
      setMessage('Login realizado com sucesso.');
      persistAuthBootstrap(payload);
      await waitForAuthenticatedSession();
      onAuthenticated(payload);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Credenciais invalidas.');
    }
  };

  const accentText = mode === 'login' ? 'Entre no seu workspace Orion' : 'Crie seu workspace Orion';
  const supportText =
    mode === 'login'
      ? 'Acesse entregas, cenarios, execucoes e integracoes em uma frente unica.'
      : 'Cadastre sua empresa, conecte integracoes e prepare o fluxo completo para operar dentro do Orion.';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.18),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.12),_transparent_20%),linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] px-4 py-4 text-white sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1480px] gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="overflow-hidden rounded-[36px] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] backdrop-blur-2xl shadow-[0_30px_90px_-35px_rgba(15,23,42,0.95)]">
          <CardContent className="flex h-full flex-col justify-between p-7 sm:p-9">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <OrionLogo />
                <Badge className="rounded-full border-0 bg-fuchsia-500/15 text-fuchsia-200">Orion Platform</Badge>
              </div>

              <h1 className="mt-8 text-4xl font-black tracking-tight text-white md:text-5xl">{accentText}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{supportText}</p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                { icon: <UserPlus className="h-4 w-4" />, title: 'Workspace por empresa', text: 'Cada cliente opera em seu proprio tenant com configuracoes isoladas.' },
                { icon: <Bot className="h-4 w-4" />, title: 'Integracoes conectadas', text: 'Discord, n8n e GitHub seguem conectados ao fluxo operacional.' },
                { icon: <CheckCircle2 className="h-4 w-4" />, title: 'Fluxo completo', text: 'Da descoberta a execucao, tudo fica organizado no mesmo produto.' },
                { icon: <Sparkles className="h-4 w-4" />, title: 'Visual Orion', text: 'Uma frente mais forte, clara e preparada para uso real do time.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[0_20px_50px_-35px_rgba(8,15,30,0.95)]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-200">
                      {item.icon}
                    </div>
                    {item.title}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[36px] border-white/10 bg-[linear-gradient(180deg,#0a0f1a_0%,#0b1220_100%)] shadow-[0_30px_90px_-35px_rgba(15,23,42,0.95)]">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black text-white">{mode === 'login' ? 'Acesso ao Orion' : 'Criar nova conta'}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {mode === 'login'
                    ? 'Entre com suas credenciais para abrir o painel principal.'
                    : 'Complete os dados da empresa para preparar a nova instancia.'}
                </div>
              </div>

              {showModeSwitch && (
                <div className="rounded-full border border-white/10 bg-white/5 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Button
                    variant={mode === 'login' ? 'default' : 'ghost'}
                    className={cn('rounded-full px-4 text-xs', mode === 'login' ? 'bg-fuchsia-600 text-white' : 'text-slate-300')}
                    onClick={() => {
                      setMode('login');
                      setStatus('idle');
                      setMessage('');
                      setIssues([]);
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant={mode === 'signup' ? 'default' : 'ghost'}
                    className={cn('rounded-full px-4 text-xs', mode === 'signup' ? 'bg-violet-600 text-white' : 'text-slate-300')}
                    onClick={() => {
                      setMode('signup');
                      setStatus('idle');
                      setMessage('');
                      setIssues([]);
                    }}
                  >
                    Nova conta
                  </Button>
                </div>
              )}
            </div>

            {message && (
              <div
                className={cn(
                  'mt-5 rounded-2xl border px-4 py-3 text-sm',
                  status === 'success'
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                    : status === 'error'
                    ? 'border-red-400 bg-red-500/10 text-red-200'
                    : 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
                )}
              >
                {message}
              </div>
            )}

            {mode === 'login' ? (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">E-mail</label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={fieldClassName()}
                    placeholder="voce@empresa.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Senha</label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={fieldClassName()}
                    placeholder="Sua senha"
                  />
                </div>

                <Button
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500"
                  onClick={handleLogin}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Entrando...' : 'Entrar no Orion'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="text-center text-xs text-slate-400">
                  <Link href="/forgot-password" className="text-fuchsia-300 hover:text-fuchsia-200">
                    Esqueci minha senha
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">E-mail</label>
                    <Input value={signupForm.email} onChange={(e) => setSignupForm((prev) => ({ ...prev, email: e.target.value }))} type="email" className={fieldClassName()} placeholder="contato@empresa.com" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Senha</label>
                    <Input value={signupForm.password} onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))} type="password" className={fieldClassName()} placeholder="Senha forte" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-300">Nome da empresa</label>
                    <Input value={signupForm.companyName} onChange={(e) => setSignupForm((prev) => ({ ...prev, companyName: e.target.value }))} className={fieldClassName()} placeholder="Empresa LTDA" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">CNPJ</label>
                    <Input value={signupForm.cnpj} onChange={(e) => setSignupForm((prev) => ({ ...prev, cnpj: e.target.value }))} className={fieldClassName()} placeholder="00.000.000/0000-00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Endereco</label>
                    <Input value={signupForm.address} onChange={(e) => setSignupForm((prev) => ({ ...prev, address: e.target.value }))} className={fieldClassName()} placeholder="Rua, numero, cidade" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-300">URL publica do app</label>
                    <Input value={signupForm.appPublicUrl} onChange={(e) => setSignupForm((prev) => ({ ...prev, appPublicUrl: e.target.value }))} type="url" className={fieldClassName()} placeholder="https://seu-app.ngrok-free.dev" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-300">Webhook base URL</label>
                    <Input value={signupForm.webhookBaseUrl} onChange={(e) => setSignupForm((prev) => ({ ...prev, webhookBaseUrl: e.target.value }))} type="url" className={fieldClassName()} placeholder="https://pauloqa.app.n8n.cloud" />
                  </div>
                  <div className="md:col-span-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
                    <div className="font-semibold">Webhook padrao do Orion</div>
                    <p className="mt-1 text-cyan-100/80">
                      O path do workflow permanece fixo. O tenant da empresa segue no payload para o n8n resolver a conta certa.
                    </p>
                    <div className="mt-2 font-mono text-[11px] text-cyan-50">{webhookPreview}</div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">API Key do n8n</label>
                    <Input value={signupForm.apiKey} onChange={(e) => setSignupForm((prev) => ({ ...prev, apiKey: e.target.value }))} type="password" className={fieldClassName()} placeholder="sk_..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Discord Bot Token</label>
                    <Input value={signupForm.discordBotToken} onChange={(e) => setSignupForm((prev) => ({ ...prev, discordBotToken: e.target.value }))} type="password" className={fieldClassName()} placeholder="Bot ..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Discord Guild ID</label>
                    <Input value={signupForm.discordGuildId} onChange={(e) => setSignupForm((prev) => ({ ...prev, discordGuildId: e.target.value }))} className={fieldClassName()} placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Comando do bot</label>
                    <Input value={signupForm.discordCommandName} onChange={(e) => setSignupForm((prev) => ({ ...prev, discordCommandName: e.target.value }))} className={fieldClassName()} placeholder="qa" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Owner</label>
                    <Input value={signupForm.githubOwner} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubOwner: e.target.value }))} className={fieldClassName()} placeholder="seu_usuario" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Repo</label>
                    <Input value={signupForm.githubRepo} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubRepo: e.target.value }))} className={fieldClassName()} placeholder="seu_repo" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Branch</label>
                    <Input value={signupForm.githubBranch} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubBranch: e.target.value }))} className={fieldClassName()} placeholder="main" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Token</label>
                    <Input value={signupForm.githubToken} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubToken: e.target.value }))} type="password" className={fieldClassName()} placeholder="ghp_..." />
                  </div>
                </div>

                {issues.length > 0 && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      Ajuste os campos abaixo
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500"
                  onClick={handleSignup}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Criando conta...' : 'Criar conta'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <Lock className="h-4 w-4 text-fuchsia-300" />
              O tenant e o workflow sao criados por empresa. O webhook e fixo e a conta certa e escolhida pelo tenant enviado no payload.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
