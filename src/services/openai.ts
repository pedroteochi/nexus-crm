import Constants from 'expo-constants';

import { FUNNEL_STAGES, type Company, type Contact, type Message } from '@/types/models';
import { getAccessToken } from '@/services/auth';
import { normalizeSearch } from '@/utils/search';

/**
 * Cliente de IA — agora um `fetch` fino para o proxy Express (apps/api).
 *
 * A chave da OpenAI NÃO vive mais no dispositivo: o app manda contexto tipado e
 * recebe o mesmo shape de antes. A superfície pública deste módulo é idêntica à
 * versão que chamava a OpenAI direto (mesmos 5 métodos, mesmos tipos, mesmos
 * erros tipados), então nenhum consumidor — useChat, useCopilot, crmStore — muda.
 *
 * Sandbox Mode: sem backend configurado (`EXPO_PUBLIC_API_URL` ausente), as
 * respostas são simuladas localmente, como antes. Com backend, uma falha real
 * sobe como OpenAiError tipado — nunca mascaramos erro com dado fake, senão a
 * demo mentiria.
 */

const TIMEOUT_MS = 20_000; // > 15s do servidor: deixa o erro classificado do servidor vencer o abort.
const SANDBOX_DELAY_MS = 1_000;
const HISTORY_LIMIT = 10;

// ─────────────────── erros tipados (contrato idêntico ao de antes) ───────────────────
export type OpenAiErrorKind =
  | 'auth' // sessão ausente/expirada
  | 'quota' // conta de IA sem crédito
  | 'rate_limit' // muitas requisições
  | 'timeout' // abortado pelo nosso timeout
  | 'network' // fetch falhou (sem conectividade)
  | 'server' // 5xx ou resposta vazia/malformada
  | 'unknown';

/** Erro tipado com categoria e mensagem pronta para exibir. */
export class OpenAiError extends Error {
  readonly kind: OpenAiErrorKind;
  readonly status?: number;

  constructor(kind: OpenAiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'OpenAiError';
    this.kind = kind;
    this.status = status;
  }
}

const USER_MESSAGE: Record<OpenAiErrorKind, string> = {
  auth: 'Sessão expirada — entre novamente.',
  quota: 'O serviço de IA está sem créditos no momento.',
  rate_limit: 'Muitas requisições — aguarde um momento e tente de novo.',
  timeout: 'A requisição expirou — verifique sua conexão e tente de novo.',
  network: 'Erro de rede — verifique sua conexão e tente de novo.',
  server: 'A IA está com problemas no momento — tente de novo em instantes.',
  unknown: 'Não foi possível obter uma resposta — tente de novo.',
};

/** Traduz qualquer valor lançado em uma única frase para o usuário. */
export const toUserMessage = (error: unknown): string =>
  error instanceof OpenAiError ? error.message : USER_MESSAGE.unknown;

// ─────────────────── base URL do proxy ───────────────────
// Sandbox Mode é explícito: sem EXPO_PUBLIC_API_URL (nem extra.apiUrl), não há
// backend → respostas simuladas. O .env.example já traz a URL para simulador;
// Android emulador usa 10.0.2.2 e device físico o IP da LAN (ver .env.example).
const resolveApiBase = (): string | null => {
  const explicit =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return explicit ? explicit.replace(/\/+$/, '') : null;
};

const API_BASE = resolveApiBase();

// ─────────────────── remontar OpenAiError a partir de { error: { kind, message } } ───────────────────
const errorFromResponse = async (response: Response): Promise<OpenAiError> => {
  let kind: OpenAiErrorKind = response.status >= 500 ? 'server' : 'unknown';
  let message = USER_MESSAGE[kind];
  try {
    const body = (await response.json()) as { error?: { kind?: OpenAiErrorKind; message?: string } };
    if (body.error?.kind && body.error.kind in USER_MESSAGE) kind = body.error.kind;
    message = body.error?.message ?? USER_MESSAGE[kind];
  } catch {
    // Corpo não-JSON: mantém o fallback por status.
  }
  return new OpenAiError(kind, message, response.status);
};

// ─────────────────── fetch fino para o proxy (timeout + classificação num lugar só) ───────────────────
const callProxy = async <T>(
  path: string,
  contact: Contact,
  company: Company,
  history: Message[],
): Promise<T> => {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ contact, company, history: history.slice(-HISTORY_LIMIT) }),
      signal: controller.signal,
    });
    if (!response.ok) throw await errorFromResponse(response);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof OpenAiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenAiError('timeout', USER_MESSAGE.timeout);
    }
    if (error instanceof TypeError) {
      throw new OpenAiError('network', USER_MESSAGE.network); // fetch falhou (rede/DNS)
    }
    throw new OpenAiError('unknown', USER_MESSAGE.unknown);
  } finally {
    clearTimeout(timeoutId);
  }
};

// ─────────────────── helpers de Sandbox ───────────────────
const firstNameOf = (fullName: string): string => {
  const [first] = fullName.trim().split(/\s+/);
  return first && first.length > 0 ? first : fullName;
};

/** Resolve após o delay de "pensando" para as respostas simuladas parecerem reais. */
const sandboxDelay = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, SANDBOX_DELAY_MS));

// ─────────────────── chat ───────────────────
export const sendMessage = async (
  contact: Contact,
  company: Company,
  history: Message[],
): Promise<string> => {
  if (!API_BASE) {
    await sandboxDelay();
    return (
      `Oi ${firstNameOf(contact.name)}! Estou no Modo Sandbox (backend de IA não configurado). ` +
      `Ainda posso simular nossa conversa para ${company.name} e demonstrar o fluxo do CRM — ` +
      `configure a API do Nexus (EXPO_PUBLIC_API_URL) para ativar respostas ao vivo.`
    );
  }
  const { text } = await callProxy<{ text: string }>('/ai/chat', contact, company, history);
  return text;
};

// ─────────────────── copiloto: sugestão de próxima mensagem ───────────────────
export const suggestReply = async (
  contact: Contact,
  company: Company,
  history: Message[],
): Promise<string> => {
  if (!API_BASE) {
    await sandboxDelay();
    return (
      `Oi ${firstNameOf(contact.name)}! Obrigado pelo retorno. Posso preparar uma proposta para a ` +
      `${company.name} ainda hoje — qual o melhor horário para conversarmos?`
    );
  }
  const { text } = await callProxy<{ text: string }>('/ai/suggest', contact, company, history);
  return text;
};

// ─────────────────── copiloto: resumo + próximas ações ───────────────────
export interface ConversationSummary {
  summary: string;
  nextActions: string[];
}

export const summarizeThread = async (
  contact: Contact,
  company: Company,
  history: Message[],
): Promise<ConversationSummary> => {
  if (!API_BASE) {
    await sandboxDelay();
    return {
      summary: `Conversa inicial com ${firstNameOf(contact.name)}, da ${company.name}, sobre a solução (resumo simulado — Modo Sandbox).`,
      nextActions: ['Enviar proposta comercial', 'Agendar call de follow-up', 'Confirmar orçamento'],
    };
  }
  return callProxy<ConversationSummary>('/ai/summary', contact, company, history);
};

// ─────────────────── copiloto: análise de desempenho ───────────────────
export interface ConversationAnalysis {
  score: number;
  headline: string;
  strengths: string[];
  improvements: string[];
}

export const analyzeConversation = async (
  contact: Contact,
  company: Company,
  history: Message[],
): Promise<ConversationAnalysis> => {
  if (!API_BASE) {
    await sandboxDelay();
    return {
      score: 8,
      headline: 'Atendimento cordial e objetivo (análise simulada — Modo Sandbox).',
      strengths: ['Tom cordial e profissional', 'Respostas rápidas'],
      improvements: ['Confirmar os próximos passos', 'Registrar a oportunidade no funil'],
    };
  }
  return callProxy<ConversationAnalysis>('/ai/analysis', contact, company, history);
};

// ─────────────────── copiloto: rascunho de oportunidade ───────────────────
export interface DealDraft {
  title: string;
  value: number;
  stageId: string;
  rationale: string;
  confidence: 'baixa' | 'media' | 'alta';
}

/** Sandbox (sem backend): rascunho determinístico e ciente da conversa, para a
 * demo offline ser honesta e ainda acertar o momento "50 licenças → R$ 48.000". */
const sandboxDraft = (contact: Contact, company: Company, history: Message[]): DealDraft => {
  // Normaliza (tira acentos) para "usuários"/"usuarios" e "orçamento"/"orcamento"
  // casarem — pt-BR no mobile é digitado sem acento com frequência.
  const text = normalizeSearch(history.map((message) => message.text).join(' '));
  const qty = text.match(/(\d+)\s*(licen|usuari|assento|vaga)/);
  const seats = qty?.[1] ? Number(qty[1]) : 0;
  const value = seats > 0 ? seats * 960 : 0;
  const stageId = /proposta|orcament|preco/.test(text)
    ? 'proposta'
    : /licen|usuari|plano|integr/.test(text)
      ? 'qualificacao'
      : 'novo';
  const stageLabel = FUNNEL_STAGES.find((stage) => stage.id === stageId)?.label ?? 'Novo';
  const noun = seats === 1 ? 'licença' : 'licenças';
  return {
    title: seats > 0 ? `${company.name} — ${seats} ${noun}` : `${company.name} — nova oportunidade`,
    value,
    stageId,
    rationale:
      seats > 0
        ? `Cliente citou ${seats} ${noun} — encaixa em ${stageLabel} (rascunho — Modo Sandbox).`
        : `Interesse inicial da ${company.name} (rascunho — Modo Sandbox).`,
    confidence: seats > 0 ? 'alta' : 'media',
  };
};

/**
 * Copiloto — rascunha uma oportunidade de funil a partir da conversa. O atendente
 * revisa e confirma; nada é criado automaticamente. Sem backend → rascunho
 * simulado ciente da conversa (Sandbox).
 */
export const draftOpportunity = async (
  contact: Contact,
  company: Company,
  history: Message[],
): Promise<DealDraft> => {
  if (!API_BASE) {
    await sandboxDelay();
    return sandboxDraft(contact, company, history);
  }
  return callProxy<DealDraft>('/ai/deal', contact, company, history);
};
