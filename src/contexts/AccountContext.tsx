import { setLocalXp } from '../lib/xp';
import { cacheProfile, fetchProfile, lookupEmailByUsername, supabase, uploadAvatar } from '../supabase';
import { createContext, useCallback, useEffect, useState } from 'react';

// ─── Account context ──────────────────────────────────
export interface AccountData { id?: string; name: string; username?: string; avatar: string; email?: string; emailVerified?: boolean; xp?: number; level?: number; }
export interface AccountState {
  account: AccountData | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<string | null>;
  createProfile: (name: string, username: string, avatar: string, file?: File) => Promise<string | null>;
  loginWithEmail: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  resendVerification: () => Promise<void>;
  patchAccount: (fields: Partial<AccountData>) => void;
}
export const AccountCtx = createContext<AccountState>({
  account: null, loading: true,
  signup: async () => null,
  createProfile: async () => null,
  loginWithEmail: async () => null,
  logout: async () => {},
  refreshAccount: async () => {},
  resendVerification: async () => {},
  patchAccount: () => {},
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string, email?: string, emailVerified?: boolean) => {
    const profile = await fetchProfile(userId);
    // Always set account from auth session — profile may not exist yet (unverified / creation failed)
    if (profile?.xp !== undefined) setLocalXp(profile.xp);
    setAccount({
      id: userId,
      name: profile?.name ?? (email?.split('@')[0] ?? 'مستخدم'),
      username: profile?.username,
      avatar: profile?.avatar ?? '0',
      email,
      emailVerified: emailVerified ?? false,
      xp: profile?.xp,
      level: profile?.level,
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadProfile(session.user.id, session.user.email, !!session.user.email_confirmed_at);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setAccount(null); setLoading(false); return; }
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email, !!session.user.email_confirmed_at);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signup = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (error) return error.message;
    if (!data.user) return 'حدث خطأ، حاول مجدداً';
    return null;
  }, []);

  const createProfile = useCallback(async (name: string, username: string, avatar: string, file?: File): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return 'لم يتم التحقق من الحساب';
    let finalAvatar = avatar;
    if (file) {
      const result = await uploadAvatar(userId, file);
      if (result.url) finalAvatar = result.url;
      // if upload fails, finalAvatar stays as the preset index fallback
    }
    const userEmail = session?.user?.email ?? '';
    const { updateProfileEdge } = await import('./api');
    const err = await updateProfileEdge({ name, username, avatar: finalAvatar, email: userEmail });
    if (err) return err;
    cacheProfile({ id: userId, name, username, avatar: finalAvatar });
    return null;
  }, []);

  const loginWithEmail = useCallback(async (emailOrUsername: string, password: string): Promise<string | null> => {
    // Support username login by looking up the associated email first
    let email = emailOrUsername.trim();
    if (!email.includes('@')) {
      const found = await lookupEmailByUsername(email);
      if (!found) return 'اسم المستخدم غير موجود';
      email = found;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (!data.user) return 'حدث خطأ، حاول مجدداً';
    await loadProfile(data.user.id, data.user.email, !!data.user.email_confirmed_at);
    return null;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAccount(null);
  }, []);

  const refreshAccount = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadProfile(session.user.id, session.user.email, !!session.user.email_confirmed_at);
  }, [loadProfile]);

  const resendVerification = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) await supabase.auth.resend({ type: 'signup', email: session.user.email });
  }, []);

  const patchAccount = useCallback((fields: Partial<AccountData>) => {
    setAccount(prev => prev ? { ...prev, ...fields } : prev);
  }, []);

  return <AccountCtx.Provider value={{ account, loading, signup, createProfile, loginWithEmail, logout, refreshAccount, resendVerification, patchAccount }}>{children}</AccountCtx.Provider>;
}

// Avatar images live at: TAHADDANI/images/avatar/image1.png … image15.png
// Drop the files there and they will appear automatically.
export const AVATAR_COUNT = 15;
export const AVATAR_IMAGES = Array.from({ length: AVATAR_COUNT }, (_, i) => `/TAHADDANI/images/avatar/image${i + 1}.png`);
export const AVATAR_FALLBACKS = ['😎','🦁','🐯','🦊','🐺','🦝','🐸','🦄','🐲','🌟','🔥','⚡','🎮','🏆','💎'];

