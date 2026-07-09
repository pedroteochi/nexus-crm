import { memo } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}

/** Labeled text input with inline validation error text. */
const TextFieldComponent = ({
  label,
  value,
  onChangeText,
  error,
  ...inputProps
}: TextFieldProps) => (
  <View className="gap-1.5">
    <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#a1a1aa"
      // Fold the error into the label so a screen reader reads it on (re-)focus.
      accessibilityLabel={error ? `${label}. Error: ${error}` : label}
      className={`min-h-[48px] rounded-xl border px-3.5 py-3 text-base text-zinc-900 dark:text-zinc-50 ${
        error
          ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/40'
          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
      {...inputProps}
    />
    {error ? (
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        className="text-xs font-medium text-red-500 dark:text-red-400"
      >
        {error}
      </Text>
    ) : null}
  </View>
);

export const TextField = memo(TextFieldComponent);
