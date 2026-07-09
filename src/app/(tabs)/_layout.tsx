import type { ComponentType } from 'react';
import Constants from 'expo-constants';
import { Tabs } from 'expo-router';
import { Building2, Filter, MessageCircle, Settings, Users } from 'lucide-react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

// The native tab bar (iOS 26 Liquid Glass) needs native views Expo Go doesn't
// bundle, so Expo Go uses the standard JS tab bar and development / standalone
// builds get the native one. Resolved once at load; the native module is require()d
// only off the Expo Go path so it never loads (and never crashes) inside Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';
const NativeTabsLayout: ComponentType | null = isExpoGo
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports -- keep the native-tabs module off the Expo Go path
    require('../../components/NativeTabsLayout').NativeTabsLayout;

/** Bottom tab bar: Conversas, Funil, Contatos, Empresas, Ajustes. */
export default function TabsLayout() {
  const colors = useThemeColors();

  if (NativeTabsLayout) return <NativeTabsLayout />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Conversas',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="funnel"
        options={{
          title: 'Funil',
          tabBarIcon: ({ color, size }) => <Filter color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contatos',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="companies"
        options={{
          title: 'Empresas',
          tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
