export type ColumnId = 'discovery' | 'refinement' | 'qa' | 'testing' | 'done';
export type Priority = 'Baixa' | 'Média' | 'Alta';

export type PanelId = 'executive' | 'kanban' | 'criteria' | 'qa' | 'automation' | 'integrations' | 'settings';

export type Scenario = {
  id: string;
  title: string;
  source: 'IA' | 'Manual';
  status: 'Draft' | 'Ready' | 'Automated';
};

export type DeliveryCard = {
  id: string;
  title: string;
  epic: string;
  module: string;
  column: ColumnId;
  priority: Priority;
  owner: string;
  businessGoal: string;
  acceptanceCriteria: string[];
  qaNotes: string;
  scenarios: Scenario[];
};

export type CreateFormState = {
  epic: string;
  title: string;
  module: string;
  businessGoal: string;
  acceptanceCriteria: string;
  qaNotes: string;
};

export type SectionSettings = {
  autoSync: boolean;
  aiSuggestions: boolean;
  showCriteria: boolean;
};

export type N8nSettings = {
  companyName?: string;
  cnpj?: string;
  address?: string;
  appPublicUrl: string;
  webhookBaseUrl?: string;
  webhookPath?: string;
  webhookUrl: string;
  apiKey: string;
  discordWebhook: string;
  discordApplicationId: string;
  discordPublicKey: string;
  discordBotToken: string;
  discordGuildId: string;
  discordCommandName: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken: string;
  tenantId?: string;
  tenantSlug?: string;
  workflowPublishedAt?: string;
  workflowDownloadUrl?: string;
  loadedAt?: string;
  updatedAt?: string;
};

export type SyncStatus = 'idle' | 'pending' | 'success' | 'error';
