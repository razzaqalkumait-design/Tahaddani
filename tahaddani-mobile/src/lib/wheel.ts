/**
 * Daily spin wheel, ported from the web build's SpinWheel.
 *
 * The wheel itself is drawn with react-native-svg in the store screen; this
 * module owns the segments, once-per-day gating, and reward selection.
 */
import { StorageKeys, appStorage } from './storage';
import { logger } from './logger';

export type WheelReward = 'coins' | 'all_packs' | 'no_ads';

export interface WheelSegment {
  label: string;
  emoji: string;
  color: string;
  weight: number;
  reward: WheelReward;
  value: number;
}

export const WHEEL_SEGMENTS: readonly WheelSegment[] = [
  { label: '50 عملة', emoji: '🪙', color: '#30E7ED', weight: 30, reward: 'coins', value: 50 },
  { label: 'باقات مجانية 24س', emoji: '🎮', color: '#38E27D', weight: 10, reward: 'all_packs', value: 0 },
  { label: '100 عملة', emoji: '💰', color: '#FFD700', weight: 27, reward: 'coins', value: 100 },
  { label: 'بدون إعلانات 30د', emoji: '🚫', color: '#c084fc', weight: 20, reward: 'no_ads', value: 30 },
  { label: '75 عملة', emoji: '🪙', color: '#30E7ED', weight: 10, reward: 'coins', value: 75 },
  { label: '1,000 عملة', emoji: '🏆', color: '#FF3D68', weight: 3, reward: 'coins', value: 1000 },
];

interface DailyState {
  lastDate: string;
  streak: number;
}

export async function getDailyState(): Promise<DailyState> {
  const fallback: DailyState = { lastDate: '', streak: 0 };
  try {
    const stored = await appStorage.getJson<Partial<DailyState>>(StorageKeys.daily, fallback);
    return {
      lastDate: typeof stored.lastDate === 'string' ? stored.lastDate : '',
      streak: typeof stored.streak === 'number' ? stored.streak : 0,
    };
  } catch (error) {
    logger.warn('Daily state read failed', { error: String(error) });
    return fallback;
  }
}

export async function saveDailyState(lastDate: string, streak: number): Promise<void> {
  await appStorage.setJson(StorageKeys.daily, { lastDate, streak });
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function canClaimDaily(): Promise<boolean> {
  const state = await getDailyState();
  return state.lastDate !== todayStr();
}

/** Weighted pick, identical to the web build's selection loop. */
export function pickWheelSegment(): number {
  const total = WHEEL_SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    roll -= WHEEL_SEGMENTS[i]!.weight;
    if (roll <= 0) return i;
  }
  return 0;
}

/**
 * Marks the daily claim done and advances the streak when the previous claim
 * was yesterday (matching the web build's `streak + 1` call on reward).
 */
export async function claimDaily(): Promise<{ streak: number }> {
  const state = await getDailyState();
  const streak = state.streak + 1;
  await saveDailyState(todayStr(), streak);
  return { streak };
}
