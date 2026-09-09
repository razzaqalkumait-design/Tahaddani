// Awards XP after a completed game and syncs subscription tier.
import { cors, json, requireAuth, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    const userId = await requireAuth(req);
    const { xpToAdd = 150, subTier } = await req.json() as { xpToAdd?: number; subTier?: string };

    const db = serviceClient();
    const { data: profile } = await db
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .maybeSingle();

    const oldXp = (profile?.xp ?? 0) as number;
    const newXp = oldXp + Math.min(xpToAdd, 500); // cap per call to prevent abuse
    const newLevel = Math.floor(newXp / 500) + 1;

    const update: Record<string, unknown> = { xp: newXp, level: newLevel };
    if (subTier) update.sub_tier = subTier;

    await db.from('profiles').update(update).eq('id', userId);

    return json({ ok: true, newXp, newLevel });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
