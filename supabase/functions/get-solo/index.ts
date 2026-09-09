// Returns a set of solo-game questions for a requested tier.
import { cors, json, shuffle, requireAuth } from '../_shared/auth.ts';
import soloRaw from '../_shared/data/solo.json' assert { type: 'json' };

const questions = soloRaw as { tier: number; question: string; answer: string; wrong: string[] }[];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    await requireAuth(req);
    const { tier, count = 1 } = await req.json();

    const pool = (tier !== null && tier !== undefined && typeof tier === 'number')
      ? questions.filter(q => q.tier === tier)
      : questions;

    if (pool.length === 0) return json({ error: 'No questions for tier' }, 404);

    const picked = shuffle(pool).slice(0, Math.min(count, 500));
    // Shuffle wrong answers too so order isn't predictable
    return json({
      questions: picked.map(q => ({
        ...q,
        options: shuffle([q.answer, ...q.wrong]),
      })),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
