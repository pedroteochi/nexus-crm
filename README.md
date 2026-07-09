# Nexus CRM

Um **CRM mobile com copiloto de vendas por IA**, construído com Expo (SDK 54),
Expo Router v6, NativeWind v4 e Zustand — com backend em **Supabase** (Postgres +
Auth + Row Level Security) e um pequeno **proxy Express** que mantém a chave da
OpenAI fora do dispositivo. Gerencie empresas, contatos e um funil de vendas em
cascata, e converse por contato com um copiloto de IA que sugere respostas,
resume a conversa, avalia o atendimento e até rascunha uma oportunidade de funil
a partir do chat.

<!--
  Espaço para um screen recording de ~10s do fluxo login → funil → chat → IA:
  ![Demo do app](./assets/demo.gif)
-->

---

## Como rodar

Três peças: o **projeto Supabase** (dados + auth), o **proxy de IA** (`apps/api`)
e o **app Expo**. O app também roda sem o proxy em **Modo Sandbox** (respostas de
IA simuladas), então dá para demonstrar o fluxo completo só com o Supabase.

**1. Supabase (uma vez, ~5 min)**

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, rode as migrações na ordem:
   `supabase/migrations/0001_schema.sql` → `0002_rls.sql` → `0003_seed_trigger.sql` → `0004_cascade_fks.sql`.
3. Copie a **Project URL** e a **anon/publishable key** (Project Settings → API).
4. Contas novas são semeadas automaticamente com dados de demonstração
   (empresas, contatos, uma conversa e um funil) pelo trigger de cadastro.

**2. Proxy de IA** (opcional — pule para usar o Modo Sandbox)

```bash
cd apps/api
cp .env.example .env    # preencha OPENAI_API_KEY + SUPABASE_URL + SUPABASE_ANON_KEY
npm install
npm run dev             # http://0.0.0.0:3000
```

**3. App**

```bash
cp .env.example .env    # preencha URL/key do Supabase (+ EXPO_PUBLIC_API_URL para IA ao vivo)
npm install
npx expo start          # pressione "i" (iOS) ou "a" (Android)
```

Cadastre-se no app (ou use uma conta demo pré-confirmada) e tudo carrega do
Postgres — isolado por usuário via RLS.

Scripts úteis:

```bash
npm test           # jest-expo: testes de store, serviços, componentes e telas
npm run typecheck  # TypeScript estrito, zero `any`
npm run lint       # eslint (eslint-config-expo)
```

---

## O que tem dentro

- **Auth** — login com e-mail/senha e tela dedicada de cadastro (confirmação de
  senha + critérios ao vivo), sessão persistida com renovação automática, logout
  em Ajustes. Todas as rotas ficam atrás de um gate de autenticação no layout raiz.
- **Conversas** — lista com avatares e prévia da última mensagem; chat por contato
  com indicador de digitação, envio otimista (`sending → sent`), erros tipados em
  português e reenvio com um toque.
- **Copiloto de IA** (atrás do proxy) — sugere a próxima mensagem, resume a
  conversa, avalia o desempenho do atendente e **rascunha uma oportunidade de
  funil a partir do chat** (o vendedor revisa antes de criar — nada é criado
  automaticamente).
- **Funil** — Kanban em cascata com cinco etapas, aging por etapa ("parado há Xd"),
  motivo de ganho/perda no fechamento e aba de negócios fechados.
- **Contatos & Empresas** — CRUD validado com deleção em cascata (explicitada no
  diálogo de confirmação), seletor de empresa e busca.
- **Modo Sandbox** — sem `EXPO_PUBLIC_API_URL`, as respostas de IA são simuladas
  localmente e o fluxo inteiro continua demonstrável offline.

---

## Arquitetura

```
┌─────────────┐   access_token    ┌──────────────┐   OPENAI_API_KEY   ┌─────────┐
│  App Expo   │ ────────────────► │ Proxy Express│ ─────────────────► │ OpenAI  │
│  (Zustand)  │                   │  (apps/api)  │                    └─────────┘
└──────┬──────┘                   └──────┬───────┘
       │ supabase-js (RLS)               │ auth.getUser(token)
       ▼                                 ▼
┌─────────────────────────────────────────────┐
│     Supabase — Postgres + Auth + RLS        │
└─────────────────────────────────────────────┘
```

Três decisões deliberadas:

1. **O proxy Express existe por exatamente um motivo: esconder um segredo.**
   Chave de API embarcada em app mobile é chave vazada. O app nunca vê a chave da
   OpenAI — ele envia `{contact, company, history}` com o `access_token` da
   sessão Supabase, o proxy valida o token (`auth.getUser`) e conversa com o
   `gpt-4o-mini`. Deliberadamente **sem CRUD no Express**: o Supabase já faz CRUD
   com segurança por linha; embrulhar isso em outro servidor seria reimplementar
   o trabalho do banco.
2. **O multiusuário mora no banco, não no código do app.** Toda tabela carrega
   `user_id default auth.uid()` e quatro policies de RLS
   (select/insert/update/delete). Mesmo um cliente com bug não lê linhas de outro
   usuário. A semântica de cascata do cliente é espelhada por foreign keys
   `ON DELETE CASCADE`.
3. **O Zustand é um cache com write-through otimista.** As actions mutam o cache
   de forma síncrona (a UI nunca espera a rede) e persistem no Supabase em
   segundo plano; em falha, a store re-sincroniza com o servidor (`hydrate()`) —
   o mesmo mecanismo que carrega a conta no login (com guarda contra respostas
   obsoletas entre logout/login). Telas não têm lógica de negócio.

**IDs** são gerados no cliente (timestamp + contador), então inserts otimistas
não precisam de reconciliação de id temporário; linhas criadas no servidor (o
seed) usam `gen_random_uuid()` por padrão.

---

## Estrutura de pastas

```
apps/api/                     # Proxy Express de IA (pacote próprio + job próprio na CI)
  src/server.ts               # 5 rotas de IA, validação de token, erros tipados
supabase/
  migrations/                 # 0001 schema · 0002 RLS · 0003 trigger de seed · 0004 FKs cascade
  email-templates/            # templates transacionais pt-BR (SMTP via Resend)
src/
  app/                        # Expo Router v6
    _layout.tsx               # Stack raiz + gate de auth (Stack.Protected) + hydrate/clear
    (auth)/                   # login + tela dedicada de cadastro
    (tabs)/                   # Conversas · Funil · Contatos · Empresas · Ajustes
    chat/[id].tsx             # chat + ações do copiloto de IA
  components/                 # UI atômica e memoizada
  hooks/                      # useSession, useChat, useCopilot, …
  services/                   # supabase.ts · auth.ts · crmRepo.ts (dados) · openai.ts (cliente do proxy)
  store/                      # crmStore.ts — cache + write-through otimista
  types/                      # models.ts — fonte única de verdade
  __tests__/                  # testes de unidade + componente + tela
.maestro/                     # fluxo E2E (login → contato → chat → resposta)
```

---

## Notas de segurança

- A chave da OpenAI vive **apenas** no `.env` do proxy. O bundle do app não
  contém segredos — a anon key do Supabase é pública por design (a fronteira de
  segurança é a RLS).
- O proxy rejeita chamadas não autenticadas (401 com erro tipado que a UI sabe
  exibir). Um segredo compartilhado de desenvolvimento só é aceito **quando o
  Supabase não está configurado** — não é um bypass de auth em ambiente
  configurado.
- O histórico de chat enviado ao proxy é sanitizado no servidor (apenas os papéis
  `user`/`assistant` são repassados), então um cliente adulterado não injeta
  prompts de `system`.

## Limitações conhecidas (deliberadas e documentadas)

- **Sem rate limiting em `/ai`** ainda — o próximo passo de hardening do proxy.
- **Falhas de write-through re-sincronizam em silêncio** — uma escrita perdida é
  corrigida por refetch, mas o usuário não recebe um toast sobre isso.
- `FUNNEL_STAGES` está duplicado entre app e proxy — extrair um pacote de tipos
  compartilhado (monorepo com npm workspaces) é a evolução planejada.
- A confirmação de e-mail usa o modo de teste do Resend (entrega só para o dono
  da conta); produção verificaria um domínio próprio.

## Testes

- **Unidade** — actions da store (cascatas, envio/reenvio otimista,
  hydrate/clear) e o mapeamento de erros do cliente do proxy, com a camada de
  dados mockada.
- **Componente** — testes de render/interação com RNTL; `ContactsScreen`
  exercita a validação de formulário através de uma tela renderizada.
- **E2E** — `.maestro/contact-to-chat.yaml`: login → contato → chat → resposta
  (parametrizado com uma conta de teste semeada).

## Stack

Expo SDK 54 · React 19 / RN 0.81 (New Architecture) · Expo Router v6 · NativeWind v4 ·
Zustand · Supabase (Postgres/Auth/RLS) · Express + OpenAI SDK (gpt-4o-mini) ·
jest-expo & RNTL · Maestro · GitHub Actions.
