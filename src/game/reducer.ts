// v1.1.0 | 2026-06-02 MEZ

import { GameState, GameSnapshot, GamePhase, PlayerInfo, PlayerColor, currentSnapshot } from './types';
import { BoardVariant, BoardConfig, getBoardConfig, STONES_BY_VARIANT, DEFAULT_NAMES, getPlayerColors } from './constants';

// ─── Action Types ────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'CLICK_NODE'; node: number }
  | { type: 'AI_MOVE' }
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

function scorePlace(board: (PlayerColor | null)[], node: number, color: PlayerColor, opponents: PlayerColor[], cfg: BoardConfig): number {
  const b = [...board];
  b[node] = color;
  let score = formsNewMill(b, node, color, cfg) ? 1000 : 0;
  for (const opponent of opponents) {
    const test = [...board];
    test[node] = opponent;
    if (formsNewMill(test, node, opponent, cfg)) score += 180;
  }
  score += cfg.neighbors[node].filter(n => board[n] === color).length * 8;
  return score;
}

function chooseBestPlace(snap: GameSnapshot, cfg: BoardConfig): number | null {
  const { board, players, currentPlayerIndex } = snap;
  const color = players[currentPlayerIndex].color;
  const opponents = players
    .filter((p, i) => i !== currentPlayerIndex && !p.eliminated)
    .map(p => p.color);
  let best: { node: number; score: number } | null = null;
  for (let node = 0; node < board.length; node++) {
    if (board[node] !== null) continue;
    const score = scorePlace(board, node, color, opponents, cfg);
    if (!best || score > best.score) best = { node, score };
  }
  return best?.node ?? null;
}

function chooseBestMove(snap: GameSnapshot, cfg: BoardConfig): [number, number] | null {
  const { board, players, currentPlayerIndex } = snap;
  const player = players[currentPlayerIndex];
  const color = player.color;
  const canJump = player.stonesOnBoard <= 3;
  let best: { from: number; to: number; score: number } | null = null;

  for (let from = 0; from < board.length; from++) {
    if (board[from] !== color) continue;
    const targets = canJump
      ? board.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0)
      : cfg.neighbors[from].filter(to => board[to] === null);
    for (const to of targets) {
      const b = [...board];
      b[from] = null;
      b[to] = color;
      const score = (formsNewMill(b, to, color, cfg) ? 1000 : 0) + cfg.neighbors[to].filter(n => b[n] === color).length * 8;
      if (!best || score > best.score) best = { from, to, score };
    }
  }

  return best ? [best.from, best.to] : null;
}

function chooseBestRemove(snap: GameSnapshot, cfg: BoardConfig): number | null {
  const { board, players, currentPlayerIndex } = snap;
  const opponentColors = players
    .filter((p, i) => i !== currentPlayerIndex && !p.eliminated)
    .map(p => p.color);
  const eligible = getEligibleRemoves(board, opponentColors, cfg);
  if (eligible.length === 0) return null;
  return eligible
    .map(node => ({
      node,
      score: cfg.neighbors[node].filter(n => board[n] === board[node]).length + (isInMill(board, node, cfg) ? 0 : 5),
    }))
    .sort((a, b) => b.score - a.score)[0].node;
}

function handleAIMove(snap: GameSnapshot, playerCount: number, cfg: BoardConfig): GameSnapshot | null {
  const currentPlayer = snap.players[snap.currentPlayerIndex];
  if (!currentPlayer.isAI || currentPlayer.eliminated || snap.winner !== null) return null;

  if (snap.phase === 'placing') {
    const node = chooseBestPlace(snap, cfg);
    return node === null ? null : handleClickNode(snap, node, playerCount, cfg);
  }

  if (snap.phase === 'moving') {
    const move = chooseBestMove(snap, cfg);
    if (!move) return null;
    const selected = handleClickNode(snap, move[0], playerCount, cfg);
    return selected ? handleClickNode(selected, move[1], playerCount, cfg) : null;
  }

  if (snap.phase === 'removing') {
    const node = chooseBestRemove(snap, cfg);
    return node === null ? null : handleClickNode(snap, node, playerCount, cfg);
  }

  return null;
}

// ─── Initial State ───────────────────────────────────────────────────────────

function makeInitialSnapshot(playerCount: 2 | 3, boardVariant: BoardVariant, names: string[] = [], aiPlayers: boolean[] = []): GameSnapshot {
  const cfg = getBoardConfig(boardVariant);
  const stonesPerPlayer = STONES_BY_VARIANT[boardVariant][playerCount];
  const players: PlayerInfo[] = getPlayerColors(playerCount).map((color, i) => ({
    name: names[i] || DEFAULT_NAMES[color],
    color,
    stonesInHand: stonesPerPlayer,
    stonesOnBoard: 0,
    eliminated: false,
    isAI: Boolean(aiPlayers[i]),
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

export function makeInitialState(playerCount: 2 | 3, boardVariant: BoardVariant = 'standard', names: string[] = [], aiPlayers: boolean[] = []): GameState {
  return {
    playerCount,
    boardVariant,
    history: [makeInitialSnapshot(playerCount, boardVariant, names, aiPlayers)],
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

    case 'AI_MOVE': {
      const snap = currentSnapshot(state);
      const cfg = getBoardConfig(state.boardVariant);
      const newSnap = handleAIMove(snap, state.playerCount, cfg);
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

    case 'NEW_GAME': {
      const snap = currentSnapshot(state);
      return makeInitialState(
        state.playerCount,
        state.boardVariant,
        snap.players.map(p => p.name),
        snap.players.map(p => p.isAI)
      );
    }


    default:
      return state;
  }
}
