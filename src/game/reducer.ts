// v1.1.0 | 2026-05-31 MEZ

import { GameState, GameSnapshot, GamePhase, PlayerInfo, PlayerColor, currentSnapshot } from './types';
import { BoardVariant, BoardConfig, getBoardConfig, STONES_BY_VARIANT, PLAYER_COLORS, DEFAULT_NAMES } from './constants';

// ─── Action Types ────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'CLICK_NODE'; node: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_NAME'; playerIndex: number; name: string }
  | { type: 'NEW_GAME' };

// ─── Pure Helpers (board-config-aware) ───────────────────────────────────────

function formsNewMill(board: (PlayerColor | null)[], node: number, color: PlayerColor, cfg: BoardConfig): boolean {
  return cfg.mills.some(mill => mill.includes(node) && mill.every(n => board[n] === color));
}

function isInMill(board: (PlayerColor | null)[], node: number, cfg: BoardConfig): boolean {
  const color = board[node];
  if (!color) return false;
  return cfg.mills.some(mill => mill.includes(node) && mill.every(n => board[n] === color));
}

function getEligibleRemoves(board: (PlayerColor | null)[], opponentColors: PlayerColor[], cfg: BoardConfig): number[] {
  const opponentNodes: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] && opponentColors.includes(board[i]!)) opponentNodes.push(i);
  }
  const nonMill = opponentNodes.filter(i => !isInMill(board, i, cfg));
  return nonMill.length > 0 ? nonMill : opponentNodes;
}

function isMovementBlocked(board: (PlayerColor | null)[], idx: number, players: PlayerInfo[], cfg: BoardConfig): boolean {
  const p = players[idx];
  if (p.stonesOnBoard <= 3) return false;
  const color = p.color;
  for (let from = 0; from < board.length; from++) {
    if (board[from] !== color) continue;
    if (cfg.neighbors[from].some(to => board[to] === null)) return false;
  }
  return true;
}

function clearPlayerStones(board: (PlayerColor | null)[], color: PlayerColor): (PlayerColor | null)[] {
  return board.map(c => (c === color ? null : c));
}

function getWinner(players: PlayerInfo[]): number | null {
  const active = players.reduce<number[]>((acc, p, i) => (!p.eliminated ? [...acc, i] : acc), []);
  return active.length === 1 ? active[0] : null;
}

function advanceTurn(
  board: (PlayerColor | null)[],
  players: PlayerInfo[],
  currentIdx: number,
  playerCount: number,
  cfg: BoardConfig
): GameSnapshot {
  let b = [...board];
  const ps = players.map(p => ({ ...p }));

  // Eliminierung: zu wenige Steine
  for (let i = 0; i < playerCount; i++) {
    if (i === currentIdx || ps[i].eliminated) continue;
    if (ps[i].stonesInHand === 0 && ps[i].stonesOnBoard <= 2) {
      ps[i] = { ...ps[i], eliminated: true, stonesOnBoard: 0 };
      b = clearPlayerStones(b, ps[i].color);
    }
  }

  const immediateWinner = getWinner(ps);
  if (immediateWinner !== null) {
    return { board: b, players: ps, currentPlayerIndex: immediateWinner, phase: 'gameover', selectedNode: null, winner: immediateWinner };
  }

  let nextIdx = (currentIdx + 1) % playerCount;
  for (let attempt = 0; attempt < playerCount; attempt++) {
    const np = ps[nextIdx];
    if (np.eliminated) { nextIdx = (nextIdx + 1) % playerCount; continue; }

    if (np.stonesInHand === 0 && isMovementBlocked(b, nextIdx, ps, cfg)) {
      ps[nextIdx] = { ...ps[nextIdx], eliminated: true, stonesOnBoard: 0 };
      b = clearPlayerStones(b, np.color);
      const w = getWinner(ps);
      if (w !== null) {
        return { board: b, players: ps, currentPlayerIndex: w, phase: 'gameover', selectedNode: null, winner: w };
      }
      nextIdx = (nextIdx + 1) % playerCount;
      continue;
    }
    break;
  }

  const finalWinner = getWinner(ps);
  if (finalWinner !== null) {
    return { board: b, players: ps, currentPlayerIndex: finalWinner, phase: 'gameover', selectedNode: null, winner: finalWinner };
  }

  const phase: GamePhase = ps[nextIdx].stonesInHand > 0 ? 'placing' : 'moving';
  return { board: b, players: ps, currentPlayerIndex: nextIdx, phase, selectedNode: null, winner: null };
}

// ─── Click Handler ───────────────────────────────────────────────────────────

function handleClickNode(snap: GameSnapshot, node: number, playerCount: number, cfg: BoardConfig): GameSnapshot | null {
  const { board, players, currentPlayerIndex, phase, selectedNode } = snap;
  if (phase === 'gameover') return null;

  const b = [...board] as (PlayerColor | null)[];
  const ps = players.map(p => ({ ...p }));
  const cp = ps[currentPlayerIndex];
  const color = cp.color;

  if (phase === 'placing') {
    if (b[node] !== null) return null;
    b[node] = color;
    cp.stonesInHand--;
    cp.stonesOnBoard++;
    if (formsNewMill(b, node, color, cfg)) {
      return { ...snap, board: b, players: ps, phase: 'removing', selectedNode: null };
    }
    return advanceTurn(b, ps, currentPlayerIndex, playerCount, cfg);
  }

  if (phase === 'moving') {
    if (selectedNode === null) {
      if (b[node] !== color) return null;
      return { ...snap, selectedNode: node };
    }
    if (node === selectedNode) return { ...snap, selectedNode: null };
    if (b[node] === color) return { ...snap, selectedNode: node };

    const canJump = cp.stonesOnBoard <= 3;
    const validTarget = canJump
      ? b[node] === null
      : b[node] === null && cfg.neighbors[selectedNode].includes(node);
    if (!validTarget) return null;

    b[selectedNode] = null;
    b[node] = color;
    if (formsNewMill(b, node, color, cfg)) {
      return { ...snap, board: b, players: ps, phase: 'removing', selectedNode: null };
    }
    return advanceTurn(b, ps, currentPlayerIndex, playerCount, cfg);
  }

  if (phase === 'removing') {
    const opponentColors = ps
      .filter((p, i) => i !== currentPlayerIndex && !p.eliminated)
      .map(p => p.color);
    const eligible = getEligibleRemoves(b, opponentColors, cfg);
    if (!eligible.includes(node)) return null;

    const removedColor = b[node]!;
    const removedIdx = ps.findIndex(p => p.color === removedColor);
    b[node] = null;
    ps[removedIdx] = { ...ps[removedIdx], stonesOnBoard: ps[removedIdx].stonesOnBoard - 1 };
    return advanceTurn(b, ps, currentPlayerIndex, playerCount, cfg);
  }

  return null;
}

// ─── Initial State ───────────────────────────────────────────────────────────

function makeInitialSnapshot(playerCount: 2 | 3, boardVariant: BoardVariant): GameSnapshot {
  const cfg = getBoardConfig(boardVariant);
  const stonesPerPlayer = STONES_BY_VARIANT[boardVariant][playerCount];
  const players: PlayerInfo[] = PLAYER_COLORS.slice(0, playerCount).map(color => ({
    name: DEFAULT_NAMES[color],
    color,
    stonesInHand: stonesPerPlayer,
    stonesOnBoard: 0,
    eliminated: false,
  }));
  return {
    board: Array(cfg.nodes.length).fill(null),
    players,
    currentPlayerIndex: 0,
    phase: 'placing',
    selectedNode: null,
    winner: null,
  };
}

export function makeInitialState(playerCount: 2 | 3, boardVariant: BoardVariant = 'standard'): GameState {
  return {
    playerCount,
    boardVariant,
    history: [makeInitialSnapshot(playerCount, boardVariant)],
    historyIndex: 0,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case 'CLICK_NODE': {
      const snap = currentSnapshot(state);
      const cfg = getBoardConfig(state.boardVariant);
      const newSnap = handleClickNode(snap, action.node, state.playerCount, cfg);
      if (!newSnap) return state;
      const newHistory = [...state.history.slice(0, state.historyIndex + 1), newSnap];
      return { ...state, history: newHistory, historyIndex: newHistory.length - 1 };
    }

    case 'UNDO':
      if (state.historyIndex <= 0) return state;
      return { ...state, historyIndex: state.historyIndex - 1 };

    case 'REDO':
      if (state.historyIndex >= state.history.length - 1) return state;
      return { ...state, historyIndex: state.historyIndex + 1 };

    case 'SET_NAME': {
      const newHistory = state.history.map(snap => ({
        ...snap,
        players: snap.players.map((p, i) =>
          i === action.playerIndex ? { ...p, name: action.name } : p
        ),
      }));
      return { ...state, history: newHistory };
    }

    case 'NEW_GAME':
      return makeInitialState(state.playerCount, state.boardVariant);


    default:
      return state;
  }
}
