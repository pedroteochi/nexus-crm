import { useCallback, useState } from 'react';

import { useCrmStore } from '@/store/crmStore';
import type { Chat, Company, Contact, Message } from '@/types/models';

/** Stable empty reference so selectors don't trigger re-renders for empty chats. */
const EMPTY_MESSAGES: Message[] = [];

export interface UseChatResult {
  chat: Chat | undefined;
  contact: Contact | undefined;
  company: Company | undefined;
  messages: Message[];
  isSending: boolean;
  send: (text: string) => Promise<void>;
  retry: (messageId: string) => Promise<void>;
}

/**
 * View-model for a single chat screen. Resolves the chat, its contact and
 * company from the store, exposes the message list, and owns the local
 * "awaiting the assistant" flag so the UI can disable input while a reply is
 * pending. All business logic stays in the store action.
 */
export const useChat = (chatId: string): UseChatResult => {
  const chat = useCrmStore((state) => state.chats.find((item) => item.id === chatId));
  const contact = useCrmStore((state) => {
    const current = state.chats.find((item) => item.id === chatId);
    return current ? state.contacts.find((item) => item.id === current.contactId) : undefined;
  });
  const company = useCrmStore((state) => {
    const current = state.chats.find((item) => item.id === chatId);
    const owner = current
      ? state.contacts.find((item) => item.id === current.contactId)
      : undefined;
    return owner ? state.companies.find((item) => item.id === owner.companyId) : undefined;
  });
  const messages = useCrmStore((state) => state.messages[chatId] ?? EMPTY_MESSAGES);
  const sendMessage = useCrmStore((state) => state.sendMessage);
  const retryMessage = useCrmStore((state) => state.retryMessage);

  const [isSending, setIsSending] = useState(false);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;
      setIsSending(true);
      try {
        await sendMessage(chatId, trimmed);
      } finally {
        setIsSending(false);
      }
    },
    [chatId, isSending, sendMessage],
  );

  const retry = useCallback(
    async (messageId: string) => {
      if (isSending) return;
      setIsSending(true);
      try {
        await retryMessage(chatId, messageId);
      } finally {
        setIsSending(false);
      }
    },
    [chatId, isSending, retryMessage],
  );

  return { chat, contact, company, messages, isSending, send, retry };
};
