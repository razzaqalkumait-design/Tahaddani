import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AccountCtx } from './AccountContext';
import { fetchCoins, saveCoins } from '../lib/profiles';
import { StorageKeys, appStorage } from '../lib/storage';

const DEFAULT_COINS = 250;
const REMOTE_POLL_MS = 30_000;
const SYNC_DEBOUNCE_MS = 1_500;

export interface CoinsState {
  coins: number;
  hydrated: boolean;
  unlockedPacks: string[];
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  flushCoins: () => void;
  unlockPack: (packId: string) => void;
}

export const CoinsCtx = createContext<CoinsState>({
  coins: 0,
  hydrated: false,
  unlockedPacks: [],
  addCoins: () => {},
  spendCoins: () => false,
  flushCoins: () => {},
  unlockPack: () => {},
});

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { account } = useContext(AccountCtx);
  const userId = account?.id;

  const [coins, setCoins] = useState(DEFAULT_COINS);
  const [unlockedPacks, setUnlockedPacks] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinsRef = useRef(coins);
  coinsRef.current = coins;

  // Local cache first so the balance renders without waiting on the network.
  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const [storedCoins, storedPacks] = await Promise.all([
        appStorage.getNumber(StorageKeys.coins, DEFAULT_COINS),
        appStorage.getJson<string[]>(StorageKeys.packs, []),
      ]);
      if (!active) return;

      setCoins(storedCoins);
      setUnlockedPacks(Array.isArray(storedPacks) ? storedPacks : []);
      setHydrated(true);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  // The server balance is authoritative; poll so admin adjustments show up.
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;

    const load = async () => {
      const remote = await fetchCoins(userId);
      if (!active || remote === null) return;
      setCoins(remote);
      await appStorage.setString(StorageKeys.coins, String(remote));
    };

    void load();
    const interval = setInterval(() => void load(), REMOTE_POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId]);

  useEffect(
    () => () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    },
    [],
  );

  const persist = useCallback(
    (value: number) => {
      void appStorage.setString(StorageKeys.coins, String(value));
      if (!userId) return;

      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => void saveCoins(userId, value), SYNC_DEBOUNCE_MS);
    },
    [userId],
  );

  const addCoins = useCallback(
    (amount: number) => {
      setCoins((current) => {
        const next = current + amount;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const spendCoins = useCallback(
    (amount: number): boolean => {
      if (coinsRef.current < amount) return false;
      const next = coinsRef.current - amount;
      coinsRef.current = next;
      setCoins(next);
      persist(next);
      return true;
    },
    [persist],
  );

  const flushCoins = useCallback(() => {
    if (!userId) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    void saveCoins(userId, coinsRef.current);
  }, [userId]);

  const unlockPack = useCallback((packId: string) => {
    setUnlockedPacks((current) => {
      if (current.includes(packId)) return current;
      const next = [...current, packId];
      void appStorage.setJson(StorageKeys.packs, next);
      return next;
    });
  }, []);

  const value = useMemo<CoinsState>(
    () => ({ coins, hydrated, unlockedPacks, addCoins, spendCoins, flushCoins, unlockPack }),
    [coins, hydrated, unlockedPacks, addCoins, spendCoins, flushCoins, unlockPack],
  );

  return <CoinsCtx.Provider value={value}>{children}</CoinsCtx.Provider>;
}

export function useCoins(): CoinsState {
  return useContext(CoinsCtx);
}
