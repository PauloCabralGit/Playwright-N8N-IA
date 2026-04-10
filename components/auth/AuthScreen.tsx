'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Bot, CheckCircle2, Lock, Sparkles, UserPlus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  discordWebhook: string;
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
  discordWebhook: '',
  githubOwner: '',
  githubRepo: '',
  githubBranch: 'main',
  githubToken: '',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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

  useEffect(() => {
    if (!signupForm.webhookPath.trim() && signupForm.companyName.trim()) {
      setSignupForm((prev) => ({ ...prev, webhookPath: slugify(prev.companyName) || 'cliente' }));
    }
  }, [signupForm.companyName, signupForm.webhookPath]);

  const webhookPreview = useMemo(() => {
    const base = signupForm.webhookBaseUrl.trim().replace(/\/+$/, '');
    const path = slugify(signupForm.webhookPath || signupForm.companyName || 'cliente');
    return base ? `${base}/webhook/${path}` : 'https://seu-n8n.com/webhook/seu-cliente';
  }, [signupForm.webhookBaseUrl, signupForm.webhookPath, signupForm.companyName]);

  const validateSignup = () => {
    const required: Array<[keyof FormState, string]> = [
      ['email', 'E-mail'],
      ['password', 'Senha'],
      ['companyName', 'Nome da empresa'],
      ['cnpj', 'CNPJ'],
      ['address', 'Endereço'],
      ['appPublicUrl', 'URL pública do app'],
      ['webhookBaseUrl', 'Base URL do webhook'],
      ['webhookPath', 'Path do webhook'],
      ['apiKey', 'API Key do n8n'],
      ['githubOwner', 'GitHub Owner'],
      ['githubRepo', 'GitHub Repo'],
      ['githubBranch', 'GitHub Branch'],
      ['githubToken', 'GitHub Token'],
    ];

    const nextIssues: string[] = [];
    for (const [field, label] of required) {
      if (!String(signupForm[field] || '').trim()) {
        nextIssues.push(`${label} está vazio`);
      }
    }

    if (signupForm.email && !/^\S+@\S+\.\S+$/.test(signupForm.email.trim())) {
      nextIssues.push('E-mail está inválido');
    }

    if (signupForm.password.trim().length < 8) {
      nextIssues.push('Senha deve ter ao menos 8 caracteres');
    }

    if (signupForm.appPublicUrl && !isHttpUrl(signupForm.appPublicUrl)) {
      nextIssues.push('URL pública do app está inválida');
    }

    if (signupForm.webhookBaseUrl && !isHttpUrl(signupForm.webhookBaseUrl)) {
      nextIssues.push('Base URL do webhook está inválida');
    }

    if (signupForm.discordWebhook && !/^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\/[^/]+\/[^/]+$/i.test(signupForm.discordWebhook.trim())) {
      nextIssues.push('Discord Webhook está inválido');
    }

    if (signupForm.githubToken && !/^(ghp_|github_pat_)/i.test(signupForm.githubToken.trim())) {
      nextIssues.push('GitHub Token está inválido');
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
    setMessage('Criando conta e publicando workflow...');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(signupForm),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        setStatus('error');
        setIssues(Array.isArray(payload?.issues) ? payload.issues : []);
        setMessage(payload?.error || 'Não foi possível criar a conta.');
        return;
      }

      setStatus('success');
      setMessage('Conta criada e workflow publicado com sucesso.');
      persistAuthBootstrap(payload);
      onAuthenticated(payload);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setStatus('error');
      setMessage('Informe e-mail e senha.');
      return;
    }

    setStatus('loading');
    setMessage('Entrando na conta...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        setStatus('error');
        setMessage(payload?.error || 'Credenciais inválidas.');
        return;
      }

      setStatus('success');
      setMessage('Login realizado com sucesso.');
      persistAuthBootstrap(payload);
      onAuthenticated(payload);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Credenciais inválidas.');
    }
  };

  const accentText = mode === 'login' ? 'Acesse sua instância' : 'Crie uma nova conta';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.16),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_20%),linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] px-5 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden rounded-[32px] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.05))] backdrop-blur-2xl shadow-[0_30px_90px_-35px_rgba(15,23,42,0.95)]">
          <CardContent className="flex h-full flex-col justify-between p-8">
            <div>
              <Badge className="rounded-full border-0 bg-fuchsia-500/15 text-fuchsia-200">Multi-tenant QA Flow Pro</Badge>
              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                {accentText}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
                Cada empresa ganha sua própria conta, seu próprio webhook e o workflow publicado para a instância dela.
                O cadastro cria o tenant, publica o fluxo no n8n e testa a conexão antes de liberar o acesso.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                { icon: <UserPlus className="h-4 w-4" />, title: 'Cadastro de empresa', text: 'CNPJ, endereço e dados de acesso.' },
                { icon: <Bot className="h-4 w-4" />, title: 'Workflow por cliente', text: 'Webhooks separados por tenant.' },
                { icon: <CheckCircle2 className="h-4 w-4" />, title: 'Teste automático', text: 'Publica e valida a integração.' },
                { icon: <Sparkles className="h-4 w-4" />, title: 'SaaS pronto', text: 'Cada cliente tem sua própria configuração.' },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
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

        <Card className="rounded-[32px] border-white/10 bg-[#090d1a] shadow-[0_30px_90px_-35px_rgba(15,23,42,0.95)]">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black text-white">Entrar ou criar conta</div>
                <div className="mt-1 text-xs text-slate-400">Login para clientes existentes ou onboarding completo para um novo cliente.</div>
              </div>
              {showModeSwitch && (
                <div className="rounded-full border border-white/10 bg-white/5 p-1">
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
              <div className={cn(
                'mt-5 rounded-2xl border px-4 py-3 text-sm',
                status === 'success' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : status === 'error' ? 'border-red-400 bg-red-500/10 text-red-200' : 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
              )}>
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
                    className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    placeholder="voce@empresa.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Senha</label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    placeholder="Sua senha"
                  />
                </div>
                <Button
                  className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500"
                  onClick={handleLogin}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Entrando...' : 'Entrar na conta'}
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
                    <Input value={signupForm.email} onChange={(e) => setSignupForm((prev) => ({ ...prev, email: e.target.value }))} type="email" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="contato@empresa.com" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Senha</label>
                    <Input value={signupForm.password} onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))} type="password" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="Senha forte" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-300">Nome da empresa</label>
                    <Input value={signupForm.companyName} onChange={(e) => setSignupForm((prev) => {
                      const next = { ...prev, companyName: e.target.value };
                      if (!prev.webhookPath.trim()) {
                        next.webhookPath = slugify(e.target.value) || 'cliente';
                      }
                      return next;
                    })} className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="Empresa LTDA" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">CNPJ</label>
                    <Input value={signupForm.cnpj} onChange={(e) => setSignupForm((prev) => ({ ...prev, cnpj: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="00.000.000/0000-00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Endereço</label>
                    <Input value={signupForm.address} onChange={(e) => setSignupForm((prev) => ({ ...prev, address: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="Rua, número, cidade" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-300">URL pública do app</label>
                    <Input value={signupForm.appPublicUrl} onChange={(e) => setSignupForm((prev) => ({ ...prev, appPublicUrl: e.target.value }))} type="url" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="https://seu-app.ngrok-free.dev" />
                  </div>
                  <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">Webhook base URL</label>
                      <Input value={signupForm.webhookBaseUrl} onChange={(e) => setSignupForm((prev) => ({ ...prev, webhookBaseUrl: e.target.value }))} type="url" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="https://pauloqa.app.n8n.cloud" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">Webhook path</label>
                      <Input value={signupForm.webhookPath} onChange={(e) => setSignupForm((prev) => ({ ...prev, webhookPath: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="cliente-x" />
                    </div>
                  </div>
                  <div className="md:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Webhook final</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-200">{webhookPreview}</div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">API Key do n8n</label>
                    <Input value={signupForm.apiKey} onChange={(e) => setSignupForm((prev) => ({ ...prev, apiKey: e.target.value }))} type="password" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="sk_..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">Discord Webhook (opcional)</label>
                    <Input value={signupForm.discordWebhook} onChange={(e) => setSignupForm((prev) => ({ ...prev, discordWebhook: e.target.value }))} type="url" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="https://discord.com/api/webhooks/..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Owner</label>
                    <Input value={signupForm.githubOwner} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubOwner: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="seu_usuario" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Repo</label>
                    <Input value={signupForm.githubRepo} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubRepo: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="seu_repo" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Branch</label>
                    <Input value={signupForm.githubBranch} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubBranch: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="main" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">GitHub Token</label>
                    <Input value={signupForm.githubToken} onChange={(e) => setSignupForm((prev) => ({ ...prev, githubToken: e.target.value }))} type="password" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" placeholder="ghp_..." />
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
                  className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500"
                  onClick={handleSignup}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Criando conta...' : 'Criar conta e publicar workflow'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              <Lock className="h-4 w-4 text-fuchsia-300" />
              O tenant, o webhook e o workflow são criados por empresa. Cada conta trabalha com a própria configuração.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
