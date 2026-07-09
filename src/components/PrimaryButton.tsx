import { memo } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Primary indigo call-to-action. ≥48px tall, with loading and disabled states. */
const PrimaryButtonComponent = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: PrimaryButtonProps) => {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`min-h-[48px] flex-row items-center justify-center rounded-xl px-5 py-3 ${
        isDisabled ? 'bg-indigo-300 dark:bg-indigo-800' : 'bg-primary active:bg-indigo-700'
      }`}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text className="text-base font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
};

export const PrimaryButton = memo(PrimaryButtonComponent);
