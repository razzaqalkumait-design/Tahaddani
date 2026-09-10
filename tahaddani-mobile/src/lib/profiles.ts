import { z } from 'zod';
import { supabase } from './supabase';
import { StorageKeys, appStorage } from './storage';
import { logger } from './logger';
import { fetchProfileEdge, updateProfileEdge } from '../api';

export const profileSchema = z.object({
  id: z.string(),
  name: z.string().catch(''),
  username: z.string().catch(''),
  avatar: z.string().catch('0'),
  email: z.string().optional(),
  xp: z.coerce.number().optional(),
  level: z.coerce.number().optional(),
  sub_tier: z.string().optional(),
});

export type Profile = z.infer<typeof profileSchema>;

export type InviteMode = 'classic' | 'wicked' | 'thirty' | 'guess';

export const gameInviteSchema = z.object({
  id: z.string(),
  from_id: z.string(),
  to_id: z.string(),
  from_name: z.string().catch(''),
  mode: z.enum(['classic', 'wicked', 'thirty', 'guess']).catch('classic'),
  room_code: z.string().catch(''),
  status: z.enum(['pending', 'accepted', 'declined']).catch('pending'),
  created_at: z.string().catch(''),
});

export type GameInvite = z.infer<typeof gameInviteSchema>;

export interface FriendEntry {
  id: string;
  profile: Profile;
  status: 'pending' | 'accepted';
  direction: 'sent' | 'received';
}

// ─── Profile cache ───────────────────────────────────

function profileKey(userId: string): string {
  return StorageKeys.profilePrefix + userId;
}

export async function cacheProfile(profile: Profile): Promise<void> {
  await appStorage.setJson(profileKey(profile.id), profile);
}

export async function getCachedProfile(userId: string): Promise<Profile | null> {
  const raw = await appStorage.getJson<unknown>(profileKey(userId), null);
  if (raw === null) return null;
  const parsed = profileSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Reads the live profile, falling back to the cached copy when offline. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const remote = await fetchProfileEdge();
    if (remote) {
      const profile = profileSchema.parse(remote);
      await cacheProfile(profile);
      return profile;
    }
  } catch (error) {
    logger.warn('Profile fetch failed, falling back to cache', { userId });
  }
  return getCachedProfile(userId);
}

export async function updateProfile(fields: Partial<Omit<Profile, 'id'>>): Promise<string | null> {
  // Delegated to the edge function, which holds the service role and bypasses RLS.
  return updateProfileEdge(fields);
}

export async function lookupEmailByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .ilike('username', username.trim())
    .maybeSingle();

  if (error) {
    logger.error('Username lookup failed', error);
    return null;
  }
  const parsed = z.object({ email: z.string().optional() }).safeParse(data);
  return parsed.success ? (parsed.data.email ?? null) : null;
}

export async function isUsernameTaken(username: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from('profiles').select('id').eq('username', username.toLowerCase());
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

export async function searchByUsername(username: string): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, username, avatar')
    .ilike('username', `%${username}%`)
    .limit(10);

  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const parsed = profileSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

// ─── Coins ───────────────────────────────────────────

export async function fetchCoins(userId: string): Promise<number | null> {
  const { data } = await supabase.from('profiles').select('coins').eq('id', userId).maybeSingle();
  const parsed = z.object({ coins: z.coerce.number() }).safeParse(data);
  return parsed.success ? parsed.data.coins : null;
}

export async function saveCoins(userId: string, coins: number): Promise<void> {
  const { error } = await supabase.from('profiles').update({ coins }).eq('id', userId);
  if (error) logger.error('Coin save failed', error, { userId });
}

// ─── Friends ─────────────────────────────────────────

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<string | null> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });
  return error?.message ?? null;
}

export async function acceptFriendRequest(friendshipId: string): Promise<string | null> {
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  return error?.message ?? null;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) logger.error('Friend removal failed', error);
}

/** Ported from the web build's getFriendshipStatus (src/supabase.ts). */
export async function getFriendshipStatus(
  userId: string,
  otherId: string,
): Promise<{ id: string; status: 'pending' | 'accepted'; direction: 'sent' | 'received' } | null> {
  const rowSchema = z.object({
    id: z.string(),
    requester_id: z.string(),
    status: z.enum(['pending', 'accepted']).catch('pending'),
  });

  const { data } = await supabase
    .from('friendships')
    .select('id, requester_id, status')
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`)
    .single();

  const parsed = rowSchema.safeParse(data);
  if (!parsed.success) return null;
  return {
    id: parsed.data.id,
    status: parsed.data.status,
    direction: parsed.data.requester_id === userId ? 'sent' : 'received',
  };
}

/** Ported from the web build's uploadAvatar (src/supabase.ts). */
export async function uploadAvatar(
  userId: string,
  file: { name: string; type: string; base64: string },
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const binary = base64ToUint8Array(file.base64);
  const { error } = await supabase.storage.from('avatars').upload(path, binary, {
    upsert: true,
    contentType: file.type,
  });
  if (error) {
    logger.error('[uploadAvatar]', error.message, { userId });
    return { url: null, error: error.message };
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl + '?t=' + Date.now(), error: null };
}

/** Minimal base64→bytes decoder (Hermes has no atob). */
function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const idx = (ch: string | undefined): number => (ch ? lookup.indexOf(ch) : -1);
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = idx(clean[i]);
    const b = idx(clean[i + 1]);
    const c = idx(clean[i + 2]);
    const d = idx(clean[i + 3]);
    bytes.push((a << 2) | (b >> 4));
    if (c !== -1) bytes.push(((b & 15) << 4) | (c >> 2));
    if (d !== -1) bytes.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(bytes);
}

export async function getFriends(userId: string): Promise<FriendEntry[]> {
  const rowSchema = z.object({
    id: z.string(),
    requester_id: z.string(),
    addressee_id: z.string(),
    status: z.enum(['pending', 'accepted']).catch('pending'),
  });

  const { data } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (!Array.isArray(data) || data.length === 0) return [];

  const rows = data.flatMap((row) => {
    const parsed = rowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  if (rows.length === 0) return [];

  const otherIds = rows.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id));
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, name, username, avatar')
    .in('id', otherIds);

  const profileMap = new Map<string, Profile>();
  for (const row of profileRows ?? []) {
    const parsed = profileSchema.safeParse(row);
    if (parsed.success) profileMap.set(parsed.data.id, parsed.data);
  }

  return rows.map((row) => {
    const otherId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    return {
      id: row.id,
      profile: profileMap.get(otherId) ?? { id: otherId, name: '', username: '', avatar: '0' },
      status: row.status,
      direction: row.requester_id === userId ? ('sent' as const) : ('received' as const),
    };
  });
}

// ─── Invites ─────────────────────────────────────────

export async function sendGameInvite(
  fromId: string,
  toId: string,
  fromName: string,
  mode: InviteMode,
  roomCode: string,
): Promise<string | null> {
  // Clear any pending invite between these two players before issuing a new one.
  await supabase.from('game_invites').delete().eq('from_id', fromId).eq('to_id', toId).eq('status', 'pending');
  const { error } = await supabase.from('game_invites').insert({
    from_id: fromId,
    to_id: toId,
    from_name: fromName,
    mode,
    room_code: roomCode,
    status: 'pending',
  });
  return error?.message ?? null;
}

export async function updateInviteStatus(inviteId: string, status: 'accepted' | 'declined'): Promise<void> {
  const { error } = await supabase.from('game_invites').update({ status }).eq('id', inviteId);
  if (error) logger.error('Invite status update failed', error, { inviteId });
}

export function subscribeToInvites(userId: string, onInvite: (invite: GameInvite) => void): () => void {
  const channel = supabase
    .channel(`invites_${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `to_id=eq.${userId}` },
      (payload) => {
        const parsed = gameInviteSchema.safeParse(payload.new);
        if (parsed.success) onInvite(parsed.data);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
