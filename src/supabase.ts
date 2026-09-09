import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const g = globalThis as typeof globalThis & { __taSupabase?: SupabaseClient };
if (!g.__taSupabase) {
  g.__taSupabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
    { auth: { storageKey: 'ta_auth' } },
  );
}
export const supabase = g.__taSupabase;

export interface Profile {
  id: string;
  name: string;        // display name — freely changeable
  username: string;    // unique handle
  avatar: string;
  email?: string;      // stored for username-based login lookup
  xp?: number;
  level?: number;
  sub_tier?: string;
}

const PROFILE_CACHE = 'ta_profile_v1';

export function cacheProfile(profile: Profile): void {
  try { localStorage.setItem(PROFILE_CACHE + '_' + profile.id, JSON.stringify(profile)); } catch {}
}

export function getCachedProfile(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE + '_' + userId);
    return raw ? JSON.parse(raw) as Profile : null;
  } catch { return null; }
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { fetchProfileEdge } = await import('./api');
    const profile = await fetchProfileEdge();
    if (profile) { cacheProfile(profile); return profile; }
  } catch {}
  // Fall back to locally cached profile
  return getCachedProfile(userId);
}

export async function upsertProfile(profile: Profile): Promise<void> {
  await supabase.from('profiles').upsert(profile);
}

/** Look up the auth email for a given username. Returns null if not found. */
export async function lookupEmailByUsername(username: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .ilike('username', username.trim())
    .maybeSingle();
  return (data as { email?: string } | null)?.email ?? null;
}

export async function uploadAvatar(userId: string, file: File): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error('[uploadAvatar]', error.message, error);
    return { url: null, error: error.message };
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl + '?t=' + Date.now(), error: null };
}

export async function updateProfile(_userId: string, fields: Partial<Omit<Profile, 'id'>>): Promise<string | null> {
  // Delegates to edge function which uses service role — bypasses RLS issues
  const { updateProfileEdge } = await import('./api');
  return updateProfileEdge(fields as Record<string, string>);
}

export async function fetchCoins(userId: string): Promise<number | null> {
  const { data } = await supabase.from('profiles').select('coins').eq('id', userId).maybeSingle();
  return data?.coins ?? null;
}

export async function saveCoins(userId: string, coins: number): Promise<void> {
  await supabase.from('profiles').update({ coins }).eq('id', userId);
}

// ─── Game Invites ─────────────────────────────────────

export type InviteMode = 'classic' | 'wicked' | 'thirty' | 'guess';

export interface GameInvite {
  id: string;
  from_id: string;
  to_id: string;
  from_name: string;
  mode: InviteMode;
  room_code: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export async function sendGameInvite(fromId: string, toId: string, fromName: string, mode: InviteMode, roomCode: string): Promise<string | null> {
  // cancel any pre-existing pending invite from this user to this friend for any mode
  await supabase.from('game_invites').delete().eq('from_id', fromId).eq('to_id', toId).eq('status', 'pending');
  const { error } = await supabase.from('game_invites').insert({ from_id: fromId, to_id: toId, from_name: fromName, mode, room_code: roomCode, status: 'pending' });
  return error?.message ?? null;
}

export async function updateInviteStatus(inviteId: string, status: 'accepted' | 'declined'): Promise<void> {
  await supabase.from('game_invites').update({ status }).eq('id', inviteId);
}

export function subscribeToInvites(userId: string, onInvite: (invite: GameInvite) => void): () => void {
  const ch = supabase
    .channel('invites_' + userId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `to_id=eq.${userId}` },
      (payload) => onInvite(payload.new as GameInvite))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export async function isUsernameTaken(username: string, excludeId?: string): Promise<boolean> {
  let q = supabase.from('profiles').select('id').eq('username', username.toLowerCase());
  if (excludeId) q = q.neq('id', excludeId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

export async function searchByUsername(username: string): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, username, avatar')
    .ilike('username', `%${username}%`)
    .limit(10);
  return data ?? [];
}

// ─── Friends ─────────────────────────────────────────

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
}

export interface FriendEntry {
  id: string;          // friendship row id
  profile: Profile;    // the other person
  status: 'pending' | 'accepted';
  direction: 'sent' | 'received';
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<string | null> {
  const { error } = await supabase.from('friendships').insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });
  return error?.message ?? null;
}

export async function acceptFriendRequest(friendshipId: string): Promise<string | null> {
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  return error?.message ?? null;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await supabase.from('friendships').delete().eq('id', friendshipId);
}

export async function getFriends(userId: string): Promise<FriendEntry[]> {
  const { data: rows } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (!rows?.length) return [];

  const otherIds = rows.map(r => r.requester_id === userId ? r.addressee_id : r.requester_id);
  const { data: profiles } = await supabase.from('profiles').select('id, name, username, avatar').in('id', otherIds);
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return rows.map(r => {
    const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    return {
      id: r.id,
      profile: profileMap.get(otherId) ?? { id: otherId, name: '???', username: '???', avatar: '0' },
      status: r.status,
      direction: r.requester_id === userId ? 'sent' : 'received',
    };
  });
}

export async function getFriendshipStatus(userId: string, otherId: string): Promise<{ id: string; status: 'pending' | 'accepted'; direction: 'sent' | 'received' } | null> {
  const { data } = await supabase
    .from('friendships')
    .select('id, requester_id, status')
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`)
    .single();
  if (!data) return null;
  return { id: data.id, status: data.status, direction: data.requester_id === userId ? 'sent' : 'received' };
}
