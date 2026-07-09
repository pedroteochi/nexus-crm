import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Opportunity } from '@/types/models';
import { formatCurrency, stageAge, type StageAgeSeverity } from '@/utils/opportunity';

interface OpportunityCardProps {
  opportunity: Opportunity;
  contactName: string;
  onPress: (id: string) => void;
  /** Stage color, rendered as a leading accent strip to tie the row to its stage. */
  stageColor?: string;
}

const BADGE_BG: Record<StageAgeSeverity, string> = {
  ok: 'bg-zinc-100 dark:bg-zinc-800',
  warn: 'bg-amber-100 dark:bg-amber-950/50',
  late: 'bg-red-100 dark:bg-red-950/50',
};

const BADGE_TEXT: Record<StageAgeSeverity, string> = {
  ok: 'text-zinc-500 dark:text-zinc-400',
  warn: 'text-amber-700 dark:text-amber-300',
  late: 'text-red-700 dark:text-red-300',
};

/** A full-width opportunity row: title, contact + owner, value, and the escalating
 * "stuck in stage" age badge. A leading color strip echoes the row's stage. */
const OpportunityCardComponent = ({
  opportunity,
  contactName,
  onPress,
  stageColor,
}: OpportunityCardProps) => {
  const handlePress = useCallback(() => onPress(opportunity.id), [opportunity.id, onPress]);
  const age = stageAge(opportunity.stageEnteredAt);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${opportunity.title}, ${formatCurrency(opportunity.value)}, ${contactName}, responsável ${opportunity.owner}, ${age.label}`}
      className="flex-row overflow-hidden rounded-xl border border-zinc-200 bg-white active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {stageColor ? <View style={{ backgroundColor: stageColor }} className="w-1" /> : null}
      <View className="flex-1 p-3">
        <Text numberOfLines={2} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {opportunity.title}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {contactName} · resp. {opportunity.owner}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(opportunity.value)}
          </Text>
          <View className={`rounded-full px-2 py-0.5 ${BADGE_BG[age.severity]}`}>
            <Text className={`text-[10px] font-medium ${BADGE_TEXT[age.severity]}`}>
              {age.label}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export const OpportunityCard = memo(OpportunityCardComponent);
