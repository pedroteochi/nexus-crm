-- Nexus CRM — schema (bloco 1 de 3)
-- Espelha o domínio de src/types/models.ts. Toda tabela carrega user_id com
-- default auth.uid() referenciando auth.users, para o isolamento multiusuário
-- do bloco 2 (RLS). Os FKs de domínio usam ON DELETE CASCADE / SET NULL para
-- que as cascatas que hoje vivem no crmStore virem responsabilidade do banco.
--
-- IDs são `text`, não `uuid`: o cliente gera o id (generateId(), formato curto
-- "base36-contador") e insere com ele, o que torna o update otimista trivial
-- (sem reconciliação temp→real). O default gen_random_uuid()::text cobre inserts
-- server-side (o seed do bloco 3), que não passam id.
--
-- Rode no SQL Editor do Supabase. Ordem: 0001 → 0002 → 0003.

-- 1. COMPANIES
create table public.companies (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  industry   text,
  employees  integer,
  created_at timestamptz not null default now()
);

-- 2. CONTACTS
create table public.contacts (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  email      text,
  company_id text references public.companies (id) on delete set null,
  role       text,
  created_at timestamptz not null default now()
);

-- 3. CHATS
create table public.chats (
  id              text primary key default gen_random_uuid()::text,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id      text references public.contacts (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

-- 4. MESSAGES
create table public.messages (
  id           text primary key default gen_random_uuid()::text,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chat_id      text not null references public.chats (id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  text         text not null,
  status       text not null default 'sent' check (status in ('sending', 'sent', 'error')),
  error_reason text,
  created_at   timestamptz not null default now()
);

-- 5. OPPORTUNITIES
-- Atenção: `owner` é o Responsável (texto livre, ex.: "Você") — NÃO é FK de usuário.
-- O dono de dados é `user_id`. `stage_id` é texto (as etapas são a constante
-- FUNNEL_STAGES do app, não uma tabela).
create table public.opportunities (
  id               text primary key default gen_random_uuid()::text,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null,
  contact_id       text references public.contacts (id) on delete set null,
  stage_id         text not null,
  owner            text,
  value            numeric(14, 2) default 0,
  status           text not null default 'open' check (status in ('open', 'won', 'lost')),
  close_reason     text,
  created_at       timestamptz not null default now(),
  stage_entered_at timestamptz not null default now()
);

-- Índices (queries por dono e joins do funil/chat)
create index on public.contacts (user_id);
create index on public.chats (user_id);
create index on public.chats (contact_id);
create index on public.messages (chat_id);
create index on public.opportunities (user_id, stage_id);
create index on public.opportunities (contact_id);
