import { memo, useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View, type ListRenderItem } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';

import { IconButton } from '@/components/IconButton';

export interface PickerOption {
  id: string;
  name: string;
}

interface CompanyPickerProps {
  label: string;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  error?: string;
  placeholder?: string;
}

const Separator = () => <View className="h-px bg-zinc-100 dark:bg-zinc-800" />;

/** Custom dropdown picker (never a native `<select>`): a field that opens a modal
 * list of options. Fully controlled and accessible. */
const CompanyPickerComponent = ({
  label,
  options,
  selectedId,
  onSelect,
  error,
  placeholder = 'Selecione uma empresa',
}: CompanyPickerProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === selectedId) ?? null;

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect],
  );

  const renderItem: ListRenderItem<PickerOption> = useCallback(
    ({ item }) => {
      const isSelected = item.id === selectedId;
      return (
        <Pressable
          onPress={() => handleSelect(item.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={item.name}
          className="flex-row items-center justify-between px-5 py-3.5 active:bg-zinc-50 dark:active:bg-zinc-800"
        >
          <Text
            className={`text-base ${isSelected ? 'font-semibold text-primary dark:text-indigo-400' : 'text-zinc-800 dark:text-zinc-100'}`}
          >
            {item.name}
          </Text>
          {isSelected ? <Check color="#4f46e5" size={18} /> : null}
        </Pressable>
      );
    },
    [handleSelect, selectedId],
  );

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected ? selected.name : placeholder}`}
        className={`min-h-[48px] flex-row items-center justify-between rounded-xl border px-3.5 py-3 ${
          error
            ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/40'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
        }`}
      >
        <Text
          className={`text-base ${selected ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'}`}
        >
          {selected ? selected.name : placeholder}
        </Text>
        <ChevronDown color="#a1a1aa" size={20} />
      </Pressable>
      {error ? (
        <Text className="text-xs font-medium text-red-500 dark:text-red-400">{error}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* accessible={false} on the layout-only wrappers so option rows stay
            individually selectable by a screen reader; the Close button is the
            a11y-reachable dismiss affordance (the backdrop tap is not). */}
        <Pressable
          accessible={false}
          className="flex-1 justify-center bg-black/40 px-6"
          onPress={() => setOpen(false)}
        >
          <Pressable
            accessible={false}
            onPress={() => undefined}
            className="max-h-[70%] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900"
          >
            <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {label}
              </Text>
              <IconButton onPress={() => setOpen(false)} accessibilityLabel="Fechar">
                <X color="#71717a" size={20} />
              </IconButton>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={Separator}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export const CompanyPicker = memo(CompanyPickerComponent);
