// All calls to sensitive edge functions go through here.
// The game content (questions, categories) never appears in the frontend bundle.
import { supabase } from './supabase';

async function call<T>(fn: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) throw new Error(error.message);
  // Edge functions can return { error: "..." } with HTTP 200 — treat as failure
  if (data && typeof data === 'object' && 'error' in (data as object)) {
    throw new Error((data as unknown as { error: string }).error);
  }
  return data as T;
}

// ─── Questions ───────────────────────────────────────

export type Question = { group: string; points: number; question: string; answer: string; options?: string[] };
export type ThirtyQ = { category: string; question: string; answers: string[]; note?: string };
export type GuessCategory = { key: string; name: string; emoji: string; count: number };
export type GuessCard = { name: string; file: string };
export type SoloQ = { tier: number; question: string; answer: string; wrong: string[]; options: string[] };

export async function fetchClassicQuestions(groups: string[]): Promise<Question[]> {
  const res = await call<{ questions: Question[] }>('get-questions', { groups });
  return res.questions;
}

export async function fetchThirtyQuestion(category: string): Promise<ThirtyQ> {
  const res = await call<{ question: ThirtyQ }>('get-thirty', { category });
  return res.question;
}

export async function fetchGuessCategories(): Promise<GuessCategory[]> {
  const res = await call<{ categories: GuessCategory[] }>('get-guess-categories', {});
  return res.categories;
}

export async function dealGuessCards(categoryKey: string): Promise<[GuessCard, GuessCard]> {
  const res = await call<{ cards: [GuessCard, GuessCard] }>('get-guess-deal', { categoryKey });
  return res.cards;
}

export async function fetchSoloQuestions(tier: number | null, count: number): Promise<SoloQ[]> {
  const res = await call<{ questions: SoloQ[] }>('get-solo', { tier, count });
  return res.questions;
}

// ─── Profile ─────────────────────────────────────────

export type ProfileData = { id: string; name: string; username: string; avatar: string };

export async function fetchProfileEdge(): Promise<ProfileData | null> {
  const res = await call<{ profile: ProfileData | null }>('get-profile', {});
  return res.profile;
}

export async function updateProfileEdge(fields: Partial<Omit<ProfileData, 'id'>> & { email?: string }): Promise<string | null> {
  try {
    await call('update-profile', fields);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

// ─── XP & Anti-cheat ─────────────────────────────────

export async function syncXpToServer(xpToAdd: number, subTier?: string): Promise<void> {
  try { await call('update-xp', { xpToAdd, subTier }); } catch { /* non-critical */ }
}

export interface GameEvent {
  type: 'answer';
  questionId: string;
  choice: string;
  correct: boolean;
  pointValue: number;
  timestamp: number;
}

export async function validateGameResult(mode: string, events: GameEvent[], durationMs: number): Promise<{ coinsEarned: number; xpEarned: number; newLevel: number } | null> {
  try {
    return await call('validate-game-result', { mode, events, durationMs, playerCount: 1 });
  } catch { return null; }
}

// ─── Coins ───────────────────────────────────────────

export async function serverAwardCoins(isWinner: boolean): Promise<{ earned: number; newTotal: number; streak: number }> {
  return call('award-coins', { isWinner });
}

export async function serverSpendCoins(amount: number): Promise<{ success: boolean; newTotal: number }> {
  return call('spend-coins', { amount });
}
