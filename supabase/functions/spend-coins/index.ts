// Server-side coin spend — validates balance before deducting.
// Prevents client-side manipulation of coin balance.
import { cors, json, requireAuth, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    const userId = await requireAuth(req);
    const { amount } = await req.json() as { amount: number };

    if (!Number.isInteger(amount) || amount <= 0) return json({ error: 'Invalid amount' }, 400);

    const db = serviceClient();
    const { data: profile, error: readErr } = await db
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();

    if (readErr || !profile) return json({ error: 'Profile not found' }, 404);
    if ((profile.coins ?? 0) < amount) return json({ error: 'رصيدك غير كافٍ', success: false }, 400);

    const newCoins = profile.coins - amount;
    const { error: writeErr } = await db
      .from('profiles')
      .update({ coins: newCoins })
      .eq('id', userId);

    if (writeErr) return json({ error: writeErr.message }, 500);
    return json({ success: true, newTotal: newCoins });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
