import { create } from 'zustand';

import * as openai from '@/services/openai';
import * as repo from '@/services/crmRepo';
import { FUNNEL_STAGES } from '@/types/models';
import type {
  Chat,
  Company,
  Contact,
  Message,
  MessagesByChat,
  MessageStatus,
  NewCompanyInput,
  NewContactInput,
  NewOpportunityInput,
  Opportunity,
} from '@/types/models';
import { generateId } from '@/utils/id';

/** Only the last N messages are sent to the model as context. */
const HISTORY_LIMIT = 10;

export interface CrmState {
  companies: Company[];
  contacts: Contact[];
  chats: Chat[];
  messages: MessagesByChat;
  opportunities: Opportunity[];
  hasHydrated: boolean;

  /** Carrega o dataset do usuário logado do Supabase para o cache. Chamado no login. */
  hydrate: () => Promise<void>;
  /** Esvazia o cache. Chamado no logout. */
  clear: () => void;

  addOpportunity: (input: NewOpportunityInput) => Opportunity;
  updateOpportunity: (id: string, patch: Partial<Pick<Opportunity, 'title' | 'owner' | 'value'>>) => void;
  /** Move to a stage; resets the "stuck for X" timer and reopens if it was closed. */
  moveOpportunity: (id: string, stageId: string) => void;
  /** Close as won or lost with an optional reason (Motivo de ganho/perda). */
  closeOpportunity: (id: string, outcome: 'won' | 'lost', reason?: string) => void;
  deleteOpportunity: (id: string) => void;

  addCompany: (input: NewCompanyInput) => Company;
  updateCompany: (id: string, patch: Partial<NewCompanyInput>) => void;
  /** Cascade delete: also removes the company's contacts, their chats and messages. */
  deleteCompany: (id: string) => void;
  addContact: (input: NewContactInput) => Contact;
  updateContact: (id: string, patch: Partial<NewContactInput>) => void;
  /** Cascade delete: also removes the contact's chat and its messages. */
  deleteContact: (id: string) => void;
  /** Idempotent: returns the existing chat id for the contact, or creates one. */
  getOrCreateChatForContact: (contactId: string) => string;
  /** Remove a single chat and its messages, leaving the contact intact. */
  deleteChat: (chatId: string) => void;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  /** Re-send a previously failed user message: drops it, then sends its text again. */
  retryMessage: (chatId: string, messageId: string) => Promise<void>;
  setHasHydrated: (value: boolean) => void;
}

/** Immutably append a message to a chat's message list. */
const appendMessage = (
  messages: MessagesByChat,
  chatId: string,
  message: Message,
): MessagesByChat => ({
  ...messages,
  [chatId]: [...(messages[chatId] ?? []), message],
});

/** Immutably update the status of a single message. No-op if it is gone. */
const withMessageStatus = (
  messages: MessagesByChat,
  chatId: string,
  messageId: string,
  status: MessageStatus,
): MessagesByChat => {
  const chatMessages = messages[chatId];
  if (!chatMessages) return messages;
  return {
    ...messages,
    [chatId]: chatMessages.map((message) =>
      message.id === messageId ? { ...message, status } : message,
    ),
  };
};

/** Immutably mark a message as errored and attach a user-facing reason. */
const withMessageError = (
  messages: MessagesByChat,
  chatId: string,
  messageId: string,
  reason: string,
): MessagesByChat => {
  const chatMessages = messages[chatId];
  if (!chatMessages) return messages;
  return {
    ...messages,
    [chatId]: chatMessages.map((message) =>
      message.id === messageId ? { ...message, status: 'error', errorReason: reason } : message,
    ),
  };
};

export const useCrmStore = create<CrmState>()((set, get) => {
  /**
   * Dispara uma escrita no Supabase em background. O cache já foi atualizado de
   * forma otimista; se a escrita falhar, ressincronizamos com a verdade do
   * servidor (refetch) em vez de adivinhar um rollback manual. Mantém as actions
   * síncronas (a UI responde na hora) e o servidor como fonte da verdade.
   */
  const writeThrough = (label: string, op: Promise<void>): void => {
    op.catch((error) => {
      console.error(`[crmStore] ${label} falhou; ressincronizando com o servidor`, error);
      void get().hydrate();
    });
  };

  // Geração de hidratação: clear() (logout) e cada hydrate() novo invalidam os
  // fetches em voo. Sem isso, um snapshot atrasado do usuário A poderia
  // sobrescrever o clear() e aparecer na sessão do usuário B.
  let hydrateGeneration = 0;

  return {
    companies: [],
    contacts: [],
    chats: [],
    messages: {},
    opportunities: [],
    hasHydrated: false,

    hydrate: async () => {
      const generation = ++hydrateGeneration;
      try {
        let snapshot: repo.CrmSnapshot;
        try {
          snapshot = await repo.fetchSnapshot();
        } catch (firstError) {
          // Primeira falha é tratada como transitória (ex.: clock skew do próprio
          // Supabase — "JWT issued at future" — logo após o login, ou um blip de
          // rede): espera 2s e tenta UMA vez antes de desistir.
          console.warn('[crmStore] hydrate falhou; tentando de novo em 2s', firstError);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (generation !== hydrateGeneration) return; // logout/novo hydrate no meio
          snapshot = await repo.fetchSnapshot();
        }
        if (generation !== hydrateGeneration) return; // resposta obsoleta: descarta
        set({ ...snapshot, hasHydrated: true });
      } catch (error) {
        console.error('[crmStore] hydrate falhou', error);
        if (generation !== hydrateGeneration) return;
        // Nunca deixe a UI presa no skeleton — mesmo sem dados, libere a tela.
        set({ hasHydrated: true });
      }
    },

    clear: () => {
      hydrateGeneration++; // invalida qualquer hydrate em voo
      set({
        companies: [],
        contacts: [],
        chats: [],
        messages: {},
        opportunities: [],
        hasHydrated: false,
      });
    },

    addOpportunity: (input) => {
      const now = Date.now();
      const opportunity: Opportunity = {
        id: generateId(),
        title: input.title,
        contactId: input.contactId,
        stageId: input.stageId ?? FUNNEL_STAGES[0]?.id ?? 'novo',
        owner: input.owner,
        value: input.value,
        status: 'open',
        createdAt: now,
        stageEnteredAt: now,
      };
      set((state) => ({ opportunities: [opportunity, ...state.opportunities] }));
      writeThrough('addOpportunity', repo.insertOpportunity(opportunity));
      return opportunity;
    },

    updateOpportunity: (id, patch) => {
      set((state) => ({
        opportunities: state.opportunities.map((opp) => (opp.id === id ? { ...opp, ...patch } : opp)),
      }));
      writeThrough('updateOpportunity', repo.updateOpportunity(id, patch));
    },

    moveOpportunity: (id, stageId) => {
      let changed = false;
      const stageEnteredAt = Date.now();
      set((state) => ({
        opportunities: state.opportunities.map((opp) => {
          if (opp.id !== id) return opp;
          // No-op if it is already open in this stage: returning the same object
          // avoids a re-render and, crucially, keeps `stageEnteredAt` intact so the
          // "parado há Xd" aging signal isn't silently wiped by re-tapping the
          // current stage. A closed opp in the same stage still reopens (timer reset).
          if (opp.stageId === stageId && opp.status === 'open') return opp;
          changed = true;
          return { ...opp, stageId, status: 'open', closeReason: undefined, stageEnteredAt };
        }),
      }));
      // Only persist when something actually changed (mirrors the local no-op).
      if (changed) {
        writeThrough(
          'moveOpportunity',
          repo.updateOpportunity(id, {
            stageId,
            status: 'open',
            closeReason: undefined,
            stageEnteredAt,
          }),
        );
      }
    },

    closeOpportunity: (id, outcome, reason) => {
      // Store a trimmed reason or nothing at all — never a fabricated placeholder.
      const closeReason = reason?.trim() || undefined;
      set((state) => ({
        opportunities: state.opportunities.map((opp) =>
          opp.id === id ? { ...opp, status: outcome, closeReason } : opp,
        ),
      }));
      writeThrough('closeOpportunity', repo.updateOpportunity(id, { status: outcome, closeReason }));
    },

    deleteOpportunity: (id) => {
      set((state) => ({ opportunities: state.opportunities.filter((opp) => opp.id !== id) }));
      writeThrough('deleteOpportunity', repo.deleteOpportunity(id));
    },

    addCompany: (input) => {
      const company: Company = { ...input, id: generateId(), createdAt: Date.now() };
      set((state) => ({ companies: [company, ...state.companies] }));
      writeThrough('addCompany', repo.insertCompany(company));
      return company;
    },

    updateCompany: (id, patch) => {
      set((state) => ({
        companies: state.companies.map((company) =>
          company.id === id ? { ...company, ...patch } : company,
        ),
      }));
      writeThrough('updateCompany', repo.updateCompany(id, patch));
    },

    deleteCompany: (id) => {
      // Cascade in the cache; the DB mirrors it via ON DELETE CASCADE FKs, so the
      // repo only deletes the company itself.
      set((state) => {
        const removedContactIds = new Set(
          state.contacts.filter((contact) => contact.companyId === id).map((contact) => contact.id),
        );
        const removedChatIds = new Set(
          state.chats
            .filter((chat) => removedContactIds.has(chat.contactId))
            .map((chat) => chat.id),
        );
        return {
          companies: state.companies.filter((company) => company.id !== id),
          contacts: state.contacts.filter((contact) => !removedContactIds.has(contact.id)),
          chats: state.chats.filter((chat) => !removedChatIds.has(chat.id)),
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([chatId]) => !removedChatIds.has(chatId)),
          ),
          opportunities: state.opportunities.filter(
            (opp) => !removedContactIds.has(opp.contactId),
          ),
        };
      });
      writeThrough('deleteCompany', repo.deleteCompany(id));
    },

    addContact: (input) => {
      const contact: Contact = { ...input, id: generateId(), createdAt: Date.now() };
      set((state) => ({ contacts: [contact, ...state.contacts] }));
      writeThrough('addContact', repo.insertContact(contact));
      return contact;
    },

    updateContact: (id, patch) => {
      set((state) => ({
        contacts: state.contacts.map((contact) =>
          contact.id === id ? { ...contact, ...patch } : contact,
        ),
      }));
      writeThrough('updateContact', repo.updateContact(id, patch));
    },

    deleteContact: (id) => {
      // Cascade in the cache; the DB cascades chats + messages + opportunities.
      set((state) => {
        const removedChatIds = new Set(
          state.chats.filter((chat) => chat.contactId === id).map((chat) => chat.id),
        );
        return {
          contacts: state.contacts.filter((contact) => contact.id !== id),
          chats: state.chats.filter((chat) => !removedChatIds.has(chat.id)),
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([chatId]) => !removedChatIds.has(chatId)),
          ),
          opportunities: state.opportunities.filter((opp) => opp.contactId !== id),
        };
      });
      writeThrough('deleteContact', repo.deleteContact(id));
    },

    getOrCreateChatForContact: (contactId) => {
      const existing = get().chats.find((chat) => chat.contactId === contactId);
      if (existing) return existing.id;

      const now = Date.now();
      const chat: Chat = { id: generateId(), contactId, createdAt: now, lastMessageAt: now };
      set((state) => ({
        chats: [chat, ...state.chats],
        messages: { ...state.messages, [chat.id]: [] },
      }));
      writeThrough('getOrCreateChatForContact', repo.insertChat(chat));
      return chat.id;
    },

    deleteChat: (chatId) => {
      set((state) => ({
        chats: state.chats.filter((chat) => chat.id !== chatId),
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([id]) => id !== chatId),
        ),
      }));
      writeThrough('deleteChat', repo.deleteChat(chatId));
    },

    sendMessage: async (chatId, text) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: Message = {
        id: generateId(),
        chatId,
        role: 'user',
        text: trimmed,
        createdAt: Date.now(),
        status: 'sending',
      };

      // Optimistically show the user message, then flip it to "sent" (synchronous).
      set((state) => ({
        messages: appendMessage(state.messages, chatId, userMessage),
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, lastMessageAt: userMessage.createdAt } : chat,
        ),
      }));
      set((state) => ({
        messages: withMessageStatus(state.messages, chatId, userMessage.id, 'sent'),
      }));
      // Persist the user turn in the background.
      writeThrough('sendMessage/user', repo.insertMessage({ ...userMessage, status: 'sent' }));
      writeThrough('sendMessage/touch', repo.touchChat(chatId, userMessage.createdAt));

      try {
        const state = get();
        const chat = state.chats.find((item) => item.id === chatId);
        if (!chat) throw new Error(`No chat found for id ${chatId}`);
        const contact = state.contacts.find((item) => item.id === chat.contactId);
        if (!contact) throw new Error(`No contact found for chat ${chatId}`);
        const company = state.companies.find((item) => item.id === contact.companyId);
        if (!company) throw new Error(`No company found for contact ${contact.id}`);

        const history = (state.messages[chatId] ?? []).slice(-HISTORY_LIMIT);
        const reply = await openai.sendMessage(contact, company, history);

        const assistantMessage: Message = {
          id: generateId(),
          chatId,
          role: 'assistant',
          text: reply,
          createdAt: Date.now(),
          status: 'sent',
        };
        set((state) => ({
          messages: appendMessage(state.messages, chatId, assistantMessage),
          chats: state.chats.map((item) =>
            item.id === chatId ? { ...item, lastMessageAt: assistantMessage.createdAt } : item,
          ),
        }));
        writeThrough('sendMessage/assistant', repo.insertMessage(assistantMessage));
        writeThrough('sendMessage/touch', repo.touchChat(chatId, assistantMessage.createdAt));
      } catch (error) {
        console.error('[crmStore] sendMessage failed', error);
        const reason = openai.toUserMessage(error);
        set((state) => ({
          messages: withMessageError(state.messages, chatId, userMessage.id, reason),
        }));
        writeThrough('sendMessage/error', repo.updateMessageStatus(userMessage.id, 'error', reason));
      }
    },

    retryMessage: async (chatId, messageId) => {
      const target = (get().messages[chatId] ?? []).find((message) => message.id === messageId);
      if (!target || target.role !== 'user') return;
      // Drop the failed message (locally + in the DB), then re-send its text.
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] ?? []).filter((message) => message.id !== messageId),
        },
      }));
      writeThrough('retryMessage/drop', repo.deleteMessage(messageId));
      await get().sendMessage(chatId, target.text);
    },

    setHasHydrated: (value) => set({ hasHydrated: value }),
  };
});
