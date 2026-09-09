// Deals exactly 2 cards for a guess game session.
// The full item list never reaches the client.
import { cors, json, shuffle, requireAuth } from '../_shared/auth.ts';
import guessRaw from '../_shared/data/guess.json' assert { type: 'json' };

const cats = guessRaw as { key: string; name: string; emoji: string; items: { name: string; file: string }[] }[];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    await requireAuth(req);
    const { categoryKey } = await req.json();
    const cat = cats.find(c => c.key === categoryKey);
    if (!cat) return json({ error: 'Category not found' }, 404);

    const [card0, card1] = shuffle(cat.items);
    return json({ cards: [card0, card1] });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
