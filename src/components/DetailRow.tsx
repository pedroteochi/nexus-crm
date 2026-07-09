import { memo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  /** Draw a hairline divider above the row (for rows after the first). */
  divider?: boolean;
}

/** Labeled info row for a detail screen: icon + label + value, optionally tappable. */
const DetailRowComponent = ({ icon, label, value, onPress, divider }: DetailRowProps) => {
  const body = (
    <View
      className={`flex-row items-center gap-3 px-4 py-3.5 ${
        divider ? 'border-t border-zinc-100 dark:border-zinc-800' : ''
      }`}
    >
      {icon}
      <View className="flex-1">
        <Text className="text-xs text-zinc-400 dark:text-zinc-500">{label}</Text>
        <Text className="text-[15px] text-zinc-800 dark:text-zinc-100">{value}</Text>
      </View>
      {onPress ? <ChevronRight color="#a1a1aa" size={18} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      className="active:bg-zinc-50 dark:active:bg-zinc-800"
    >
      {body}
    </Pressable>
  );
};

export const DetailRow = memo(DetailRowComponent);
