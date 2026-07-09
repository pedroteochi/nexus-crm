import { memo } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Sparkles, ThumbsUp, TrendingUp, X, type LucideIcon } from 'lucide-react-native';

import { IconButton } from '@/components/IconButton';
import type { ConversationAnalysis } from '@/services/openai';

interface CopilotAnalysisProps {
  visible: boolean;
  loading: boolean;
  analysis: ConversationAnalysis | null;
  onClose: () => void;
}

/** Traffic-light color for the 0-10 score. */
const scoreColor = (score: number): string =>
  score >= 8 ? '#059669' : score >= 5 ? '#d97706' : '#dc2626';

interface SectionProps {
  title: string;
  items: string[];
  color: string;
  Icon: LucideIcon;
}

const Section = ({ title, items, color, Icon }: SectionProps) => (
  <View className="mt-4 gap-2">
    <View className="flex-row items-center gap-1.5">
      <Icon color={color} size={15} />
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </Text>
    </View>
    {items.map((item, index) => (
      <View key={`${index}-${item}`} className="flex-row gap-2">
        <Text style={{ color }} className="text-[15px]">
          •
        </Text>
        <Text className="flex-1 text-[15px] leading-6 text-zinc-800 dark:text-zinc-100">{item}</Text>
      </View>
    ))}
  </View>
);

/** Bottom sheet with the Copilot's quality analysis: score + strengths/improvements. */
const CopilotAnalysisComponent = ({ visible, loading, analysis, onClose }: CopilotAnalysisProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable accessible={false} className="flex-1 justify-end bg-black/40" onPress={onClose}>
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
              Análise com IA
            </Text>
          </View>
          <IconButton onPress={onClose} accessibilityLabel="Fechar">
            <X color="#71717a" size={22} />
          </IconButton>
        </View>

        {loading ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator color="#4f46e5" />
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">Avaliando o atendimento…</Text>
          </View>
        ) : analysis ? (
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center gap-3">
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: `${scoreColor(analysis.score)}22` }}
              >
                <Text className="text-xl font-bold" style={{ color: scoreColor(analysis.score) }}>
                  {analysis.score}
                </Text>
              </View>
              <Text className="flex-1 text-[15px] leading-6 text-zinc-800 dark:text-zinc-100">
                {analysis.headline}
              </Text>
            </View>
            {analysis.strengths.length > 0 ? (
              <Section title="Pontos fortes" items={analysis.strengths} color="#059669" Icon={ThumbsUp} />
            ) : null}
            {analysis.improvements.length > 0 ? (
              <Section
                title="A melhorar"
                items={analysis.improvements}
                color="#d97706"
                Icon={TrendingUp}
              />
            ) : null}
          </ScrollView>
        ) : null}
      </Pressable>
    </Pressable>
  </Modal>
);

export const CopilotAnalysis = memo(CopilotAnalysisComponent);
