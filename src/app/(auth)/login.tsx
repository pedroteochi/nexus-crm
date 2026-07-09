import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CircleAlert, Sparkles } from 'lucide-react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { AuthFailure, signIn } from '@/services/auth';
import { isSupabaseConfigured } from '@/services/supabase';

/**
 * Tela de login. Renderizada pelo gate do RootLayout quando não há sessão.
 * "Criar conta" navega para a tela dedicada de cadastro (fluxo em outra tela).
 * Ao autenticar, o onAuthStateChange atualiza a sessão e o gate troca para o app.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    if (loading) return; // o "go" do teclado não respeita o disabled do botão
    setError(null);
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // Sucesso: o gate assume a partir daqui.
    } catch (e) {
      setError(e instanceof AuthFailure ? e.message : 'Não foi possível entrar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }, [email, password, loading]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Marca */}
          <View className="items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Sparkles color="#ffffff" size={30} />
            </View>
            <Text className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Nexus CRM
            </Text>
            <Text className="text-center text-base text-zinc-500 dark:text-zinc-400">
              Entre para acessar seu funil
            </Text>
          </View>

          {/* Card do formulário */}
          <View className="gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@empresa.com"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              editable={!loading}
            />
            <TextField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              editable={!loading}
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error ? (
              <View
                accessibilityRole="alert"
                className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/40"
              >
                <CircleAlert color="#dc2626" size={18} />
                <Text className="flex-1 text-sm text-red-700 dark:text-red-300">{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Entrar"
              onPress={submit}
              loading={loading}
              disabled={!isSupabaseConfigured}
            />
          </View>

          {/* Ir para o cadastro (outra tela) */}
          <View className="flex-row items-center justify-center gap-1.5">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">Ainda não tem conta?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/signup')}
              hitSlop={8}
            >
              <Text className="text-sm font-semibold text-primary">Criar conta</Text>
            </Pressable>
          </View>

          {!isSupabaseConfigured ? (
            <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
              <Text className="text-sm text-amber-800 dark:text-amber-300">
                Configure o Supabase para ativar o login: defina{' '}
                <Text className="font-semibold">EXPO_PUBLIC_SUPABASE_URL</Text> e{' '}
                <Text className="font-semibold">EXPO_PUBLIC_SUPABASE_ANON_KEY</Text> no arquivo{' '}
                <Text className="font-semibold">.env</Text>.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
