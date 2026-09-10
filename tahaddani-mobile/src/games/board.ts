import type { Question } from '../api';

/**
 * Classic/wicked board data, ported from the web build.
 *
 * Only category *names* live here; the actual question bank stays server-side
 * behind the `get-questions` edge function and is loaded once per session.
 */

export const TIERS = [100, 200, 300, 400, 500] as const;

/** Question tiers that can trigger a wicked event (300–500). */
export const WICKED_HIGH_TIERS = [300, 400, 500] as const;

export const TIMER_SECS = 60;
export const SKIP_TIMER_SECS = 30;

/** Playable category names (metadata only — no question content). */
export const playableGroups: readonly string[] = [
  'كأس العالم',
  'الأفلام',
  'الذكاء الاصطناعي',
  'عالم الحيوان',
  'الأفلام العربية',
  'الموسيقى العربية',
  'برشلونة',
  'الدوري الألماني',
  'قطع غيار السيارات',
  'السيارات',
  'شخصيات كرتونية',
  'كريستيانو رونالدو',
  'دي سي',
  'القواميس',
  'الهندسة',
  'كرة القدم الأوروبية',
  'حقيقة أم خرافة',
  'قوانين كرة القدم',
  'معلومات عامة',
  'التاريخ',
  'النظام الشمسي',
  'ميسي',
  'أساطير تاريخية',
  'الرياضيات',
  'إكس بوكس',
];

/** Fisher–Yates copy-shuffle used by the web build for groups and decks. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function pickRandomGroups(count: number): string[] {
  return shuffle(playableGroups).slice(0, Math.min(count, playableGroups.length));
}

// ─── Per-session question cache ───────────────────────
// Populated once per game via loadQuestionsForGame(); the board and the
// "change question" action both draw from this in-memory pool.

let sessionQuestions: Question[] = [];

export async function loadQuestionsForGame(groups: string[]): Promise<void> {
  const { fetchClassicQuestions } = await import('../api');
  sessionQuestions = await fetchClassicQuestions(groups);
}

export function pickQuestion(group: string, points: number, exclude?: string): Question | null {
  let pool = sessionQuestions.filter((q) => q.group === group && q.points === points);
  if (exclude && pool.length > 1) pool = pool.filter((q) => q.question !== exclude);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function pickSuddenDeathQuestion(excludeTexts: Set<string>): Question | null {
  const pool = sessionQuestions.filter((q) => q.points === 500 && !excludeTexts.has(q.question));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
