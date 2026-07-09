import { useCrmStore } from '@/store/crmStore';
import { FUNNEL_STAGES } from '@/types/models';
import { generateSeed } from '@/utils/seed';

jest.useFakeTimers();

// AsyncStorage é importado (no load) pelo client Supabase — usa o mock nativo do pacote.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference out-of-scope imports; require is the canonical pattern.
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// A camada de dados é mockada: os testes exercitam o CACHE (updates otimistas da
// store), não o Supabase. Todo write resolve com sucesso → sem rollback/re-hydrate.
jest.mock('@/services/crmRepo', () => ({
  fetchSnapshot: jest.fn(() =>
    Promise.resolve({ companies: [], contacts: [], chats: [], messages: {}, opportunities: [] }),
  ),
  insertCompany: jest.fn(() => Promise.resolve()),
  updateCompany: jest.fn(() => Promise.resolve()),
  deleteCompany: jest.fn(() => Promise.resolve()),
  insertContact: jest.fn(() => Promise.resolve()),
  updateContact: jest.fn(() => Promise.resolve()),
  deleteContact: jest.fn(() => Promise.resolve()),
  insertChat: jest.fn(() => Promise.resolve()),
  touchChat: jest.fn(() => Promise.resolve()),
  deleteChat: jest.fn(() => Promise.resolve()),
  insertMessage: jest.fn(() => Promise.resolve()),
  updateMessageStatus: jest.fn(() => Promise.resolve()),
  deleteMessage: jest.fn(() => Promise.resolve()),
  insertOpportunity: jest.fn(() => Promise.resolve()),
  updateOpportunity: jest.fn(() => Promise.resolve()),
  deleteOpportunity: jest.fn(() => Promise.resolve()),
}));

describe('crmStore', () => {
  beforeEach(() => {
    // Seed the store directly to dodge async-hydration races (per the blueprint).
    useCrmStore.setState(generateSeed());
  });

  it('seeds a coherent, fully-linked dataset', () => {
    const state = useCrmStore.getState();

    expect(state.companies).toHaveLength(5);
    expect(state.contacts).toHaveLength(15);
    expect(state.chats).toHaveLength(10);

    // The pipeline seeds open deals plus at least one won and one lost, so the
    // funnel and the "Fechadas" lifecycle both have something to show on first run.
    expect(state.opportunities.some((opp) => opp.status === 'open')).toBe(true);
    expect(state.opportunities.some((opp) => opp.status === 'won')).toBe(true);
    expect(state.opportunities.some((opp) => opp.status === 'lost')).toBe(true);
    // Every opportunity points at a real contact.
    const contactIdSet = new Set(state.contacts.map((contact) => contact.id));
    state.opportunities.forEach((opp) => expect(contactIdSet.has(opp.contactId)).toBe(true));

    // Exactly 5 contacts remain chat-less so the "create chat on tap" flow is testable.
    const contactIdsWithChat = new Set(state.chats.map((chat) => chat.contactId));
    const chatlessContacts = state.contacts.filter(
      (contact) => !contactIdsWithChat.has(contact.id),
    );
    expect(chatlessContacts).toHaveLength(5);

    // Every foreign key resolves.
    const companyIds = new Set(state.companies.map((company) => company.id));
    state.contacts.forEach((contact) => {
      expect(companyIds.has(contact.companyId)).toBe(true);
    });
    const contactIds = new Set(state.contacts.map((contact) => contact.id));
    state.chats.forEach((chat) => {
      expect(contactIds.has(chat.contactId)).toBe(true);
    });
  });

  it('creates a chat for a chat-less contact and is idempotent', () => {
    const initial = useCrmStore.getState();
    const contactIdsWithChat = new Set(initial.chats.map((chat) => chat.contactId));
    const chatless = initial.contacts.find((contact) => !contactIdsWithChat.has(contact.id));

    expect(chatless).toBeDefined();
    if (!chatless) throw new Error('expected a chat-less contact in the seed');

    const chatCountBefore = useCrmStore.getState().chats.length;

    const firstId = useCrmStore.getState().getOrCreateChatForContact(chatless.id);
    expect(useCrmStore.getState().chats).toHaveLength(chatCountBefore + 1);

    // Calling again must return the same chat id and not create another chat.
    const secondId = useCrmStore.getState().getOrCreateChatForContact(chatless.id);
    expect(secondId).toBe(firstId);
    expect(useCrmStore.getState().chats).toHaveLength(chatCountBefore + 1);
  });

  it('sends a message and appends a Sandbox assistant reply when no key is set', async () => {
    const chat = useCrmStore.getState().chats[0];
    if (!chat) throw new Error('expected a seeded chat');
    const chatId = chat.id;
    const countBefore = (useCrmStore.getState().messages[chatId] ?? []).length;

    const pending = useCrmStore.getState().sendMessage(chatId, 'Hello there');

    // The user message is appended and synchronously flipped sending -> sent.
    const afterUser = useCrmStore.getState().messages[chatId] ?? [];
    const userMessage = afterUser[afterUser.length - 1];
    expect(userMessage?.role).toBe('user');
    expect(userMessage?.status).toBe('sent');

    // Sandbox path waits ~1s: run timers + flush microtasks, then await completion.
    await jest.runAllTimersAsync();
    await pending;

    const finalMessages = useCrmStore.getState().messages[chatId] ?? [];
    expect(finalMessages).toHaveLength(countBefore + 2);

    const assistantMessage = finalMessages[finalMessages.length - 1];
    expect(assistantMessage?.role).toBe('assistant');
    expect(assistantMessage?.status).toBe('sent');
    // Assert a reply was appended, not its exact copy — the Sandbox text is localized.
    expect(assistantMessage?.text.trim()).toBeTruthy();
  });

  it('cascade-deletes a contact along with its chat and messages', () => {
    const before = useCrmStore.getState();
    const chat = before.chats[0];
    if (!chat) throw new Error('expected a seeded chat');
    const { contactId } = chat;
    expect(before.messages[chat.id]).toBeDefined();

    useCrmStore.getState().deleteContact(contactId);
    const after = useCrmStore.getState();

    expect(after.contacts.some((contact) => contact.id === contactId)).toBe(false);
    expect(after.chats.some((item) => item.id === chat.id)).toBe(false);
    expect(after.messages[chat.id]).toBeUndefined();
    // The owning company and the other contacts are untouched.
    expect(after.companies).toHaveLength(before.companies.length);
    expect(after.contacts).toHaveLength(before.contacts.length - 1);
  });

  it('cascade-deletes a company: its contacts, their chats and messages', () => {
    const before = useCrmStore.getState();
    const company = before.companies[0];
    if (!company) throw new Error('expected a seeded company');

    const doomedContactIds = new Set(
      before.contacts.filter((contact) => contact.companyId === company.id).map((c) => c.id),
    );
    const doomedChatIds = new Set(
      before.chats.filter((chat) => doomedContactIds.has(chat.contactId)).map((c) => c.id),
    );
    expect(doomedContactIds.size).toBeGreaterThan(0);

    useCrmStore.getState().deleteCompany(company.id);
    const after = useCrmStore.getState();

    // The company and every contact under it are gone.
    expect(after.companies.some((c) => c.id === company.id)).toBe(false);
    expect(after.contacts.some((c) => doomedContactIds.has(c.id))).toBe(false);
    // So are their chats and message buckets.
    expect(after.chats.some((chat) => doomedChatIds.has(chat.id))).toBe(false);
    doomedChatIds.forEach((chatId) => expect(after.messages[chatId]).toBeUndefined());

    // Unrelated records survive, and counts drop by exactly the cascade size.
    expect(after.companies).toHaveLength(before.companies.length - 1);
    expect(after.contacts).toHaveLength(before.contacts.length - doomedContactIds.size);
    expect(after.chats).toHaveLength(before.chats.length - doomedChatIds.size);
  });

  it('updates a company and a contact in place, preserving untouched fields', () => {
    const before = useCrmStore.getState();
    const company = before.companies[0];
    const contact = before.contacts[0];
    if (!company || !contact) throw new Error('expected seeded records');

    useCrmStore.getState().updateCompany(company.id, { name: 'Renamed Co', employees: 999 });
    useCrmStore.getState().updateContact(contact.id, { role: 'CEO' });
    const after = useCrmStore.getState();

    const updatedCompany = after.companies.find((c) => c.id === company.id);
    expect(updatedCompany?.name).toBe('Renamed Co');
    expect(updatedCompany?.employees).toBe(999);
    expect(updatedCompany?.industry).toBe(company.industry); // untouched field preserved
    expect(updatedCompany?.id).toBe(company.id); // identity preserved

    const updatedContact = after.contacts.find((c) => c.id === contact.id);
    expect(updatedContact?.role).toBe('CEO');
    expect(updatedContact?.companyId).toBe(contact.companyId); // FK preserved

    // Update must not add or remove records.
    expect(after.companies).toHaveLength(before.companies.length);
    expect(after.contacts).toHaveLength(before.contacts.length);
  });

  it('retries a failed user message: drops it and re-sends the text', async () => {
    const chat = useCrmStore.getState().chats[0];
    if (!chat) throw new Error('expected a seeded chat');
    const chatId = chat.id;

    // Inject a failed user message directly (Sandbox mode never fails on its own).
    const failedId = 'failed-message';
    useCrmStore.setState((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [
          ...(state.messages[chatId] ?? []),
          {
            id: failedId,
            chatId,
            role: 'user',
            text: 'Tente de novo',
            createdAt: 1,
            status: 'error',
            errorReason: 'boom',
          },
        ],
      },
    }));
    const countWithFailed = (useCrmStore.getState().messages[chatId] ?? []).length;

    const pending = useCrmStore.getState().retryMessage(chatId, failedId);
    await jest.runAllTimersAsync();
    await pending;

    const finalMessages = useCrmStore.getState().messages[chatId] ?? [];
    // The failed message is gone; a fresh user message + a Sandbox reply replaced it.
    expect(finalMessages.some((message) => message.id === failedId)).toBe(false);
    expect(finalMessages).toHaveLength(countWithFailed + 1);
    const resent = finalMessages.find(
      (message) => message.role === 'user' && message.text === 'Tente de novo',
    );
    expect(resent?.status).toBe('sent');
    const last = finalMessages[finalMessages.length - 1];
    expect(last?.role).toBe('assistant');
    expect(last?.status).toBe('sent');
  });

  describe('opportunities', () => {
    const firstContact = () => {
      const contact = useCrmStore.getState().contacts[0];
      if (!contact) throw new Error('expected a seeded contact');
      return contact;
    };

    it('adds an open opportunity at the first stage and prepends it', () => {
      const contact = firstContact();
      const before = useCrmStore.getState().opportunities.length;

      const created = useCrmStore.getState().addOpportunity({
        title: 'Novo negócio',
        contactId: contact.id,
        owner: 'Você',
        value: 5000,
      });

      const after = useCrmStore.getState().opportunities;
      expect(after).toHaveLength(before + 1);
      expect(after[0]?.id).toBe(created.id); // prepended
      expect(created.status).toBe('open');
      expect(created.stageId).toBe(FUNNEL_STAGES[0]?.id);
      expect(created.stageEnteredAt).toBe(created.createdAt);
    });

    it('moves an opportunity to a new stage, reopening it and resetting the stage timer', () => {
      const contact = firstContact();
      const opp = useCrmStore
        .getState()
        .addOpportunity({ title: 'X', contactId: contact.id, owner: 'Você', value: 1000 });

      // Simulate it having sat in-stage a while, then been closed as lost.
      useCrmStore.setState((state) => ({
        opportunities: state.opportunities.map((item) =>
          item.id === opp.id
            ? { ...item, status: 'lost', closeReason: 'preço', stageEnteredAt: 1 }
            : item,
        ),
      }));

      const target = FUNNEL_STAGES[2]?.id;
      if (!target) throw new Error('expected a third stage');
      useCrmStore.getState().moveOpportunity(opp.id, target);

      const moved = useCrmStore.getState().opportunities.find((item) => item.id === opp.id);
      expect(moved?.stageId).toBe(target);
      expect(moved?.status).toBe('open'); // reopened
      expect(moved?.closeReason).toBeUndefined();
      expect(moved?.stageEnteredAt).toBeGreaterThan(1); // timer reset to "now"
    });

    it('is a no-op when an open opp is moved to the stage it is already in', () => {
      const contact = firstContact();
      const opp = useCrmStore
        .getState()
        .addOpportunity({ title: 'Parada', contactId: contact.id, owner: 'Você', value: 1000 });

      // Pretend it entered its stage long ago (a "stuck" deal).
      const oldEnteredAt = 12345;
      useCrmStore.setState((state) => ({
        opportunities: state.opportunities.map((item) =>
          item.id === opp.id ? { ...item, stageEnteredAt: oldEnteredAt } : item,
        ),
      }));
      const before = useCrmStore.getState().opportunities.find((item) => item.id === opp.id);

      useCrmStore.getState().moveOpportunity(opp.id, opp.stageId); // same stage

      const after = useCrmStore.getState().opportunities.find((item) => item.id === opp.id);
      expect(after?.stageEnteredAt).toBe(oldEnteredAt); // aging timer preserved
      expect(after).toBe(before); // same reference — no re-render churn
    });

    it('reopens a closed opp even when moved to its current stage', () => {
      const contact = firstContact();
      const opp = useCrmStore
        .getState()
        .addOpportunity({ title: 'Reabrir', contactId: contact.id, owner: 'Você', value: 1000 });
      useCrmStore.getState().closeOpportunity(opp.id, 'lost', 'preço');

      useCrmStore.getState().moveOpportunity(opp.id, opp.stageId); // same stage, but closed

      const after = useCrmStore.getState().opportunities.find((item) => item.id === opp.id);
      expect(after?.status).toBe('open');
      expect(after?.closeReason).toBeUndefined();
    });

    it('closes an opportunity as won with a reason, leaving the stage intact', () => {
      const contact = firstContact();
      const opp = useCrmStore
        .getState()
        .addOpportunity({ title: 'Fechar', contactId: contact.id, owner: 'Você', value: 2000 });

      useCrmStore.getState().closeOpportunity(opp.id, 'won', 'melhor proposta');

      const closed = useCrmStore.getState().opportunities.find((item) => item.id === opp.id);
      expect(closed?.status).toBe('won');
      expect(closed?.closeReason).toBe('melhor proposta');
      expect(closed?.stageId).toBe(opp.stageId);
    });

    it('deletes a single opportunity, leaving the others intact', () => {
      const contact = firstContact();
      const opp = useCrmStore
        .getState()
        .addOpportunity({ title: 'Some', contactId: contact.id, owner: 'Você', value: 1000 });
      const before = useCrmStore.getState().opportunities.length;

      useCrmStore.getState().deleteOpportunity(opp.id);

      const after = useCrmStore.getState().opportunities;
      expect(after).toHaveLength(before - 1);
      expect(after.some((item) => item.id === opp.id)).toBe(false);
    });

    it('cascade-deletes opportunities when their contact is removed', () => {
      const contact = firstContact();
      useCrmStore
        .getState()
        .addOpportunity({ title: 'Deal', contactId: contact.id, owner: 'Você', value: 3000 });
      expect(
        useCrmStore.getState().opportunities.some((item) => item.contactId === contact.id),
      ).toBe(true);

      useCrmStore.getState().deleteContact(contact.id);

      expect(
        useCrmStore.getState().opportunities.some((item) => item.contactId === contact.id),
      ).toBe(false);
    });

    it('cascade-deletes opportunities when their company is removed', () => {
      const company = useCrmStore.getState().companies[0];
      if (!company) throw new Error('expected a seeded company');
      const contactUnder = useCrmStore
        .getState()
        .contacts.find((contact) => contact.companyId === company.id);
      if (!contactUnder) throw new Error('expected a contact under the company');

      useCrmStore
        .getState()
        .addOpportunity({ title: 'Deal', contactId: contactUnder.id, owner: 'Você', value: 3000 });

      useCrmStore.getState().deleteCompany(company.id);

      expect(
        useCrmStore.getState().opportunities.some((item) => item.contactId === contactUnder.id),
      ).toBe(false);
    });
  });
});

describe('hydrate / clear', () => {
  it('hydrate carrega o snapshot do repositório para o cache', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- acesso ao mock do repo
    const repo = require('@/services/crmRepo');
    const snapshot = {
      companies: [{ id: 'co1', name: 'Acme', industry: 'Tech', employees: 10, createdAt: 1 }],
      contacts: [],
      chats: [],
      messages: {},
      opportunities: [],
    };
    (repo.fetchSnapshot as jest.Mock).mockResolvedValueOnce(snapshot);

    await useCrmStore.getState().hydrate();

    const state = useCrmStore.getState();
    expect(state.companies).toEqual(snapshot.companies);
    expect(state.hasHydrated).toBe(true);
  });

  it('clear esvazia o cache e volta hasHydrated para false', () => {
    useCrmStore.setState(generateSeed());
    expect(useCrmStore.getState().companies.length).toBeGreaterThan(0);

    useCrmStore.getState().clear();

    const state = useCrmStore.getState();
    expect(state.companies).toHaveLength(0);
    expect(state.contacts).toHaveLength(0);
    expect(state.chats).toHaveLength(0);
    expect(state.opportunities).toHaveLength(0);
    expect(state.hasHydrated).toBe(false);
  });
});
