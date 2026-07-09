-- Nexus CRM — Row Level Security (bloco 2 de 3)
-- Cada usuário só lê/escreve as próprias linhas. Padrão oficial atual:
--   * `to authenticated` corta o role anônimo antes de avaliar a policy;
--   * `(select auth.uid())` embrulhado em subquery é avaliado UMA vez por
--     statement (initPlan), não por linha — a diferença entre ms e segundos.
-- Quatro policies (select/insert/update/delete) por tabela.

alter table public.companies     enable row level security;
alter table public.contacts      enable row level security;
alter table public.chats         enable row level security;
alter table public.messages      enable row level security;
alter table public.opportunities enable row level security;

-- ─────────────── COMPANIES ───────────────
create policy "companies_select" on public.companies for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "companies_insert" on public.companies for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "companies_update" on public.companies for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "companies_delete" on public.companies for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ─────────────── CONTACTS ───────────────
create policy "contacts_select" on public.contacts for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "contacts_insert" on public.contacts for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "contacts_update" on public.contacts for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "contacts_delete" on public.contacts for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ─────────────── CHATS ───────────────
create policy "chats_select" on public.chats for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "chats_insert" on public.chats for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "chats_update" on public.chats for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "chats_delete" on public.chats for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ─────────────── MESSAGES ───────────────
create policy "messages_select" on public.messages for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "messages_insert" on public.messages for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "messages_update" on public.messages for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "messages_delete" on public.messages for delete to authenticated
  using ( (select auth.uid()) = user_id );

-- ─────────────── OPPORTUNITIES ───────────────
create policy "opportunities_select" on public.opportunities for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy "opportunities_insert" on public.opportunities for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy "opportunities_update" on public.opportunities for update to authenticated
  using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );
create policy "opportunities_delete" on public.opportunities for delete to authenticated
  using ( (select auth.uid()) = user_id );
