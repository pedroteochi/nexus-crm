import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Moon, Smartphone, Sun, type LucideIcon } from 'lucide-react-native';

import { useThemeStore, type ThemePreference } from '@/store/themeStore';

const OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: 'system', label: 'Sistema', Icon: Smartphone },
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
];

/** Segmented control for the theme preference. Reads/writes the theme store
 * only — placement-agnostic, so it can move to any future settings screen. */
const ThemeSelectorComponent = () => {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <View className="flex-row gap-2">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <Pressable
            key={value}
            onPress={() => setPreference(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            className={`flex-1 items-center gap-1 rounded-xl border px-2 py-3 ${
              active
                ? 'border-primary bg-primary'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <Icon color={active ? '#ffffff' : '#a1a1aa'} size={20} />
            <Text
              className={`text-xs font-medium ${
                active ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const ThemeSelector = memo(ThemeSelectorComponent);
