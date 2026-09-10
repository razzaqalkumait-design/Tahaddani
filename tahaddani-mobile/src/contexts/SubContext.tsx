import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StorageKeys, appStorage } from '../lib/storage';

export type SubTier = 'free' | 'starter' | 'supporter' | 'advocate' | 'vip';

const TIERS: readonly SubTier[] = ['free', 'starter', 'supporter', 'advocate', 'vip'];

function toTier(value: string | null): SubTier {
  return TIERS.find((tier) => tier === value) ?? 'free';
}

export interface SubState {
  tier: SubTier;
  removeAds: boolean;
  removeAdsTempUntil: number;
  allPacksTempUntil: number;
  matchCount: number;
  hydrated: boolean;
  setTier: (tier: SubTier) => void;
  setRemoveAds: (value: boolean) => void;
  setRemoveAdsTempUntil: (timestamp: number) => void;
  setAllPacksTempUntil: (timestamp: number) => void;
  incMatchCount: () => void;
}

export const SubCtx = createContext<SubState>({
  tier: 'free',
  removeAds: false,
  removeAdsTempUntil: 0,
  allPacksTempUntil: 0,
  matchCount: 0,
  hydrated: false,
  setTier: () => {},
  setRemoveAds: () => {},
  setRemoveAdsTempUntil: () => {},
  setAllPacksTempUntil: () => {},
  incMatchCount: () => {},
});

export function SubProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<SubTier>('free');
  const [removeAds, setRemoveAdsState] = useState(false);
  const [removeAdsTempUntil, setRemoveAdsTempUntilState] = useState(0);
  const [allPacksTempUntil, setAllPacksTempUntilState] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Storage is async on native, so values load after the first render.
  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const [storedTier, storedNoAds, storedNoAdsUntil, storedPacksUntil] = await Promise.all([
        appStorage.getString(StorageKeys.subTier),
        appStorage.getString(StorageKeys.removeAds),
        appStorage.getNumber(StorageKeys.removeAdsUntil, 0),
        appStorage.getNumber(StorageKeys.allPacksUntil, 0),
      ]);
      if (!active) return;

      setTierState(toTier(storedTier));
      setRemoveAdsState(storedNoAds === '1');
      setRemoveAdsTempUntilState(storedNoAdsUntil);
      setAllPacksTempUntilState(storedPacksUntil);
      setHydrated(true);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const setTier = useCallback((next: SubTier) => {
    setTierState(next);
    void appStorage.setString(StorageKeys.subTier, next);
  }, []);

  const setRemoveAds = useCallback((value: boolean) => {
    setRemoveAdsState(value);
    void appStorage.setString(StorageKeys.removeAds, value ? '1' : '0');
  }, []);

  const setRemoveAdsTempUntil = useCallback((timestamp: number) => {
    setRemoveAdsTempUntilState(timestamp);
    void appStorage.setString(StorageKeys.removeAdsUntil, String(timestamp));
  }, []);

  const setAllPacksTempUntil = useCallback((timestamp: number) => {
    setAllPacksTempUntilState(timestamp);
    void appStorage.setString(StorageKeys.allPacksUntil, String(timestamp));
  }, []);

  const incMatchCount = useCallback(() => setMatchCount((count) => count + 1), []);

  const value = useMemo<SubState>(
    () => ({
      tier,
      removeAds,
      removeAdsTempUntil,
      allPacksTempUntil,
      matchCount,
      hydrated,
      setTier,
      setRemoveAds,
      setRemoveAdsTempUntil,
      setAllPacksTempUntil,
      incMatchCount,
    }),
    [
      tier,
      removeAds,
      removeAdsTempUntil,
      allPacksTempUntil,
      matchCount,
      hydrated,
      setTier,
      setRemoveAds,
      setRemoveAdsTempUntil,
      setAllPacksTempUntil,
      incMatchCount,
    ],
  );

  return <SubCtx.Provider value={value}>{children}</SubCtx.Provider>;
}

export function useSub(): SubState {
  return useContext(SubCtx);
}
