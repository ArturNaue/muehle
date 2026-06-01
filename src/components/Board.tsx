// v1.1.0 | 2026-05-31 MEZ

import React, { useMemo } from 'react';
import { GameSnapshot, PlayerColor } from '../game/types';
import { getBoardConfig, BoardVariant } from '../game/constants';
import { GameAction } from '../game/reducer';
import PlayerCard from './PlayerCard';

// ─── Sizing ───────────────────────────────────────────────────────────────────
// Mulden (leere Knoten): kleines Loch
const HOLE_R  = 3;
// Scheiben: grösser als das Loch, leicht überlappend
const DISC_R  = 12;
// Klickbereich (unsichtbar, grösser als Scheibe für komfortables Tippen)
const HIT_R   = 16;

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getHighlightTargets(
  board: (PlayerColor | null)[],
  selectedNode: number | null,
  canJump: boolean,
  neighbors: number[][]
): Set<number> {
  if (selectedNode === null) return new Set();
  const targets = new Set<number>();
  if (canJump) {
    for (let i = 0; i < board.length; i++) { if (board[i] === null) targets.add(i); }
  } else {
    for (const n of neighbors[selectedNode]) {
      if (board[n] === null) targets.add(n);
    }
  }
  return targets;
}

function isInMill(board: (PlayerColor | null)[], node: number, mills: number[][]): boolean {
  const color = board[node];
  if (!color) return false;
  return mills.some(mill => mill.includes(node) && mill.every(n => board[n] === color));
}

function getEligibleRemoveSet(
  board: (PlayerColor | null)[],
  opponentColors: PlayerColor[],
  mills: number[][]
): Set<number> {
  const opp: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] && opponentColors.includes(board[i]!)) opp.push(i);
  }
  const nonMill = opp.filter(i => !isInMill(board, i, mills));
  return new Set(nonMill.length > 0 ? nonMill : opp);
}

// ─── Disc Component ───────────────────────────────────────────────────────────

interface DiscProps {
  color: PlayerColor;
  selected: boolean;
  removeHighlight: boolean;
  r: number;
}

/** Flache Scheibe (kein 3D-Gradient) mit Rahmen und Schatten */
const Disc: React.FC<DiscProps> = ({ color, selected, removeHighlight, r: DISC_R }) => {
  const fill =
    color === 'WHITE' ? 'rgb(230,230,220)' :
    color === 'BLACK' ? 'rgb(28,28,33)'    :
    /* RED */           'rgb(176,22,22)';

  const stroke =
    removeHighlight  ? 'rgb(252,165,165)' :
    selected         ? 'rgb(251,191,36)'  :
    color === 'WHITE'? 'rgb(170,170,160)' :
    color === 'BLACK'? 'rgb(65,65,72)'    :
    /* RED */          'rgb(120,10,10)';

  const strokeWidth = selected || removeHighlight ? 2.5 : 1.5;

  // Kleiner Glanzpunkt oben-links (subtil, kein 3D-Effekt)
  const shineOpacity = color === 'BLACK' ? 0.15 : 0.45;

  return (
    <g>
      <circle
        r={DISC_R}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.6))' }}
        className={removeHighlight ? 'muehle-pulse' : ''}
      />
      {/* Glanzpunkt */}
      <circle
        cx={-DISC_R * 0.28}
        cy={-DISC_R * 0.28}
        r={DISC_R * 0.18}
        fill={`rgba(255,255,255,${shineOpacity})`}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
};

// ─── Board Component ──────────────────────────────────────────────────────────

interface BoardProps {
  snap: GameSnapshot;
  playerCount: 2 | 3;
  boardVariant: BoardVariant;
  dispatch: React.Dispatch<GameAction>;
}

const Board: React.FC<BoardProps> = ({ snap, playerCount, boardVariant, dispatch }) => {
  const { board, players, currentPlayerIndex, phase, selectedNode, winner } = snap;
  const cfg = useMemo(() => getBoardConfig(boardVariant), [boardVariant]);

  // Scheibenradius: für Sechseck-Mühle kleiner (innere Knoten sind eng),
  // für alle anderen Varianten Standard-Radius.
  const discR = useMemo(() => {
    // Kleinsten Knotenabstand über alle Kanten berechnen
    let minDist = Infinity;
    for (const [a, b] of cfg.edges) {
      const [ax, ay] = cfg.nodes[a];
      const [bx, by] = cfg.nodes[b];
      const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
      if (d < minDist) minDist = d;
    }
    // Scheibe passt mit 2 Einheiten Luft zwischen Nachbarn: r < (minDist - 2) / 2
    const maxAllowed = Math.floor((minDist - 2) / 2);
    return Math.min(DISC_R, maxAllowed);
  }, [cfg]);

  // ViewBox dynamisch berechnen: passt sich jeder Brett-Form an
  // Formel: maximale Knotenausdehnung + Scheibenradius + 4 Einheiten Rand
  const svgViewBox = useMemo(() => {
    let maxX = 0, maxY = 0;
    for (const [x, y] of cfg.nodes) {
      maxX = Math.max(maxX, Math.abs(x));
      maxY = Math.max(maxY, Math.abs(y));
    }
    const vbX = maxX + discR + 4;
    const vbY = maxY + discR + 4;
    return `-${vbX} -${vbY} ${2 * vbX} ${2 * vbY}`;
  }, [cfg, discR]);

  const currentPlayer = players[currentPlayerIndex];
  const currentColor  = currentPlayer.color;
  const canJump = currentPlayer.stonesOnBoard <= 3 && currentPlayer.stonesInHand === 0;

  const moveTargets = useMemo(() =>
    phase === 'moving'
      ? getHighlightTargets(board, selectedNode, canJump, cfg.neighbors)
      : new Set<number>(),
    [board, selectedNode, canJump, cfg.neighbors, phase]
  );

  const removeTargets = useMemo(() =>
    phase === 'removing'
      ? getEligibleRemoveSet(
          board,
          players.filter((p, i) => i !== currentPlayerIndex && !p.eliminated).map(p => p.color),
          cfg.mills
        )
      : new Set<number>(),
    [board, players, currentPlayerIndex, phase, cfg.mills]
  );

  const statusText =
    winner !== null
      ? `${players[winner].name} gewinnt! 🏆`
    : phase === 'placing'
      ? `${currentPlayer.name} setzt (${currentPlayer.stonesInHand} übrig)`
    : phase === 'moving'
      ? selectedNode !== null
        ? `${currentPlayer.name}: Zielfeld wählen`
        : `${currentPlayer.name} zieht${canJump ? ' (springt)' : ''}`
      : `${currentPlayer.name}: Gegnerstein schlagen`;

  const is2Player = playerCount === 2;

  // ── Spieler-Karten-Reihe für 2-Spieler-Modus ────────────────────────────────
  const cardRow2P = (flipped: boolean) => {
    const pidx = flipped ? 1 : 0;
    return (
      <div
        id={`muehle-board-row-${flipped ? 'top' : 'bottom'}`}
        style={{
          position: 'absolute',
          [flipped ? 'top' : 'bottom']: '8px',
          left: '10px', right: '10px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        <PlayerCard
          id={`muehle-card-${pidx}-${flipped ? 'top' : 'bot'}`}
          player={players[pidx]}
          isActive={currentPlayerIndex === pidx}
          winner={winner} playerIndex={pidx} winnerIndex={winner}
          onRename={name => dispatch({ type: 'SET_NAME', playerIndex: pidx, name })}
          flipped={flipped}
        />
        <button
          id={`muehle-status-${flipped ? 'top' : 'bot'}`}
          onClick={() => {
            if (selectedNode !== null && phase === 'moving')
              dispatch({ type: 'CLICK_NODE', node: selectedNode });
          }}
          style={{
            flex: 1,
            transform: flipped ? 'rotate(180deg)' : undefined,
            cursor: selectedNode !== null && phase === 'moving' ? 'pointer' : 'default',
            borderColor: currentPlayerIndex === pidx && !winner ? 'rgb(245,158,11)' : undefined,
            background: currentPlayerIndex === pidx && !winner ? 'rgba(120,53,15,0.35)' : undefined,
          }}
          className="muehle-status-btn"
        >{statusText}</button>
        <PlayerCard
          id={`muehle-card-${1 - pidx}-${flipped ? 'top' : 'bot'}`}
          player={players[1 - pidx]}
          isActive={currentPlayerIndex === (1 - pidx)}
          winner={winner} playerIndex={1 - pidx} winnerIndex={winner}
          onRename={name => dispatch({ type: 'SET_NAME', playerIndex: 1 - pidx, name })}
          flipped={flipped}
        />
      </div>
    );
  };

  return (
    <div
      id="muehle-board-container"
      className="muehle-board-container"
      style={{ position: 'relative', background: 'rgb(45,55,72)', borderRadius: '1rem' }}
    >
      {is2Player && cardRow2P(true)}
      {is2Player && cardRow2P(false)}

      {/* 3-Spieler: Status oben, Karten unten */}
      {!is2Player && (
        <>
          <div id="muehle-status-3p" style={{ position: 'absolute', top: '8px', left: '10px', right: '10px' }}>
            <div className="muehle-status-btn" style={{ textAlign: 'center' }}>{statusText}</div>
          </div>
          <div id="muehle-cards-3p" style={{
            position: 'absolute', bottom: '8px', left: '10px', right: '10px',
            display: 'flex', gap: '4px', justifyContent: 'space-between',
          }}>
            {players.map((p, i) => (
              <PlayerCard
                key={i} id={`muehle-card-${i}`}
                player={p} isActive={currentPlayerIndex === i}
                winner={winner} playerIndex={i} winnerIndex={winner}
                onRename={name => dispatch({ type: 'SET_NAME', playerIndex: i, name })}
              />
            ))}
          </div>
        </>
      )}

      {/* SVG Spielfeld */}
      <svg
        id="muehle-board-svg"
        viewBox={svgViewBox}
        className="muehle-board-svg"
        style={{ width: '100%', display: 'block', userSelect: 'none' }}
      >
        {/* Board-Linien */}
        {cfg.edges.map(([a, b_], i) => (
          <line
            key={`edge-${i}`}
            x1={cfg.nodes[a][0]} y1={cfg.nodes[a][1]}
            x2={cfg.nodes[b_][0]} y2={cfg.nodes[b_][1]}
            stroke="rgb(80,95,115)"
            strokeWidth="2"
          />
        ))}

        {/* Keine gesonderte Hervorhebung für Diagonalkanten – einheitliche Linienfarbe */}

        {/* Knoten */}
        {cfg.nodes.map(([x, y], idx) => {
          const stoneColor  = board[idx];
          const isSelected  = selectedNode === idx;
          const isMoveTarget  = moveTargets.has(idx);
          const isRemoveTarget = removeTargets.has(idx);
          const isEmpty = stoneColor === null;

          return (
            <g
              key={`node-${idx}`}
              transform={`translate(${x},${y})`}
              onClick={() => dispatch({ type: 'CLICK_NODE', node: idx })}
              style={{ cursor: winner !== null ? 'default' : 'pointer' }}
            >
              {/* Unsichtbarer grosser Klickbereich */}
              <circle r={HIT_R} fill="transparent" />

              {/* Mulde (leeres Loch) – kleiner als Scheibe */}
              {isEmpty && (
                <circle
                  r={HOLE_R}
                  fill={isMoveTarget ? 'rgb(80,50,15)' : 'rgb(30,37,48)'}
                  stroke={isMoveTarget ? 'rgb(245,158,11)' : 'rgb(20,25,35)'}
                  strokeWidth="1"
                  className={isMoveTarget ? 'muehle-pulse' : ''}
                />
              )}

              {/* Ziel-Punkt bei leerem Move-Target */}
              {isMoveTarget && isEmpty && (
                <circle r={HOLE_R * 0.55} fill="rgba(245,158,11,0.75)" />
              )}

              {/* Scheibe */}
              {stoneColor && (
                <Disc
                  color={stoneColor}
                  selected={isSelected}
                  removeHighlight={isRemoveTarget}
                  r={discR}
                />
              )}

              {/* Ring um ausgewählte Scheibe */}
              {isSelected && stoneColor && (
                <circle
                  r={discR + 3.5}
                  fill="none"
                  stroke="rgb(251,191,36)"
                  strokeWidth="1.5"
                  className="muehle-pulse"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Gewinner-Overlay */}
      {winner !== null && (
        <div
          id="muehle-winner-overlay"
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
            background: 'rgba(3,7,18,0.78)', borderRadius: '1rem', zIndex: 10,
          }}
        >
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: '1.5rem', color: 'rgb(251,191,36)', letterSpacing: '0.08em', margin: 0 }}>
            {players[winner].name} gewinnt!
          </p>
          <button
            id="muehle-winner-newgame"
            onClick={() => dispatch({ type: 'NEW_GAME' })}
            style={{
              padding: '0.5rem 1.5rem', borderRadius: '8px',
              background: 'rgb(245,158,11)', border: 'none',
              color: 'rgb(3,7,18)', fontFamily: "'Exo 2', sans-serif",
              fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Neu starten
          </button>
        </div>
      )}
    </div>
  );
};

export default Board;
