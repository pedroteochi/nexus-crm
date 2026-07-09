import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Circle, CircleAlert, CircleCheck } from 'lucide-react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { AuthFailure, signUp } from '@/services/auth';
import { isSupabaseConfigured } from '@/services/supabase';

/** Um critério de senha exibido ao vivo (verde quando atendido). */
const Criterion = ({ ok, label }: { ok: boolean; label: string }) => (
  <View className="flex-row items-center gap-2">
    {ok ? <Check color="#059669" size={16} /> : <Circle color="#a1a1aa" size={16} />}
    <Text
      className={`text-sm ${
        ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
      }`}
    >
      {label}
    </Text>
  </View>
);

/**
 * Tela dedicada de cadastro (empilhada sobre o login). Pede e-mail, senha e
 * confirmação de senha, validando critérios ao vivo. Ao criar a conta:
 *  - com sessão (confirmação de e-mail desligada) → o gate assume;
 *  - sem sessão (confirmação ligada) → mostra o aviso "confirme o e-mail".
 */
export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => {
    const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
    const hasMinLength = password.length >= 8;
    const hasLetterAndNumber = /[a-zA-Z]/.test(password) && /\d/.test(password);
    const passwordsMatch = password.length > 0 && password === confirm;
    return { emailValid, hasMinLength, hasLetterAndNumber, passwordsMatch };
  }, [email, password, confirm]);

  const submit = useCallback(async () => {
    if (loading) return; // o "go" do teclado não respeita o disabled do botão
    setError(null);
    // Validação com mensagem específica — o botão é sempre tocável de propósito:
    // um botão desabilitado sem explicação deixa o usuário sem saber o que falta.
    if (!email.trim()) {
      setError('Digite seu e-mail.');
      return;
    }
    if (!checks.emailValid) {
      setError('Digite um e-mail válido (ex.: voce@empresa.com).');
      return;
    }
    if (!checks.hasMinLength) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (!checks.hasLetterAndNumber) {
      setError('A senha precisa ter pelo menos uma letra e um número.');
      return;
    }
    if (!checks.passwordsMatch) {
      setError('As senhas não coincidem — confira os dois campos.');
      return;
    }
    setLoading(true);
    try {
      const session = await signUp(email, password);
      // Sem sessão = confirmação de e-mail ligada. Com sessão, o gate assume.
      if (!session) setDone(true);
    } catch (e) {
      setError(
        e instanceof AuthFailure ? e.message : 'Não foi possível criar a conta. Tente de novo.',
      );
    } finally {
      setLoading(false);
    }
  }, [email, password, checks, loading]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Voltar */}
        <View className="px-4 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
          >
            <ArrowLeft color="#71717a" size={22} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {done ? (
            /* Sucesso: conta criada, aguardando confirmação de e-mail */
            <View className="items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
                <CircleCheck color="#059669" size={32} />
              </View>
              <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Conta criada!
              </Text>
              <Text className="text-center text-base leading-6 text-zinc-500 dark:text-zinc-400">
                Enviamos um e-mail de confirmação para{'\n'}
                <Text className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {email.trim()}
                </Text>
                . Confirme e depois entre.
              </Text>
              <View className="w-full pt-2">
                <PrimaryButton label="Voltar para o login" onPress={() => router.back()} />
              </View>
            </View>
          ) : (
            <>
              <View className="gap-1">
                <Text className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Criar conta
                </Text>
                <Text className="text-base text-zinc-500 dark:text-zinc-400">
                  Comece a gerenciar seu funil de vendas
                </Text>
              </View>

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
                {/* textContentType="none": "newPassword" dispara o sheet de senha
                    forte do iOS, que num bug conhecido do RN LIMPA o campo irmão
                    ao ser recusado e buga a renderização do secure text. Sem a
                    associação, o cadastro digitável funciona; o autofill fica no
                    login (lá é "password", que se comporta bem). */}
                <TextField
                  label="Senha"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  textContentType="none"
                  autoComplete="off"
                  editable={!loading}
                />
                <TextField
                  label="Confirmar senha"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  textContentType="none"
                  autoComplete="off"
                  editable={!loading}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                />

                {/* Critérios ao vivo */}
                <View className="gap-1.5 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50">
                  <Criterion ok={checks.hasMinLength} label="Pelo menos 8 caracteres" />
                  <Criterion ok={checks.hasLetterAndNumber} label="Uma letra e um número" />
                  <Criterion ok={checks.passwordsMatch} label="As senhas coincidem" />
                </View>

                {error ? (
                  <View
                    accessibilityRole="alert"
                    className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/40"
                  >
                    <CircleAlert color="#dc2626" size={18} />
                    <Text className="flex-1 text-sm text-red-700 dark:text-red-300">{error}</Text>
                  </View>
                ) : null}

                {/* Sempre tocável: ao tocar com algo inválido, o banner acima explica o quê. */}
                <PrimaryButton
                  label="Criar conta"
                  onPress={submit}
                  loading={loading}
                  disabled={!isSupabaseConfigured}
                />
              </View>

              <View className="flex-row items-center justify-center gap-1.5">
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">Já tem conta?</Text>
                <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
                  <Text className="text-sm font-semibold text-primary">Entrar</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
