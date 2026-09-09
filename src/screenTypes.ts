import type { GameMode } from './types';

// ─── Types ────────────────────────────────────────────
export type MenuMode = 'classic' | 'wicked' | 'thirty' | 'guess' | 'settings' | 'solo';
export type Screen =
  | { id: 'welcome' }
  | { id: 'home' }
  | { id: 'modeSelect'; wicked: boolean }
  | { id: 'players'; mode: GameMode }
  | { id: 'categories'; mode: GameMode; players: string[] }
  | { id: 'game'; mode: GameMode; players: string[]; groups: string[] }
  | { id: 'end'; scores: Record<string, number>; names: Record<string, string>; coinsEarned: number }
  | { id: 'thirtySetup' }
  | { id: 'guessSetup'; autoJoinCode?: string; hostCode?: string }
  | { id: 'onlineClassic'; wicked: boolean; autoJoinCode?: string; hostCode?: string }
  | { id: 'onlineThirty'; autoJoinCode?: string; hostCode?: string }
  | { id: 'solo' }
  | { id: 'store' };

export const TIERS = [100, 200, 300, 400, 500];
export const CONFETTI_COLORS = ['#30E7ED', '#DFC5FE', '#F9F9F9', '#38E27D', '#FF3D68', '#FFD700'];

