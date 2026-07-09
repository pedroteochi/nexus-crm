import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';

interface ChatListItemProps {
  chatId: string;
  contactName: string;
  snippet: string;
  timeLabel: string;
  onPress: (chatId: string) => void;
}

/** Memoized chat row: avatar, contact name, last-message snippet, timestamp. */
const ChatListItemComponent = ({
  chatId,
  contactName,
  snippet,
  timeLabel,
  onPress,
}: ChatListItemProps) => {
  const handlePress = useCallback(() => onPress(chatId), [chatId, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir conversa com ${contactName}`}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-50 dark:active:bg-zinc-900"
    >
      <Avatar name={contactName} />
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            numberOfLines={1}
            className="flex-1 pr-2 text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {contactName}
          </Text>
          <Text className="text-xs text-zinc-400">{timeLabel}</Text>
        </View>
        <Text numberOfLines={1} className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {snippet}
        </Text>
      </View>
    </Pressable>
  );
};

export const ChatListItem = memo(ChatListItemComponent);
