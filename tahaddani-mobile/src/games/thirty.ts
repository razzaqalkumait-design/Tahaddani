import { shuffle } from '../lib/shuffle';

/** All thirty-challenge categories, matching the web build. */
export const THIRTY_CATS_UNIQUE: readonly string[] = [
  'اسلاميات',
  'معلومات عامة',
  'رياضة',
  'تاريخ',
  'علوم',
  'جغرافيا',
  'ثقافة عامة',
  'سينما',
  'موسيقى',
  'تكنولوجيا',
  'فن',
  'أدب',
];

/**
 * Random-category pick, duplicating the web build's behavior: '🎲' resolves
 * to a real category before a question is fetched.
 */
export function pickRandomThirtyCategory(): string {
  return THIRTY_CATS_UNIQUE[Math.floor(Math.random() * THIRTY_CATS_UNIQUE.length)] ?? THIRTY_CATS_UNIQUE[0]!;
}

/**
 * Bidding points for a bid of `n` answers, ported from the web build:
 * 1–9 answers earn 1 point, 10–19 earn 2, 20+ earn 3.
 */
export function calcThirtyPoints(bid: number): number {
  return bid < 10 ? 1 : bid < 20 ? 2 : 3;
}

/** Creates a fresh false-array sized to a question's answers. */
export function makeCheckedList(answerCount: number): boolean[] {
  return new Array(Math.max(0, answerCount)).fill(false);
}

/** Picks the next bidder after a raise (turn alternates). */
export function otherPlayer(player: 0 | 1): 0 | 1 {
  return player === 0 ? 1 : 0;
}

export { shuffle };
