// Server-side coin award after a game ends.
// Client cannot manipulate the amount — all logic runs here.
import { cors, json, requireAuth, serviceClient } from '../_shared/auth.ts';

const BASE = 100;       // for completing any game
const WIN_BONUS = 50;   // for winning (non-tie)
const STREAK_BONUS = 100; // every 3rd game streak

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    const userId = await requireAuth(req);
    const { isWinner } = await req.json() as { isWinner: boolean };

    const db = serviceClient();

    // Read current coins and streak from DB
    const { data: profile, error: readErr } = await db
      .from('profiles')
      .select('coins, game_streak')
      .eq('id', userId)
      .single();

    if (readErr || !profile) return json({ error: 'Profile not found' }, 404);

    const newStreak = (profile.game_streak ?? 0) + 1;
    let earned = BASE;
    if (isWinner) earned += WIN_BONUS;
    if (newStreak % 3 === 0) earned += STREAK_BONUS;

    const newCoins = (profile.coins ?? 0) + earned;

    const { error: writeErr } = await db
      .from('profiles')
      .update({ coins: newCoins, game_streak: newStreak })
      .eq('id', userId);

    if (writeErr) return json({ error: writeErr.message }, 500);

    return json({ earned, newTotal: newCoins, streak: newStreak });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }
});
