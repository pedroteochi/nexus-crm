import { memo, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Pencil, Trash2, X } from 'lucide-react-native';

import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useCrmStore } from '@/store/crmStore';
import { FUNNEL_STAGES } from '@/types/models';
import { formatCurrency } from '@/utils/opportunity';

interface OpportunitySheetProps {
  opportunityId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

/** Bottom sheet for a single opportunity: move it across stages, mark it
 * Ganho/Perdido (with an optional reason), or edit/delete it. */
const OpportunitySheetComponent = ({ opportunityId, onClose, onEdit }: OpportunitySheetProps) => {
  const liveOpportunity = useCrmStore((state) =>
    state.opportunities.find((opp) => opp.id === opportunityId),
  );
  const liveContactName = useCrmStore((state) => {
    const opp = state.opportunities.find((item) => item.id === opportunityId);
    return opp ? (state.contacts.find((c) => c.id === opp.contactId)?.name ?? 'Sem contato') : '';
  });
  const moveOpportunity = useCrmStore((state) => state.moveOpportunity);
  const closeOpportunity = useCrmStore((state) => state.closeOpportunity);
  const deleteOpportunity = useCrmStore((state) => state.deleteOpportunity);
  const getOrCreateChatForContact = useCrmStore((state) => state.getOrCreateChatForContact);
  const router = useRouter();

  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null);
  const [reason, setReason] = useState('');

  // Reset the win/loss sub-flow whenever a different opp is opened/closed.
  useEffect(() => {
    setOutcome(null);
    setReason('');
  }, [opportunityId]);

  const visible = Boolean(opportunityId && liveOpportunity);

  // Keep rendering the last opportunity through the iOS close animation: on close
  // the selector goes undefined and the body would collapse to an empty box that
  // slides out. Latching while visible avoids that flash (mirrors OpportunityFormModal).
  const shownRef = useRef({ opportunity: liveOpportunity, contactName: liveContactName });
  if (visible) shownRef.current = { opportunity: liveOpportunity, contactName: liveContactName };
  const opportunity = visible ? liveOpportunity : shownRef.current.opportunity;
  const contactName = visible ? liveContactName : shownRef.current.contactName;

  const handleConfirmClose = () => {
    if (!opportunity || !outcome) return;
    // Reason is optional — pass it through as-is (the store trims and drops blanks)
    // rather than fabricating a placeholder motivo.
    closeOpportunity(opportunity.id, outcome, reason);
    onClose();
  };

  const handleMove = (stageId: string) => {
    if (!opportunity || stageId === opportunity.stageId) return;
    moveOpportunity(opportunity.id, stageId);
    // Close so the deal is seen jumping to its new stage — the move's feedback.
    onClose();
  };

  // Bridge Funil -> Conversas: jump to (or start) the chat with this deal's contact.
  const handleOpenChat = () => {
    if (!opportunity) return;
    const chatId = getOrCreateChatForContact(opportunity.contactId);
    onClose();
    router.push(`/chat/${chatId}`);
  };

  const handleDelete = () => {
    if (!opportunity) return;
    Alert.alert('Excluir oportunidade?', 'Não é possível desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteOpportunity(opportunity.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessible={false} className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          accessible={false}
          onPress={() => undefined}
          className="rounded-t-3xl bg-white px-5 pb-10 pt-4 dark:bg-zinc-900"
        >
          {opportunity ? (
            <View>
              <View className="mb-1 items-center">
                <View className="h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </View>
              <View className="mb-4 flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {opportunity.title}
                  </Text>
                  <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {contactName} · {formatCurrency(opportunity.value)}
                  </Text>
                </View>
                <IconButton onPress={onClose} accessibilityLabel="Fechar">
                  <X color="#71717a" size={22} />
                </IconButton>
              </View>

              {outcome ? (
                <View className="gap-3">
                  <TextField
                    label={outcome === 'won' ? 'Motivo do ganho' : 'Motivo da perda'}
                    value={reason}
                    onChangeText={setReason}
                    placeholder={outcome === 'won' ? 'Ex.: melhor proposta' : 'Ex.: preço'}
                    autoCapitalize="sentences"
                  />
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => setOutcome(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Voltar"
                      className="flex-1 items-center justify-center rounded-xl border border-zinc-200 py-3 active:opacity-70 dark:border-zinc-800"
                    >
                      <Text className="text-base font-medium text-zinc-800 dark:text-zinc-100">
                        Voltar
                      </Text>
                    </Pressable>
                    <View className="flex-1">
                      <PrimaryButton label="Confirmar" onPress={handleConfirmClose} />
                    </View>
                  </View>
                </View>
              ) : (
                <View>
                  <Pressable
                    onPress={handleOpenChat}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir conversa com ${contactName}`}
                    className="mb-4 flex-row items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 active:opacity-70 dark:border-zinc-800"
                  >
                    <MessageCircle color="#4f46e5" size={18} />
                    <Text className="text-base font-medium text-primary dark:text-indigo-300">
                      Abrir conversa
                    </Text>
                  </Pressable>

                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Mover para
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {FUNNEL_STAGES.map((stage) => {
                      const active = stage.id === opportunity.stageId;
                      return (
                        <Pressable
                          key={stage.id}
                          onPress={() => handleMove(stage.id)}
                          disabled={active}
                          accessibilityRole="button"
                          accessibilityLabel={
                            active ? `Etapa atual: ${stage.label}` : `Mover para ${stage.label}`
                          }
                          accessibilityState={{ selected: active, disabled: active }}
                          className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-70 ${
                            active
                              ? 'border-primary bg-indigo-50 dark:bg-indigo-500/15'
                              : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <View
                            style={{ backgroundColor: stage.color }}
                            className="h-2 w-2 rounded-full"
                          />
                          <Text
                            className={`text-xs font-medium ${
                              active
                                ? 'text-primary dark:text-indigo-300'
                                : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {stage.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View className="mt-4 flex-row gap-3">
                    <Pressable
                      onPress={() => setOutcome('won')}
                      accessibilityRole="button"
                      accessibilityLabel="Marcar como ganho"
                      className="flex-1 items-center rounded-xl border border-emerald-200 py-3 active:opacity-70 dark:border-emerald-900"
                    >
                      <Text className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                        Ganho
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setOutcome('lost')}
                      accessibilityRole="button"
                      accessibilityLabel="Marcar como perdido"
                      className="flex-1 items-center rounded-xl border border-red-200 py-3 active:opacity-70 dark:border-red-900"
                    >
                      <Text className="text-base font-semibold text-red-600 dark:text-red-400">
                        Perdido
                      </Text>
                    </Pressable>
                  </View>

                  <View className="mt-3 flex-row items-center justify-between">
                    <Pressable
                      onPress={() => onEdit(opportunity.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Editar oportunidade"
                      className="flex-row items-center gap-1.5 py-2"
                    >
                      <Pencil color="#4f46e5" size={16} />
                      <Text className="text-sm text-primary dark:text-indigo-300">Editar</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleDelete}
                      accessibilityRole="button"
                      accessibilityLabel="Excluir oportunidade"
                      className="flex-row items-center gap-1.5 py-2"
                    >
                      <Trash2 color="#ef4444" size={16} />
                      <Text className="text-sm text-red-600 dark:text-red-400">Excluir</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const OpportunitySheet = memo(OpportunitySheetComponent);
