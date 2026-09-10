import type { SoloQuestion } from '../api';

/**
 * Solo-game selection rules, ported from the web build.
 *
 * The question tier escalates with the streak: every 5 correct answers push
 * the player up one tier (1–5). Selection falls back through looser pools so
 * a short server deck can never end the game early.
 */
export function pickFromPool(pool: SoloQuestion[], streak: number, used: Set<string>): SoloQuestion | null {
  const tier = Math.min(5, Math.floor(streak / 5) + 1);
  let candidates = pool.filter((q) => q.tier === tier && !used.has(q.question));
  if (candidates.length === 0) candidates = pool.filter((q) => q.tier === tier);
  if (candidates.length === 0) candidates = pool.filter((q) => !used.has(q.question));
  if (candidates.length === 0) candidates = pool;
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export const SOLO_TIMER_SECS = 15;
