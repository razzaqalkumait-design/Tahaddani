/**
 * End-of-game rewards, ported from the web build's AppInner.rewardGameEnd.
 *
 * Local state updates instantly for feedback, then the XP delta syncs to the
 * server (best-effort). Coin awards use the `award-coins` edge function so
 * the server stays authoritative; on failure the local amount is kept.
 */
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { useCoins } from '../contexts/CoinsContext';
import { useSub } from '../contexts/SubContext';
import { StorageKeys, appStorage } from '../lib/storage';
import { serverAwardCoins, syncXpToServer } from '../api';
import { XP_PER_GAME, xpToLevel } from '../lib/xp';
import { logger } from '../lib/logger';

const BASE_EARNED = 100;
const WIN_BONUS = 50;
const STREAK_BONUS = 100;

export async function getGameStreak(): Promise<number> {
  return appStorage.getNumber(StorageKeys.gameStreak, 0);
}

export async function setGameStreak(streak: number): Promise<void> {
  await appStorage.setString(StorageKeys.gameStreak, String(streak));
}

export async function getLocalXp(): Promise<number> {
  return appStorage.getNumber(StorageKeys.xp, 0);
}

export async function setLocalXp(xp: number): Promise<void> {
  await appStorage.setString(StorageKeys.xp, String(xp));
}

export interface RewardResult {
  coinsEarned: number;
  streak: number;
}

export interface RewardFn {
  (scoreEntries: [string, number][]): Promise<RewardResult>;
}

export interface RewardsApi {
  rewardGameEnd: RewardFn;
}

const RewardsCtx = createContext<RewardsApi>({
  rewardGameEnd: async () => ({ coinsEarned: 0, streak: 0 }),
});

/**
 * Provider that exposes the shared reward pipeline. This logic existed inline
 * in the web build's App component; it lives here so every game mode funnels
 * through one implementation.
 */
export function RewardsProvider({ children }: { children: ReactNode }) {
  const { addCoins, flushCoins } = useCoins();
  const { account, patchAccount } = useAccount();
  const { tier, matchCount, incMatchCount } = useSub();

  const rewardGameEnd = useCallback<RewardFn>(
    async (scoreEntries) => {
      let earned = BASE_EARNED;

      // Win bonus: only when there is a strict top score (no tie).
      const sorted = [...scoreEntries].sort((a, b) => b[1] - a[1]);
      const isTie = sorted.length > 1 && (sorted[1]?.[1] ?? 0) === (sorted[0]?.[1] ?? 0);
      if (!isTie && sorted.length > 0) earned += WIN_BONUS;

      const streak = (await getGameStreak()) + 1;
      await setGameStreak(streak);
      if (streak % 3 === 0) earned += STREAK_BONUS;

      // Subscription bonuses — same rules as the web build.
      const newMatchCount = matchCount + 1;
      incMatchCount();
      if (tier === 'starter' && Math.random() < 0.05) earned *= 2;
      if (tier === 'supporter' && newMatchCount % 3 === 0) earned += 250;
      if (tier === 'advocate' && newMatchCount % 3 === 0) earned += 1000;

      const coinsEarned = Math.floor(earned);

      // Server award is authoritative when it succeeds; local otherwise.
      try {
        const awarded = await serverAwardCoins(!isTie && sorted.length > 0);
        addCoins(awarded.earned);
        flushCoins();
      } catch (error) {
        logger.warn('Server coin award failed; keeping local reward', { coinsEarned });
        addCoins(coinsEarned);
        flushCoins();
      }

      // XP: local first for instant feedback, then best-effort server sync.
      const oldXp = await getLocalXp();
      const newXp = oldXp + XP_PER_GAME;
      await setLocalXp(newXp);
      const newLevel = xpToLevel(newXp);
      if (account) patchAccount({ xp: newXp, level: newLevel });
      void syncXpToServer(XP_PER_GAME, tier !== 'free' ? tier : undefined);

      return { coinsEarned, streak };
    },
    [account, addCoins, flushCoins, incMatchCount, matchCount, patchAccount, tier],
  );

  return <RewardsCtx.Provider value={{ rewardGameEnd }}>{children}</RewardsCtx.Provider>;
}

export function useRewards(): RewardsApi {
  return useContext(RewardsCtx);
}
