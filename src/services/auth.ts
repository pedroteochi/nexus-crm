import type { Session } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

/**
 * Camada de autenticação. Envolve o supabase.auth com mensagens de erro em
 * português e expõe o token de acesso para o proxy de IA.
 */

/** Erro de auth já traduzido para exibição direta ao usuário. */
export class AuthFailure extends Error {}

/**
 * Traduz QUALQUER erro (AuthError, Error cru, string, ou objeto Response) numa
 * frase limpa em português. O fallback nunca vaza o objeto original — foi o bug
 * que fazia o corpo cru da resposta aparecer na tela.
 */
const friendly = (error: unknown): AuthFailure => {
  const raw = (
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  ).toLowerCase();

  if (raw.includes('invalid login credentials')) return new AuthFailure('E-mail ou senha incorretos.');
  if (raw.includes('email not confirmed')) return new AuthFailure('Confirme seu e-mail antes de entrar.');
  if (raw.includes('already registered') || raw.includes('already been registered'))
    return new AuthFailure('Já existe uma conta com esse e-mail.');
  if (raw.includes('password should be at least') || raw.includes('weak password'))
    return new AuthFailure('A senha precisa ter pelo menos 6 caracteres.');
  if (raw.includes('unable to validate email') || raw.includes('invalid email'))
    return new AuthFailure('E-mail inválido.');
  if (raw.includes('sending') && raw.includes('email'))
    return new AuthFailure('Não foi possível enviar o e-mail de confirmação — tente de novo em instantes.');
  if (raw.includes('rate limit') || raw.includes('too many') || raw.includes('over_email_send_rate'))
    return new AuthFailure('Muitas tentativas — aguarde um momento e tente de novo.');
  // Fallback limpo: NUNCA devolve o objeto/corpo cru para a UI.
  return new AuthFailure('Não foi possível concluir agora. Tente novamente.');
};

const ensureConfigured = (): void => {
  if (!isSupabaseConfigured) {
    throw new AuthFailure(
      'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.',
    );
  }
};

/** Cria uma conta. Com "Confirm email" ligado, a sessão vem null até confirmar. */
export const signUp = async (email: string, password: string): Promise<Session | null> => {
  ensureConfigured();
  try {
    const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
    if (error) throw friendly(error);
    // Proteção anti-enumeração do Supabase: e-mail já cadastrado devolve um user
    // "fake" SEM identities em vez de erro — sem este check, o app mostraria um
    // "Conta criada!" falso para uma conta que já existe.
    if (data.user && !data.session && data.user.identities?.length === 0) {
      throw new AuthFailure('Já existe uma conta com esse e-mail.');
    }
    return data.session;
  } catch (e) {
    throw e instanceof AuthFailure ? e : friendly(e);
  }
};

/** Faz login com e-mail e senha. */
export const signIn = async (email: string, password: string): Promise<Session> => {
  ensureConfigured();
  try {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw friendly(error);
    return data.session;
  } catch (e) {
    throw e instanceof AuthFailure ? e : friendly(e);
  }
};

/** Encerra a sessão. O gate do RootLayout devolve para a tela de login. */
export const signOut = async (): Promise<void> => {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw friendly(error);
};

/** Sessão atual (lida do AsyncStorage no boot). */
export const getSession = async (): Promise<Session | null> => {
  if (!isSupabaseConfigured) return null;
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  return session;
};

/**
 * Token que o proxy de IA usa para autenticar a requisição: o access_token da
 * sessão Supabase, e nada além dele. Sem sessão → null → o proxy responde 401
 * ("Sessão expirada"), que a UI já trata. Um fallback de segredo compartilhado
 * aqui embutiria um bypass de auth no bundle — removido junto com a Fase 1.
 */
export const getAccessToken = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.access_token ?? null;
};
