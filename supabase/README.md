# Supabase — banco, auth e RLS do Nexus CRM

## Como aplicar (uma vez, no seu projeto)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Authentication → Providers → Email**, **desligue "Confirm email"** para o
   dev — senão o cadastro não devolve sessão até clicar num link de confirmação.
3. Abra o **SQL Editor** e rode os arquivos nesta ordem:
   1. `migrations/0001_schema.sql` — as 5 tabelas
   2. `migrations/0002_rls.sql` — habilita RLS + 4 policies por tabela
   3. `migrations/0003_seed_trigger.sql` — dataset demo por usuário no cadastro
4. Em **Project Settings → API**, copie a **Project URL** e a **anon/publishable
   key**. Elas vão para o `.env` do app (`EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`) e, na Fase 2, para o `.env` do proxy.

## Modelo de segurança

- Toda tabela tem `user_id uuid default auth.uid()`. O cliente nem precisa mandar
  `user_id` no insert — o Postgres preenche e o `with check` valida.
- RLS garante que cada usuário só enxerga as próprias linhas. Sem a policy, a
  linha é invisível — não existe "vazar dados do vizinho".
- As cascatas (deletar empresa → some contatos → chats → mensagens →
  oportunidades) são FKs `on delete cascade`, não lógica de cliente.
