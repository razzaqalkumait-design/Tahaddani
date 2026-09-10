/** Shared game types, ported from the web build. */

/** Local board-game variants; the mobile UI offers three playable shapes. */
export type GameMode =
  | 'teams'
  | 'teamsHost'
  | 'wickedTeams'
  | 'wickedTeamsHost'
  | 'ffa'
  | 'wickedFfa'
  | 'solo';

/** Route params passed to `/play/[mode]`. */
export interface PlayParams {
  mode?: string;
  online?: string;
}

export const isWickedMode = (mode: GameMode): boolean => mode.includes('wicked');
export const isFfaMode = (mode: GameMode): boolean => mode === 'ffa' || mode === 'wickedFfa';
