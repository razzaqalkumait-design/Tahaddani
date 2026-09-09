import { supabase } from '../supabase';

// ─── Shared online helpers ────────────────────────────
export function makeSbClient() {
  return Promise.resolve(supabase);
}

export function makeRoomCode() {
  return 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('').sort(() => Math.random() - .5).slice(0, 4).join('');
}

