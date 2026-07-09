import type { Company, Contact, Message } from '@/types/models';

/**
 * openai.ts agora é um cliente-fino do proxy Express. Estes testes exercitam:
 *  - o caminho "live" (com EXPO_PUBLIC_API_URL) → fetch para o proxy, remontagem
 *    do erro tipado a partir de { error: { kind, message } };
 *  - o Modo Sandbox (sem EXPO_PUBLIC_API_URL) → respostas simuladas locais,
 *    incluindo o rascunho determinístico de oportunidade.
 *
 * getAccessToken é mockado para não puxar a cadeia do Supabase para o teste.
 */
jest.mock('@/services/auth', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('test-token')),
}));

const TEST_API = 'http://proxy.test:3000';

type OpenaiModule = typeof import('@/services/openai');

/** Recarrega o módulo COM backend configurado (caminho live). */
const live = (): OpenaiModule => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_API_URL = TEST_API;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- reimport com env novo exige require após resetModules
  return require('@/services/openai') as OpenaiModule;
};

/** Recarrega o módulo SEM backend (Modo Sandbox). */
const sandbox = (): OpenaiModule => {
  jest.resetModules();
  delete process.env.EXPO_PUBLIC_API_URL;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- reimport com env novo exige require após resetModules
  return require('@/services/openai') as OpenaiModule;
};

const contact: Contact = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  companyId: 'co1',
  createdAt: 0,
};
const company: Company = {
  id: 'co1',
  name: 'Analytical Engines',
  industry: 'Computing',
  employees: 42,
  createdAt: 0,
};
const history: Message[] = [];

/** Resposta fake do proxy com o corpo que o cliente lê. */
const fakeResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const mockFetch = (impl: () => Promise<Response>): void => {
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('openai proxy client — caminho live', () => {
  it('sendMessage retorna o texto do proxy no sucesso', async () => {
    const { sendMessage } = live();
    mockFetch(() => Promise.resolve(fakeResponse(200, { text: 'Hi Ada' })));
    await expect(sendMessage(contact, company, history)).resolves.toBe('Hi Ada');
  });

  it('envia o Authorization Bearer com o token da sessão', async () => {
    const { sendMessage } = live();
    const fetchSpy = jest.fn(() => Promise.resolve(fakeResponse(200, { text: 'ok' })));
    global.fetch = fetchSpy as unknown as typeof fetch;
    await sendMessage(contact, company, history);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${TEST_API}/ai/chat`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('mapeia { error: { kind: auth } } 401 para um erro de auth', async () => {
    const { sendMessage } = live();
    mockFetch(() =>
      Promise.resolve(fakeResponse(401, { error: { kind: 'auth', message: 'Sessão expirada.' } })),
    );
    await expect(sendMessage(contact, company, history)).rejects.toMatchObject({
      kind: 'auth',
      status: 401,
    });
  });

  it('mapeia { error: { kind: quota } } para um erro de quota', async () => {
    const { sendMessage } = live();
    mockFetch(() => Promise.resolve(fakeResponse(429, { error: { kind: 'quota', message: 'x' } })));
    await expect(sendMessage(contact, company, history)).rejects.toMatchObject({ kind: 'quota' });
  });

  it('mapeia { error: { kind: rate_limit } } para rate_limit', async () => {
    const { sendMessage } = live();
    mockFetch(() =>
      Promise.resolve(fakeResponse(429, { error: { kind: 'rate_limit', message: 'x' } })),
    );
    await expect(sendMessage(contact, company, history)).rejects.toMatchObject({
      kind: 'rate_limit',
    });
  });

  it('mapeia um 5xx sem corpo JSON para um erro de servidor', async () => {
    const { sendMessage } = live();
    mockFetch(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('not json')),
      } as unknown as Response),
    );
    await expect(sendMessage(contact, company, history)).rejects.toMatchObject({ kind: 'server' });
  });

  it('mapeia um fetch que falha (TypeError) para um erro de rede', async () => {
    const { sendMessage } = live();
    mockFetch(() => Promise.reject(new TypeError('Network request failed')));
    await expect(sendMessage(contact, company, history)).rejects.toMatchObject({ kind: 'network' });
  });

  it('mapeia um fetch abortado para um erro de timeout', async () => {
    const { sendMessage } = live();
    mockFetch(() => {
      const abort = new Error('Aborted');
      abort.name = 'AbortError';
      return Promise.reject(abort);
    });
    await expect(sendMessage(contact, company, history)).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('summarizeThread devolve o shape do proxy', async () => {
    const { summarizeThread } = live();
    mockFetch(() =>
      Promise.resolve(fakeResponse(200, { summary: 'Resumo', nextActions: ['A', 'B'] })),
    );
    await expect(summarizeThread(contact, company, history)).resolves.toEqual({
      summary: 'Resumo',
      nextActions: ['A', 'B'],
    });
  });

  it('draftOpportunity devolve o DealDraft do proxy', async () => {
    const { draftOpportunity } = live();
    mockFetch(() =>
      Promise.resolve(
        fakeResponse(200, {
          title: 'Plano Pro',
          value: 12000,
          stageId: 'proposta',
          rationale: 'Proposta enviada',
          confidence: 'alta',
        }),
      ),
    );
    await expect(draftOpportunity(contact, company, history)).resolves.toEqual({
      title: 'Plano Pro',
      value: 12000,
      stageId: 'proposta',
      rationale: 'Proposta enviada',
      confidence: 'alta',
    });
  });
});

describe('openai.toUserMessage', () => {
  it('repassa a mensagem de um OpenAiError', async () => {
    const { OpenAiError, toUserMessage } = live();
    expect(toUserMessage(new OpenAiError('auth', 'Sessão expirada — entre novamente.'))).toBe(
      'Sessão expirada — entre novamente.',
    );
  });

  it('cai numa mensagem genérica para throwables desconhecidos', async () => {
    const { toUserMessage } = live();
    expect(toUserMessage('boom')).toBe('Não foi possível obter uma resposta — tente de novo.');
  });
});

describe('openai Modo Sandbox (sem backend)', () => {
  it('sendMessage devolve uma resposta simulada citando o primeiro nome', async () => {
    const { sendMessage } = sandbox();
    const reply = await sendMessage(contact, company, history);
    expect(reply).toContain('Sandbox');
    expect(reply).toContain('Ada');
  });

  it('suggestReply devolve o rascunho do copiloto (primeiro nome apenas)', async () => {
    const { suggestReply } = sandbox();
    const draft = await suggestReply(contact, company, history);
    expect(draft).toContain('proposta');
    expect(draft).toContain('Ada');
    expect(draft).not.toContain('Lovelace');
  });

  it('summarizeThread devolve um resumo simulado não-vazio', async () => {
    const { summarizeThread } = sandbox();
    const result = await summarizeThread(contact, company, history);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.nextActions.length).toBeGreaterThan(0);
  });

  it('analyzeConversation devolve uma análise simulada com score válido', async () => {
    const { analyzeConversation } = sandbox();
    const result = await analyzeConversation(contact, company, history);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.strengths.length + result.improvements.length).toBeGreaterThan(0);
  });

  it('draftOpportunity: deriva assentos → value + etapa qualificação', async () => {
    const { draftOpportunity } = sandbox();
    const thread: Message[] = [
      {
        id: 'm1',
        chatId: 'c1',
        role: 'user',
        text: 'Queremos um plano com 50 licenças',
        createdAt: 0,
        status: 'sent',
      },
    ];
    const draft = await draftOpportunity(contact, company, thread);
    expect(draft.title).toContain('50 licenças');
    expect(draft.value).toBe(48000);
    expect(draft.stageId).toBe('qualificacao');
    expect(draft.confidence).toBe('alta');
  });

  it('draftOpportunity: thread magro deixa value 0 em "novo"', async () => {
    const { draftOpportunity } = sandbox();
    const thread: Message[] = [
      { id: 'm1', chatId: 'c1', role: 'user', text: 'oi', createdAt: 0, status: 'sent' },
    ];
    const draft = await draftOpportunity(contact, company, thread);
    expect(draft.value).toBe(0);
    expect(draft.stageId).toBe('novo');
  });

  it('draftOpportunity: assento único é gramatical ("1 licença")', async () => {
    const { draftOpportunity } = sandbox();
    const thread: Message[] = [
      { id: 'm1', chatId: 'c1', role: 'user', text: 'preciso de 1 licença', createdAt: 0, status: 'sent' },
    ];
    const draft = await draftOpportunity(contact, company, thread);
    expect(draft.title).toContain('1 licença');
    expect(draft.title).not.toContain('1 licenças');
    expect(draft.value).toBe(960);
  });

  it('draftOpportunity: casa "usuarios" sem acento e ignora um "valor" solto', async () => {
    const { draftOpportunity } = sandbox();
    const thread: Message[] = [
      {
        id: 'm1',
        chatId: 'c1',
        role: 'user',
        text: 'precisamos de 30 usuarios, isso agrega muito valor',
        createdAt: 0,
        status: 'sent',
      },
    ];
    const draft = await draftOpportunity(contact, company, thread);
    expect(draft.value).toBe(28800);
    expect(draft.stageId).toBe('qualificacao');
  });
});
