import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { cacheProfile, fetchProfile, lookupEmailByUsername } from '../lib/profiles';
import { updateProfileEdge } from '../api';
import { strings } from '../i18n';
import { logger } from '../lib/logger';

export interface AccountData {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  email?: string;
  emailVerified: boolean;
  xp?: number;
  level?: number;
}

export interface AccountState {
  account: AccountData | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string) => Promise<string | null>;
  createProfile: (name: string, username: string, avatar: string) => Promise<string | null>;
  loginWithEmail: (emailOrUsername: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  resendVerification: () => Promise<void>;
  patchAccount: (fields: Partial<AccountData>) => void;
}

export const AccountCtx = createContext<AccountState>({
  account: null,
  loading: true,
  error: null,
  signup: async () => null,
  createProfile: async () => null,
  loginWithEmail: async () => null,
  logout: async () => {},
  refreshAccount: async () => {},
  resendVerification: async () => {},
  patchAccount: () => {},
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string, email?: string, emailVerified = false) => {
    const profile = await fetchProfile(userId);
    // The session is authoritative: a profile row may not exist yet.
    setAccount({
      id: userId,
      name: profile?.name || email?.split('@')[0] || strings.account.defaultName,
      username: profile?.username,
      avatar: profile?.avatar ?? '0',
      email,
      emailVerified,
      xp: profile?.xp,
      level: profile?.level,
    });
  }, []);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;

        if (sessionError) {
          setError(strings.common.error);
          logger.error('Session restore failed', sessionError);
          return;
        }
        const user = data.session?.user;
        if (user) await loadProfile(user.id, user.email, Boolean(user.email_confirmed_at));
      } catch (restoreError) {
        if (active) setError(strings.common.error);
        logger.error('Session restore threw', restoreError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void restore();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === 'SIGNED_OUT') {
        setAccount(null);
        setLoading(false);
        return;
      }
      const user = session?.user;
      if (!user) return;

      void loadProfile(user.id, user.email, Boolean(user.email_confirmed_at)).finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signup = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      // Native has no page origin; the verification link comes back through the app scheme.
      options: { emailRedirectTo: Linking.createURL('/auth/callback') },
    });
    if (signupError) return signupError.message;
    return data.user ? null : strings.common.error;
  }, []);

  const createProfile = useCallback(
    async (name: string, username: string, avatar: string): Promise<string | null> => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return strings.account.sessionError;

      const failure = await updateProfileEdge({ name, username, avatar, email: user.email ?? '' });
      if (failure) return failure;

      await cacheProfile({ id: user.id, name, username, avatar });
      return null;
    },
    [],
  );

  const loginWithEmail = useCallback(
    async (emailOrUsername: string, password: string): Promise<string | null> => {
      let email = emailOrUsername.trim();

      // Username login resolves to the account email first.
      if (!email.includes('@')) {
        const found = await lookupEmailByUsername(email);
        if (!found) return strings.account.usernameNotFound;
        email = found;
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) return loginError.message;
      if (!data.user) return strings.common.error;

      await loadProfile(data.user.id, data.user.email, Boolean(data.user.email_confirmed_at));
      return null;
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAccount(null);
  }, []);

  const refreshAccount = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user) await loadProfile(user.id, user.email, Boolean(user.email_confirmed_at));
  }, [loadProfile]);

  const resendVerification = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user?.email;
    if (email) await supabase.auth.resend({ type: 'signup', email });
  }, []);

  const patchAccount = useCallback((fields: Partial<AccountData>) => {
    setAccount((previous) => (previous ? { ...previous, ...fields } : previous));
  }, []);

  const value = useMemo<AccountState>(
    () => ({
      account,
      loading,
      error,
      signup,
      createProfile,
      loginWithEmail,
      logout,
      refreshAccount,
      resendVerification,
      patchAccount,
    }),
    [account, loading, error, signup, createProfile, loginWithEmail, logout, refreshAccount, resendVerification, patchAccount],
  );

  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

export function useAccount(): AccountState {
  return useContext(AccountCtx);
}

export const AVATAR_COUNT = 15;
export const AVATAR_FALLBACKS = ['😎', '🦁', '🐯', '🦊', '🐺', '🦝', '🐸', '🦄', '🐲', '🌟', '🔥', '⚡', '🎮', '🏆', '💎'];
