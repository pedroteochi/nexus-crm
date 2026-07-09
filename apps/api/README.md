# @nexus/api — proxy de IA do Nexus CRM

Servidor Express minúsculo cujo único trabalho é **guardar a chave da OpenAI fora
do dispositivo**. O app manda `{ contact, company, history }`; o servidor monta o
prompt, chama a OpenAI e devolve o mesmo shape que o cliente já consumia.

## Rodar (Fase 1 — sem Supabase ainda)

```bash
cd apps/api
cp .env.example .env      # preencha OPENAI_API_KEY e DEV_SHARED_SECRET
npm install
npm run dev               # http://0.0.0.0:3000
```

Smoke test:

```bash
curl -s http://localhost:3000/health | jq
# → { "ok": true, "supabase": "dev-secret-only" }

curl -s http://localhost:3000/ai/chat \
  -H "authorization: Bearer $DEV_SHARED_SECRET" \
  -H 'content-type: application/json' \
  -d '{"contact":{"name":"Ana","email":"a@x.com","companyId":"1"},
       "company":{"name":"Acme","industry":"SaaS","employees":50},
       "history":[{"role":"user","text":"Oi, quero 50 licenças"}]}' | jq
```

## Endpoints

Todos sob `/ai` exigem `Authorization: Bearer <token>` (o `DEV_SHARED_SECRET` na
Fase 1, ou o `access_token` da sessão Supabase na Fase 2). Body: `{ contact, company, history }`.

| Rota | Retorna |
| --- | --- |
| `POST /ai/chat` | `{ text }` |
| `POST /ai/suggest` | `{ text }` |
| `POST /ai/summary` | `{ summary, nextActions[] }` |
| `POST /ai/analysis` | `{ score, headline, strengths[], improvements[] }` |
| `POST /ai/deal` | `{ title, value, stageId, rationale, confidence }` |

## Ativar o login Supabase (Fase 2)

Descomente `SUPABASE_URL` e `SUPABASE_ANON_KEY` no `.env`. O client Supabase é
lazy: assim que essas duas variáveis existem, o proxy troca o `DEV_SHARED_SECRET`
pela validação do `access_token` real via `supabase.auth.getUser(token)`.

## Celular físico não enxerga `localhost`

`localhost` no telefone é o telefone. Para alcançar o PC:

| Onde o app roda | Base URL |
| --- | --- |
| Simulador iOS | `http://localhost:3000` |
| Emulador Android | `http://10.0.2.2:3000` |
| Celular físico | `http://<IP-LAN-do-PC>:3000` (`ipconfig getifaddr en0`) ou `ngrok http 3000` |
