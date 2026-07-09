import { memo, useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { RotateCcw, X } from 'lucide-react-native';

import { IconButton } from '@/components/IconButton';
import { useCrmStore } from '@/store/crmStore';
import { formatCurrency } from '@/utils/opportunity';

interface ClosedOpportunitiesSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Bottom sheet listing won/lost opportunities — the deals that leave the open
 * funnel — with a one-tap "Reabrir" that drops them back into their stage. */
const ClosedOpportunitiesSheetComponent = ({ visible, onClose }: ClosedOpportunitiesSheetProps) => {
  const opportunities = useCrmStore((state) => state.opportunities);
  const contacts = useCrmStore((state) => state.contacts);
  const moveOpportunity = useCrmStore((state) => state.moveOpportunity);

  const nameOf = useMemo(() => {
    const map = new Map(contacts.map((contact) => [contact.id, contact.name]));
    return (id: string) => map.get(id) ?? 'Sem contato';
  }, [contacts]);

  const closed = useMemo(
    () => opportunities.filter((opp) => opp.status !== 'open'),
    [opportunities],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessible={false} className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          accessible={false}
          onPress={() => undefined}
          style={{ maxHeight: '75%' }}
          className="rounded-t-3xl bg-white px-5 pb-10 pt-4 dark:bg-zinc-900"
        >
          <View className="mb-1 items-center">
            <View className="h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Oportunidades fechadas
            </Text>
            <IconButton onPress={onClose} accessibilityLabel="Fechar">
              <X color="#71717a" size={22} />
            </IconButton>
          </View>

          {closed.length === 0 ? (
            <Text className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
              Nenhuma oportunidade fechada ainda.
            </Text>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {closed.map((opp) => {
                const won = opp.status === 'won';
                return (
                  <View
                    key={opp.id}
                    className="flex-row items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <View
                      className={`h-2.5 w-2.5 rounded-full ${won ? 'bg-emerald-500' : 'bg-red-500'}`}
                    />
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                      >
                        {opp.title}
                      </Text>
                      <Text numberOfLines={1} className="text-xs text-zinc-500 dark:text-zinc-400">
                        {nameOf(opp.contactId)} · {formatCurrency(opp.value)}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className={`text-xs font-medium ${
                          won
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {won ? 'Ganho' : 'Perdido'}
                        {opp.closeReason ? ` · ${opp.closeReason}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => moveOpportunity(opp.id, opp.stageId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Reabrir ${opp.title}`}
                      className="flex-row items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 active:opacity-70 dark:border-zinc-700"
                    >
                      <RotateCcw color="#71717a" size={14} />
                      <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Reabrir
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const ClosedOpportunitiesSheet = memo(ClosedOpportunitiesSheetComponent);
