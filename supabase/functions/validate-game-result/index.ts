// Anti-cheat: client sends raw game events, backend validates and computes final score.
// Flow: client -> backend validates -> backend calculates result -> database
import { cors, json, requireAuth, serviceClient } from '../_shared/auth.ts';

interface GameEvent {
  type: 'answer';
  questionId: string;
  choice: string;
  correct: boolean;
  pointValue: number;
  timestamp: number;
}

interface GameResult {
  mode: string;
  events: GameEvent[];
  durationMs: number;
  playerCount: number;
}

const MAX_EVENTS = 200;
const MIN_ANSWER_MS = 800;   // minimum realistic time between answers
const MAX_SCORE_PER_EVENT = 500;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    const userId = await requireAuth(req);
    const result: GameResult = await req.json();

    if (!result.mode || !Array.isArray(result.events)) {
      return json({ error: 'Invalid payload' }, 400);
    }

    // Clamp event count
    const events = result.events.slice(0, MAX_EVENTS);

    // Validate timestamps — answers can't be too fast
    let prevTs = 0;
    for (const ev of events) {
      if (ev.type === 'answer') {
        if (prevTs > 0 && ev.timestamp - prevTs < MIN_ANSWER_MS) {
          return json({ error: 'Answer rate too fast — suspected automation', cheat: true }, 400);
        }
        prevTs = ev.timestamp;
      }
    }

    // Calculate score server-side (ignore client-provided scores)
    let coinsEarned = 100; // base completion reward
    let correctCount = 0;
    for (const ev of events) {
      if (ev.type === 'answer' && ev.correct) {
        const pts = Math.min(ev.pointValue, MAX_SCORE_PER_EVENT);
        coinsEarned += Math.floor(pts * 0.1); // 10% of point value as coins
        correctCount++;
      }
    }

    const xpEarned = 150; // fixed XP per game
    const db = serviceClient();

    // Read current XP
    const { data: profile } = await db
      .from('profiles')
      .select('xp, coins')
      .eq('id', userId)
      .maybeSingle();

    const oldXp = (profile?.xp ?? 0) as number;
    const oldCoins = (profile?.coins ?? 0) as number;
    const newXp = oldXp + xpEarned;
    const newCoins = oldCoins + coinsEarned;
    const newLevel = Math.floor(newXp / 500) + 1;

    await db.from('profiles').update({ xp: newXp, level: newLevel, coins: newCoins }).eq('id', userId);

    return json({ ok: true, coinsEarned, xpEarned, newXp, newLevel, correctCount });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
