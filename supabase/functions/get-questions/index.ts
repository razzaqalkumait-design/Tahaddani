// Returns a shuffled subset of classic/wicked questions for one game session.
// The full question bank never leaves the server.
import { cors, json, shuffle, requireAuth } from '../_shared/auth.ts';
import questionsRaw from '../_shared/data/questions.json' assert { type: 'json' };

const questions = questionsRaw as { group: string; points: number; question: string; answer: string; options?: string[] }[];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    await requireAuth(req);
    const { groups, pointsPerGroup = 5 } = await req.json();
    if (!Array.isArray(groups) || groups.length === 0) return json({ error: 'groups required' }, 400);

    const result: typeof questions = [];
    const TIERS = [100, 200, 300, 400, 500];

    for (const group of groups) {
      for (const pts of TIERS.slice(0, pointsPerGroup)) {
        const pool = shuffle(questions.filter(q => q.group === group && q.points === pts));
        if (pool.length === 0) continue;
        // Return up to 5 questions per slot so changeQ has alternatives
        result.push(...pool.slice(0, 5));
      }
    }

    return json({ questions: shuffle(result) });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
