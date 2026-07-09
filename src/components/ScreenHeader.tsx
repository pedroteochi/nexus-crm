import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** Large screen title with an optional subtitle and a trailing action slot. */
const ScreenHeaderComponent = ({ title, subtitle, action }: ScreenHeaderProps) => (
  <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
    <View className="flex-1 pr-3">
      <Text
        accessibilityRole="header"
        className="text-3xl font-bold text-zinc-900 dark:text-zinc-50"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</Text>
      ) : null}
    </View>
    {action}
  </View>
);

export const ScreenHeader = memo(ScreenHeaderComponent);
