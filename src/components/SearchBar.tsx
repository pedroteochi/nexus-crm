import { memo } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** Reusable search field for the list screens: icon, input, and a clear button. */
const SearchBarComponent = ({ value, onChangeText, placeholder = 'Buscar' }: SearchBarProps) => (
  <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-900">
    <Search color="#a1a1aa" size={18} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#a1a1aa"
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      accessibilityLabel={placeholder}
      className="flex-1 py-0 text-base text-zinc-900 dark:text-zinc-50"
    />
    {value.length > 0 ? (
      <Pressable
        onPress={() => onChangeText('')}
        accessibilityRole="button"
        accessibilityLabel="Limpar busca"
        hitSlop={8}
      >
        <X color="#a1a1aa" size={18} />
      </Pressable>
    ) : null}
  </View>
);

export const SearchBar = memo(SearchBarComponent);
