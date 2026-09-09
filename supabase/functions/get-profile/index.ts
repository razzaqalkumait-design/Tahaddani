import { cors, json, requireAuth, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    const userId = await requireAuth(req);
    const db = serviceClient();
    const { data, error } = await db
      .from('profiles')
      .select('id, name, username, avatar, xp, level, sub_tier')
      .eq('id', userId)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    return json({ profile: data });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
