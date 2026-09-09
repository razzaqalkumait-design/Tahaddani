import { createContext, useState } from 'react';

// ─── Subscription context ─────────────────────────────
export type SubTier = 'free' | 'starter' | 'supporter' | 'advocate' | 'vip';
export interface SubState {
  tier: SubTier;
  removeAds: boolean;
  removeAdsTempUntil: number;
  allPacksTempUntil: number;
  matchCount: number;
  setTier: (t: SubTier) => void;
  setRemoveAds: (v: boolean) => void;
  setRemoveAdsTempUntil: (ts: number) => void;
  setAllPacksTempUntil: (ts: number) => void;
  incMatchCount: () => void;
}
export const SubCtx = createContext<SubState>({
  tier: 'free', removeAds: false, removeAdsTempUntil: 0, allPacksTempUntil: 0, matchCount: 0,
  setTier: () => {}, setRemoveAds: () => {}, setRemoveAdsTempUntil: () => {}, setAllPacksTempUntil: () => {}, incMatchCount: () => {},
});
export function SubProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTierRaw] = useState<SubTier>(() => (localStorage.getItem('ta_sub_tier') as SubTier) || 'free');
  const [removeAds, setRemoveAdsRaw] = useState(() => localStorage.getItem('ta_no_ads') === '1');
  const [removeAdsTempUntil, setRemoveAdsTempUntilRaw] = useState(() => Number(localStorage.getItem('ta_no_ads_until') || 0));
  const [allPacksTempUntil, setAllPacksTempUntilRaw] = useState(() => Number(localStorage.getItem('ta_all_packs_until') || 0));
  const [matchCount, setMatchCount] = useState(0);

  const setTier = (t: SubTier) => { setTierRaw(t); localStorage.setItem('ta_sub_tier', t); };
  const setRemoveAds = (v: boolean) => { setRemoveAdsRaw(v); localStorage.setItem('ta_no_ads', v ? '1' : '0'); };
  const setRemoveAdsTempUntil = (ts: number) => { setRemoveAdsTempUntilRaw(ts); localStorage.setItem('ta_no_ads_until', String(ts)); };
  const setAllPacksTempUntil = (ts: number) => { setAllPacksTempUntilRaw(ts); localStorage.setItem('ta_all_packs_until', String(ts)); };
  const incMatchCount = () => setMatchCount(c => c + 1);

  return (
    <SubCtx.Provider value={{ tier, removeAds, removeAdsTempUntil, allPacksTempUntil, matchCount, setTier, setRemoveAds, setRemoveAdsTempUntil, setAllPacksTempUntil, incMatchCount }}>
      {children}
    </SubCtx.Provider>
  );
}

