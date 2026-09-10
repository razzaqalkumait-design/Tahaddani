import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Shared online helpers ────────────────────────────
// Ported from the web build; the single supabase client replaces the lazy
// `makeSbClient()` indirection, and room codes keep the same alphabet/length.

export type OnlineSeat = 0 | 1;

export function makeRoomCode(): string {
  return 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('').sort(() => Math.random() - 0.5).slice(0, 4).join('');
}

/**
 * Opens the broadcast channel for a room and registers handlers.
 *
 * The host (seat 0) owns the room state: a guest announces `join`, and the
 * host replies with full `state` broadcasts. `config.self: false` matches the
 * web build so a host never receives its own echo.
 */
export async function subscribeRoom(
  channelName: string,
  onState: (state: Record<string, unknown>) => void,
  onJoin: (payload: { name: string }) => void,
): Promise<RealtimeChannel> {
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } },
  });
  channel.on('broadcast', { event: 'state' }, ({ payload }) => {
    onState((payload ?? {}) as Record<string, unknown>);
  });
  channel.on('broadcast', { event: 'join' }, ({ payload }) => {
    onJoin((payload ?? {}) as { name: string });
  });
  await channel.subscribe();
  return channel;
}

export function announceJoin(channel: RealtimeChannel, name: string): void {
  channel.send({ type: 'broadcast', event: 'join', payload: { name } });
}

export function broadcastState(channel: RealtimeChannel | null, state: object): void {
  if (!channel) return;
  channel.send({ type: 'broadcast', event: 'state', payload: state });
}

export async function closeRoom(channel: RealtimeChannel | null): Promise<void> {
  if (!channel) return;
  await supabase.removeChannel(channel);
}
