'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bot,
  ChevronDown,
  Clock3,
  Database,
  FileText,
  GitBranch,
  Layers3,
  Plus,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { KanbanSection } from '@/components/dashboard/KanbanSection';
import { CriteriaSection } from '@/components/dashboard/CriteriaSection';
import { QaSection } from '@/components/dashboard/QaSection';
import { AutomationSection } from '@/components/dashboard/AutomationSection';
import { IntegrationsSection } from '@/components/dashboard/IntegrationsSection';
import { SettingsSection } from '@/components/dashboard/SettingsSection';
import { OrionLogo } from '@/components/dashboard/OrionLogo';
import { TimingDashboardSection } from '@/components/dashboard/TimingDashboardSection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ColumnId, DeliveryCard, N8nSettings, PanelId, Scenario, TeamMember } from '@/components/dashboard/types';

const columns: { id: ColumnId; title: string; hint: string }[] = [
  { id: 'discovery', title: 'Descoberta', hint: 'Ideias, contexto e entendimento do fluxo' },
  { id: 'refinement', title: 'Refinamento', hint: 'Critérios de aceite e alinhamento funcional' },
  { id: 'development', title: 'Desenvolvimento', hint: 'Implementação técnica e ajustes da entrega' },
  { id: 'qa', title: 'Pronto para QA', hint: 'Pronto para gerar e revisar cenários' },
  { id: 'testing', title: 'Execução', hint: 'Execução manual, automação e evidências' },
  { id: 'done', title: 'Concluido', hint: 'Validado e pronto para entrega' },
];

const initialCards: DeliveryCard[] = [
  {
    id: 'DEL-201',
    title: 'Consulta de lead no painel comercial',
    epic: 'Onboarding PME',
    module: 'Lead',
    column: 'qa',
    priority: 'Alta',
    owner: 'Paulo',
    businessGoal:
      'Permitir que o time comercial visualize rapidamente os dados do lead sem sair do fluxo principal de atendimento.',
    acceptanceCriteria: [
      'Usuário autenticado deve conseguir pesquisar um lead por identificador.',
      'O sistema deve exibir nome, telefone, status e origem do lead.',
      'Quando o lead não existir, a interface deve mostrar mensagem clara sem quebrar o fluxo.',
    ],
    qaNotes: 'Validar interface, API e comportamento para lead inexistente.',
    scenarios: [
      { id: 'CT-FUNC-21', title: 'Display lead data for a valid identifier', source: 'IA', status: 'Ready' },
      { id: 'CT-FUNC-22', title: 'Show graceful message when lead is not found', source: 'Manual', status: 'Draft' },
    ],
  },
  {
    id: 'DEL-202',
    title: 'Listagem de campanhas com alto volume',
    epic: 'Campanhas',
    module: 'Campanhas',
    column: 'testing',
    priority: 'Média',
    owner: 'Bianca',
    businessGoal:
      'Garantir que a tela de campanhas escale bem para clientes com alto volume operacional e sem travamentos.',
    acceptanceCriteria: [
      'A listagem deve carregar em tempo aceitável com grande volume.',
      'A ordenação não pode travar a interface.',
    ],
    qaNotes: 'Rodar cenários manuais e k6 antes do go-live.',
    scenarios: [
      { id: 'CT-PERF-03', title: 'Load campaign list under heavy volume', source: 'IA', status: 'Automated' },
    ],
  },
  {
    id: 'DEL-203',
    title: 'Login com credenciais válidas',
    epic: 'Autenticação',
    module: 'Acesso',
    column: 'done',
    priority: 'Alta',
    owner: 'Amanda',
    businessGoal: 'Permitir autenticação estável e segura para todos os perfis de usuário.',
    acceptanceCriteria: [
      'Usuário válido deve acessar o sistema com sucesso.',
      'Sessão deve ser registrada corretamente.',
    ],
    qaNotes: 'Cobertura de smoke já validada.',
    scenarios: [{ id: 'CT-FUNC-02', title: 'Authenticate a valid user', source: 'IA', status: 'Automated' }],
  },
];

const SESSION_IDLE_TIMEOUT_MS = 30 * 1000;

type AuthAccount = {
  id: string;
  email: string;
  companyName: string;
  cnpj: string;
  address: string;
  tenantId: string;
};

type AuthTenant = {
  id: string;
  slug: string;
  companyName: string;
  cnpj?: string;
  address?: string;
  appPublicUrl?: string;
  webhookBaseUrl?: string;
  webhookPath?: string;
  webhookUrl?: string;
  apiKey?: string;
  discordWebhook?: string;
  discordApplicationId?: string;
  discordPublicKey?: string;
  discordBotToken?: string;
  discordGuildId?: string;
  discordCommandName?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubBranch?: string;
  githubToken?: string;
  workflowDownloadUrl?: string;
  workflowPublishedAt?: string;
  loadedAt?: string;
  updatedAt?: string;
};

type AuthBootstrap = {
  account: AuthAccount;
  tenant?: AuthTenant | null;
};

const AUTH_BOOTSTRAP_STORAGE_KEY = 'qa_auth_bootstrap';

function createDefaultExecution(estimatedMinutes = 10) {
  return {
    estimatedMinutes,
    actualMinutes: 0,
    status: 'Not Run' as const,
    notes: '',
    executedBy: '',
    evidences: [] as string[],
    bugSource: 'None' as const,
    bugTitle: '',
    bugDescription: '',
  };
}

function StatCard({ title, value, subtitle, glow }: { title: string; value: string | number; subtitle: string; glow: string }) {
  return (
    <Card className="relative overflow-hidden rounded-[28px] border-white/10 bg-white/10 backdrop-blur-2xl shadow-[0_25px_80px_-35px_rgba(15,23,42,0.9)]">
      <div className={cn('absolute inset-x-0 top-0 h-1.5', glow)} />
      <CardContent className="p-5">
        <div className="text-sm text-slate-300">{title}</div>
        <div className="mt-2 text-4xl font-black tracking-tight text-white">{value}</div>
        <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function ScenarioBadge({ source }: { source: Scenario['source'] }) {
  return (
    <Badge
      className={cn(
        'rounded-full border-0',
        source === 'IA' ? 'bg-fuchsia-500/15 text-fuchsia-200' : 'bg-cyan-500/15 text-cyan-200'
      )}
    >
      {source}
    </Badge>
  );
}

function formatSessionCountdown(timeLeftMs: number) {
  const safeMs = Math.max(0, timeLeftMs);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type ParsedGherkinScenario = {
  title: string;
  objective: string;
  steps: string;
  expectedResult: string;
};

function collectGherkinTexts(value: unknown, bucket: string[] = []) {
  if (typeof value === 'string') {
    if (/^\s*Feature:/m.test(value) || /^\s*Scenario(?: Outline)?:/m.test(value)) {
      bucket.push(value);
    }
    return bucket;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectGherkinTexts(item, bucket);
    }
    return bucket;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectGherkinTexts(item, bucket);
    }
  }

  return bucket;
}

function parseGherkinScenarios(text: string): ParsedGherkinScenario[] {
  const lines = text.split(/\r?\n/);
  const featureTitle =
    lines.find((line) => line.trim().startsWith('Feature:'))?.replace(/^.*Feature:\s*/, '').trim() || '';

  const scenarios: ParsedGherkinScenario[] = [];
  let currentTitle = '';
  let currentGiven: string[] = [];
  let currentWhen: string[] = [];
  let currentThen: string[] = [];
  let currentSection: 'given' | 'when' | 'then' | null = null;

  const flushScenario = () => {
    if (!currentTitle) return;
    scenarios.push({
      title: currentTitle,
      objective: featureTitle ? `Cobrir o comportamento descrito em ${featureTitle}.` : '',
      steps: [...currentGiven, ...currentWhen].join('\n').trim(),
      expectedResult: currentThen.join('\n').trim(),
    });
    currentTitle = '';
    currentGiven = [];
    currentWhen = [];
    currentThen = [];
    currentSection = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^Scenario(?: Outline)?:/i.test(line)) {
      flushScenario();
      currentTitle = line.replace(/^Scenario(?: Outline)?:\s*/i, '').trim();
      continue;
    }

    if (/^(Given|And)\b/i.test(line) && currentSection !== 'then' && currentSection !== 'when') {
      currentSection = 'given';
      currentGiven.push(line);
      continue;
    }

    if (/^When\b/i.test(line)) {
      currentSection = 'when';
      currentWhen.push(line);
      continue;
    }

    if (/^Then\b/i.test(line)) {
      currentSection = 'then';
      currentThen.push(line);
      continue;
    }

    if (/^And\b/i.test(line)) {
      if (currentSection === 'then') currentThen.push(line);
      else if (currentSection === 'when') currentWhen.push(line);
      else if (currentSection === 'given') currentGiven.push(line);
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      if (currentSection === 'then') currentThen.push(line);
      else if (currentSection === 'when') currentWhen.push(line);
      else if (currentSection === 'given') currentGiven.push(line);
    }
  }

  flushScenario();
  return scenarios;
}

export default function Page() {
  const router = useRouter();
  const [cards, setCards] = useState<DeliveryCard[]>(initialCards);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(initialCards[0].id);
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<ColumnId>('discovery');
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({
    epic: '',
    title: '',
    module: '',
    businessGoal: '',
    acceptanceCriteria: '',
    qaNotes: '',
    commitDate: '',
    dueDate: '',
    devStartedAt: '',
    devCompletedAt: '',
    devEstimatedHours: '',
    devActualHours: '',
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<PanelId>('kanban');
  const [panelOpen, setPanelOpen] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [currentAccount, setCurrentAccount] = useState<AuthAccount | null>(null);
  const [currentTenant, setCurrentTenant] = useState<AuthTenant | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const idleLogoutTimerRef = useRef<number | null>(null);
  const idleDeadlineRef = useRef<number | null>(null);
  const idleLogoutLockedRef = useRef(false);
  const [sessionTimeLeftMs, setSessionTimeLeftMs] = useState(SESSION_IDLE_TIMEOUT_MS);
  const [settings, setSettings] = useState({
    autoSync: true,
    aiSuggestions: true,
    showCriteria: true,
  });
  const [n8nSettings, setN8nSettings] = useState<N8nSettings>({
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
  });
  const [n8nDraftSettings, setN8nDraftSettings] = useState<N8nSettings>({
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
  });
  const [n8nConnectionVerified, setN8nConnectionVerified] = useState(false);
  const [n8nConnectionMessage, setN8nConnectionMessage] = useState('');
  const [hasUnsavedN8nSettings, setHasUnsavedN8nSettings] = useState(false);
  const clearAuthBootstrap = () => {
    if (typeof window === 'undefined') return;

    try {
      window.sessionStorage.removeItem(AUTH_BOOTSTRAP_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear auth bootstrap', error);
    }
  };

  const applyAuthBootstrap = (bootstrap: AuthBootstrap) => {
    setCurrentAccount(bootstrap.account);
    setCurrentTenant(bootstrap.tenant || null);
    setAuthState('authenticated');

    const tenant = bootstrap.tenant || null;
    const nextSettings: N8nSettings = {
      companyName: tenant?.companyName || bootstrap.account.companyName || '',
      cnpj: tenant?.cnpj || bootstrap.account.cnpj || '',
      address: tenant?.address || bootstrap.account.address || '',
      appPublicUrl: tenant?.appPublicUrl || '',
      webhookBaseUrl: tenant?.webhookBaseUrl || '',
      webhookPath: tenant?.webhookPath || '',
      webhookUrl: tenant?.webhookUrl || '',
      apiKey: tenant?.apiKey || '',
      discordWebhook: tenant?.discordWebhook || '',
      discordApplicationId: tenant?.discordApplicationId || '',
      discordPublicKey: tenant?.discordPublicKey || '',
      discordBotToken: tenant?.discordBotToken || '',
      discordGuildId: tenant?.discordGuildId || '',
      discordCommandName: tenant?.discordCommandName || 'qa',
      githubOwner: tenant?.githubOwner || '',
      githubRepo: tenant?.githubRepo || '',
      githubBranch: tenant?.githubBranch || 'main',
      githubToken: tenant?.githubToken || '',
      tenantId: tenant?.id || bootstrap.account.tenantId || '',
      tenantSlug: tenant?.slug || '',
      workflowPublishedAt: tenant?.workflowPublishedAt || '',
      workflowDownloadUrl: tenant?.workflowDownloadUrl || '',
      loadedAt: tenant?.loadedAt || '',
      updatedAt: tenant?.updatedAt || '',
    };

    setN8nSettings(nextSettings);
    setN8nDraftSettings(nextSettings);
    setHasUnsavedN8nSettings(false);
    setN8nConnectionVerified(Boolean(nextSettings.workflowPublishedAt));
    setN8nConnectionMessage(
      nextSettings.workflowPublishedAt
        ? 'Integracao preparada para este tenant. Valide novamente quando alterar os acessos.'
        : 'Clique em Validar integracao para confirmar os acessos.'
    );
  };

  type N8nConfigProblem = {
    field: keyof N8nSettings;
    label: string;
    reason: string;
  };

  const isValidUrl = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const getN8nIntegrationProblems = (settings: N8nSettings): N8nConfigProblem[] => {
    const problems: N8nConfigProblem[] = [];

    const requiredTextFields: { field: keyof N8nSettings; label: string }[] = [
      { field: 'appPublicUrl', label: 'URL pública do app' },
      { field: 'webhookUrl', label: 'Integracao do n8n' },
      { field: 'apiKey', label: 'API Key do n8n' },
      { field: 'discordBotToken', label: 'Discord Bot Token' },
      { field: 'githubOwner', label: 'GitHub Owner' },
      { field: 'githubRepo', label: 'GitHub Repo' },
      { field: 'githubBranch', label: 'GitHub Branch' },
      { field: 'githubToken', label: 'GitHub Token' },
    ];

    for (const item of requiredTextFields) {
      const value = String(settings[item.field] || '').trim();
      if (!value) {
        problems.push({ field: item.field, label: item.label, reason: 'está vazio' });
        continue;
      }

      if ((item.field === 'appPublicUrl' || item.field === 'webhookUrl') && !isValidUrl(value)) {
        problems.push({ field: item.field, label: item.label, reason: 'está com URL inválida' });
      }
    }

    return problems;
  };

  const isN8nIntegrationReady = (settings: N8nSettings) => getN8nIntegrationProblems(settings).length === 0;

  const formatN8nProblems = (problems: N8nConfigProblem[]) => {
    const labels = problems.map((problem) => `${problem.label} (${problem.reason})`);
    if (labels.length === 0) return '';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
    return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
  };

  const getN8nBlockingReason = () => {
    const problems = getN8nIntegrationProblems(n8nDraftSettings);

    if (hasUnsavedN8nSettings) {
      return problems.length > 0
        ? `salve as configuracoes antes de sincronizar. Campos com problema: ${formatN8nProblems(problems)}.`
        : 'salve as configurações antes de sincronizar.';
    }

    if (problems.length > 0) {
      return `revise as configuracoes antes de sincronizar. Campos com problema: ${formatN8nProblems(problems)}.`;
    }

    if (!n8nConnectionVerified) {
      return n8nConnectionMessage || 'teste a conexão antes de sincronizar.';
    }

    return null;
  };

  const sameN8nSettings = (left: N8nSettings, right: N8nSettings) => {
    const fields: (keyof N8nSettings)[] = [
      'appPublicUrl',
      'webhookUrl',
      'apiKey',
      'discordWebhook',
      'discordApplicationId',
      'discordPublicKey',
      'discordBotToken',
      'discordGuildId',
      'discordCommandName',
      'githubOwner',
      'githubRepo',
      'githubBranch',
      'githubToken',
    ];

    return fields.every((field) => String(left[field] || '').trim() === String(right[field] || '').trim());
  };

  const markN8nDraftChanged = useCallback((nextSettings: N8nSettings) => {
    setN8nDraftSettings(nextSettings);
    setHasUnsavedN8nSettings(!sameN8nSettings(nextSettings, n8nSettings));
    setN8nConnectionVerified(false);
    setN8nConnectionMessage('Configuracao alterada. Valide a integracao novamente.');
  }, [n8nSettings]);

  const handleN8nSettingsSave = useCallback((nextSettings: N8nSettings) => {
    setN8nSettings(nextSettings);
    setN8nDraftSettings(nextSettings);
    setHasUnsavedN8nSettings(false);
    setN8nConnectionVerified(false);
    setN8nConnectionMessage('Configuracao salva. Clique em Validar integracao para confirmar os acessos.');
  }, []);

  const mergeN8nSettings = (primary: Partial<N8nSettings>, fallback?: Partial<N8nSettings>): N8nSettings => ({
    companyName: primary.companyName ?? fallback?.companyName ?? '',
    cnpj: primary.cnpj ?? fallback?.cnpj ?? '',
    address: primary.address ?? fallback?.address ?? '',
    appPublicUrl: primary.appPublicUrl ?? fallback?.appPublicUrl ?? '',
    webhookBaseUrl: primary.webhookBaseUrl ?? fallback?.webhookBaseUrl ?? '',
    webhookPath: primary.webhookPath ?? fallback?.webhookPath ?? '',
    webhookUrl: primary.webhookUrl ?? fallback?.webhookUrl ?? '',
    apiKey: primary.apiKey ?? fallback?.apiKey ?? '',
    discordWebhook: primary.discordWebhook ?? fallback?.discordWebhook ?? '',
    discordApplicationId: primary.discordApplicationId ?? fallback?.discordApplicationId ?? '',
    discordPublicKey: primary.discordPublicKey ?? fallback?.discordPublicKey ?? '',
    discordBotToken: primary.discordBotToken ?? fallback?.discordBotToken ?? '',
    discordGuildId: primary.discordGuildId ?? fallback?.discordGuildId ?? '',
    discordCommandName: primary.discordCommandName ?? fallback?.discordCommandName ?? 'qa',
    githubOwner: primary.githubOwner ?? fallback?.githubOwner ?? '',
    githubRepo: primary.githubRepo ?? fallback?.githubRepo ?? '',
    githubBranch: primary.githubBranch ?? fallback?.githubBranch ?? 'main',
    githubToken: primary.githubToken ?? fallback?.githubToken ?? '',
    tenantId: primary.tenantId ?? fallback?.tenantId ?? '',
    tenantSlug: primary.tenantSlug ?? fallback?.tenantSlug ?? '',
    workflowPublishedAt: primary.workflowPublishedAt ?? fallback?.workflowPublishedAt ?? '',
    workflowDownloadUrl: primary.workflowDownloadUrl ?? fallback?.workflowDownloadUrl ?? '',
    loadedAt: primary.loadedAt ?? fallback?.loadedAt ?? '',
    updatedAt: primary.updatedAt ?? fallback?.updatedAt ?? '',
  });

  const loadN8nSettings = useCallback(async (tenantIdOverride?: string, fallbackSettings?: Partial<N8nSettings>) => {
    try {
      const tenantId = tenantIdOverride || fallbackSettings?.tenantId || '';
      const tenantQuery = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const [settingsResponse, configResponse] = await Promise.all([
        fetch(`/api/settings/n8n${tenantQuery}`, { cache: 'no-store' }),
        fetch(`/api/settings/n8n/config${tenantQuery}`, { cache: 'no-store' }),
      ]);

      if (!settingsResponse.ok || !configResponse.ok) {
        return;
      }

      const config = await settingsResponse.json();
      const publicConfig = await configResponse.json();

      const nextSettings = mergeN8nSettings(
        {
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
          tenantId: config.tenantId || publicConfig.tenantId || '',
          tenantSlug: config.tenantSlug || publicConfig.tenantSlug || '',
          workflowPublishedAt: config.workflowPublishedAt || publicConfig.workflowPublishedAt || '',
          workflowDownloadUrl: config.workflowDownloadUrl || publicConfig.workflowDownloadUrl || '',
          loadedAt: config.loadedAt || '',
          updatedAt: config.updatedAt || '',
        },
        fallbackSettings || { tenantId }
      );

      setN8nSettings(nextSettings);
      setN8nDraftSettings(nextSettings);
      setHasUnsavedN8nSettings(false);
      setN8nConnectionVerified(Boolean(nextSettings.workflowPublishedAt));
      setN8nConnectionMessage(
        nextSettings.workflowPublishedAt
          ? 'Integracao preparada para este tenant. Valide novamente quando alterar os acessos.'
          : 'Clique em Validar integracao para confirmar os acessos.'
      );
      setCurrentTenant((prev) => {
        if (prev?.id) return prev;
        if (!nextSettings.tenantId) return prev;

        return {
          id: nextSettings.tenantId,
          slug: nextSettings.tenantSlug || '',
          companyName: nextSettings.companyName || currentAccount?.companyName || '',
          cnpj: nextSettings.cnpj || currentAccount?.cnpj || '',
          address: nextSettings.address || currentAccount?.address || '',
          appPublicUrl: nextSettings.appPublicUrl || '',
          webhookBaseUrl: nextSettings.webhookBaseUrl || '',
          webhookPath: nextSettings.webhookPath || '',
          webhookUrl: nextSettings.webhookUrl || '',
          apiKey: nextSettings.apiKey || '',
          discordWebhook: nextSettings.discordWebhook || '',
          discordApplicationId: nextSettings.discordApplicationId || '',
          discordPublicKey: nextSettings.discordPublicKey || '',
          discordBotToken: nextSettings.discordBotToken || '',
          discordGuildId: nextSettings.discordGuildId || '',
          discordCommandName: nextSettings.discordCommandName || 'qa',
          githubOwner: nextSettings.githubOwner || '',
          githubRepo: nextSettings.githubRepo || '',
          githubBranch: nextSettings.githubBranch || 'main',
          githubToken: nextSettings.githubToken || '',
          workflowPublishedAt: nextSettings.workflowPublishedAt || '',
          workflowDownloadUrl: nextSettings.workflowDownloadUrl || '',
          loadedAt: nextSettings.loadedAt || '',
          updatedAt: nextSettings.updatedAt || '',
        };
      });
    } catch (error) {
      console.error('Failed to load n8n settings', error);
    }
  }, [currentAccount?.address, currentAccount?.cnpj, currentAccount?.companyName]);

  const loadTeamMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/members', {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (Array.isArray(data?.items)) {
        setTeamMembers(data.items);
      }
    } catch (error) {
      console.error('Failed to load team members', error);
    }
  }, []);

  const normalizeCardForUi = useCallback((card: DeliveryCard): DeliveryCard => ({
    ...card,
    commitDate: card.commitDate || '',
    dueDate: card.dueDate || '',
    devStartedAt: card.devStartedAt || '',
    devCompletedAt: card.devCompletedAt || '',
    devEstimatedHours: Number(card.devEstimatedHours || 0),
    devActualHours: Number(card.devActualHours || 0),
    estimatedExecutionMinutes: card.estimatedExecutionMinutes || 0,
    scenarios: (card.scenarios || []).map((scenario) => ({
      ...scenario,
      execution: scenario.execution || createDefaultExecution(10),
    })),
  }), []);

  const loadBoardCards = async () => {
    try {
      const response = await fetch('/api/board/cards', { cache: 'no-store' });
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data?.items) && data.items.length > 0) {
        const nextCards = data.items.map(normalizeCardForUi);
        setCards(nextCards);
        setSelectedId((prev) => {
          const found = nextCards.find((card: DeliveryCard) => card.id === prev);
          return found ? prev : nextCards[0].id;
        });
      }
    } catch (error) {
      console.error('Failed to load board cards', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let hasBootstrap = false;

    if (typeof window !== 'undefined') {
      try {
        const rawBootstrap = window.sessionStorage.getItem(AUTH_BOOTSTRAP_STORAGE_KEY);
        if (rawBootstrap) {
          const parsed = JSON.parse(rawBootstrap) as AuthBootstrap;
          if (parsed?.account?.id) {
            hasBootstrap = true;
            applyAuthBootstrap(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load auth bootstrap', error);
      }
    }

    const loadAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!mounted) return;

        if (!response.ok) {
          if (hasBootstrap || authState === 'authenticated') {
            return;
          }
          setAuthState('unauthenticated');
          return;
        }

        const data = await response.json();
        if (!mounted) return;

        setCurrentAccount(data.account || null);
        setCurrentTenant((prev) => data.tenant || prev || null);
        setAuthState('authenticated');
        void loadTeamMembers();

      } catch (error) {
        if (!mounted) return;
        console.error('Failed to load auth state', error);
        if (hasBootstrap || authState === 'authenticated') {
          return;
        }
        clearAuthBootstrap();
        setAuthState('unauthenticated');
      }
    };

    void loadAuth();

    return () => {
      mounted = false;
    };
  }, [authState, loadN8nSettings, loadTeamMembers]);

  useEffect(() => {
    if (authState === 'authenticated') {
      const tenantToLoad = currentAccount?.tenantId || currentTenant?.id || '';
      if (tenantToLoad) {
        void loadN8nSettings(tenantToLoad, currentTenant || undefined);
      }
      void loadTeamMembers();
      void loadBoardCards();
    }
  }, [authState, currentAccount?.tenantId, currentTenant, loadN8nSettings, loadTeamMembers]);

  useEffect(() => {
    if (authState === 'unauthenticated') {
      clearAuthBootstrap();
      router.replace('/login');
    }
  }, [authState, router]);

  const clearSyncMessage = () => {
    window.setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage(null);
    }, 4000);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSidebarClick = (id: PanelId) => {
    setActiveSection(id);
    if (id === 'kanban') {
      setPanelOpen(false);
      return;
    }
    setPanelOpen(true);
  };

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to logout', error);
    } finally {
      clearAuthBootstrap();
      setCurrentAccount(null);
      setCurrentTenant(null);
      setAuthState('unauthenticated');
      setN8nConnectionVerified(false);
      setN8nConnectionMessage('');
      setHasUnsavedN8nSettings(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== 'authenticated' || typeof window === 'undefined') {
      if (idleLogoutTimerRef.current) {
        window.clearTimeout(idleLogoutTimerRef.current);
        idleLogoutTimerRef.current = null;
      }
      idleDeadlineRef.current = null;
      setSessionTimeLeftMs(SESSION_IDLE_TIMEOUT_MS);
      idleLogoutLockedRef.current = false;
      return;
    }

    const triggerIdleLogout = async () => {
      if (idleLogoutLockedRef.current) {
        return;
      }

      idleLogoutLockedRef.current = true;
      setSyncStatus('error');
      setSyncMessage('Sessao encerrada por inatividade. Faca login novamente.');
      await handleLogout();
    };

    const resetIdleTimer = () => {
      if (idleLogoutTimerRef.current) {
        window.clearTimeout(idleLogoutTimerRef.current);
      }

      idleDeadlineRef.current = Date.now() + SESSION_IDLE_TIMEOUT_MS;
      setSessionTimeLeftMs(SESSION_IDLE_TIMEOUT_MS);
      idleLogoutTimerRef.current = window.setTimeout(() => {
        void triggerIdleLogout();
      }, SESSION_IDLE_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetIdleTimer();
      }
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetIdleTimer();

    const intervalId = window.setInterval(() => {
      const deadline = idleDeadlineRef.current;
      if (!deadline) {
        setSessionTimeLeftMs(SESSION_IDLE_TIMEOUT_MS);
        return;
      }

      setSessionTimeLeftMs(Math.max(0, deadline - Date.now()));
    }, 1000);

    return () => {
      if (idleLogoutTimerRef.current) {
        window.clearTimeout(idleLogoutTimerRef.current);
        idleLogoutTimerRef.current = null;
      }
      idleDeadlineRef.current = null;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      events.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
    };
  }, [authState, handleLogout]);

  const openCreateDialog = (column: ColumnId) => {
    setCreateColumn(column);
    setForm({
      epic: '',
      title: '',
      module: '',
      businessGoal: '',
      acceptanceCriteria: '',
      qaNotes: '',
      commitDate: '',
      dueDate: '',
      devStartedAt: '',
      devCompletedAt: '',
      devEstimatedHours: '',
      devActualHours: '',
    });
    setCreateOpen(true);
  };

  const syncSelectedCard = () => {
    syncWithN8n(selectedCard, 'update');
    handleSidebarClick('integrations');
  };

  const persistBoardCard = async (card: DeliveryCard, action: 'create' | 'update' | 'local' = 'update') => {
    const normalizedCard = normalizeCardForUi(card);

    setCards((prev) => prev.map((item) => (item.id === normalizedCard.id ? normalizedCard : item)));

    try {
      await fetch('/api/board/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card: normalizedCard }),
      });
    } catch (error) {
      console.error('Failed to persist board card', error);
    }

  };

  const syncWithN8n = async (
    card: DeliveryCard,
    action: 'create' | 'move' | 'update',
    options?: { quietOnBlock?: boolean; quietOnFailure?: boolean }
  ) => {
    const blockingReason = getN8nBlockingReason();

    if (blockingReason) {
      if (!options?.quietOnBlock) {
        setSyncStatus('error');
        setSyncMessage(`Integração n8n bloqueada: ${blockingReason}`);
        clearSyncMessage();
      }
      return;
    }

    setSyncStatus('pending');
    setSyncMessage('Tentando sincronizar com n8n...');

    try {
      const response = await fetch('/api/kanban/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: card.id,
          status: card.column,
          action,
          card,
          configSnapshot: n8nDraftSettings,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Erro desconhecido');
        if (!options?.quietOnFailure) {
          setSyncStatus('error');
          setSyncMessage(`Erro ao sincronizar com n8n: ${text}`);
          clearSyncMessage();
        } else {
          console.warn('Falha silenciosa ao sincronizar com n8n:', text);
        }
        return;
      }

      setSyncStatus('success');
      setSyncMessage('Sincronização enviada ao n8n.');
      clearSyncMessage();
    } catch (error) {
      if (!options?.quietOnFailure) {
        setSyncStatus('error');
        setSyncMessage(`Erro na integração com n8n: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        clearSyncMessage();
      } else {
        console.warn('Falha silenciosa na integração com n8n:', error);
      }
    }
  };

  const buildAiScenarioDrafts = (card: DeliveryCard): Scenario[] => {
    const normalizedCriteria = card.acceptanceCriteria
      .map((criterion) => criterion.trim())
      .filter(Boolean);

    const category = /perf|latenc|tempo|volume|carga/i.test(`${card.title} ${card.module} ${normalizedCriteria.join(' ')}`)
      ? 'Performance'
      : 'Funcional';

    const drafts: Scenario[] = [
      {
        id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}`,
        title: `Happy path for ${card.title}`,
        source: 'IA',
        status: 'Draft',
        objective: card.businessGoal,
        owner: card.owner,
        category,
        execution: createDefaultExecution(12),
      },
    ];

    if (normalizedCriteria.length > 1) {
      drafts.push({
        id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}`,
        title: `Business rules coverage for ${card.title}`,
        source: 'IA',
        status: 'Draft',
        objective: 'Cobrir regras, combinações e restrições descritas nos critérios de aceite.',
        owner: card.owner,
        category,
        execution: createDefaultExecution(12),
      });
    }

    if (normalizedCriteria.some((criterion) => /nao|não|inexist|inv[aá]lid|erro|falha|vazio|sem /i.test(criterion))) {
      drafts.push({
        id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}`,
        title: `Negative path and validation for ${card.title}`,
        source: 'IA',
        status: 'Draft',
        objective: 'Cobrir cenários inválidos, mensagens de erro e comportamento de exceção.',
        owner: card.owner,
        category,
        execution: createDefaultExecution(10),
      });
    }

    if (normalizedCriteria.some((criterion) => /perfil|permiss|autentic|sess[aã]o|papel|acesso/i.test(criterion))) {
      drafts.push({
        id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}`,
        title: `Permission and access control for ${card.title}`,
        source: 'IA',
        status: 'Draft',
        objective: 'Validar restrições de acesso, autenticação e perfis envolvidos no fluxo.',
        owner: card.owner,
        category,
        execution: createDefaultExecution(10),
      });
    }

    if (category === 'Performance') {
      drafts.push({
        id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}`,
        title: `Performance and response time for ${card.title}`,
        source: 'IA',
        status: 'Draft',
        objective: 'Avaliar estabilidade, volume e tempo de resposta do fluxo.',
        owner: card.owner,
        category,
        execution: createDefaultExecution(15),
      });
    }

    return drafts;
  };

  const generateAiWithN8n = async (card: DeliveryCard, scenarios: Scenario[]) => {
    if (hasUnsavedN8nSettings || !isN8nIntegrationReady(n8nDraftSettings) || !n8nConnectionVerified) return;

    try {
      setSyncStatus('pending');
      setSyncMessage(`Gerando ${scenarios.length} cenários por IA...`);
      const primaryScenario = scenarios[0];
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: primaryScenario.id,
          title: primaryScenario.title,
          module: card.module,
          category: /perf/i.test(`${card.id} ${card.module} ${card.title}`) ? 'Performance' : 'Funcional',
          priority: card.priority,
          status: primaryScenario.status || 'Draft',
          objective: card.businessGoal,
          preconditions: card.qaNotes,
          owner: card.owner,
          cardId: card.id,
          card,
          scenarioBatch: scenarios.map((scenario) => ({
            id: scenario.id,
            title: scenario.title,
            module: card.module,
            category: scenario.category || 'Funcional',
            priority: card.priority,
            status: scenario.status || 'Draft',
            objective: scenario.objective || card.businessGoal,
            owner: scenario.owner || card.owner,
          })),
          scenarioCountHint: scenarios.length,
          generationMode: 'multi_scenario_from_acceptance_criteria',
          generationInstructions:
            'Leia os critérios de aceite, interprete a intenção da task e gere vários cenários complementares. ' +
            'Não copie os critérios literalmente. Crie cenários distintos cobrindo happy path, regras de negócio, ' +
            'validações, exceções e casos negativos quando fizer sentido.',
          acceptanceCriteria: card.acceptanceCriteria,
          businessGoal: card.businessGoal,
          qaNotes: card.qaNotes,
          syncToN8n: true,
          configSnapshot: n8nDraftSettings,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.stage
          ? `Erro ao gerar cenário por IA em ${payload.stage}: ${payload.error || 'Falha desconhecida'}`
          : payload?.error || 'Erro ao gerar cenário por IA';
        setSyncStatus('error');
        setSyncMessage(message);
        clearSyncMessage();
        console.error('Erro ao gerar cenários com IA', payload);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      const structuredGeneratedScenarios = Array.isArray(payload?.generatedScenarios)
        ? payload.generatedScenarios
            .map((scenario: Record<string, unknown>) => ({
              title: String(scenario?.title || '').trim(),
              objective: String(scenario?.objective || '').trim(),
              steps: String(scenario?.steps || '').trim(),
              expectedResult: String(scenario?.expectedResult || '').trim(),
            }))
            .filter((scenario: ParsedGherkinScenario) => scenario.title || scenario.steps || scenario.expectedResult)
        : [];
      const generatedTexts = collectGherkinTexts(payload?.n8n || payload);
      const parsedGeneratedScenarios =
        structuredGeneratedScenarios.length > 0
          ? structuredGeneratedScenarios
          : generatedTexts.flatMap((text) => parseGherkinScenarios(text));

      if (parsedGeneratedScenarios.length > 0) {
        const existingScenarioIds = new Set(card.scenarios.map((scenario) => scenario.id));
        const updatedScenarios = card.scenarios.map((scenario, index) => {
          const generated = parsedGeneratedScenarios[index];
          if (!generated) {
            return scenario;
          }

          return {
            ...scenario,
            title: generated.title || scenario.title,
            objective: generated.objective || scenario.objective || card.businessGoal,
            steps: generated.steps || scenario.steps || '',
            expectedResult: generated.expectedResult || scenario.expectedResult || '',
            status: 'Ready' as const,
          };
        });

        const overflowScenarios = parsedGeneratedScenarios.slice(updatedScenarios.length).map((generated: ParsedGherkinScenario, index: number) => ({
          id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}-${index + 1}`,
          title: generated.title || `AI scenario ${index + 1} for ${card.title}`,
          source: 'IA' as const,
          status: 'Ready' as const,
          objective: generated.objective || card.businessGoal,
          steps: generated.steps || '',
          expectedResult: generated.expectedResult || '',
          category: /perf/i.test(`${card.id} ${card.module} ${card.title}`) ? 'Performance' as const : 'Funcional' as const,
          owner: card.owner,
          execution: createDefaultExecution(10),
        })).filter((scenario: Scenario) => !existingScenarioIds.has(scenario.id));

        const updatedCard = {
          ...card,
          scenarios: [...overflowScenarios, ...updatedScenarios],
        };

        await persistBoardCard(updatedCard, 'update');
      }

      setSyncStatus('success');
      setSyncMessage(
        parsedGeneratedScenarios.length > 0
          ? `${parsedGeneratedScenarios.length} cenários gerados e preenchidos no sistema.`
          : `${scenarios.length} cenários enviados para geração IA com sucesso.`,
      );
      clearSyncMessage();
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(`Erro na geração de cenários IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      clearSyncMessage();
      console.error('Erro na geração de cenários IA:', error);
    }
  };

  const handleCardChange = (card: DeliveryCard) => {
    void persistBoardCard(card, 'update');
  };

  const handleScenarioChange = (scenarioId: string, patch: Partial<Scenario>) => {
    const updatedCard = {
      ...selectedCard,
      scenarios: selectedCard.scenarios.map((scenario) =>
        scenario.id === scenarioId
          ? {
              ...scenario,
              ...patch,
              execution: patch.execution
                ? {
                    ...(scenario.execution || createDefaultExecution()),
                    ...patch.execution,
                  }
                : scenario.execution,
            }
          : scenario,
      ),
    };

    void persistBoardCard(updatedCard, 'update');
  };

  const handleAddScenario = () => {
    const scenario: Scenario = {
      id: `CT-MAN-${Math.floor(Math.random() * 900 + 100)}`,
      title: `Manual scenario for ${selectedCard.title}`,
      source: 'Manual',
      status: 'Draft',
      objective: '',
      steps: '',
      expectedResult: '',
      category: 'Funcional',
      owner: selectedCard.owner,
      execution: createDefaultExecution(10),
    };

    const updatedCard = {
      ...selectedCard,
      scenarios: [scenario, ...selectedCard.scenarios],
    };

    void persistBoardCard(updatedCard, 'update');
  };

  const handleDeleteScenario = (scenarioId: string) => {
    const updatedCard = {
      ...selectedCard,
      scenarios: selectedCard.scenarios.filter((scenario) => scenario.id !== scenarioId),
    };

    void persistBoardCard(updatedCard, 'update');
  };

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedId) || cards[0],
    [cards, selectedId]
  );

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const text = [
        card.id,
        card.title,
        card.epic,
        card.module,
        card.businessGoal,
        card.commitDate || '',
        card.dueDate || '',
        card.owner,
        card.acceptanceCriteria.join(' '),
        card.scenarios.map((scenario) => scenario.title).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [cards, search]);

  const grouped = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.id] = filteredCards.filter((card) => card.column === column.id);
      return acc;
    }, {} as Record<ColumnId, DeliveryCard[]>);
  }, [filteredCards]);

  const totalScenarios = cards.reduce((acc, card) => acc + card.scenarios.length, 0);
  const totalAi = cards.reduce((acc, card) => acc + card.scenarios.filter((scenario) => scenario.source === 'IA').length, 0);
  const totalReady = cards.filter((card) => card.column === 'qa').length;
  const hasTenantDataResolved = Boolean(
    currentTenant?.id ||
      n8nSettings.tenantId ||
      n8nSettings.companyName ||
      n8nSettings.appPublicUrl ||
      n8nSettings.webhookUrl ||
      n8nSettings.webhookBaseUrl
  );

  const handleCreate = () => {
    const acceptanceCriteria = form.acceptanceCriteria
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const shouldSeedScenario = createColumn === 'qa' || createColumn === 'testing' || createColumn === 'done';

    const newCard: DeliveryCard = {
      id: `DEL-${Math.floor(Math.random() * 900 + 100)}`,
      epic: form.epic || 'Novo épico',
      title: form.title || 'Nova entrega',
      module: form.module || 'Geral',
      column: createColumn,
      priority: 'Média',
      owner: teamMembers[0]?.name || currentAccount?.companyName || 'Responsavel pendente',
      ownerId: teamMembers[0]?.id || '',
      businessGoal: form.businessGoal || 'Sem objetivo informado.',
      acceptanceCriteria,
      commitDate: form.commitDate || '',
      dueDate: form.dueDate || '',
      devStartedAt: form.devStartedAt || '',
      devCompletedAt: form.devCompletedAt || '',
      devEstimatedHours: Number(form.devEstimatedHours || 0),
      devActualHours: Number(form.devActualHours || 0),
      estimatedExecutionMinutes: Math.max(acceptanceCriteria.length * 10, 15),
      qaNotes: form.qaNotes,
      scenarios: acceptanceCriteria.length && shouldSeedScenario
        ? [
              {
                id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}`,
                title: `AI scenario draft for ${form.title || 'new delivery'}`,
              source: 'IA',
              status: 'Draft',
              objective: form.businessGoal || '',
              expectedResult: acceptanceCriteria.join('\n'),
              execution: createDefaultExecution(10),
            },
          ]
          : [],
    };

    setCards((prev) => [newCard, ...prev]);
    setSelectedId(newCard.id);
    setActiveSection('kanban');
    setPanelOpen(false);
    setCreateOpen(false);
    setForm({
      epic: '',
      title: '',
      module: '',
      businessGoal: '',
      acceptanceCriteria: '',
      qaNotes: '',
      commitDate: '',
      dueDate: '',
      devStartedAt: '',
      devCompletedAt: '',
      devEstimatedHours: '',
      devActualHours: '',
    });

    void persistBoardCard(newCard, 'create');
  };

  const generateAiScenario = () => {
    const blockingReason = getN8nBlockingReason();
    if (blockingReason) {
      setSyncStatus('error');
      setSyncMessage(`Integração n8n bloqueada: ${blockingReason}`);
      clearSyncMessage();
      return;
    }

    const aiScenarios = buildAiScenarioDrafts(selectedCard);

    const updatedCard = {
      ...selectedCard,
      scenarios: [...aiScenarios, ...selectedCard.scenarios],
    };

    void persistBoardCard(updatedCard, 'local');

    generateAiWithN8n(updatedCard, aiScenarios);
  };

  const moveCard = async (cardId: string, newColumn: ColumnId) => {
    const card = cards.find((item) => item.id === cardId);
    if (card) {
      setCards((prev) => prev.map((item) => (item.id === cardId ? { ...item, column: newColumn } : item)));
    }
  };

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/10 px-6 py-4 text-sm text-slate-200 backdrop-blur-2xl">
          Carregando sua conta...
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/10 px-6 py-4 text-sm text-slate-200 backdrop-blur-2xl">
          Redirecionando para o login...
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.16),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_20%),linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] text-white">
        <main className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 shadow-[0_35px_90px_-40px_rgba(8,15,30,0.95)] backdrop-blur-2xl sm:p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <OrionLogo />
                  <Badge className="rounded-full border-0 bg-cyan-500/10 px-3 py-1 text-cyan-100">Workspace principal</Badge>
                  <Badge className="rounded-full border-0 bg-white/10 px-3 py-1 text-slate-200">Central de Entregas</Badge>
                </div>

                <div>
                  <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Painel de entregas Orion</h1>
                  <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">
                    Organize discovery, refinamento, desenvolvimento, QA e execução em um fluxo único, com visual mais limpo e foco no que realmente precisa avançar.
                  </p>
                </div>

                {syncMessage && (
                  <div
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-sm',
                      syncStatus === 'pending'
                        ? 'border-slate-500 bg-slate-950/80 text-slate-100'
                        : syncStatus === 'success'
                        ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                        : 'border-amber-400 bg-amber-500/10 text-amber-200'
                    )}
                  >
                    {syncMessage}
                  </div>
                )}

                {authState === 'authenticated' && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Sessao expira em <span className="font-mono font-semibold">{formatSessionCountdown(sessionTimeLeftMs)}</span> por inatividade.
                  </div>
                )}

                {currentAccount?.tenantId && !currentTenant && !hasTenantDataResolved && (
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-amber-300" />
                      <div className="space-y-1">
                        <div className="font-semibold">Tenant não encontrado no banco conectado</div>
                        <div className="text-amber-100/80">
                          A conta existe, mas a linha correspondente em <span className="font-semibold">tenants</span> não foi localizada.
                          Os dados de integração dependem desse registro para aparecerem no front.
                        </div>
                        <div className="text-xs text-amber-100/70">
                          Tenant ID: <span className="font-mono">{currentAccount.tenantId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-stretch gap-3 xl:min-w-[320px] xl:max-w-[360px]">
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[0_25px_60px_-40px_rgba(34,211,238,0.85)]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-fuchsia-500/15 text-sm font-bold text-fuchsia-100">
                          {currentAccount?.companyName?.[0]?.toUpperCase() || 'O'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{currentAccount?.companyName || 'Orion'}</div>
                          <div className="truncate text-[11px] text-slate-400">
                            {currentTenant?.slug ? `Tenant: ${currentTenant.slug}` : currentAccount?.email}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-300" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 rounded-2xl border-white/10 bg-[#0b1220] p-2 text-white">
                      <DropdownMenuItem className="rounded-xl text-slate-200 focus:bg-white/10 focus:text-white" onClick={() => handleSidebarClick('integrations')}>
                        <GitBranch className="mr-2 h-4 w-4" />
                        Integrações
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl text-slate-200 focus:bg-white/10 focus:text-white" onClick={() => handleSidebarClick('settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl text-slate-200 focus:bg-white/10 focus:text-white" onClick={() => handleSidebarClick('executive')}>
                        <Clock3 className="mr-2 h-4 w-4" />
                        Dashboard de tempos
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl text-slate-200 focus:bg-white/10 focus:text-white" onClick={() => router.push('/admin')}>
                        <Database className="mr-2 h-4 w-4" />
                        Painel administrativo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="rounded-xl text-rose-200 focus:bg-rose-500/10 focus:text-rose-100" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Sistema</div>
                      <div className="mt-1 text-sm font-semibold text-white">Orion</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Visão ativa</div>
                      <div className="mt-1 text-sm font-semibold text-white">Pipeline de entregas</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Entregas no fluxo" value={cards.length} subtitle="Itens acompanhados no Orion" glow="bg-gradient-to-r from-fuchsia-500 to-violet-500" />
            <StatCard title="Cenários mapeados" value={totalScenarios} subtitle="Manuais e assistidos por IA" glow="bg-gradient-to-r from-cyan-500 to-sky-500" />
            <StatCard title="Sugestões por IA" value={totalAi} subtitle="Cenários com apoio inteligente" glow="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <StatCard title="Prontos para QA" value={totalReady} subtitle="Cards preparados para validação" glow="bg-gradient-to-r from-emerald-500 to-lime-500" />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-12">
            <KanbanSection
              columns={columns}
              grouped={grouped}
              search={search}
              setSearch={setSearch}
              setSelectedId={setSelectedId}
              setDetailOpen={setDetailOpen}
              moveCard={moveCard}
              onCreateInColumn={openCreateDialog}
            />
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="rounded-[32px] border-white/10 bg-[#090d1a] text-white sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Nova entrega em {columns.find((column) => column.id === createColumn)?.title}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Cadastre o item no estágio certo do fluxo e evolua depois no board do Orion.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <Input value={form.epic} onChange={(e) => setForm((prev) => ({ ...prev, epic: e.target.value }))} placeholder="Epico" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                <Input value={form.module} onChange={(e) => setForm((prev) => ({ ...prev, module: e.target.value }))} placeholder="Modulo" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Titulo da entrega" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 md:col-span-2" />
                <Input type="date" value={form.commitDate} onChange={(e) => setForm((prev) => ({ ...prev, commitDate: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white" />
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white" />
                <Input type="date" value={form.devStartedAt} onChange={(e) => setForm((prev) => ({ ...prev, devStartedAt: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white" />
                <Input type="date" value={form.devCompletedAt} onChange={(e) => setForm((prev) => ({ ...prev, devCompletedAt: e.target.value }))} className="rounded-2xl border-white/10 bg-white/5 text-white" />
                <Input type="number" min={0} value={form.devEstimatedHours} onChange={(e) => setForm((prev) => ({ ...prev, devEstimatedHours: e.target.value }))} placeholder="Horas estimadas Dev" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                <Input type="number" min={0} value={form.devActualHours} onChange={(e) => setForm((prev) => ({ ...prev, devActualHours: e.target.value }))} placeholder="Horas reais Dev" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                <Textarea value={form.businessGoal} onChange={(e) => setForm((prev) => ({ ...prev, businessGoal: e.target.value }))} placeholder="Objetivo de negocio" className="min-h-[110px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 md:col-span-2" />
                <Textarea value={form.acceptanceCriteria} onChange={(e) => setForm((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))} placeholder="Criterios de aceite (um por linha)" className="min-h-[150px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 md:col-span-2" />
                <Textarea value={form.qaNotes} onChange={(e) => setForm((prev) => ({ ...prev, qaNotes: e.target.value }))} placeholder="Notas iniciais de QA" className="min-h-[110px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 md:col-span-2" />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500" onClick={handleCreate}>
                  Criar entrega
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
            <DialogContent className="flex h-[96vh] max-h-[96vh] w-[min(1480px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[32px] border-white/10 bg-[#090d1a] p-0 text-white sm:max-w-[1480px]">
              {activeSection === 'criteria' && (
                <CriteriaSection
                  selectedCard={selectedCard}
                  setSelectedId={setSelectedId}
                  setDetailOpen={setDetailOpen}
                  setActiveSection={setActiveSection}
                />
              )}

              {activeSection === 'executive' && (
                <div className="flex min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
                  <TimingDashboardSection cards={cards} />
                </div>
              )}

                {activeSection === 'qa' && (
                  <div className="flex min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
                    <QaSection
                      selectedCard={selectedCard}
                      teamMembers={teamMembers}
                      moveCard={moveCard}
                      generateAiScenario={generateAiScenario}
                      syncStatus={syncStatus}
                      syncMessage={syncMessage}
                      onCardChange={handleCardChange}
                      onScenarioChange={handleScenarioChange}
                      onDeleteScenario={handleDeleteScenario}
                      onAddScenario={handleAddScenario}
                    />
                  </div>
                )}

              {activeSection === 'automation' && <AutomationSection totalAi={totalAi} generateAiScenario={generateAiScenario} />}

              {activeSection === 'integrations' && <IntegrationsSection syncSelectedCard={syncSelectedCard} settings={settings} />}

              {activeSection === 'settings' && (
                <SettingsSection
                  settings={settings}
                  toggleSetting={toggleSetting}
                  tenantData={currentTenant}
                  tenantId={currentAccount?.tenantId || currentTenant?.id || ''}
                  tenantMissing={Boolean(currentAccount?.tenantId && !currentTenant && !hasTenantDataResolved)}
                  n8nSettings={n8nSettings}
                  onN8nSettingsSave={handleN8nSettingsSave}
                  onN8nSettingsChange={markN8nDraftChanged}
                  onN8nConnectionTestResult={(ok, message) => {
                    setN8nConnectionVerified(ok);
                    setN8nConnectionMessage(message);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </main>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="flex max-h-[88vh] w-[min(960px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[32px] border-white/10 bg-[#090d1a] p-0 text-white sm:max-w-5xl">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <DialogHeader>
              <DialogTitle className="pr-10 text-2xl font-black tracking-tight text-white">{selectedCard.title}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {selectedCard.id} • {selectedCard.module} • {selectedCard.epic}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.95)]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Responsável</div>
                  <div className="mt-2 font-semibold text-white">{selectedCard.owner}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.95)]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Módulo</div>
                  <div className="mt-2 font-semibold text-white">{selectedCard.module}</div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 text-slate-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.95)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Clock3 className="h-4 w-4 text-cyan-400" />
                    Datas e tempos da entrega
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                      setDetailOpen(false);
                      setActiveSection('executive');
                      setPanelOpen(true);
                    }}
                  >
                    Dashboard de tempos
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Commit date</div>
                    <Input
                      type="date"
                      value={selectedCard.commitDate || ''}
                      onChange={(e) => handleCardChange({ ...selectedCard, commitDate: e.target.value })}
                      className="rounded-2xl border-white/10 bg-slate-950/70 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Due date</div>
                    <Input
                      type="date"
                      value={selectedCard.dueDate || ''}
                      onChange={(e) => handleCardChange({ ...selectedCard, dueDate: e.target.value })}
                      className="rounded-2xl border-white/10 bg-slate-950/70 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Horas estimadas Dev</div>
                    <Input
                      type="number"
                      min={0}
                      value={selectedCard.devEstimatedHours || 0}
                      onChange={(e) => handleCardChange({ ...selectedCard, devEstimatedHours: Number(e.target.value || 0) })}
                      className="rounded-2xl border-white/10 bg-slate-950/70 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Horas reais Dev</div>
                    <Input
                      type="number"
                      min={0}
                      value={selectedCard.devActualHours || 0}
                      onChange={(e) => handleCardChange({ ...selectedCard, devActualHours: Number(e.target.value || 0) })}
                      className="rounded-2xl border-white/10 bg-slate-950/70 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Inicio Dev</div>
                    <Input
                      type="date"
                      value={selectedCard.devStartedAt || ''}
                      onChange={(e) => handleCardChange({ ...selectedCard, devStartedAt: e.target.value })}
                      className="rounded-2xl border-white/10 bg-slate-950/70 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Conclusao Dev</div>
                    <Input
                      type="date"
                      value={selectedCard.devCompletedAt || ''}
                      onChange={(e) => handleCardChange({ ...selectedCard, devCompletedAt: e.target.value })}
                      className="rounded-2xl border-white/10 bg-slate-950/70 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
                  onClick={() => {
                    setDetailOpen(false);
                    setActiveSection('qa');
                    setPanelOpen(true);
                  }}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Abrir QA
                </Button>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 text-slate-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.95)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers3 className="h-4 w-4 text-fuchsia-400" />
                  Objetivo de negócio
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{selectedCard.businessGoal}</p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 text-slate-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.95)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    Critérios de aceite
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {selectedCard.acceptanceCriteria.map((criterion, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-200">
                      {criterion}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 text-slate-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.95)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Cenários
                  </div>
                  <Badge className="rounded-full border-0 bg-white/10 text-slate-100">{selectedCard.scenarios.length}</Badge>
                </div>
                <div className="mt-4 max-h-[38vh] space-y-3 overflow-y-auto pr-1">
                  {selectedCard.scenarios.map((scenario) => (
                    <div key={scenario.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-400">{scenario.id}</div>
                          <div className="mt-1 break-words text-sm font-semibold text-slate-100">{scenario.title}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ScenarioBadge source={scenario.source} />
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="rounded-2xl border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                            onClick={() => handleDeleteScenario(scenario.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-white/10 px-6 py-4 sm:px-8">
            <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
