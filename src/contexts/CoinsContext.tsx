import { AccountCtx } from './AccountContext';
import { fetchCoins, saveCoins } from '../supabase';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

// ─── Coins context ────────────────────────────────────
export interface CoinsState { coins: number; addCoins: (n: number) => void; spendCoins: (n: number) => boolean; flushCoins: () => void; unlockedPacks: string[]; unlockPack: (id: string) => void; }
export const CoinsCtx = createContext<CoinsState>({ coins: 0, addCoins: () => {}, spendCoins: () => false, flushCoins: () => {}, unlockedPacks: [], unlockPack: () => {} });

export function CoinsProvider({ children }: { children: React.ReactNode }) {
  const { account } = useContext(AccountCtx);
  const userId = account?.id;
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [coins, setCoinsRaw] = useState(() => Number(localStorage.getItem('ta_coins') ?? 250));
  const [unlockedPacks, setUnlockedPacks] = useState<string[]>(() => JSON.parse(localStorage.getItem('ta_packs') || '[]'));

  // Load from Supabase when user logs in, and poll for admin edits every 30s
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const remote = await fetchCoins(userId);
      if (remote !== null) {
        setCoinsRaw(remote);
        localStorage.setItem('ta_coins', String(remote));
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const persist = (v: number) => {
    localStorage.setItem('ta_coins', String(v));
    if (!userId) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => saveCoins(userId, v), 1500);
  };

  const coinsRef = useRef(coins);
  coinsRef.current = coins;

  const addCoins = (n: number) => setCoinsRaw(c => { const v = c + n; persist(v); return v; });
  const spendCoins = (n: number) => {
    let ok = false;
    setCoinsRaw(c => { if (c >= n) { persist(c - n); ok = true; return c - n; } return c; });
    return ok;
  };
  const flushCoins = () => {
    if (!userId) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    saveCoins(userId, coinsRef.current);
  };
  const unlockPack = (id: string) => setUnlockedPacks(p => { const v = [...p, id]; localStorage.setItem('ta_packs', JSON.stringify(v)); return v; });

  return <CoinsCtx.Provider value={{ coins, addCoins, spendCoins, flushCoins, unlockedPacks, unlockPack }}>{children}</CoinsCtx.Provider>;
}

