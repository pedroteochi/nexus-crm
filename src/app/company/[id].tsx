import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InteractionManager, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Briefcase, Building2, Pencil, Trash2, Users } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { CompanyFormModal } from '@/components/CompanyFormModal';
import { ContactListItem } from '@/components/ContactListItem';
import { DetailRow } from '@/components/DetailRow';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useCrmStore } from '@/store/crmStore';

export default function CompanyDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const companyId = params.id ?? '';
  const router = useRouter();
  const colors = useThemeColors();

  const company = useCrmStore((state) => state.companies.find((item) => item.id === companyId));
  // Select the stable array and derive the filtered list in a memo — returning a
  // fresh array straight from the selector loops under Zustand v5 (useSyncExternalStore).
  const allContacts = useCrmStore((state) => state.contacts);
  const contacts = useMemo(
    () => allContacts.filter((item) => item.companyId === companyId),
    [allContacts, companyId],
  );
  const deleteCompany = useCrmStore((state) => state.deleteCompany);
  const getOrCreateChatForContact = useCrmStore((state) => state.getOrCreateChatForContact);

  const [editOpen, setEditOpen] = useState(false);

  // Self-heal: leave if the company disappears after being shown (deleted here)
  // rather than dead-ending on "not found"; a bad deep-link keeps the empty state.
  const wasPresent = useRef(false);
  useEffect(() => {
    if (company) {
      wasPresent.current = true;
      return;
    }
    if (wasPresent.current && router.canGoBack()) router.back();
  }, [company, router]);

  const handleOpenContact = useCallback((id: string) => router.push(`/contact/${id}`), [router]);
  const handleOpenChat = useCallback(
    (id: string) => {
      const chatId = getOrCreateChatForContact(id);
      router.push(`/chat/${chatId}`);
    },
    [getOrCreateChatForContact, router],
  );

  const handleDelete = useCallback(() => {
    if (!company) return;
    const linked = contacts.length;
    const detail =
      linked > 0
        ? `Isso também remove ${linked} ${linked === 1 ? 'contato vinculado' : 'contatos vinculados'} e as conversas deles. Não é possível desfazer.`
        : 'Não é possível desfazer.';
    Alert.alert(`Excluir ${company.name}?`, detail, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          router.back();
          InteractionManager.runAfterInteractions(() => deleteCompany(companyId));
        },
      },
    ]);
  }, [company, companyId, contacts.length, deleteCompany, router]);

  if (!company) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Empresa' }} />
        <EmptyState
          icon={<Building2 color="#a1a1aa" size={28} />}
          title="Empresa não encontrada"
          description="Esta empresa pode ter sido removida."
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: company.name }} />

      <View className="items-center gap-3 py-4">
        <Avatar name={company.name} size={80} />
        <View className="items-center">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{company.name}</Text>
          <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{company.industry}</Text>
        </View>
      </View>

      <Card className="overflow-hidden p-0">
        <DetailRow
          icon={<Briefcase color={colors.iconMuted} size={18} />}
          label="Setor"
          value={company.industry}
        />
        <DetailRow
          icon={<Users color={colors.iconMuted} size={18} />}
          label="Funcionários"
          value={String(company.employees)}
          divider
        />
      </Card>

      <View className="gap-2">
        <Text className="px-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {contacts.length} {contacts.length === 1 ? 'contato' : 'contatos'}
        </Text>
        {contacts.length === 0 ? (
          <Text className="px-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum contato vinculado ainda.
          </Text>
        ) : (
          <Card className="overflow-hidden p-0">
            {contacts.map((contact) => (
              <ContactListItem
                key={contact.id}
                contactId={contact.id}
                name={contact.name}
                subtitle={contact.role ?? 'Sem cargo'}
                onPress={handleOpenContact}
                onOpenChat={handleOpenChat}
              />
            ))}
          </Card>
        )}
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={() => setEditOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Editar empresa"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 active:opacity-70 dark:border-zinc-800"
        >
          <Pencil color={colors.tint} size={18} />
          <Text className="text-base font-medium text-zinc-800 dark:text-zinc-100">Editar</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Excluir empresa"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 py-3 active:opacity-70 dark:border-red-900"
        >
          <Trash2 color="#ef4444" size={18} />
          <Text className="text-base font-medium text-red-600 dark:text-red-400">Excluir</Text>
        </Pressable>
      </View>

      <CompanyFormModal visible={editOpen} onClose={() => setEditOpen(false)} company={company} />
    </ScrollView>
  );
}
