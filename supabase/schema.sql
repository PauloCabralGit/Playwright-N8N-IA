-- Supabase schema for the QA platform
-- Run this in the Supabase SQL Editor after creating your project.

create table if not exists tenants (
  id text primary key,
  slug text not null unique,
  company_name text not null,
  cnpj text not null,
  address text not null,
  app_public_url text not null,
  webhook_base_url text not null,
  webhook_path text not null,
  webhook_url text not null,
  api_key text not null,
  discord_webhook text not null default '',
  discord_application_id text not null default '',
  discord_public_key text not null default '',
  discord_bot_token text not null default '',
  discord_guild_id text not null default '',
  discord_command_name text not null default 'qa',
  github_owner text not null,
  github_repo text not null,
  github_branch text not null default 'main',
  github_token text not null,
  workflow_json jsonb not null default '{}'::jsonb,
  workflow_published_at text not null default '',
  workflow_download_url text not null default '',
  loaded_at text not null default '',
  updated_at text not null default '',
  created_at text not null default ''
);

alter table tenants
  add column if not exists workflow_json jsonb not null default '{}'::jsonb;

alter table tenants
  add column if not exists discord_application_id text not null default '';

alter table tenants
  add column if not exists discord_public_key text not null default '';

alter table tenants
  add column if not exists discord_bot_token text not null default '';

alter table tenants
  add column if not exists discord_guild_id text not null default '';

alter table tenants
  add column if not exists discord_command_name text not null default 'qa';

alter table tenants
  add column if not exists discord_webhook text not null default '';

create table if not exists accounts (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  company_name text not null,
  cnpj text not null,
  address text not null,
  tenant_id text not null unique,
  created_at text not null,
  updated_at text not null
);

create table if not exists sessions (
  token text primary key,
  account_id text not null,
  created_at text not null,
  last_seen_at text not null
);

create index if not exists idx_accounts_email on accounts(email);
create index if not exists idx_accounts_tenant_id on accounts(tenant_id);
create index if not exists idx_sessions_account_id on sessions(account_id);
create index if not exists idx_tenants_slug on tenants(slug);

create table if not exists board_cards (
  tenant_id text not null,
  card_id text not null,
  card jsonb not null,
  updated_at text not null,
  primary key (tenant_id, card_id)
);

create index if not exists idx_board_cards_tenant_id on board_cards(tenant_id);

create table if not exists card_history (
  id text primary key,
  tenant_id text not null,
  card_id text not null,
  action text not null,
  before_card jsonb not null default '{}'::jsonb,
  after_card jsonb not null default '{}'::jsonb,
  created_at text not null
);

create index if not exists idx_card_history_tenant_id on card_history(tenant_id);
create index if not exists idx_card_history_card_id on card_history(card_id);

create table if not exists password_reset_tokens (
  id text primary key,
  account_id text not null,
  token_hash text not null unique,
  expires_at text not null,
  used_at text not null default '',
  created_at text not null
);

create index if not exists idx_password_reset_tokens_account_id on password_reset_tokens(account_id);
create index if not exists idx_password_reset_tokens_expires_at on password_reset_tokens(expires_at);
create index if not exists idx_password_reset_tokens_used_at on password_reset_tokens(used_at);
