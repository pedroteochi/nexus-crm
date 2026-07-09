import { getSupabase } from '@/services/supabase';
import type {
  Chat,
  Company,
  Contact,
  Message,
  MessagesByChat,
  MessageStatus,
  Opportunity,
  OpportunityStatus,
} from '@/types/models';

/**
 * Camada de dados do CRM sobre o Supabase.
 *
 * Responsabilidades:
 *  - traduzir entre as linhas do Postgres (snake_case, timestamptz) e os modelos
 *    do app (camelCase, epoch ms);
 *  - expor CRUD por entidade que a store chama (write-through com update otimista).
 *
 * `user_id` nunca é enviado nos inserts — o default `auth.uid()` + a RLS cuidam
 * do isolamento por usuário. As cascatas de delete são FKs no banco, então deletar
 * a entidade-raiz basta (a store espelha isso no cache local).
 */

// ─────────────────── conversões de tempo ───────────────────
const toMs = (iso: string | null): number => (iso ? Date.parse(iso) : 0);
const toIso = (ms: number): string => new Date(ms).toISOString();

// ─────────────────── linhas do banco ───────────────────
interface CompanyRow {
  id: string;
  name: string;
  industry: string | null;
  employees: number | null;
  created_at: string;
}
interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  company_id: string | null;
  role: string | null;
  created_at: string;
}
interface ChatRow {
  id: string;
  contact_id: string | null;
  created_at: string;
  last_message_at: string | null;
}
interface MessageRow {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  text: string;
  status: MessageStatus;
  error_reason: string | null;
  created_at: string;
}
interface OpportunityRow {
  id: string;
  title: string;
  contact_id: string | null;
  stage_id: string;
  owner: string | null;
  value: number | string | null;
  status: OpportunityStatus;
  close_reason: string | null;
  created_at: string;
  stage_entered_at: string;
}

// ─────────────────── row → model ───────────────────
const toCompany = (r: CompanyRow): Company => ({
  id: r.id,
  name: r.name,
  industry: r.industry ?? '',
  employees: r.employees ?? 0,
  createdAt: toMs(r.created_at),
});
const toContact = (r: ContactRow): Contact => ({
  id: r.id,
  name: r.name,
  email: r.email ?? '',
  companyId: r.company_id ?? '',
  role: r.role ?? undefined,
  createdAt: toMs(r.created_at),
});
const toChat = (r: ChatRow): Chat => ({
  id: r.id,
  contactId: r.contact_id ?? '',
  createdAt: toMs(r.created_at),
  lastMessageAt: r.last_message_at ? toMs(r.last_message_at) : toMs(r.created_at),
});
const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  chatId: r.chat_id,
  role: r.role,
  text: r.text,
  createdAt: toMs(r.created_at),
  status: r.status,
  ...(r.error_reason ? { errorReason: r.error_reason } : {}),
});
const toOpportunity = (r: OpportunityRow): Opportunity => ({
  id: r.id,
  title: r.title,
  contactId: r.contact_id ?? '',
  stageId: r.stage_id,
  owner: r.owner ?? '',
  value: r.value == null ? 0 : Number(r.value),
  status: r.status,
  ...(r.close_reason ? { closeReason: r.close_reason } : {}),
  createdAt: toMs(r.created_at),
  stageEnteredAt: toMs(r.stage_entered_at),
});

/** Lança se a resposta do Supabase trouxe erro (a store captura e reverte). */
const orThrow = <T>(result: { data: T; error: { message: string } | null }): T => {
  if (result.error) throw new Error(`[crmRepo] ${result.error.message}`);
  return result.data;
};

/** Snapshot completo do usuário logado, carregado no login para o cache Zustand. */
export interface CrmSnapshot {
  companies: Company[];
  contacts: Contact[];
  chats: Chat[];
  messages: MessagesByChat;
  opportunities: Opportunity[];
}

export const fetchSnapshot = async (): Promise<CrmSnapshot> => {
  const sb = getSupabase();
  // Paraleliza as 5 leituras. Newest-first onde a UI prepende; mensagens em ordem
  // cronológica (asc) para a timeline do chat.
  const [companies, contacts, chats, messages, opportunities] = await Promise.all([
    sb.from('companies').select('*').order('created_at', { ascending: false }),
    sb.from('contacts').select('*').order('created_at', { ascending: false }),
    sb.from('chats').select('*').order('last_message_at', { ascending: false, nullsFirst: false }),
    sb.from('messages').select('*').order('created_at', { ascending: true }),
    sb.from('opportunities').select('*').order('created_at', { ascending: false }),
  ]);

  const byChat: MessagesByChat = {};
  for (const row of orThrow(messages) as MessageRow[]) {
    (byChat[row.chat_id] ??= []).push(toMessage(row));
  }

  return {
    companies: (orThrow(companies) as CompanyRow[]).map(toCompany),
    contacts: (orThrow(contacts) as ContactRow[]).map(toContact),
    chats: (orThrow(chats) as ChatRow[]).map(toChat),
    messages: byChat,
    opportunities: (orThrow(opportunities) as OpportunityRow[]).map(toOpportunity),
  };
};

// ─────────────────── companies ───────────────────
export const insertCompany = async (c: Company): Promise<void> => {
  orThrow(
    await getSupabase()
      .from('companies')
      .insert({
        id: c.id,
        name: c.name,
        industry: c.industry,
        employees: c.employees,
        created_at: toIso(c.createdAt),
      }),
  );
};
export const updateCompany = async (
  id: string,
  patch: Partial<Pick<Company, 'name' | 'industry' | 'employees'>>,
): Promise<void> => {
  orThrow(await getSupabase().from('companies').update(patch).eq('id', id));
};
export const deleteCompany = async (id: string): Promise<void> => {
  orThrow(await getSupabase().from('companies').delete().eq('id', id));
};

// ─────────────────── contacts ───────────────────
export const insertContact = async (c: Contact): Promise<void> => {
  orThrow(
    await getSupabase()
      .from('contacts')
      .insert({
        id: c.id,
        name: c.name,
        email: c.email,
        company_id: c.companyId,
        role: c.role ?? null,
        created_at: toIso(c.createdAt),
      }),
  );
};
export const updateContact = async (
  id: string,
  patch: Partial<Pick<Contact, 'name' | 'email' | 'companyId' | 'role'>>,
): Promise<void> => {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.companyId !== undefined) row.company_id = patch.companyId;
  if (patch.role !== undefined) row.role = patch.role;
  orThrow(await getSupabase().from('contacts').update(row).eq('id', id));
};
export const deleteContact = async (id: string): Promise<void> => {
  orThrow(await getSupabase().from('contacts').delete().eq('id', id));
};

// ─────────────────── chats ───────────────────
export const insertChat = async (c: Chat): Promise<void> => {
  orThrow(
    await getSupabase()
      .from('chats')
      .insert({
        id: c.id,
        contact_id: c.contactId,
        created_at: toIso(c.createdAt),
        last_message_at: toIso(c.lastMessageAt),
      }),
  );
};
export const touchChat = async (id: string, lastMessageAt: number): Promise<void> => {
  orThrow(await getSupabase().from('chats').update({ last_message_at: toIso(lastMessageAt) }).eq('id', id));
};
export const deleteChat = async (id: string): Promise<void> => {
  orThrow(await getSupabase().from('chats').delete().eq('id', id));
};

// ─────────────────── messages ───────────────────
export const insertMessage = async (m: Message): Promise<void> => {
  orThrow(
    await getSupabase()
      .from('messages')
      .insert({
        id: m.id,
        chat_id: m.chatId,
        role: m.role,
        text: m.text,
        status: m.status,
        error_reason: m.errorReason ?? null,
        created_at: toIso(m.createdAt),
      }),
  );
};
export const updateMessageStatus = async (
  id: string,
  status: MessageStatus,
  errorReason?: string,
): Promise<void> => {
  orThrow(
    await getSupabase()
      .from('messages')
      .update({ status, error_reason: errorReason ?? null })
      .eq('id', id),
  );
};
export const deleteMessage = async (id: string): Promise<void> => {
  orThrow(await getSupabase().from('messages').delete().eq('id', id));
};

// ─────────────────── opportunities ───────────────────
export const insertOpportunity = async (o: Opportunity): Promise<void> => {
  orThrow(
    await getSupabase()
      .from('opportunities')
      .insert({
        id: o.id,
        title: o.title,
        contact_id: o.contactId,
        stage_id: o.stageId,
        owner: o.owner,
        value: o.value,
        status: o.status,
        close_reason: o.closeReason ?? null,
        created_at: toIso(o.createdAt),
        stage_entered_at: toIso(o.stageEnteredAt),
      }),
  );
};
export const updateOpportunity = async (
  id: string,
  patch: Partial<
    Pick<
      Opportunity,
      'title' | 'owner' | 'value' | 'stageId' | 'status' | 'closeReason' | 'stageEnteredAt'
    >
  >,
): Promise<void> => {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.owner !== undefined) row.owner = patch.owner;
  if (patch.value !== undefined) row.value = patch.value;
  if (patch.stageId !== undefined) row.stage_id = patch.stageId;
  if (patch.status !== undefined) row.status = patch.status;
  // `in` (não !== undefined): reabrir/fechar sem motivo passa closeReason: undefined
  // DE PROPÓSITO para LIMPAR o motivo antigo no banco — checar por valor pularia
  // exatamente esse caso e o motivo ressuscitaria na próxima hidratação.
  if ('closeReason' in patch) row.close_reason = patch.closeReason ?? null;
  if (patch.stageEnteredAt !== undefined) row.stage_entered_at = toIso(patch.stageEnteredAt);
  orThrow(await getSupabase().from('opportunities').update(row).eq('id', id));
};
export const deleteOpportunity = async (id: string): Promise<void> => {
  orThrow(await getSupabase().from('opportunities').delete().eq('id', id));
};
