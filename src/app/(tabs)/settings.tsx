import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, ShieldCheck, UserRound } from 'lucide-react-native';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useSession } from '@/hooks/useSession';
import { signOut } from '@/services/auth';

export default function SettingsScreen() {
  const { session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      // O gate do RootLayout leva de volta ao login ao perder a sessão.
    } catch {
      setSigningOut(false);
    }
  }, []);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-zinc-950">
      <ScreenHeader title="Ajustes" subtitle="Sua conta e preferências" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Conta */}
        <Card className="border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
              <UserRound color="#6366f1" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Conta</Text>
              <Text
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
                numberOfLines={1}
              >
                {session?.user.email ?? 'Não autenticado'}
              </Text>
            </View>
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              accessibilityState={{ disabled: signingOut, busy: signingOut }}
              className="flex-row items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
            >
              <LogOut color="#71717a" size={16} />
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {signingOut ? 'Saindo…' : 'Sair'}
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* Aparência */}
        <View className="gap-2">
          <Text className="px-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Aparência
          </Text>
          <ThemeSelector />
        </View>

        {/* IA atrás do backend */}
        <Card className="border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <View className="flex-row gap-3">
            <ShieldCheck color="#4f46e5" size={22} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                IA com backend
              </Text>
              <Text className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                As respostas de IA são geradas pelo backend do Nexus (gpt-4o-mini) — a chave da
                OpenAI fica no servidor e nunca chega ao dispositivo. Sem backend configurado, o app
                cai no Modo Sandbox e simula as respostas localmente.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
