// Returns one random thirty-challenge question for a given category.
import { cors, json, shuffle, requireAuth } from '../_shared/auth.ts';
import thirtyRaw from '../_shared/data/thirty.json' assert { type: 'json' };

const questions = thirtyRaw as { category: string; question: string; answers: string[]; note?: string }[];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    await requireAuth(req);
    const { category } = await req.json();

    const pool = category
      ? questions.filter(q => q.category === category)
      : questions;

    if (pool.length === 0) return json({ error: 'No questions for category' }, 404);
    const question = shuffle(pool)[0];
    // Return the question but shuffle the answers so order isn't predictable
    return json({ question: { ...question, answers: shuffle(question.answers) } });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
