import { memo, useRef, type ReactNode } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ChatMenuItem {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ChatMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ChatMenuItem[];
}

/** Dropdown menu anchored under the header ⋯ button (top-right). Tapping the
 * backdrop or an item closes it. Selecting an item runs its action only AFTER
 * this modal has dismissed, so it never races a sibling modal it opens (iOS
 * cannot present a modal while another is mid-dismiss). */
const ChatMenuComponent = ({ visible, onClose, items }: ChatMenuProps) => {
  const insets = useSafeAreaInsets();
  const pendingRef = useRef<(() => void) | null>(null);

  const handleSelect = (item: ChatMenuItem) => {
    if (item.disabled) return;
    if (Platform.OS === 'ios') {
      // Defer until the fade-out completes (onDismiss), avoiding the present-
      // while-dismissing race with any modal the action opens.
      pendingRef.current = item.onPress;
      onClose();
    } else {
      onClose();
      item.onPress();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={() => {
        const run = pendingRef.current;
        pendingRef.current = null;
        run?.();
      }}
    >
      <Pressable accessible={false} className="flex-1" onPress={onClose}>
        <View
          style={{ top: insets.top + 44, right: 12 }}
          className="absolute min-w-[224px] overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => handleSelect(item)}
              disabled={item.disabled}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ disabled: item.disabled }}
              className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-zinc-50 dark:active:bg-zinc-800 ${
                index > 0 ? 'border-t border-zinc-100 dark:border-zinc-800' : ''
              } ${item.disabled ? 'opacity-40' : ''}`}
            >
              {item.icon}
              <Text
                className={`text-[15px] ${
                  item.destructive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-zinc-800 dark:text-zinc-100'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

export const ChatMenu = memo(ChatMenuComponent);
