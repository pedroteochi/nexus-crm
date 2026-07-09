import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';

import { ChatListItem } from '@/components/ChatListItem';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonLoading } from '@/components/SkeletonLoading';
import { useCrmStore } from '@/store/crmStore';
import { matchesQuery } from '@/utils/search';
import { formatRelativeTime } from '@/utils/time';

interface ChatRow {
  chatId: string;
  contactName: string;
  snippet: string;
  timeLabel: string;
}

export default function ChatsScreen() {
  const router = useRouter();
  const chats = useCrmStore((state) => state.chats);
  const contacts = useCrmStore((state) => state.contacts);
  const messages = useCrmStore((state) => state.messages);
  const hasHydrated = useCrmStore((state) => state.hasHydrated);
  const [query, setQuery] = useState('');

  const rows = useMemo<ChatRow[]>(() => {
    const contactById = new Map(contacts.map((contact) => [contact.id, contact]));
    return chats
      .slice()
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .reduce<ChatRow[]>((acc, chat) => {
        const contact = contactById.get(chat.contactId);
        if (!contact) return acc;
        const chatMessages = messages[chat.id] ?? [];
        const last = chatMessages[chatMessages.length - 1];
        acc.push({
          chatId: chat.id,
          contactName: contact.name,
          snippet: last ? last.text : 'Nenhuma mensagem ainda',
          timeLabel: formatRelativeTime(chat.lastMessageAt),
        });
        return acc;
      }, []);
  }, [chats, contacts, messages]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesQuery(`${row.contactName} ${row.snippet}`, query)),
    [rows, query],
  );

  const handlePress = useCallback(
    (chatId: string) => {
      router.push(`/chat/${chatId}`);
    },
    [router],
  );

  const renderItem: ListRenderItem<ChatRow> = useCallback(
    ({ item }) => (
      <ChatListItem
        chatId={item.chatId}
        contactName={item.contactName}
        snippet={item.snippet}
        timeLabel={item.timeLabel}
        onPress={handlePress}
      />
    ),
    [handlePress],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-zinc-950">
      <ScreenHeader title="Conversas" subtitle="Suas conversas recentes" />
      {!hasHydrated ? (
        <SkeletonLoading />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<MessageCircle color="#a1a1aa" size={28} />}
          title="Nenhuma conversa ainda"
          description="Abra a aba Contatos e toque no ícone de mensagem para iniciar uma conversa."
        />
      ) : (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar conversa" />
          <FlatList
            data={filteredRows}
            keyExtractor={(item) => item.chatId}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <Text className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
                Nenhuma conversa para “{query}”.
              </Text>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}
