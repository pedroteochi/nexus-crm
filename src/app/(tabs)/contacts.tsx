import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users } from 'lucide-react-native';

import { ContactFormModal } from '@/components/ContactFormModal';
import { ContactListItem } from '@/components/ContactListItem';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonLoading } from '@/components/SkeletonLoading';
import { useCrmStore } from '@/store/crmStore';
import { matchesQuery } from '@/utils/search';

interface ContactRow {
  id: string;
  name: string;
  subtitle: string;
}

export default function ContactsScreen() {
  const router = useRouter();
  const contacts = useCrmStore((state) => state.contacts);
  const companies = useCrmStore((state) => state.companies);
  const hasHydrated = useCrmStore((state) => state.hasHydrated);
  const getOrCreateChatForContact = useCrmStore((state) => state.getOrCreateChatForContact);

  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');

  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );

  const rows = useMemo<ContactRow[]>(
    () =>
      contacts.map((contact) => {
        const company = companyById.get(contact.companyId);
        const parts = [contact.role, company?.name].filter(Boolean);
        return {
          id: contact.id,
          name: contact.name,
          subtitle: parts.length > 0 ? parts.join(' · ') : 'Sem empresa',
        };
      }),
    [contacts, companyById],
  );

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesQuery(`${row.name} ${row.subtitle}`, query)),
    [rows, query],
  );

  const handleOpenDetail = useCallback((id: string) => router.push(`/contact/${id}`), [router]);

  const handleOpenChat = useCallback(
    (id: string) => {
      const chatId = getOrCreateChatForContact(id);
      router.push(`/chat/${chatId}`);
    },
    [getOrCreateChatForContact, router],
  );

  const renderItem: ListRenderItem<ContactRow> = useCallback(
    ({ item }) => (
      <ContactListItem
        contactId={item.id}
        name={item.name}
        subtitle={item.subtitle}
        onPress={handleOpenDetail}
        onOpenChat={handleOpenChat}
      />
    ),
    [handleOpenDetail, handleOpenChat],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-zinc-950">
      <ScreenHeader
        title="Contatos"
        subtitle={`${contacts.length} ${contacts.length === 1 ? 'pessoa' : 'pessoas'}`}
        action={
          <IconButton onPress={() => setAddOpen(true)} accessibilityLabel="Adicionar contato">
            <Plus color="#4f46e5" size={24} />
          </IconButton>
        }
      />

      {!hasHydrated ? (
        <SkeletonLoading />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users color="#a1a1aa" size={28} />}
          title="Nenhum contato ainda"
          description="Adicione seu primeiro contato para começar a montar seu CRM."
          action={<PrimaryButton label="Adicionar contato" onPress={() => setAddOpen(true)} />}
        />
      ) : (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por nome, cargo ou empresa" />
          <FlatList
            data={filteredRows}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <Text className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
                Nenhum contato para “{query}”.
              </Text>
            }
          />
        </>
      )}

      <ContactFormModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}
