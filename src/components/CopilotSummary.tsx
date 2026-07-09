import { memo } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';

import { IconButton } from '@/components/IconButton';
import type { ConversationSummary } from '@/services/openai';

interface CopilotSummaryProps {
  visible: boolean;
  loading: boolean;
  summary: ConversationSummary | null;
  onClose: () => void;
}

/** Bottom sheet with the Copilot's conversation summary and suggested next actions. */
const CopilotSummaryComponent = ({ visible, loading, summary, onClose }: CopilotSummaryProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable accessible={false} className="flex-1 justify-end bg-black/40" onPress={onClose}>
      {/* Absorb presses so tapping the sheet doesn't close the modal. */}
      <Pressable
        accessible={false}
        onPress={() => undefined}
        className="rounded-t-3xl bg-white px-5 pb-10 pt-4 dark:bg-zinc-900"
      >
        <View className="mb-1 items-center">
          <View className="h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </View>
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Sparkles color="#4f46e5" size={20} />
            <Text
              accessibilityRole="header"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              Resumo do Copilot
            </Text>
          </View>
          <IconButton onPress={onClose} accessibilityLabel="Fechar">
            <X color="#71717a" size={22} />
          </IconButton>
        </View>

        {loading ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator color="#4f46e5" />
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">Analisando a conversa…</Text>
          </View>
        ) : summary ? (
          <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
            <Text className="text-[15px] leading-6 text-zinc-800 dark:text-zinc-100">
              {summary.summary}
            </Text>
            {summary.nextActions.length > 0 ? (
              <View className="mt-4 gap-2">
                <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Próximas ações
                </Text>
                {summary.nextActions.map((action, index) => (
                  <View key={`${index}-${action}`} className="flex-row gap-2">
                    <Text className="text-[15px] text-primary dark:text-indigo-400">•</Text>
                    <Text className="flex-1 text-[15px] leading-6 text-zinc-800 dark:text-zinc-100">
                      {action}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </Pressable>
    </Pressable>
  </Modal>
);

export const CopilotSummary = memo(CopilotSummaryComponent);
