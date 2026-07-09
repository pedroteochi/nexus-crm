import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// O supabase-js constrói um RealtimeClient que exige um WebSocket global. O Node
// < 22 não tem WebSocket nativo, então fornecemos o do pacote `ws`. Este proxy só
// usa supabase.auth.getUser (REST) — nunca abre um canal realtime —, mas o cliente
// precisa existir sem estourar no boot.
if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/**
 * Nexus CRM — proxy de IA.
 *
 * Objetivo único: a chave da OpenAI vive AQUI, nunca no dispositivo. O app manda
 * `{ contact, company, history }` e recebe exatamente os mesmos shapes que o
 * cliente já consumia. Prompts, chamada à OpenAI e parsing de JSON são donos do
 * servidor; o cliente vira um `fetch` fino que só remonta os erros tipados.
 */

// ───────────────────────── config ─────────────────────────
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Faltando variável de ambiente ${key} (veja .env.example)`);
  return value;
};

const PORT = Number(process.env.PORT ?? 3000);
const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 15_000;
const HISTORY_LIMIT = 10;

const openai = new OpenAI({
  apiKey: requireEnv('OPENAI_API_KEY'),
  timeout: TIMEOUT_MS,
  maxRetries: 0, // 15s é o teto real; sem retry escondido dobrando a latência.
});

// ─────────────────── tipos de domínio (espelho do app) ───────────────────
type MessageRole = 'user' | 'assistant';
interface Company {
  id: string;
  name: string;
  industry: string;
  employees: number;
}
interface Contact {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role?: string;
}
interface Message {
  role: MessageRole;
  text: string;
}
interface Stage {
  id: string;
  label: string;
}

const FUNNEL_STAGES: Stage[] = [
  { id: 'novo', label: 'Novo' },
  { id: 'qualificacao', label: 'Qualificação' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'negociacao', label: 'Negociação' },
  { id: 'fechamento', label: 'Fechamento' },
];

// ─────────────────── erros tipados (mesmo contrato do cliente) ───────────────────
type ErrorKind = 'auth' | 'quota' | 'rate_limit' | 'timeout' | 'network' | 'server' | 'unknown';

/** Saída do modelo vazia OU malformada → tratada como falha de servidor. */
class ModelOutputError extends Error {}
/** Corpo da requisição inválido → 400 (culpa do cliente, não da IA). */
class BadRequestError extends Error {}

const classify = (err: unknown): { http: number; kind: ErrorKind; message: string } => {
  if (err instanceof BadRequestError)
    return { http: 400, kind: 'unknown', message: err.message || 'Requisição inválida.' };
  if (err instanceof ModelOutputError)
    return { http: 502, kind: 'server', message: 'A IA devolveu uma resposta inválida — tente de novo.' };
  if (err instanceof OpenAI.APIConnectionTimeoutError)
    return { http: 504, kind: 'timeout', message: 'A IA demorou para responder — tente de novo.' };
  if (err instanceof OpenAI.APIConnectionError)
    return { http: 502, kind: 'server', message: 'Falha ao falar com a OpenAI — tente de novo em instantes.' };
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? 500;
    if (status === 429 && err.code === 'insufficient_quota')
      return { http: 429, kind: 'quota', message: 'O serviço de IA está sem créditos no momento.' };
    if (status === 429)
      return { http: 429, kind: 'rate_limit', message: 'Muitas requisições — aguarde um momento e tente de novo.' };
    if (status === 401 || status === 403) {
      // A chave do SERVIDOR está ruim — o usuário do app não conserta isso. Loga e generaliza.
      console.error('[openai auth] confira OPENAI_API_KEY no servidor:', err.message);
      return { http: 502, kind: 'server', message: 'Serviço de IA indisponível — tente mais tarde.' };
    }
    if (status >= 500)
      return { http: 502, kind: 'server', message: 'A OpenAI está com problemas — tente de novo em instantes.' };
    return { http: 400, kind: 'unknown', message: 'Não foi possível obter uma resposta — tente de novo.' };
  }
  return { http: 500, kind: 'unknown', message: 'Não foi possível obter uma resposta — tente de novo.' };
};

// ─────────────────── chamada base à OpenAI (SDK oficial) ───────────────────
// Só user/assistant passam: um cliente malicioso poderia mandar role "system" no
// history e sequestrar o prompt (usar o proxy como API genérica da OpenAI).
const toChatMessages = (history: Message[]) =>
  history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: String(m.text ?? '') }));

const chat = async (
  system: string,
  history: Message[],
  opts: { temperature: number; maxTokens: number; json?: boolean },
): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
    messages: [{ role: 'system', content: system }, ...toChatMessages(history)],
  });
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new ModelOutputError('empty completion');
  return content;
};

// ─────────────────── prompts (cópia fiel de openai.ts) ───────────────────
const buildSystemPrompt = (c: Contact, co: Company) =>
  `Você é um assistente de vendas de CRM profissional. Você está conversando com ${c.name} ` +
  `da ${co.name} (${co.industry}). Use esse contexto de forma natural, responda sempre em ` +
  `português do Brasil e mantenha as respostas concisas.`;

const buildCopilotPrompt = (c: Contact, co: Company) =>
  `Você é um copiloto de vendas ajudando um atendente de CRM. Com base na conversa até aqui, ` +
  `escreva a PRÓXIMA mensagem que o atendente deve enviar para ${c.name} da ${co.name} ` +
  `(${co.industry}). NUNCA repita nem parafraseie uma mensagem que já está na conversa — ` +
  `se o cliente ainda não respondeu à última mensagem, escreva um follow-up curto e diferente ` +
  `que avance a negociação. Seja natural, cordial e objetivo, em português do Brasil. Responda ` +
  `apenas com o texto da mensagem — sem aspas, sem rótulos e sem explicações.`;

const buildSummaryPrompt = (c: Contact, co: Company) =>
  `Você é um copiloto de vendas. Resuma a conversa com ${c.name} da ${co.name} e sugira as ` +
  `próximas ações do atendente. Responda SOMENTE em JSON válido no formato ` +
  `{"summary": "resumo em 1-2 frases", "nextActions": ["ação 1", "ação 2"]}. O resumo e as ações devem ` +
  `estar em português do Brasil, com no máximo 4 ações objetivas.`;

const buildAnalysisPrompt = (c: Contact, co: Company) =>
  `Você é um analista de qualidade de atendimento. Avalie o desempenho do ATENDENTE nesta conversa ` +
  `com ${c.name} da ${co.name}. Responda SOMENTE em JSON válido no formato ` +
  `{"score": número de 0 a 10, "headline": "uma frase curta", "strengths": ["ponto forte"], ` +
  `"improvements": ["ponto a melhorar"]}. Tudo em português do Brasil, com no máximo 3 itens em cada lista.`;

const STAGE_LINES = FUNNEL_STAGES.map((s) => `${s.id} (${s.label})`).join(', ');
const buildDealPrompt = (c: Contact, co: Company) =>
  `Você é um copiloto de vendas. Analise a conversa entre um vendedor e ${c.name} ` +
  `da ${co.name} (${co.industry}, ${co.employees} funcionários) e rascunhe uma ` +
  `oportunidade de funil. Responda SOMENTE em JSON válido no formato ` +
  `{"title":"título curto do negócio","value":número inteiro em reais,` +
  `"stageId":"id da etapa","rationale":"1 frase curta explicando a etapa",` +
  `"confidence":"baixa|media|alta"}. A etapa DEVE ser uma destas: ${STAGE_LINES}. ` +
  `Escolha: só disse oi → novo; discutiu fit/orçamento → qualificacao; proposta enviada → ` +
  `proposta; negociando termos → negociacao; fechando → fechamento. ` +
  `Estime value SOMENTE se a conversa citar quantidade, plano ou preço explícito ` +
  `(ex.: nº de licenças/usuários); caso contrário use 0. Tudo em português do Brasil.`;

// ─────────────────── parsers (defensivos, iguais aos de hoje) ───────────────────
const parseSummary = (raw: string) => {
  try {
    const p = JSON.parse(raw) as { summary?: unknown; nextActions?: unknown };
    const summary = typeof p.summary === 'string' ? p.summary.trim() : '';
    const nextActions = Array.isArray(p.nextActions)
      ? p.nextActions.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).map((a) => a.trim())
      : [];
    if (!summary) throw new Error('missing summary');
    return { summary, nextActions };
  } catch {
    throw new ModelOutputError('bad summary');
  }
};

const parseAnalysis = (raw: string) => {
  const toList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((i): i is string => typeof i === 'string' && i.trim().length > 0).map((i) => i.trim())
      : [];
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const rawScore = typeof p.score === 'number' ? p.score : Number(p.score);
    const score = Number.isFinite(rawScore) ? Math.min(10, Math.max(0, Math.round(rawScore))) : 0;
    const headline = typeof p.headline === 'string' ? p.headline.trim() : '';
    const strengths = toList(p.strengths);
    const improvements = toList(p.improvements);
    if (!headline && strengths.length === 0 && improvements.length === 0) throw new Error('empty');
    return { score, headline, strengths, improvements };
  } catch {
    throw new ModelOutputError('bad analysis');
  }
};

const parseDealDraft = (raw: string) => {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const title = typeof p.title === 'string' ? p.title.trim() : '';
    const rawValue = typeof p.value === 'number' ? p.value : Number(p.value);
    const value = Number.isFinite(rawValue) ? Math.max(0, Math.round(rawValue)) : 0;
    const stageId = FUNNEL_STAGES.some((s) => s.id === p.stageId) ? (p.stageId as string) : 'novo';
    const rationale = typeof p.rationale === 'string' ? p.rationale.trim() : '';
    const norm =
      typeof p.confidence === 'string'
        ? p.confidence.normalize('NFD').replace(/[^a-z]/gi, '').toLowerCase()
        : '';
    const confidence = norm === 'alta' ? 'alta' : norm === 'baixa' ? 'baixa' : 'media';
    if (!title) throw new Error('missing title');
    return { title, value, stageId, rationale, confidence };
  } catch {
    throw new ModelOutputError('bad deal');
  }
};

// ─────────────────── AUTH middleware ───────────────────
// Supabase é LAZY: a Fase 1 roda só com DEV_SHARED_SECRET, antes do login existir.
// Quando SUPABASE_URL/ANON_KEY estiverem no .env, o proxy passa a validar o
// access_token real da sessão (Path A: supabase.auth.getUser).
let supabaseSingleton: SupabaseClient | null = null;
const getSupabase = (): SupabaseClient | null => {
  if (supabaseSingleton) return supabaseSingleton;
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  supabaseSingleton = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseSingleton;
};

interface AuthedRequest extends Request {
  userId?: string;
}

const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const bearer = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '');

  const supabase = getSupabase();

  // Segredo de dev: aceito SOMENTE enquanto o Supabase não está configurado
  // (bootstrap local sem login). Com Supabase no ar, o único token válido é o
  // access_token da sessão — senão o segredo viraria um bypass permanente de auth.
  const devSecret = process.env.DEV_SHARED_SECRET;
  if (!supabase && devSecret && bearer === devSecret) {
    (req as AuthedRequest).userId = 'dev';
    return next();
  }

  if (!supabase) {
    // Nem Supabase configurado nem segredo de dev bateu.
    res.status(401).json({ error: { kind: 'auth', message: 'Faça login para usar a IA.' } });
    return;
  }

  if (!bearer) {
    res.status(401).json({ error: { kind: 'auth', message: 'Faça login para usar a IA.' } });
    return;
  }

  const { data, error } = await supabase.auth.getUser(bearer); // valida o access_token
  if (error || !data.user) {
    res.status(401).json({ error: { kind: 'auth', message: 'Sessão expirada — entre novamente.' } });
    return;
  }

  (req as AuthedRequest).userId = data.user.id;
  next();
};

// ─────────────────── validação mínima de body ───────────────────
interface AiBody {
  contact: Contact;
  company: Company;
  history: Message[];
}
const readBody = (req: Request): AiBody => {
  const { contact, company, history } = (req.body ?? {}) as Partial<AiBody>;
  if (!contact?.name || !company?.name || !Array.isArray(history)) {
    throw new BadRequestError('Body inválido: esperado { contact, company, history }.');
  }
  return { contact, company, history };
};

// ─────────────────── app + rotas ───────────────────
const app = express();
app.use(cors()); // p/ Expo web; nativo não usa CORS.
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, supabase: getSupabase() ? 'configured' : 'dev-secret-only' });
});

app.use('/ai', requireAuth); // tudo em /ai exige token válido.

/** Envolve um handler async e traduz qualquer throw no contrato de erro tipado. */
const handle =
  (fn: (b: AiBody) => Promise<unknown>) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await fn(readBody(req)));
    } catch (err) {
      const { http, kind, message } = classify(err);
      res.status(http).json({ error: { kind, message } });
    }
  };

// POST /ai/chat → { text }
app.post(
  '/ai/chat',
  handle(async ({ contact, company, history }) => {
    const text = await chat(buildSystemPrompt(contact, company), history, {
      temperature: 0.7,
      maxTokens: 500,
    });
    return { text };
  }),
);

// POST /ai/suggest → { text }
app.post(
  '/ai/suggest',
  handle(async ({ contact, company, history }) => {
    const text = await chat(buildCopilotPrompt(contact, company), history, {
      temperature: 0.7,
      maxTokens: 300,
    });
    return { text };
  }),
);

// POST /ai/summary → { summary, nextActions }
app.post(
  '/ai/summary',
  handle(async ({ contact, company, history }) => {
    const raw = await chat(buildSummaryPrompt(contact, company), history, {
      temperature: 0.3,
      maxTokens: 400,
      json: true,
    });
    return parseSummary(raw);
  }),
);

// POST /ai/analysis → { score, headline, strengths, improvements }
app.post(
  '/ai/analysis',
  handle(async ({ contact, company, history }) => {
    const raw = await chat(buildAnalysisPrompt(contact, company), history, {
      temperature: 0.3,
      maxTokens: 400,
      json: true,
    });
    return parseAnalysis(raw);
  }),
);

// POST /ai/deal → DealDraft
app.post(
  '/ai/deal',
  handle(async ({ contact, company, history }) => {
    const raw = await chat(buildDealPrompt(contact, company), history, {
      temperature: 0.2,
      maxTokens: 300,
      json: true,
    });
    return parseDealDraft(raw);
  }),
);

// 0.0.0.0 → acessível na LAN (celular físico). NÃO use 'localhost' aqui.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`nexus-api on http://0.0.0.0:${PORT} (supabase: ${getSupabase() ? 'on' : 'dev-secret'})`);
});
