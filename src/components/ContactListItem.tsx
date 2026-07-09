import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';

interface ContactListItemProps {
  contactId: string;
  name: string;
  subtitle: string;
  /** Tap the row to open the contact's detail screen. */
  onPress: (contactId: string) => void;
  /** Tap the message icon to open (or resume) the chat. */
  onOpenChat: (contactId: string) => void;
}

/** Memoized contact row: tap the row to open the detail, or the message icon to chat. */
const ContactListItemComponent = ({
  contactId,
  name,
  subtitle,
  onPress,
  onOpenChat,
}: ContactListItemProps) => {
  const handlePress = useCallback(() => onPress(contactId), [contactId, onPress]);
  const handleOpenChat = useCallback(() => onOpenChat(contactId), [contactId, onOpenChat]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${name}`}
      // The row is one a11y element, so expose the nested chat action via the
      // rotor instead of leaving the message button unreachable to VoiceOver.
      accessibilityActions={[{ name: 'message', label: `Mensagem para ${name}` }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'message') handleOpenChat();
      }}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-50 dark:active:bg-zinc-900"
    >
      <Avatar name={name} />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {name}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </Text>
      </View>
      <IconButton onPress={handleOpenChat} accessibilityLabel={`Mensagem para ${name}`}>
        <MessageSquare color="#4f46e5" size={20} />
      </IconButton>
    </Pressable>
  );
};

export const ContactListItem = memo(ContactListItemComponent);
