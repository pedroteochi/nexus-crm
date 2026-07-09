import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Users } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';

interface CompanyListItemProps {
  companyId: string;
  name: string;
  industry: string;
  employees: number;
  /** Tap the row to open the company's detail screen. */
  onPress: (companyId: string) => void;
}

/** Memoized company row: avatar, name, industry, employee count. Tap to open the detail. */
const CompanyListItemComponent = ({
  companyId,
  name,
  industry,
  employees,
  onPress,
}: CompanyListItemProps) => {
  const handlePress = useCallback(() => onPress(companyId), [companyId, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${name}`}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-50 dark:active:bg-zinc-900"
    >
      <Avatar name={name} />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {name}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {industry}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Users color="#a1a1aa" size={14} />
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">{employees}</Text>
      </View>
    </Pressable>
  );
};

export const CompanyListItem = memo(CompanyListItemComponent);
