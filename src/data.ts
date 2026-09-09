// Category names only — no question content in this file.
// Actual question text/answers are served by the edge function (get-questions).
import { fetchClassicQuestions, type Question } from './api';

// Playable group names (all 5 tiers present) — just metadata, not sensitive.
export const playableGroups: string[] = [
  "كأس العالم","الأفلام","الذكاء الاصطناعي","عالم الحيوان","الأفلام العربية",
  "الموسيقى العربية","برشلونة","الدوري الألماني","قطع غيار السيارات","السيارات",
  "شخصيات كرتونية","كريستيانو رونالدو","دي سي","القواميس","الهندسة",
  "كرة القدم الأوروبية","حقيقة أم خرافة","قوانين كرة القدم","معلومات عامة",
  "التاريخ","النظام الشمسي","ميسي","أساطير تاريخية","الرياضيات","إكس بوكس",
];

export function pickRandomGroups(count: number): string[] {
  const pool = [...playableGroups];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

// Per-session question cache — populated by loadQuestionsForGame()
let _sessionQuestions: Question[] = [];

/** Call once when a game starts with the selected groups. */
export async function loadQuestionsForGame(groups: string[]): Promise<void> {
  _sessionQuestions = await fetchClassicQuestions(groups);
}

export function pickQuestion(group: string, points: number, exclude?: string): Question | null {
  let pool = _sessionQuestions.filter(q => q.group === group && q.points === points);
  if (exclude && pool.length > 1) pool = pool.filter(q => q.question !== exclude);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickSuddenDeathQuestion(excludeTexts: Set<string>): Question | null {
  const pool = _sessionQuestions.filter(q => q.points === 500 && !excludeTexts.has(q.question));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
