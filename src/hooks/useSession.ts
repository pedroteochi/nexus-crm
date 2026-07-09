import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

interface SessionState {
  session: Session | null;
  /** True enquanto a sessão persistida é lida do AsyncStorage no boot. */
  loading: boolean;
}

/**
 * Estado de sessão do Supabase. Lê a sessão persistida uma vez no boot e depois
 * acompanha login/logout/refresh via onAuthStateChange. Usado pelo gate do
 * RootLayout para decidir entre a tela de login e o app.
 */
export const useSession = (): SessionState => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Sem credenciais: não há sessão a resolver — cai direto na tela de login.
      setLoading(false);
      return;
    }

    let active = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
};
