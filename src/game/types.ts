// v1.1.0 | 2026-05-31 MEZ

export type PlayerColor = 'WHITE' | 'BLACK' | 'RED';
export type GamePhase = 'placing' | 'moving' | 'removing' | 'gameover';

export interface PlayerInfo {
  name: string;
  color: PlayerColor;
  stonesInHand: number;  // noch zu platzierende Steine
  stonesOnBoard: number; // Steine auf dem Spielfeld
  eliminated: boolean;
}

/** Ein vollständiger Spielzustand (für Undo/Redo) */
export interface GameSnapshot {
  board: (PlayerColor | null)[];  // 24 Knoten, Index 0–23
  players: PlayerInfo[];
  currentPlayerIndex: number;
  phase: GamePhase;
  selectedNode: number | null;   // für Moving/Jumping: gewählter Stein
  winner: number | null;         // Spieler-Index des Gewinners
}

export interface GameState {
  playerCount: 2 | 3;
  boardVariant: import('./constants').BoardVariant;
  history: GameSnapshot[];
  historyIndex: number;
}

export function currentSnapshot(state: GameState): GameSnapshot {
  return state.history[state.historyIndex];
}
