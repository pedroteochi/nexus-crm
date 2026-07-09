import { FUNNEL_STAGES } from '@/types/models';
import type {
  Chat,
  Company,
  Contact,
  Message,
  MessageRole,
  MessagesByChat,
  Opportunity,
  OpportunityStatus,
} from '@/types/models';
import { generateId } from '@/utils/id';

export interface SeedData {
  companies: Company[];
  contacts: Contact[];
  chats: Chat[];
  messages: MessagesByChat;
  opportunities: Opportunity[];
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Exactly 10 contacts get a chat -> the remaining 5 stay chat-less on purpose,
 * so the reviewer can exercise the "create a chat on tap" flow from Contacts. */
const CHATTED_CONTACT_COUNT = 10;

const COMPANY_BLUEPRINTS: readonly Omit<Company, 'id' | 'createdAt'>[] = [
  { name: 'Acme Analytics', industry: 'Dados & Analytics', employees: 120 },
  { name: 'Northwind Logística', industry: 'Logística', employees: 540 },
  { name: 'Vertex Saúde', industry: 'Saúde', employees: 80 },
  { name: 'Lumen Mídia', industry: 'Mídia & Publicidade', employees: 35 },
  { name: 'Cobalt Fintech', industry: 'Serviços Financeiros', employees: 210 },
];

const CONTACT_BLUEPRINTS: readonly {
  name: string;
  email: string;
  companyIndex: number;
  role: string;
}[] = [
  {
    name: 'Olivia Bennett',
    email: 'olivia.bennett@acmeanalytics.com',
    companyIndex: 0,
    role: 'Head de Dados',
  },
  {
    name: 'Marcus Lee',
    email: 'marcus.lee@acmeanalytics.com',
    companyIndex: 0,
    role: 'Engenheiro de Dados',
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@acmeanalytics.com',
    companyIndex: 0,
    role: 'Gerente de Produto',
  },
  {
    name: 'Diego Alvarez',
    email: 'diego.alvarez@northwindlogistics.com',
    companyIndex: 1,
    role: 'Líder de Operações',
  },
  {
    name: 'Sofia Rossi',
    email: 'sofia.rossi@northwindlogistics.com',
    companyIndex: 1,
    role: 'Gerente de Frota',
  },
  {
    name: 'Ethan Clarke',
    email: 'ethan.clarke@northwindlogistics.com',
    companyIndex: 1,
    role: 'Gerente de Compras',
  },
  {
    name: 'Hannah Kim',
    email: 'hannah.kim@vertexhealth.com',
    companyIndex: 2,
    role: 'Diretora Clínica',
  },
  {
    name: 'Noah Schmidt',
    email: 'noah.schmidt@vertexhealth.com',
    companyIndex: 2,
    role: 'Gerente de TI',
  },
  {
    name: 'Aisha Rahman',
    email: 'aisha.rahman@vertexhealth.com',
    companyIndex: 2,
    role: 'Líder de Compliance',
  },
  {
    name: 'Liam Murphy',
    email: 'liam.murphy@lumenmedia.com',
    companyIndex: 3,
    role: 'Diretor de Criação',
  },
  {
    name: 'Emma Dubois',
    email: 'emma.dubois@lumenmedia.com',
    companyIndex: 3,
    role: 'Executiva de Contas',
  },
  {
    name: 'Carlos Mendes',
    email: 'carlos.mendes@lumenmedia.com',
    companyIndex: 3,
    role: 'Comprador de Mídia',
  },
  {
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@cobaltfintech.com',
    companyIndex: 4,
    role: 'Analista de Risco',
  },
  {
    name: 'Grace Okafor',
    email: 'grace.okafor@cobaltfintech.com',
    companyIndex: 4,
    role: 'VP de Engenharia',
  },
  {
    name: 'Tom Becker',
    email: 'tom.becker@cobaltfintech.com',
    companyIndex: 4,
    role: 'Diretor de Vendas',
  },
];

/** One scripted conversation per chatted contact. Lengths vary on purpose so the
 * total message count is emergent, not hard-coded. */
const CONVERSATIONS: readonly (readonly { role: MessageRole; text: string }[])[] = [
  [
    {
      role: 'assistant',
      text: 'Oi Olivia! Obrigado pela ligação mais cedo. Como está indo a implantação de analytics com as suas equipes?',
    },
    { role: 'user', text: 'Muito bem — vamos integrar mais duas equipes neste trimestre.' },
    {
      role: 'assistant',
      text: 'Adorei esse ritmo. Quer que eu monte um plano de escala para as novas equipes?',
    },
    { role: 'user', text: 'Sim, por favor, isso ajudaria bastante.' },
  ],
  [
    { role: 'user', text: 'Rapidinho — o pipeline já suporta sincronizações incrementais?' },
    {
      role: 'assistant',
      text: 'Suporta sim, Marcus. As sincronizações incrementais saíram na última versão e cortaram o tempo de carga quase pela metade.',
    },
    { role: 'user', text: 'Perfeito, isso nos desbloqueia.' },
  ],
  [
    {
      role: 'assistant',
      text: 'Oi Priya! Dando sequência aos requisitos do dashboard para a equipe de produto.',
    },
    { role: 'user', text: 'Obrigada! Dá para adicionar uma visão de cohort antes do lançamento?' },
    {
      role: 'assistant',
      text: 'Com certeza — vou dimensionar a visão de cohort e enviar uma estimativa hoje.',
    },
  ],
  [
    { role: 'user', text: 'Tivemos um atraso de entrega na rota norte hoje de manhã.' },
    {
      role: 'assistant',
      text: 'Obrigado por avisar, Diego. Posso puxar a análise da rota e sugerir um novo trajeto — quer que eu faça?',
    },
    { role: 'user', text: 'Por favor, quanto antes melhor.' },
    {
      role: 'assistant',
      text: 'Já estou nisso. Em breve compartilho uma rota otimizada e a economia de tempo prevista.',
    },
  ],
  [
    {
      role: 'assistant',
      text: 'Oi Sofia, o novo relatório de telemetria da frota está pronto quando você quiser revisar.',
    },
    { role: 'user', text: 'Ótimo, vamos revisar na quinta.' },
  ],
  [
    { role: 'user', text: 'Você pode reenviar a cotação de compra dos veículos extras?' },
    {
      role: 'assistant',
      text: 'Claro, Ethan — reenviando agora com o desconto por volume aplicado.',
    },
    { role: 'user', text: 'Valeu.' },
  ],
  [
    {
      role: 'assistant',
      text: 'Oi Hannah! Queria confirmar os recursos de compliance que você precisava para a implantação clínica.',
    },
    {
      role: 'user',
      text: 'Sim — logs de auditoria e acesso baseado em papéis são indispensáveis.',
    },
    {
      role: 'assistant',
      text: 'Os dois já vêm prontos de fábrica. Vou enviar o resumo de compliance.',
    },
    { role: 'user', text: 'Seria perfeito, obrigada.' },
  ],
  [
    { role: 'user', text: 'A configuração de SSO é self-service ou precisamos da sua equipe?' },
    {
      role: 'assistant',
      text: 'É self-service, Noah — funciona tanto com SAML quanto com OIDC. Fico à disposição para uma call se quiser um segundo olhar.',
    },
  ],
  [
    {
      role: 'assistant',
      text: 'Oi Aisha, compartilhando a política de retenção de dados que você pediu.',
    },
    { role: 'user', text: 'Obrigada. Ela cobre os requisitos de armazenamento regional?' },
    {
      role: 'assistant',
      text: 'Cobre sim — dá para fixar o armazenamento em uma região específica por workspace.',
    },
  ],
  [
    {
      role: 'user',
      text: 'A equipe de criação amou a demo — quais são os próximos passos para começar?',
    },
    {
      role: 'assistant',
      text: 'Fantástico, Liam! O próximo passo é uma configuração rápida do workspace. Vou enviar um convite e um guia de onboarding de 10 minutos.',
    },
    { role: 'user', text: 'Manda aí que a gente começa esta semana.' },
  ],
];

const OPP_BLUEPRINTS: readonly {
  title: string;
  owner: string;
  value: number;
  stageIndex: number;
  daysInStage: number;
  status?: OpportunityStatus;
  closeReason?: string;
}[] = [
  { title: 'Plano Enterprise — 50 licenças', owner: 'Você', value: 48000, stageIndex: 0, daysInStage: 1 },
  { title: 'Expansão de vagas', owner: 'Você', value: 15000, stageIndex: 0, daysInStage: 12 },
  { title: 'Piloto — 3 meses', owner: 'Você', value: 9000, stageIndex: 1, daysInStage: 3 },
  { title: 'Migração de dados', owner: 'Você', value: 12000, stageIndex: 1, daysInStage: 9 },
  { title: 'Renovação anual', owner: 'Você', value: 36000, stageIndex: 2, daysInStage: 6 },
  { title: 'Upsell módulo IA', owner: 'Você', value: 18000, stageIndex: 3, daysInStage: 2 },
  { title: 'Contrato de suporte', owner: 'Você', value: 24000, stageIndex: 4, daysInStage: 4 },
  // A couple of already-closed deals so the "Fechadas" lifecycle is populated.
  { title: 'Pacote Starter — anual', owner: 'Você', value: 8000, stageIndex: 4, daysInStage: 5, status: 'won', closeReason: 'Melhor custo-benefício' },
  { title: 'Projeto Beta', owner: 'Você', value: 21000, stageIndex: 2, daysInStage: 8, status: 'lost', closeReason: 'Escolheram o concorrente' },
];

/** Build demo opportunities spread across the funnel. Some are deliberately
 * "stuck" (a high daysInStage) so the stage-age badge has something to show, and
 * a couple are already won/lost so the "Fechadas" view isn't empty on first run. */
export const seedOpportunities = (contacts: Contact[]): Opportunity[] => {
  if (contacts.length === 0) return [];
  const now = Date.now();
  return OPP_BLUEPRINTS.reduce<Opportunity[]>((acc, blueprint, index) => {
    const contact = contacts[index % contacts.length];
    const stage = FUNNEL_STAGES[blueprint.stageIndex];
    if (!contact || !stage) return acc;
    acc.push({
      id: generateId(),
      title: blueprint.title,
      contactId: contact.id,
      stageId: stage.id,
      owner: blueprint.owner,
      value: blueprint.value,
      status: blueprint.status ?? 'open',
      closeReason: blueprint.closeReason,
      createdAt: now - (blueprint.daysInStage + 2) * DAY,
      stageEnteredAt: now - blueprint.daysInStage * DAY,
    });
    return acc;
  }, []);
};

export const generateSeed = (): SeedData => {
  const now = Date.now();

  const companies: Company[] = COMPANY_BLUEPRINTS.map((blueprint, index) => ({
    id: generateId(),
    name: blueprint.name,
    industry: blueprint.industry,
    employees: blueprint.employees,
    createdAt: now - (COMPANY_BLUEPRINTS.length - index) * DAY,
  }));

  const companyIdAt = (index: number): string => {
    const company = companies[index];
    if (!company) {
      throw new Error(`Seed integrity error: no company at index ${index}`);
    }
    return company.id;
  };

  const contacts: Contact[] = CONTACT_BLUEPRINTS.map((blueprint, index) => ({
    id: generateId(),
    name: blueprint.name,
    email: blueprint.email,
    companyId: companyIdAt(blueprint.companyIndex),
    role: blueprint.role,
    createdAt: now - (CONTACT_BLUEPRINTS.length - index) * DAY,
  }));

  const chats: Chat[] = [];
  const messages: MessagesByChat = {};

  for (let i = 0; i < CHATTED_CONTACT_COUNT; i += 1) {
    const contact = contacts[i];
    const script = CONVERSATIONS[i];
    if (!contact || !script) continue;

    const chatId = generateId();
    const startedAt = now - (CHATTED_CONTACT_COUNT - i) * HOUR;

    const chatMessages: Message[] = script.map((entry, order) => ({
      id: generateId(),
      chatId,
      role: entry.role,
      text: entry.text,
      createdAt: startedAt + order * 3 * MINUTE,
      status: 'sent',
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];
    const lastMessageAt = lastMessage ? lastMessage.createdAt : startedAt;

    chats.push({ id: chatId, contactId: contact.id, createdAt: startedAt, lastMessageAt });
    messages[chatId] = chatMessages;
  }

  return { companies, contacts, chats, messages, opportunities: seedOpportunities(contacts) };
};
