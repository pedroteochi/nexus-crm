import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

/**
 * Supabase client — a fonte da verdade de dados e de autenticação.
 *
 * Construído sob demanda (lazy): apenas importar este módulo NÃO cria o client
 * nem agenda os timers de auto-refresh. Isso mantém o import barato (testes que
 * só tocam a store não sobem a stack de realtime/gotrue) e adia a criação para o
 * primeiro uso real — na prática, quando o RootLayout monta o useSession.
 *
 * `react-native-url-polyfill` TEM que ser importado primeiro: o RN não traz um
 * `URL` completo e o supabase-js depende dele.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Falso quando o `.env` ainda não tem as credenciais — a UI de login usa isso
 * para mostrar uma instrução em vez de falhar de forma silenciosa. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Retorna o client Supabase, criando-o (uma vez) no primeiro uso. */
export const getSupabase = (): SupabaseClient => {
  if (client) return client;

  if (!isSupabaseConfigured) {
    console.warn(
      '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ausentes — ' +
        'defina-os no .env (veja .env.example). O login não funcionará até lá.',
    );
  }

  // Placeholders evitam o throw síncrono do createClient quando o env está vazio;
  // chamadas reais só acontecem após configurar, protegidas por isSupabaseConfigured.
  client = createClient(url ?? 'http://localhost:54321', anonKey ?? 'anon-placeholder', {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // sem redirect de URL em React Native
    },
  });

  // autoRefresh só deve rodar em foreground: em background o timer é suspenso e
  // tentar renovar deixa a sessão expirar sem aviso.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      client?.auth.startAutoRefresh();
    } else {
      client?.auth.stopAutoRefresh();
    }
  });

  return client;
};
