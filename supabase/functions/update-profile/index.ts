import { cors, json, requireAuth, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    const userId = await requireAuth(req);
    const body = await req.json() as Record<string, unknown>;

    // Strip protected fields
    delete body.id;
    delete body.coins;
    delete body.game_streak;

    if (Object.keys(body).length === 0) return json({ error: 'No fields to update' }, 400);

    const db = serviceClient();

    // Check if profile row exists
    const { data: existing } = await db.from('profiles').select('id').eq('id', userId).maybeSingle();

    if (existing) {
      // Update existing row
      const { error } = await db.from('profiles').update(body).eq('id', userId);
      if (error) return json({ error: error.message }, 500);
    } else {
      // Create new row with defaults
      const { error } = await db.from('profiles').insert({ id: userId, coins: 1250, ...body });
      if (error) return json({ error: error.message }, 500);
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
