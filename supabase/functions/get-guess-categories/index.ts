// Returns the category list for the guess game — WITHOUT the items.
// Items are only served by get-guess-deal when a game actually starts.
import { cors, json, requireAuth } from '../_shared/auth.ts';
import guessRaw from '../_shared/data/guess.json' assert { type: 'json' };

const cats = guessRaw as { key: string; name: string; emoji: string; items: unknown[] }[];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    await requireAuth(req);
    // Strip items — only expose metadata
    const categories = cats.map(c => ({ key: c.key, name: c.name, emoji: c.emoji, count: c.items.length }));
    return json({ categories });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
