'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bot,
  Database,
  FileText,
  GitBranch,
  KanbanSquare,
  Layers3,
  LayoutDashboard,
  Plus,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { SidebarItem } from '@/components/dashboard/SidebarItem';
import { ExecutiveSection } from '@/components/dashboard/ExecutiveSection';
import { KanbanSection } from '@/components/dashboard/KanbanSection';
import { CriteriaSection } from '@/components/dashboard/CriteriaSection';
import { QaSection } from '@/components/dashboard/QaSection';
import { AutomationSection } from '@/components/dashboard/AutomationSection';
import { IntegrationsSection } from '@/components/dashboard/IntegrationsSection';
import { SettingsSection } from '@/components/dashboard/SettingsSection';
import { cn } from '@/lib/utils';
import type { ColumnId, DeliveryCard, N8nSettings, PanelId, Scenario, TeamMember } from '@/components/dashboard/types';

const columns: { id: ColumnId; title: string; hint: string }[] = [
  { id: 'discovery', title: 'Discovery', hint: 'Ideias e entendimento de negócio' },
  { id: 'refinement', title: 'Refinement', hint: 'Critérios de aceite e detalhamento' },
  { id: 'qa', title: 'Ready for QA', hint: 'Pronto para gerar/revisar cenários' },
  { id: 'testing', title: 'Testing', hint: 'Execução manual e automação' },
  { id: 'done', title: 'Done', hint: 'Testado, sincronizado e entregue' },
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

export default function Page() {
  const router = useRouter();
  const [cards, setCards] = useState<DeliveryCard[]>(initialCards);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(initialCards[0].id);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({
    epic: '',
    title: '',
    module: '',
    businessGoal: '',
    acceptanceCriteria: '',
    qaNotes: '',
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<PanelId>('kanban');
  const [panelOpen, setPanelOpen] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [currentAccount, setCurrentAccount] = useState<AuthAccount | null>(null);
  const [currentTenant, setCurrentTenant] = useState<AuthTenant | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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
        ? 'Workflow publicado para este tenant. Teste novamente quando alterar as integrações.'
        : 'Clique em Testar conexão para validar o webhook.'
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
      { field: 'webhookUrl', label: 'Webhook URL do n8n' },
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
        ? `salve as configurações antes de sincronizar. Campos com problema: ${formatN8nProblems(problems)}.`
        : 'salve as configurações antes de sincronizar.';
    }

    if (problems.length > 0) {
      return `revise as configurações antes de sincronizar. Campos com problema: ${formatN8nProblems(problems)}.`;
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
    setN8nConnectionMessage('Configuração alterada. Teste a conexão novamente.');
  }, [n8nSettings]);

  const handleN8nSettingsSave = useCallback((nextSettings: N8nSettings) => {
    setN8nSettings(nextSettings);
    setN8nDraftSettings(nextSettings);
    setHasUnsavedN8nSettings(false);
    setN8nConnectionVerified(false);
    setN8nConnectionMessage('Configuração salva. Clique em Testar conexão para validar o webhook.');
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
          ? 'Workflow publicado para este tenant. Teste novamente quando alterar as integrações.'
          : 'Clique em Testar conexão para validar o webhook.'
      );
    } catch (error) {
      console.error('Failed to load n8n settings', error);
    }
  }, []);

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

  const handleLogout = async () => {
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

  const generateAiWithN8n = async (card: DeliveryCard, scenario: Scenario) => {
    if (hasUnsavedN8nSettings || !isN8nIntegrationReady(n8nDraftSettings) || !n8nConnectionVerified) return;

    try {
      setSyncStatus('pending');
      setSyncMessage('Gerando cenário por IA...');
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: scenario.id,
          title: scenario.title,
          module: card.module,
          category: /perf/i.test(`${card.id} ${card.module} ${card.title}`) ? 'Performance' : 'Funcional',
          priority: card.priority,
          status: scenario.status || 'Draft',
          objective: card.businessGoal,
          preconditions: card.qaNotes,
          steps: card.acceptanceCriteria.join('\n'),
          expectedResult: card.acceptanceCriteria.join('\n'),
          owner: card.owner,
          cardId: card.id,
          card,
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

      setSyncStatus('success');
      setSyncMessage('Cenário enviado para geração IA com sucesso.');
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

  const handleCreate = () => {
    const acceptanceCriteria = form.acceptanceCriteria
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const newCard: DeliveryCard = {
      id: `DEL-${Math.floor(Math.random() * 900 + 100)}`,
      epic: form.epic || 'Novo épico',
      title: form.title || 'Nova entrega',
      module: form.module || 'Geral',
      column: acceptanceCriteria.length ? 'qa' : 'refinement',
      priority: 'Média',
      owner: teamMembers[0]?.name || currentAccount?.companyName || 'Responsavel pendente',
      ownerId: teamMembers[0]?.id || '',
      businessGoal: form.businessGoal || 'Sem objetivo informado.',
      acceptanceCriteria,
      estimatedExecutionMinutes: Math.max(acceptanceCriteria.length * 10, 15),
      qaNotes: form.qaNotes,
      scenarios: acceptanceCriteria.length
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
    setActiveSection('qa');
    setPanelOpen(true);
    setCreateOpen(false);
    setForm({ epic: '', title: '', module: '', businessGoal: '', acceptanceCriteria: '', qaNotes: '' });

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

    const aiScenario: Scenario = {
      id: `CT-AI-${Math.floor(Math.random() * 900 + 100)}`,
      title: `AI scenario draft for ${selectedCard.title}`,
      source: 'IA' as const,
      status: 'Ready' as const,
      objective: selectedCard.businessGoal,
      steps: selectedCard.acceptanceCriteria.join('\n'),
      expectedResult: selectedCard.acceptanceCriteria.join('\n'),
      owner: selectedCard.owner,
      execution: createDefaultExecution(12),
    };

    const updatedCard = {
      ...selectedCard,
      scenarios: [aiScenario, ...selectedCard.scenarios],
    };

    void persistBoardCard(updatedCard, 'local');

    generateAiWithN8n(updatedCard, aiScenario);
  };

  const moveCard = async (cardId: string, newColumn: ColumnId) => {
    const card = cards.find((item) => item.id === cardId);
    if (card) {
      setCards((prev) => prev.map((item) => (item.id === cardId ? { ...item, column: newColumn } : item)));
      if (settings.autoSync) {
        void syncWithN8n({ ...card, column: newColumn }, 'move', { quietOnBlock: true, quietOnFailure: true });
      }
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
      <div className="grid min-h-screen grid-cols-12">
        <aside className="col-span-12 border-r border-white/10 bg-black/20 px-5 py-6 backdrop-blur-2xl lg:col-span-2">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))] p-5 shadow-[0_25px_80px_-35px_rgba(217,70,239,0.6)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-[0_20px_50px_-20px_rgba(217,70,239,0.9)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight">QA Flow Pro</div>
                <div className="text-xs text-slate-400">PO → QA → n8n → GitHub</div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {(
              [
                { id: 'executive' as PanelId, icon: <LayoutDashboard className="h-4 w-4" />, label: 'Visão executiva' },
                { id: 'kanban' as PanelId, icon: <KanbanSquare className="h-4 w-4" />, label: 'Kanban de entregas' },
                { id: 'qa' as PanelId, icon: <ShieldCheck className="h-4 w-4" />, label: 'Área de QA' },
                { id: 'automation' as PanelId, icon: <Bot className="h-4 w-4" />, label: 'IA e automação' },
                { id: 'integrations' as PanelId, icon: <GitBranch className="h-4 w-4" />, label: 'Integrações' },
                { id: 'settings' as PanelId, icon: <Settings className="h-4 w-4" />, label: 'Configurações' },
              ] as const
            ).map((section) => (
              <SidebarItem
                key={section.id}
                active={activeSection === section.id}
                icon={section.icon}
                label={section.label}
                onClick={() => handleSidebarClick(section.id)}
              />
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">Integrações ativas</div>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between"><span>GitHub</span><Badge className="rounded-full bg-emerald-500/20 text-emerald-200">Online</Badge></div>
              <div className="flex items-center justify-between"><span>n8n</span><Badge className="rounded-full bg-emerald-500/20 text-emerald-200">Online</Badge></div>
            </div>
          </div>
        </aside>

        <main className="col-span-12 px-6 py-6 lg:col-span-10 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
                <Sparkles className="h-3.5 w-3.5" />
                SaaS visual PRO
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
                Um board bonito, forte e com cara de produto vendável.
              </h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">
                O PO descreve o valor de negócio e os critérios de aceite. A IA transforma isso em cenários sugeridos. O QA refina, ajusta ou cria manualmente, enquanto o fluxo segue integrado com n8n e GitHub.
              </p>
              {syncMessage && (
                <div
                  className={cn(
                    'mt-4 rounded-2xl border px-4 py-3 text-sm',
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

              {currentAccount?.tenantId && !currentTenant && (
                <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
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

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-200">
                  {currentAccount?.companyName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <div className="font-semibold text-white">{currentAccount?.companyName || 'Conta ativa'}</div>
                  <div className="text-[11px] text-slate-400">{currentTenant?.slug ? `Tenant: ${currentTenant.slug}` : currentAccount?.email}</div>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-5 text-white hover:bg-white/10"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>

              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 text-white shadow-[0_18px_45px_-18px_rgba(217,70,239,0.95)] hover:from-fuchsia-500 hover:to-violet-500">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova entrega
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-white/10 bg-[#090d1a] text-white sm:max-w-3xl rounded-[32px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Criar entrega PO → QA</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Critérios de aceite aqui podem virar cenários sugeridos automaticamente pela IA e seguir para o fluxo do n8n.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input value={form.epic} onChange={(e) => setForm((prev) => ({ ...prev, epic: e.target.value }))} placeholder="Épico" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                    <Input value={form.module} onChange={(e) => setForm((prev) => ({ ...prev, module: e.target.value }))} placeholder="Módulo" className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                    <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Título da entrega" className="md:col-span-2 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                    <Textarea value={form.businessGoal} onChange={(e) => setForm((prev) => ({ ...prev, businessGoal: e.target.value }))} placeholder="Objetivo de negócio" className="md:col-span-2 min-h-[110px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                    <Textarea value={form.acceptanceCriteria} onChange={(e) => setForm((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))} placeholder="Critérios de aceite (um por linha)" className="md:col-span-2 min-h-[150px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                    <Textarea value={form.qaNotes} onChange={(e) => setForm((prev) => ({ ...prev, qaNotes: e.target.value }))} placeholder="Notas iniciais de QA" className="md:col-span-2 min-h-[110px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500" />
                  </div>

                  <div className="mt-2 flex justify-end gap-2">
                    <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white-10" onClick={() => setCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500" onClick={handleCreate}>
                      Criar entrega
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-5 text-white hover:bg-white-10"
                onClick={() => router.push('/admin')}
              >
                <Database className="mr-2 h-4 w-4" />
                Admin
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-5 text-white hover:bg-white-10"
                onClick={() => handleSidebarClick('settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Cards de entrega" value={cards.length} subtitle="Escopo ativo entre PO e QA" glow="bg-gradient-to-r from-fuchsia-500 to-violet-500" />
            <StatCard title="Cenários totais" value={totalScenarios} subtitle="Manuais + IA" glow="bg-gradient-to-r from-cyan-500 to-sky-500" />
            <StatCard title="Gerados por IA" value={totalAi} subtitle="Prontos para refinamento" glow="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <StatCard title="Ready for QA" value={totalReady} subtitle="Itens refinados para teste" glow="bg-gradient-to-r from-emerald-500 to-lime-500" />
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
            />
          </div>

          <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
            <DialogContent className="border-white/10 bg-[#090d1a] text-white sm:max-w-4xl rounded-[32px] max-h-[90vh] overflow-y-auto flex flex-col">
              {activeSection === 'executive' && (
                <ExecutiveSection
                  syncMessage={syncMessage}
                  syncStatus={syncStatus}
                  createOpen={createOpen}
                  setCreateOpen={setCreateOpen}
                  form={form}
                  setForm={setForm}
                  handleCreate={handleCreate}
                  openPanel={handleSidebarClick}
                />
              )}

              {activeSection === 'criteria' && (
                <CriteriaSection
                  selectedCard={selectedCard}
                  setSelectedId={setSelectedId}
                  setDetailOpen={setDetailOpen}
                  setActiveSection={setActiveSection}
                />
              )}

              {activeSection === 'qa' && (
                <QaSection
                  selectedCard={selectedCard}
                  teamMembers={teamMembers}
                  moveCard={moveCard}
                  generateAiScenario={generateAiScenario}
                  onCardChange={handleCardChange}
                  onScenarioChange={handleScenarioChange}
                  onAddScenario={handleAddScenario}
                />
              )}

              {activeSection === 'automation' && <AutomationSection totalAi={totalAi} generateAiScenario={generateAiScenario} />}

              {activeSection === 'integrations' && <IntegrationsSection syncSelectedCard={syncSelectedCard} settings={settings} />}

              {activeSection === 'settings' && (
                <SettingsSection
                  settings={settings}
                  toggleSetting={toggleSetting}
                  tenantData={currentTenant}
                  tenantId={currentAccount?.tenantId || currentTenant?.id || ''}
                  tenantMissing={Boolean(currentAccount?.tenantId && !currentTenant)}
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
      </div>

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
                        <ScenarioBadge source={scenario.source} />
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
