import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '@/hooks/useSession';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeSync } from '@/hooks/useThemeSync';
import { useCrmStore } from '@/store/crmStore';

/** Root navigator + gate de autenticação. Enquanto a sessão persistida é lida,
 * mostra um loading; depois, `Stack.Protected` registra o app OU o grupo de
 * login conforme houver sessão. As telas de detalhe (chat/contact/company) são
 * irmãs de `(tabs)`, por isso o gate vive AQUI (no root) e não no tab layout —
 * senão elas ficariam alcançáveis por deep-link sem sessão.
 * `useThemeSync` aplica o tema persistido a toda a árvore. */
export default function RootLayout() {
  useThemeSync();
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const { session, loading } = useSession();

  // Sincroniza o cache do CRM com a sessão: ao logar, hidrata do Supabase; ao
  // sair (ou trocar de usuário), esvazia. Keyed no user id para reagir à troca.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (userId) {
      void useCrmStore.getState().hydrate();
    } else {
      useCrmStore.getState().clear();
    }
  }, [userId]);

  const detailHeader = {
    headerShown: true,
    headerBackTitle: 'Voltar',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.tint,
    headerTitleStyle: { color: colors.textPrimary },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator color={colors.tint} />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="chat/[id]" options={detailHeader} />
              <Stack.Screen name="contact/[id]" options={detailHeader} />
              <Stack.Screen name="company/[id]" options={detailHeader} />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
