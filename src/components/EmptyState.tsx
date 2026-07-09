import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Centered empty-state placeholder with an icon, copy, and optional action. */
const EmptyStateComponent = ({ icon, title, description, action }: EmptyStateProps) => (
  <View className="flex-1 items-center justify-center px-10 py-16">
    <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
      {icon}
    </View>
    <Text className="text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
      {title}
    </Text>
    {description ? (
      <Text className="mt-1.5 text-center text-sm leading-5 text-zinc-500 dark:text-zinc-400">
        {description}
      </Text>
    ) : null}
    {action ? <View className="mt-5">{action}</View> : null}
  </View>
);

export const EmptyState = memo(EmptyStateComponent);
