
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import type { SectionSettings, N8nSettings } from '../types';
import { useCallback, useEffect, useState } from 'react';

type SettingsSectionProps = {
  settings: SectionSettings;
  toggleSetting: (key: keyof SectionSettings) => void;
  n8nSettings?: N8nSettings;
  tenantData?: Partial<N8nSettings> | null;
  tenantId?: string;
  tenantMissing?: boolean;
  onN8nSettingsSave?: (settings: N8nSettings) => void;
  onN8nSettingsChange?: (settings: N8nSettings) => void;
  onN8nConnectionTestResult?: (ok: boolean, message: string) => void;
};

type AuthBootstrap = {
  account?: {
    tenantId?: string;
  };
  tenant?: Partial<N8nSettings> | null;
};

const AUTH_BOOTSTRAP_STORAGE_KEY = 'qa_auth_bootstrap';
const EMPTY_N8N_SETTINGS: N8nSettings = {
  companyName: '',
  cnpj: '',
  address: '',
  appPublicUrl: '',
  webhookBaseUrl: '',
  webhookPath: '',
  webhookUrl: '',
  apiKey: '',
  discordWebhook: '',
  discordApplicationId: '',
  discordPublicKey: '',
  discordBotToken: '',
  discordGuildId: '',
  discordCommandName: 'qa',
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
};

function normalizeN8nSettings(settings?: Partial<N8nSettings> | null): N8nSettings {
  return {
    ...EMPTY_N8N_SETTINGS,
    ...settings,
    companyName: settings?.companyName || '',
    cnpj: settings?.cnpj || '',
    address: settings?.address || '',
    appPublicUrl: settings?.appPublicUrl || '',
    webhookBaseUrl: settings?.webhookBaseUrl || '',
    webhookPath: settings?.webhookPath || '',
    webhookUrl: settings?.webhookUrl || '',
    apiKey: settings?.apiKey || '',
    discordWebhook: settings?.discordWebhook || '',
    discordApplicationId: settings?.discordApplicationId || '',
    discordPublicKey: settings?.discordPublicKey || '',
    discordBotToken: settings?.discordBotToken || '',
    discordGuildId: settings?.discordGuildId || '',
    discordCommandName: settings?.discordCommandName || 'qa',
    githubOwner: settings?.githubOwner || '',
    githubRepo: settings?.githubRepo || '',
    githubBranch: settings?.githubBranch || 'main',
    githubToken: settings?.githubToken || '',
    tenantId: settings?.tenantId || '',
    tenantSlug: settings?.tenantSlug || '',
    workflowPublishedAt: settings?.workflowPublishedAt || '',
    workflowDownloadUrl: settings?.workflowDownloadUrl || '',
    loadedAt: settings?.loadedAt || '',
    updatedAt: settings?.updatedAt || '',
  };
}

function mergeSettings(primary?: Partial<N8nSettings> | null, fallback?: Partial<N8nSettings> | null): N8nSettings {
  return normalizeN8nSettings({
    companyName: primary?.companyName ?? fallback?.companyName ?? '',
    cnpj: primary?.cnpj ?? fallback?.cnpj ?? '',
    address: primary?.address ?? fallback?.address ?? '',
    appPublicUrl: primary?.appPublicUrl ?? fallback?.appPublicUrl ?? '',
    webhookBaseUrl: primary?.webhookBaseUrl ?? fallback?.webhookBaseUrl ?? '',
    webhookPath: primary?.webhookPath ?? fallback?.webhookPath ?? '',
    webhookUrl: primary?.webhookUrl ?? fallback?.webhookUrl ?? '',
    apiKey: primary?.apiKey ?? fallback?.apiKey ?? '',
    discordWebhook: primary?.discordWebhook ?? fallback?.discordWebhook ?? '',
    discordApplicationId: primary?.discordApplicationId ?? fallback?.discordApplicationId ?? '',
    discordPublicKey: primary?.discordPublicKey ?? fallback?.discordPublicKey ?? '',
    discordBotToken: primary?.discordBotToken ?? fallback?.discordBotToken ?? '',
    discordGuildId: primary?.discordGuildId ?? fallback?.discordGuildId ?? '',
    discordCommandName: primary?.discordCommandName ?? fallback?.discordCommandName ?? 'qa',
    githubOwner: primary?.githubOwner ?? fallback?.githubOwner ?? '',
    githubRepo: primary?.githubRepo ?? fallback?.githubRepo ?? '',
    githubBranch: primary?.githubBranch ?? fallback?.githubBranch ?? 'main',
    githubToken: primary?.githubToken ?? fallback?.githubToken ?? '',
    tenantId: primary?.tenantId ?? fallback?.tenantId ?? '',
    tenantSlug: primary?.tenantSlug ?? fallback?.tenantSlug ?? '',
    workflowPublishedAt: primary?.workflowPublishedAt ?? fallback?.workflowPublishedAt ?? '',
    workflowDownloadUrl: primary?.workflowDownloadUrl ?? fallback?.workflowDownloadUrl ?? '',
    loadedAt: primary?.loadedAt ?? fallback?.loadedAt ?? '',
    updatedAt: primary?.updatedAt ?? fallback?.updatedAt ?? '',
  });
}

export function SettingsSection({ settings, toggleSetting, n8nSettings, tenantData, tenantId, tenantMissing, onN8nSettingsSave, onN8nSettingsChange, onN8nConnectionTestResult }: SettingsSectionProps) {
  const [n8nForm, setN8nForm] = useState<N8nSettings>(() => mergeSettings(n8nSettings, tenantData));
  const [n8nSaveStatus, setN8nSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [n8nTestStatus, setN8nTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [n8nTestMessage, setN8nTestMessage] = useState('');
  const [n8nErrors, setN8nErrors] = useState<string[]>([]);
  const [n8nWarnings, setN8nWarnings] = useState<string[]>([]);
  const [bootstrapTenantId, setBootstrapTenantId] = useState('');
  const resolvedTenantId = tenantId || bootstrapTenantId || n8nForm.tenantId || '';
  const discordInteractionEndpoint = n8nForm.appPublicUrl
    ? `${n8nForm.appPublicUrl.replace(/\/+$/, '')}/api/discord/interactions`
    : '';
  const hasLoadedN8nConfig = Boolean(
    n8nForm.webhookUrl ||
      n8nForm.apiKey ||
      n8nForm.discordWebhook ||
      n8nForm.discordApplicationId ||
      n8nForm.discordPublicKey ||
      n8nForm.discordBotToken ||
      n8nForm.discordGuildId ||
      n8nForm.discordCommandName ||
      n8nForm.githubOwner ||
      n8nForm.githubRepo ||
      n8nForm.githubBranch ||
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
  const isLikelyJwt = (value: string) => /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value.trim());
  const isLikelyGitHubToken = (value: string) => /^(ghp_|github_pat_)/i.test(value.trim());

  const validateN8nForm = (form: N8nSettings) => {
    const errors: string[] = [];

    const appPublicUrl = form.appPublicUrl.trim();
    const webhookBaseUrl = form.webhookBaseUrl?.trim() || '';
    const apiKey = form.apiKey.trim();
    const githubOwner = form.githubOwner.trim();
    const githubRepo = form.githubRepo.trim();
    const githubBranch = form.githubBranch.trim();
    const githubToken = form.githubToken.trim();

    if (!appPublicUrl) errors.push('URL p?blica do app');
    else if (!isValidHttpUrl(appPublicUrl)) errors.push('URL p?blica do app com URL inv?lida');

    if (!webhookBaseUrl) errors.push('URL do ambiente n8n');
    else if (!isValidHttpUrl(webhookBaseUrl)) errors.push('URL do ambiente n8n com formato invalido');

    if (!apiKey) errors.push('API Key do n8n');
    else if (!isLikelyJwt(apiKey)) errors.push('API Key do n8n com formato inv?lido');

    if (!form.discordBotToken.trim()) errors.push('Discord Bot Token');

    if (!githubOwner) errors.push('GitHub Owner');
    if (!githubRepo) errors.push('GitHub Repo');
    if (!githubBranch) errors.push('GitHub Branch');
    if (!githubToken) errors.push('GitHub Token');
    else if (!isLikelyGitHubToken(githubToken)) errors.push('GitHub Token com formato inv?lido');

    return errors;
  };

  useEffect(() => {
    setN8nForm(mergeSettings(n8nSettings, tenantData));
  }, [n8nSettings, tenantData]);

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

  const reloadN8nConfig = useCallback(async () => {
    if (!resolvedTenantId) {
      return;
    }

    if (hasLoadedN8nConfig) {
      return;
    }

    try {
      const tenantQuery = `?tenantId=${encodeURIComponent(resolvedTenantId)}`;
      const [settingsResponse, configResponse] = await Promise.all([
        fetch(`/api/settings/n8n${tenantQuery}`, { cache: 'no-store' }),
        fetch(`/api/settings/n8n/config${tenantQuery}`, { cache: 'no-store' }),
      ]);

      if (!settingsResponse.ok || !configResponse.ok) {
        return;
      }

      const config = await settingsResponse.json();
      const publicConfig = await configResponse.json();

      const next: N8nSettings = mergeSettings({
        companyName: config.companyName || publicConfig.companyName || '',
        cnpj: config.cnpj || publicConfig.cnpj || '',
        address: config.address || publicConfig.address || '',
        appPublicUrl: config.appPublicUrl || publicConfig.appPublicUrl || publicConfig.APP_PUBLIC_URL || '',
        webhookBaseUrl: config.webhookBaseUrl || publicConfig.webhookBaseUrl || '',
        webhookPath: config.webhookPath || publicConfig.webhookPath || '',
        webhookUrl: config.webhookUrl || '',
        apiKey: config.apiKey || '',
        discordWebhook: config.discordWebhook || '',
        discordApplicationId: config.discordApplicationId || '',
        discordPublicKey: config.discordPublicKey || '',
        discordBotToken: config.discordBotToken || '',
        discordGuildId: config.discordGuildId || '',
        discordCommandName: config.discordCommandName || 'qa',
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
      }, tenantData || n8nSettings);

      setN8nForm(next);
    } catch (error) {
      console.error('Failed to hydrate n8n settings from server', error);
    }
  }, [hasLoadedN8nConfig, n8nSettings, resolvedTenantId, tenantData]);

  useEffect(() => {
    void reloadN8nConfig();
  }, [reloadN8nConfig]);

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
    setN8nWarnings([]);
    setN8nSaveStatus('saving');
    try {
      const response = await fetch('/api/settings/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...n8nForm }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setN8nSaveStatus('success');
        setN8nErrors([]);
        setN8nWarnings(Array.isArray(payload?.warnings) ? payload.warnings : []);
        onN8nSettingsSave?.(mergeSettings(payload?.config, n8nForm));
        setTimeout(() => setN8nSaveStatus('idle'), 3000);
      } else {
        const nextMessage =
          payload?.details ||
          payload?.error ||
          'Erro ao salvar.';
        const nextIssues = Array.isArray(payload?.issues) ? payload.issues : [];
        setN8nErrors(nextIssues.length > 0 ? nextIssues : [nextMessage]);
        setN8nWarnings([]);
        setN8nSaveStatus('error');
        console.error('Save n8n settings failed:', payload);
      }
    } catch {
      setN8nSaveStatus('error');
    }
  };

  const handleTestConnection = async () => {
    const errors = validateN8nForm(n8nForm);

    if (errors.length > 0) {
      const message = `Corrija a configuracao antes de validar: ${errors.join(', ')}.`;
      setN8nTestStatus('error');
      setN8nTestMessage(message);
      onN8nConnectionTestResult?.(false, message);
      return;
    }

    setN8nTestStatus('testing');
    setN8nTestMessage('Testando a integracao...');

    try {
      const response = await fetch('/api/settings/n8n/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: n8nForm, tenantId: resolvedTenantId, tenantSlug: n8nForm.tenantSlug, source: 'site' }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        const issues = Array.isArray(data?.issues) ? data.issues : [];
        const message = data?.error || data?.details || 'Nao foi possivel validar a integracao.';
        setN8nTestStatus('error');
        setN8nTestMessage(issues.length > 0 ? `${message} ${issues.join(', ')}.` : message);
        onN8nConnectionTestResult?.(false, message);
        return;
      }

      const message = data?.message || 'Integracao validada com sucesso.';
      setN8nTestStatus('success');
      setN8nTestMessage(message);
      onN8nConnectionTestResult?.(true, message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao validar a integracao.';
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

      {tenantMissing && (
        <Card className="rounded-[24px] border-amber-400/40 bg-amber-500/10 p-5 text-amber-100 shadow-[0_20px_60px_-30px_rgba(251,191,36,0.55)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" />
            <div className="space-y-1">
              <h2 className="text-base font-bold">Tenant não encontrado no banco conectado</h2>
              <p className="text-sm text-amber-100/85">
                A conta existe, mas o registro em <span className="font-semibold">tenants</span> não está presente neste banco.
                Sem esse registro, as configurações do fluxo não conseguem ser carregadas.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="rounded-[24px] border-white/10 bg-white/8 p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Integracoes do cliente</h2>
            <p className="mt-1 text-xs text-slate-400">
              Mostre so os dados que o cliente realmente precisa preencher para operar o Orion.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {timestampLabel && (
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-slate-300">
                Atualizado em {timestampLabel}
              </div>
            )}
            <Button
              variant="outline"
              className="rounded-xl text-xs px-3 py-2 h-auto"
              onClick={handleN8nSave}
              disabled={n8nSaveStatus === 'saving'}
            >
              Salvar integração
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300">URL pública do app</label>
            <Input
              value={n8nForm.appPublicUrl}
              onChange={(e) => updateN8nForm({ appPublicUrl: e.target.value })}
              className={requiredFieldClass(n8nForm.appPublicUrl)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">URL do ambiente n8n</label>
            <Input
              value={n8nForm.webhookBaseUrl || ''}
              onChange={(e) => updateN8nForm({ webhookBaseUrl: e.target.value })}
              placeholder="https://seu-workspace.app.n8n.cloud"
              className={requiredFieldClass(n8nForm.webhookBaseUrl || '')}
            />
          </div>
          <div className="md:col-span-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            <div className="font-semibold">O que o cliente precisa informar</div>
            <p className="mt-1 text-cyan-100/80">
              Informe somente a URL do ambiente n8n, a chave da API, o token do bot do Discord e o repositorio do GitHub. O Orion cuida dos endpoints internos e das rotas tecnicas por baixo.
            </p>
          </div>
          <div className="md:col-span-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100">
            <div className="font-semibold">Configuracao do Discord</div>
            <p className="mt-1 text-violet-100/80">
              Para o Discord funcionar, use o endpoint abaixo no Developer Portal. O Application ID e a Public Key sao resolvidos automaticamente quando o token do bot estiver correto.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Discord Bot Token</label>
            <Input
              type="password"
              value={n8nForm.discordBotToken}
              onChange={(e) => updateN8nForm({ discordBotToken: e.target.value })}
              placeholder="Bot ..."
              className={requiredFieldClass(n8nForm.discordBotToken)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Discord Guild ID</label>
            <Input
              value={n8nForm.discordGuildId}
              onChange={(e) => updateN8nForm({ discordGuildId: e.target.value })}
              placeholder="Opcional"
              className="mt-1 rounded-xl border-white/10 bg-white/5 text-white text-xs placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Comando do Discord</label>
            <Input
              value={n8nForm.discordCommandName}
              onChange={(e) => updateN8nForm({ discordCommandName: e.target.value })}
              placeholder="qa"
              className="mt-1 rounded-xl border-white/10 bg-white/5 text-white text-xs placeholder:text-slate-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300">Endpoint de interacao do Discord</label>
            <Input
              readOnly
              value={discordInteractionEndpoint}
              placeholder="Preencha a URL publica do app para gerar este endpoint"
              className="mt-1 rounded-xl border-white/10 bg-white/5 text-white text-xs placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Discord Application ID</label>
            <Input
              readOnly
              value={n8nForm.discordApplicationId || ''}
              placeholder="Resolvido automaticamente apos salvar"
              className="mt-1 rounded-xl border-white/10 bg-white/5 text-white text-xs placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Discord Public Key</label>
            <Input
              readOnly
              value={n8nForm.discordPublicKey || ''}
              placeholder="Resolvida automaticamente apos salvar"
              className="mt-1 rounded-xl border-white/10 bg-white/5 text-white text-xs placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">GitHub Owner</label>
            <Input
              type="text"
              value={n8nForm.githubOwner}
              onChange={(e) => updateN8nForm({ githubOwner: e.target.value })}
              placeholder="seu_usuario"
              className={requiredFieldClass(n8nForm.githubOwner)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">GitHub Repo</label>
            <Input
              type="text"
              value={n8nForm.githubRepo}
              onChange={(e) => updateN8nForm({ githubRepo: e.target.value })}
              placeholder="seu_repo"
              className={requiredFieldClass(n8nForm.githubRepo)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">GitHub Branch</label>
            <Input
              type="text"
              value={n8nForm.githubBranch}
              onChange={(e) => updateN8nForm({ githubBranch: e.target.value })}
              placeholder="main"
              className={requiredFieldClass(n8nForm.githubBranch)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">GitHub Token</label>
            <Input
              type="password"
              value={n8nForm.githubToken}
              onChange={(e) => updateN8nForm({ githubToken: e.target.value })}
              placeholder="ghp_..."
              className={requiredFieldClass(n8nForm.githubToken)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15 text-xs px-3 py-2 h-auto"
            onClick={handleTestConnection}
            disabled={n8nTestStatus === 'testing'}
          >
            {n8nTestStatus === 'testing' ? 'Testando...' : 'Validar integracao'}
          </Button>
        </div>

        {n8nTestMessage && (
          <div
            className={cn(
              'mt-3 rounded-xl px-3 py-2 text-xs',
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
          <div className="mt-3 rounded-xl border border-emerald-400 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            Salvo.
          </div>
        )}
        {n8nWarnings.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-400 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <div className="font-semibold">Avisos</div>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              {n8nWarnings.slice(0, 5).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        {n8nSaveStatus === 'error' && (
          <div className="mt-3 rounded-xl border border-red-400 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {n8nErrors.length > 0 ? n8nErrors[0] : 'Erro ao salvar. Veja o console para detalhes.'}
          </div>
        )}
      </Card>

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

    </div>
  );
}


