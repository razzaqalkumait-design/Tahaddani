export type Screen =
  | 'welcome'
  | 'menu'
  | 'modeSelect'
  | 'players'
  | 'categories'
  | 'game'
  | 'end';

export type GameMode =
  | 'teams'
  | 'teamsHost'
  | 'wickedTeams'
  | 'wickedTeamsHost'
  | 'ffa'
  | 'wickedFfa'
  | 'solo';

export interface Question {
  group: string;
  points: number;
  question: string;
  answer: string;
  flag?: string;
}

export interface Team {
  name: string;
  score: number;
  players: string[];
}

export interface CellState {
  used: boolean;
}

export type BoardState = Record<string, Record<number, CellState>>;

export interface GameState {
  mode: GameMode;
  teams: Record<number, Team>;
  currentTeam: number;
  board: BoardState;
  selectedGroups: string[];
  currentQuestion: Question | null;
  showQuestion: boolean;
  answeringTeam: number;
  timerSeconds: number;
  gameEnded: boolean;
  gaUsed: { block: Record<number, boolean>; two: Record<number, boolean>; steal: Record<number, boolean>; double: Record<number, boolean> };
  gaState: { block: boolean; two: boolean; steal: boolean; double: boolean };
  roundPhase: 'board' | 'picking';
}
