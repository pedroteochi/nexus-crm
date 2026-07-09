import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Building2, Mail, Pencil, Plus, Trash2, User } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ContactFormModal } from '@/components/ContactFormModal';
import { DetailRow } from '@/components/DetailRow';
import { EmptyState } from '@/components/EmptyState';
import { OpportunityFormModal } from '@/components/OpportunityFormModal';
import { OpportunitySheet } from '@/components/OpportunitySheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useCrmStore } from '@/store/crmStore';
import { FUNNEL_STAGES } from '@/types/models';
import { formatCurrency } from '@/utils/opportunity';

export default function ContactDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const contactId = params.id ?? '';
  const router = useRouter();
  const colors = useThemeColors();

  const contact = useCrmStore((state) => state.contacts.find((item) => item.id === contactId));
  const company = useCrmStore((state) => {
    const owner = state.contacts.find((item) => item.id === contactId);
    return owner ? state.companies.find((item) => item.id === owner.companyId) : undefined;
  });
  const deleteContact = useCrmStore((state) => state.deleteContact);
  const getOrCreateChatForContact = useCrmStore((state) => state.getOrCreateChatForContact);
  const allOpportunities = useCrmStore((state) => state.opportunities);

  // Zustand v5: select the whole array, derive with useMemo (a filtering selector
  // returns a new array each render and loops).
  const opportunities = useMemo(
    () => allOpportunities.filter((opp) => opp.contactId === contactId),
    [allOpportunities, contactId],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [oppFormOpen, setOppFormOpen] = useState(false);
  const [editingOppId, setEditingOppId] = useState<string | null>(null);

  const editingOpp = useMemo(
    () => allOpportunities.find((opp) => opp.id === editingOppId),
    [allOpportunities, editingOppId],
  );

  const handleEditOpp = useCallback((id: string) => {
    setSelectedOppId(null);
    // Let the sheet dismiss before presenting the form (iOS one-modal-at-a-time).
    setTimeout(() => setEditingOppId(id), Platform.OS === 'ios' ? 320 : 0);
  }, []);

  const closeOppForm = useCallback(() => {
    setOppFormOpen(false);
    setEditingOppId(null);
  }, []);

  // Self-heal: if the contact disappears after being shown (deleted here, or
  // cascaded by a company delete on a screen above), leave instead of dead-ending
  // on "not found". A fresh deep-link to a bad id keeps showing the empty state.
  const wasPresent = useRef(false);
  useEffect(() => {
    if (contact) {
      wasPresent.current = true;
      return;
    }
    if (wasPresent.current && router.canGoBack()) router.back();
  }, [contact, router]);

  const handleChat = useCallback(() => {
    const chatId = getOrCreateChatForContact(contactId);
    router.push(`/chat/${chatId}`);
  }, [contactId, getOrCreateChatForContact, router]);

  const handleDelete = useCallback(() => {
    if (!contact) return;
    Alert.alert(
      `Excluir ${contact.name}?`,
      'Isso também remove a conversa e o histórico de mensagens. Não é possível desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            router.back();
            InteractionManager.runAfterInteractions(() => deleteContact(contactId));
          },
        },
      ],
    );
  }, [contact, contactId, deleteContact, router]);

  if (!contact) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Contato' }} />
        <EmptyState
          icon={<User color="#a1a1aa" size={28} />}
          title="Contato não encontrado"
          description="Este contato pode ter sido removido."
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
      <Stack.Screen options={{ title: contact.name }} />

      <View className="items-center gap-3 py-4">
        <Avatar name={contact.name} size={80} />
        <View className="items-center">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{contact.name}</Text>
          {contact.role ? (
            <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{contact.role}</Text>
          ) : null}
        </View>
      </View>

      <Card className="overflow-hidden p-0">
        <DetailRow
          icon={<Mail color={colors.iconMuted} size={18} />}
          label="E-mail"
          value={contact.email}
        />
        {company ? (
          <DetailRow
            icon={<Building2 color={colors.iconMuted} size={18} />}
            label="Empresa"
            value={company.name}
            onPress={() => router.push(`/company/${company.id}`)}
            divider
          />
        ) : null}
      </Card>

      <PrimaryButton
        label="Conversar"
        onPress={handleChat}
        accessibilityLabel={`Conversar com ${contact.name}`}
      />

      <View className="gap-2">
        <View className="flex-row items-center justify-between px-0.5">
          <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Oportunidades
          </Text>
          <Pressable
            onPress={() => setOppFormOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Nova oportunidade"
            hitSlop={8}
            className="active:opacity-60"
          >
            <Plus color={colors.tint} size={20} />
          </Pressable>
        </View>

        {opportunities.length === 0 ? (
          <Text className="rounded-xl border border-dashed border-zinc-200 py-4 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
            Nenhuma oportunidade ainda.
          </Text>
        ) : (
          opportunities.map((opp) => {
            const stage = FUNNEL_STAGES.find((item) => item.id === opp.stageId);
            const won = opp.status === 'won';
            const lost = opp.status === 'lost';
            const dotColor = won ? '#10b981' : lost ? '#ef4444' : (stage?.color ?? '#a1a1aa');
            const statusLabel = won ? 'Ganho' : lost ? 'Perdido' : (stage?.label ?? '');
            return (
              <Pressable
                key={opp.id}
                onPress={() => setSelectedOppId(opp.id)}
                accessibilityRole="button"
                accessibilityLabel={`${opp.title}, ${statusLabel}, ${formatCurrency(opp.value)}`}
                className="flex-row items-center gap-3 rounded-xl border border-zinc-200 p-3 active:opacity-70 dark:border-zinc-800"
              >
                <View style={{ backgroundColor: dotColor }} className="h-2.5 w-2.5 rounded-full" />
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                  >
                    {opp.title}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">{statusLabel}</Text>
                </View>
                <Text className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(opp.value)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={() => setEditOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Editar contato"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 active:opacity-70 dark:border-zinc-800"
        >
          <Pencil color={colors.tint} size={18} />
          <Text className="text-base font-medium text-zinc-800 dark:text-zinc-100">Editar</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Excluir contato"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 py-3 active:opacity-70 dark:border-red-900"
        >
          <Trash2 color="#ef4444" size={18} />
          <Text className="text-base font-medium text-red-600 dark:text-red-400">Excluir</Text>
        </Pressable>
      </View>

      <ContactFormModal visible={editOpen} onClose={() => setEditOpen(false)} contact={contact} />
      <OpportunitySheet
        opportunityId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
        onEdit={handleEditOpp}
      />
      <OpportunityFormModal
        visible={oppFormOpen || Boolean(editingOppId)}
        opportunity={editingOpp}
        presetContactId={contactId}
        onClose={closeOppForm}
      />
    </ScrollView>
  );
}
