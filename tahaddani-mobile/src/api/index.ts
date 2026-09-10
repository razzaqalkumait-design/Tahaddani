import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  awardCoinsSchema,
  gameResultSchema,
  guessCardSchema,
  guessCategorySchema,
  parseList,
  profileDataSchema,
  questionSchema,
  soloQuestionSchema,
  spendCoinsSchema,
  thirtyQuestionSchema,
} from './schemas';
import type { GuessCard, GuessCategory, ProfileData, Question, SoloQuestion, ThirtyQuestion } from './schemas';

export * from './schemas';

/** Domain failure surfaced to callers; never a raw transport error. */
export class ApiError extends Error {
  readonly code: string;

  constructor(message: string, code = 'api_error') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Single entry point for every edge-function call. Game content (questions and
 * answers) is resolved server-side so it never ships inside the app bundle.
 */
async function call<T>(fn: string, body: object, schema: z.ZodType<T>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });

  if (error) throw new ApiError(error.message, 'edge_function_failed');

  // Edge functions can report failure with HTTP 200 and an `error` key.
  if (data && typeof data === 'object' && 'error' in data) {
    const message = String((data as { error: unknown }).error);
    throw new ApiError(message, 'edge_function_rejected');
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    logger.error('Edge function returned an unexpected shape', parsed.error, { fn });
    throw new ApiError('Unexpected response from server', 'invalid_response');
  }
  return parsed.data;
}

// ─── Questions ───────────────────────────────────────

export async function fetchClassicQuestions(groups: string[]): Promise<Question[]> {
  const res = await call('get-questions', { groups }, z.object({ questions: z.unknown() }));
  return parseList(questionSchema, res.questions);
}

export async function fetchThirtyQuestion(category: string): Promise<ThirtyQuestion> {
  const res = await call('get-thirty', { category }, z.object({ question: thirtyQuestionSchema }));
  return res.question;
}

export async function fetchGuessCategories(): Promise<GuessCategory[]> {
  const res = await call('get-guess-categories', {}, z.object({ categories: z.unknown() }));
  return parseList(guessCategorySchema, res.categories);
}

export async function dealGuessCards(categoryKey: string): Promise<[GuessCard, GuessCard]> {
  const res = await call(
    'get-guess-deal',
    { categoryKey },
    z.object({ cards: z.tuple([guessCardSchema, guessCardSchema]) }),
  );
  return res.cards;
}

export async function fetchSoloQuestions(tier: number | null, count: number): Promise<SoloQuestion[]> {
  const res = await call('get-solo', { tier, count }, z.object({ questions: z.unknown() }));
  return parseList(soloQuestionSchema, res.questions);
}

// ─── Profile ─────────────────────────────────────────

export async function fetchProfileEdge(): Promise<ProfileData | null> {
  const res = await call('get-profile', {}, z.object({ profile: profileDataSchema.nullable() }));
  return res.profile;
}

export async function updateProfileEdge(
  fields: Partial<Omit<ProfileData, 'id'>> & { email?: string },
): Promise<string | null> {
  try {
    await call('update-profile', fields, z.unknown());
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'update_failed';
  }
}

// ─── XP and anti-cheat ───────────────────────────────

export interface GameEvent {
  type: 'answer';
  questionId: string;
  choice: string;
  correct: boolean;
  pointValue: number;
  timestamp: number;
}

export async function syncXpToServer(xpToAdd: number, subTier?: string): Promise<void> {
  try {
    await call('update-xp', { xpToAdd, subTier }, z.unknown());
  } catch (error) {
    // XP sync is best-effort; the local value stays authoritative until the next attempt.
    logger.warn('XP sync failed, will retry on next award', { xpToAdd });
  }
}

export async function validateGameResult(
  mode: string,
  events: GameEvent[],
  durationMs: number,
): Promise<z.infer<typeof gameResultSchema> | null> {
  try {
    return await call('validate-game-result', { mode, events, durationMs, playerCount: 1 }, gameResultSchema);
  } catch (error) {
    logger.error('Game result validation failed', error, { mode });
    return null;
  }
}

// ─── Coins ───────────────────────────────────────────

export async function serverAwardCoins(isWinner: boolean): Promise<z.infer<typeof awardCoinsSchema>> {
  return call('award-coins', { isWinner }, awardCoinsSchema);
}

export async function serverSpendCoins(amount: number): Promise<z.infer<typeof spendCoinsSchema>> {
  return call('spend-coins', { amount }, spendCoinsSchema);
}
