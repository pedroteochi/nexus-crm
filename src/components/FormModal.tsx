import { memo, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { IconButton } from '@/components/IconButton';

interface FormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom-sheet style modal used to host validated forms. Tapping the backdrop
 * closes it; taps inside the sheet are absorbed so they never dismiss it. */
const FormModalComponent = ({ visible, title, onClose, children }: FormModalProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    {/* accessible={false} on the layout-only wrappers so they don't collapse the
        form fields into a single a11y element; the Close button below stays the
        screen-reader dismiss affordance. */}
    <Pressable
      accessible={false}
      accessibilityLabel="Fechar"
      className="flex-1 justify-end bg-black/40"
      onPress={onClose}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Absorb presses so tapping the sheet doesn't close the modal. */}
        <Pressable
          accessible={false}
          onPress={() => undefined}
          className="rounded-t-3xl bg-white px-5 pb-10 pt-4 dark:bg-zinc-900"
        >
          <View className="mb-1 items-center">
            <View className="h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </View>
          <View className="mb-4 flex-row items-center justify-between">
            <Text
              accessibilityRole="header"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </Text>
            <IconButton onPress={onClose} accessibilityLabel="Fechar">
              <X color="#71717a" size={22} />
            </IconButton>
          </View>
          {children}
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  </Modal>
);

export const FormModal = memo(FormModalComponent);
