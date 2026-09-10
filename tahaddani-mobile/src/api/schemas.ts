import { z } from 'zod';

/**
 * Wire schemas for the edge functions.
 *
 * Every schema is tolerant on purpose: optional fields carry defaults so one
 * drifting field degrades that field rather than discarding a whole payload.
 */

export const questionSchema = z.object({
  group: z.string().catch(''),
  points: z.coerce.number().catch(0),
  question: z.string().catch(''),
  answer: z.string().catch(''),
  options: z.array(z.string()).optional(),
});

export const thirtyQuestionSchema = z.object({
  category: z.string().catch(''),
  question: z.string().catch(''),
  answers: z.array(z.string()).catch([]),
  note: z.string().optional(),
});

export const guessCategorySchema = z.object({
  key: z.string(),
  name: z.string().catch(''),
  emoji: z.string().catch(''),
  count: z.coerce.number().catch(0),
});

export const guessCardSchema = z.object({
  name: z.string().catch(''),
  file: z.string().catch(''),
});

export const soloQuestionSchema = z.object({
  tier: z.coerce.number().catch(0),
  question: z.string().catch(''),
  answer: z.string().catch(''),
  wrong: z.array(z.string()).catch([]),
  options: z.array(z.string()).catch([]),
});

export const profileDataSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  username: z.string().catch(''),
  avatar: z.string().catch('0'),
});

export const gameResultSchema = z.object({
  coinsEarned: z.coerce.number().catch(0),
  xpEarned: z.coerce.number().catch(0),
  newLevel: z.coerce.number().catch(1),
});

export const awardCoinsSchema = z.object({
  earned: z.coerce.number().catch(0),
  newTotal: z.coerce.number().catch(0),
  streak: z.coerce.number().catch(0),
});

export const spendCoinsSchema = z.object({
  success: z.boolean().catch(false),
  newTotal: z.coerce.number().catch(0),
});

/**
 * Drops entries that fail validation instead of failing the whole list, so one
 * malformed question cannot blank an entire round.
 */
export function parseList<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  const rows: T[] = [];
  for (const entry of value) {
    const parsed = schema.safeParse(entry);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

export type Question = z.infer<typeof questionSchema>;
export type ThirtyQuestion = z.infer<typeof thirtyQuestionSchema>;
export type GuessCategory = z.infer<typeof guessCategorySchema>;
export type GuessCard = z.infer<typeof guessCardSchema>;
export type SoloQuestion = z.infer<typeof soloQuestionSchema>;
export type ProfileData = z.infer<typeof profileDataSchema>;
