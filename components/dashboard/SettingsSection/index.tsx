import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { SectionSettings, N8nSettings } from '../types';
import { useEffect, useState } from 'react';

type SettingsSectionProps = {
  settings: SectionSettings;
  toggleSetting: (key: keyof SectionSettings) => void;
  n8nSettings?: N8nSettings;
  tenantId?: string;
  onN8nSettingsSave?: (settings: N8nSettings) => void;
  onN8nSettingsChange?: (settings: N8nSettings) => void;
  onN8nConnectionTestResult?: (ok: boolean, message: string) => void;
  connectionVerified?: boolean;
  connectionMessage?: string;
  appPublicUrl?: string;
};

type AuthBootstrap = {
  account?: {
    tenantId?: string;
  };
  tenant?: Partial<N8nSettings> | null;
};

const AUTH_BOOTSTRAP_STORAGE_KEY = 'qa_auth_bootstrap';

export function SettingsSection({ settings, toggleSetting, n8nSettings, tenantId, onN8nSettingsSave, onN8nSettingsChange, onN8nConnectionTestResult, connectionVerified, connectionMessage, appPublicUrl }: SettingsSectionProps) {
  const [n8nForm, setN8nForm] = useState<N8nSettings>(n8nSettings || {
    companyName: '',
    cnpj: '',
    address: '',
    appPublicUrl: '',
    webhookBaseUrl: '',
    webhookPath: '',
    webhookUrl: '',
    apiKey: '',
    discordWebhook: '',
    githubOwner: '',
    githubRepo: '',
    githubBranch: 'main',
    githubToken: '',
    tenantId: '',
    tenantSlug: '',
    workflowPublishedAt: '',
    workflowDownloadUrl: '',
    loadedAt: '',
    updatedAt: '',
  });
  const [showN8nForm, setShowN8nForm] = useState(false);
  const [n8nSaveStatus, setN8nSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [n8nTestStatus, setN8nTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [n8nTestMessage, setN8nTestMessage] = useState('');
  const [n8nErrors, setN8nErrors] = useState<string[]>([]);
  const [bootstrapTenantId, setBootstrapTenantId] = useState('');
  const [serverLoadStatus, setServerLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverLoadMessage, setServerLoadMessage] = useState('');
  const storedAppUrl = (n8nForm.appPublicUrl || n8nSettings?.appPublicUrl || appPublicUrl || '').replace(/\/+$/, '') || 'http://localhost:3000';
  const resolvedTenantId = tenantId || bootstrapTenantId || n8nForm.tenantId || '';
  const resolvedAppUrl = storedAppUrl;
  const editableAppUrl = (n8nForm.appPublicUrl || storedAppUrl).replace(/\/+$/, '') || 'http://localhost:3000';
  const configEndpoint = `${editableAppUrl}/api/settings/n8n/config`;
  const hasLoadedN8nConfig = Boolean(
    n8nForm.webhookUrl ||
      n8nForm.apiKey ||
      n8nForm.discordWebhook ||
      n8nForm.githubOwner ||
      n8nForm.githubRepo ||
      n8nForm.loadedAt ||
      n8nForm.updatedAt
  );
  const timestamp = n8nForm.updatedAt || n8nForm.loadedAt || '';
  const timestampLabel = timestamp
    ? new Date(timestamp).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';
  const requiredFieldClass = (value: string) =>
    cn(
      'mt-1 rounded-xl border-white/10 bg-white/5 text-white text-xs placeholder:text-slate-500',
      value.trim() ? '' : 'border-red-400/50 ring-1 ring-red-400/20'
    );

  const isValidHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());
  const isValidDiscordWebhook = (value: string) => /^https:\/\/(canary\.|ptb\.)?discord\.com\/api\/webhooks\/[^/]+\/[^/]+$/i.test(value.trim());
  const isLikelyJwt = (value: string) => /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value.trim());
  const isLikelyGitHubToken = (value: string) => /^(ghp_|github_pat_)/i.test(value.trim());

  const validateN8nForm = (form: N8nSettings) => {
    const errors: string[] = [];

    const appPublicUrl = form.appPublicUrl.trim();
    const webhookUrl = form.webhookUrl.trim();
    const apiKey = form.apiKey.trim();
    const githubOwner = form.githubOwner.trim();
    const githubRepo = form.githubRepo.trim();
    const githubBranch = form.githubBranch.trim();
    const githubToken = form.githubToken.trim();
    const discordWebhook = form.discordWebhook.trim();

    if (!appPublicUrl) errors.push('URL pÃºblica do app');
    else if (!isValidHttpUrl(appPublicUrl)) errors.push('URL pÃºblica do app com URL invÃ¡lida');

    if (!webhookUrl) errors.push('Webhook URL do n8n');
    else if (!isValidHttpUrl(webhookUrl)) errors.push('Webhook URL do n8n com formato invÃ¡lido');

    if (!apiKey) errors.push('API Key do n8n');
    else if (!isLikelyJwt(apiKey)) errors.push('API Key do n8n com formato invÃ¡lido');

    if (!githubOwner) errors.push('GitHub Owner');
    if (!githubRepo) errors.push('GitHub Repo');
    if (!githubBranch) errors.push('GitHub Branch');
    if (!githubToken) errors.push('GitHub Token');
    else if (!isLikelyGitHubToken(githubToken)) errors.push('GitHub Token com formato invÃ¡lido');

    if (discordWebhook && !isValidDiscordWebhook(discordWebhook)) errors.push('Discord Webhook com formato invÃ¡lido');

    return errors;
  };

  const liveN8nIssues = validateN8nForm(n8nForm);
  const checklistItems = [
    {
      key: 'appPublicUrl',
      label: 'URL pÃºblica do app',
      value: n8nForm.appPublicUrl,
      valid: Boolean(n8nForm.appPublicUrl.trim()) && isValidHttpUrl(n8nForm.appPublicUrl),
      optional: false,
    },
    {
      key: 'webhookUrl',
      label: 'Webhook URL do n8n',
      value: n8nForm.webhookUrl,
      valid: Boolean(n8nForm.webhookUrl.trim()) && isValidHttpUrl(n8nForm.webhookUrl),
      optional: false,
    },
    {
      key: 'apiKey',
      label: 'API Key do n8n',
      value: n8nForm.apiKey,
      valid: Boolean(n8nForm.apiKey.trim()) && isLikelyJwt(n8nForm.apiKey),
      optional: false,
      masked: true,
    },
    {
      key: 'githubOwner',
      label: 'GitHub Owner',
      value: n8nForm.githubOwner,
      valid: Boolean(n8nForm.githubOwner.trim()),
      optional: false,
    },
    {
      key: 'githubRepo',
      label: 'GitHub Repo',
      value: n8nForm.githubRepo,
      valid: Boolean(n8nForm.githubRepo.trim()),
      optional: false,
    },
    {
      key: 'githubBranch',
      label: 'GitHub Branch',
      value: n8nForm.githubBranch,
      valid: Boolean(n8nForm.githubBranch.trim()),
      optional: false,
    },
    {
      key: 'githubToken',
      label: 'GitHub Token',
      value: n8nForm.githubToken,
      valid: Boolean(n8nForm.githubToken.trim()) && isLikelyGitHubToken(n8nForm.githubToken),
      optional: false,
      masked: true,
    },
    {
      key: 'discordWebhook',
      label: 'Discord Webhook',
      value: n8nForm.discordWebhook,
      valid: !n8nForm.discordWebhook.trim() || isValidDiscordWebhook(n8nForm.discordWebhook),
      optional: true,
      masked: Boolean(n8nForm.discordWebhook.trim()),
    },
  ] as const;
  const checklistOkCount = checklistItems.filter((item) => item.valid && !item.optional).length;
  const checklistPendingCount = checklistItems.filter((item) => !item.valid && !item.optional).length;
  const checklistOptionalCount = checklistItems.filter((item) => item.optional).length;

  useEffect(() => {
    if (!n8nSettings) return;
    setN8nForm(n8nSettings);
  }, [n8nSettings]);

  useEffect(() => {
    if (resolvedTenantId) {
      return;
    }

    try {
      const rawBootstrap = window.sessionStorage.getItem(AUTH_BOOTSTRAP_STORAGE_KEY);
      if (!rawBootstrap) return;

      const parsed = JSON.parse(rawBootstrap) as AuthBootstrap;
      const nextTenantId = parsed?.account?.tenantId || '';
      if (!nextTenantId) return;

      setBootstrapTenantId(nextTenantId);

    } catch (error) {
      console.error('Failed to read auth bootstrap in settings', error);
    }
  }, [bootstrapTenantId, hasLoadedN8nConfig, tenantId, resolvedTenantId]);

  const reloadN8nConfig = async () => {
    if (!resolvedTenantId) {
      setServerLoadStatus('error');
      setServerLoadMessage('tenantId nÃ£o resolvido');
      return;
    }

    setServerLoadStatus('loading');
    setServerLoadMessage('');
    let cancelled = false;

    try {
      const tenantQuery = `?tenantId=${encodeURIComponent(resolvedTenantId)}`;
      const [settingsResponse, configResponse] = await Promise.all([
        fetch(`/api/settings/n8n${tenantQuery}`, { cache: 'no-store' }),
        fetch(`/api/settings/n8n/config${tenantQuery}`, { cache: 'no-store' }),
      ]);

      if (!settingsResponse.ok || !configResponse.ok || cancelled) {
        setServerLoadStatus('error');
        setServerLoadMessage('Falha ao carregar configuraÃ§Ãµes do servidor.');
        return;
      }

      const config = await settingsResponse.json();
      const publicConfig = await configResponse.json();

      const next: N8nSettings = {
        companyName: config.companyName || publicConfig.companyName || '',
        cnpj: config.cnpj || publicConfig.cnpj || '',
        address: config.address || publicConfig.address || '',
        appPublicUrl: config.appPublicUrl || publicConfig.appPublicUrl || publicConfig.APP_PUBLIC_URL || '',
        webhookBaseUrl: config.webhookBaseUrl || publicConfig.webhookBaseUrl || '',
        webhookPath: config.webhookPath || publicConfig.webhookPath || '',
        webhookUrl: config.webhookUrl || '',
        apiKey: config.apiKey || '',
        discordWebhook: config.discordWebhook || '',
        githubOwner: config.githubOwner || '',
        githubRepo: config.githubRepo || '',
        githubBranch: config.githubBranch || 'main',
        githubToken: config.githubToken || '',
        tenantId: config.tenantId || publicConfig.tenantId || resolvedTenantId || '',
        tenantSlug: config.tenantSlug || publicConfig.tenantSlug || '',
        workflowPublishedAt: config.workflowPublishedAt || publicConfig.workflowPublishedAt || '',
        workflowDownloadUrl: config.workflowDownloadUrl || publicConfig.workflowDownloadUrl || '',
        loadedAt: config.loadedAt || '',
        updatedAt: config.updatedAt || '',
      };

      setN8nForm(next);
      onN8nSettingsSave?.(next);
      setServerLoadStatus('success');
      setServerLoadMessage('ConfiguraÃ§Ãµes carregadas do servidor.');
    } catch (error) {
      setServerLoadStatus('error');
      setServerLoadMessage(error instanceof Error ? error.message : 'Falha ao carregar configuraÃ§Ãµes.');
      console.error('Failed to hydrate n8n settings from server', error);
    }
  };

  useEffect(() => {
    void reloadN8nConfig();
  }, [resolvedTenantId]);

  const updateN8nForm = (patch: Partial<N8nSettings>) => {
    setN8nForm((prev) => {
      const next = { ...prev, ...patch };
      onN8nSettingsChange?.(next);
      return next;
    });
  };

  const handleN8nSave = async () => {
    const errors = validateN8nForm(n8nForm);

    if (errors.length > 0) {
      setN8nErrors(errors);
      setN8nSaveStatus('error');
      return;
    }

    setN8nErrors([]);
    setN8nSaveStatus('saving');
    try {
      const response = await fetch('/api/settings/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...n8nForm }),
      });
      if (response.ok) {
        setN8nSaveStatus('success');
        setN8nErrors([]);
        onN8nSettingsSave?.(n8nForm);
        setTimeout(() => setN8nSaveStatus('idle'), 3000);
      } else {
        setN8nSaveStatus('error');
      }
    } catch {
      setN8nSaveStatus('error');
    }
  };

  const handleTestConnection = async () => {
    const errors = validateN8nForm(n8nForm);

    if (errors.length > 0) {
      const message = `Corrija a configuraÃ§Ã£o antes de testar: ${errors.join(', ')}.`;
      setN8nTestStatus('error');
      setN8nTestMessage(message);
      onN8nConnectionTestResult?.(false, message);
      return;
    }

    setN8nTestStatus('testing');
    setN8nTestMessage('Testando conexÃ£o com o webhook...');

    try {
      const response = await fetch('/api/settings/n8n/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: n8nForm }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        const issues = Array.isArray(data?.issues) ? data.issues : [];
        const message = data?.error || data?.details || 'NÃ£o foi possÃ­vel conectar ao webhook.';
        setN8nTestStatus('error');
        setN8nTestMessage(issues.length > 0 ? `${message} ${issues.join(', ')}.` : message);
        onN8nConnectionTestResult?.(false, message);
        return;
      }

      const message = data?.message || 'ConexÃ£o com o webhook confirmada.';
      setN8nTestStatus('success');
      setN8nTestMessage(message);
      onN8nConnectionTestResult?.(true, message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao testar conexÃ£o.';
      setN8nTestStatus('error');
      setN8nTestMessage(message);
      onN8nConnectionTestResult?.(false, message);
    }
  };

  const options = [
    { label: 'Auto-sync de integraÃ§Ãµes', key: 'autoSync' as const, enabled: settings.autoSync },
    { label: 'SugestÃµes de IA', key: 'aiSuggestions' as const, enabled: settings.aiSuggestions },
    { label: 'Mostrar critÃ©rios', key: 'showCriteria' as const, enabled: settings.showCriteria },
  ];

  return (
    <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-4 pr-4">
      <DialogTitle className="sr-only">Integração n8n</DialogTitle>
      <DialogDescription className="sr-only">
        Configurações da integração n8n para o tenant atual.
      </DialogDescription>
      <Card id="settings" className="rounded-[24px] border-white/10 bg-white/8 p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
        <div>
          <h2 className="text-lg font-bold text-white">Comportamento</h2>
          <p className="mt-1 text-xs text-slate-400">Ajuste o comportamento do fluxo no painel.</p>
        </div>
        <div className="mt-4 space-y-2">
          {options.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
              <div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="text-xs text-slate-400">{item.enabled ? 'Ativado' : 'Desativado'}</div>
              </div>
              <Button
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-xs',
                  item.enabled ? 'bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15' : 'text-slate-200 hover:bg-white/10'
                )}
                onClick={() => toggleSetting(item.key)}
              >
                {item.enabled ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          ))}
        </div>
      </Card>

            <Card className="rounded-[24px] border-white/10 bg-white/8 p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Integração n8n</h2>
          </div>
          <Button
            variant="outline"
            className="rounded-xl text-xs px-3 py-2"
            onClick={() => {
              setShowN8nForm(!showN8nForm);
              void reloadN8nConfig();
            }}
          >
            {showN8nForm ? 'Cancelar' : 'Editar'}
          </Button>
        </div>

        {showN8nForm && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">URL pública do app <span className="text-red-300">*</span></label>
              <Input
                type="url"
                value={n8nForm.appPublicUrl}
                onChange={(e) => updateN8nForm({ appPublicUrl: e.target.value })}
                placeholder="https://seu-tunnel.ngrok-free.dev"
                className={requiredFieldClass(n8nForm.appPublicUrl)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Webhook URL do n8n <span className="text-red-300">*</span></label>
              <Input
                type="url"
                value={n8nForm.webhookUrl}
                onChange={(e) => updateN8nForm({ webhookUrl: e.target.value })}
                placeholder="https://n8n.example.com/webhook/..."
                className={requiredFieldClass(n8nForm.webhookUrl)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">API Key do n8n <span className="text-red-300">*</span></label>
              <Input
                type="password"
                value={n8nForm.apiKey}
                onChange={(e) => updateN8nForm({ apiKey: e.target.value })}
                placeholder="sk_..."
                className={requiredFieldClass(n8nForm.apiKey)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Discord Webhook URL (opcional)</label>
              <Input
                type="url"
                value={n8nForm.discordWebhook}
                onChange={(e) => updateN8nForm({ discordWebhook: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
                className="mt-1 rounded-xl border-white/10 bg-white/5 text-white text-xs placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">GitHub Owner <span className="text-red-300">*</span></label>
                <Input
                  type="text"
                  value={n8nForm.githubOwner}
                  onChange={(e) => updateN8nForm({ githubOwner: e.target.value })}
                  placeholder="seu_usuario"
                  className={requiredFieldClass(n8nForm.githubOwner)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">GitHub Repo <span className="text-red-300">*</span></label>
                <Input
                  type="text"
                  value={n8nForm.githubRepo}
                  onChange={(e) => updateN8nForm({ githubRepo: e.target.value })}
                  placeholder="seu_repo"
                  className={requiredFieldClass(n8nForm.githubRepo)}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">GitHub Branch <span className="text-red-300">*</span></label>
                <Input
                  type="text"
                  value={n8nForm.githubBranch}
                  onChange={(e) => updateN8nForm({ githubBranch: e.target.value })}
                  placeholder="main"
                  className={requiredFieldClass(n8nForm.githubBranch)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">GitHub Token <span className="text-red-300">*</span></label>
                <Input
                  type="password"
                  value={n8nForm.githubToken}
                  onChange={(e) => updateN8nForm({ githubToken: e.target.value })}
                  placeholder="ghp_..."
                  className={requiredFieldClass(n8nForm.githubToken)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white text-xs disabled:opacity-50 py-2 h-auto"
                onClick={handleN8nSave}
                disabled={n8nSaveStatus === 'saving'}
              >
                {n8nSaveStatus === 'saving' ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl text-xs px-3 py-2 h-auto"
                onClick={() => setShowN8nForm(false)}
              >
                Cancelar
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15 text-xs px-3 py-2 h-auto"
                onClick={handleTestConnection}
                disabled={n8nTestStatus === 'testing'}
              >
                {n8nTestStatus === 'testing' ? 'Testando...' : 'Testar conexão'}
              </Button>
            </div>

            {n8nTestMessage && (
              <div
                className={cn(
                  'rounded-xl px-3 py-2 text-xs',
                  n8nTestStatus === 'success'
                    ? 'border border-emerald-400 bg-emerald-500/10 text-emerald-200'
                    : n8nTestStatus === 'error'
                    ? 'border border-red-400 bg-red-500/10 text-red-200'
                    : 'border border-cyan-400 bg-cyan-500/10 text-cyan-200'
                )}
              >
                {n8nTestMessage}
              </div>
            )}

            {n8nSaveStatus === 'success' && (
              <div className="rounded-xl border border-emerald-400 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                Salvo.
              </div>
            )}
            {n8nSaveStatus === 'error' && (
              <div className="rounded-xl border border-red-400 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {n8nErrors.length > 0 ? n8nErrors[0] : 'Erro ao salvar.'}
              </div>
            )}
          </div>
        )}
      </Card>

    </div>
  );
}
