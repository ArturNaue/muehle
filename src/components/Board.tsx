// v1.1.0 | 2026-06-02 MEZ

import React, { useMemo, useRef, useState } from 'react';
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

const COLORS = {
  board: '#d99a52',
  boardLine: '#8a5329',
  darkUi: '#4c2e17',
  text: '#3d2412',
  mutedText: '#745033',
  panel: 'rgba(255, 245, 224, 0.84)',
  panelStrong: 'rgba(255, 250, 238, 0.9)',
  yellow: '#f59e0b',
};

const PLAYER_DISC: Record<PlayerColor, { fill: string; stroke: string; shine: number }> = {
  WHITE: { fill: '#f8f1df', stroke: '#bfae8f', shine: 0.62 },
  BLACK: { fill: '#17120d', stroke: '#050302', shine: 0.16 },
  BLUE: { fill: '#2563eb', stroke: '#173a9a', shine: 0.42 },
  RED: { fill: '#f43f5e', stroke: '#9f1239', shine: 0.38 },
  GREEN: { fill: '#22c55e', stroke: '#15803d', shine: 0.42 },
  YELLOW: { fill: '#f59e0b', stroke: '#92400e', shine: 0.5 },
  BROWN: { fill: '#5a351d', stroke: '#2f1a0d', shine: 0.22 },
  PURPLE: { fill: '#8b5cf6', stroke: '#6d28d9', shine: 0.42 },
};

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
  const disc = PLAYER_DISC[color];
  const fill = disc.fill;

  const stroke =
    removeHighlight  ? '#fff5e0' :
    selected         ? COLORS.yellow :
    disc.stroke;

  const strokeWidth = selected || removeHighlight ? 2.5 : 1.5;

  // Kleiner Glanzpunkt oben-links (subtil, kein 3D-Effekt)
  const shineOpacity = disc.shine;

  return (
    <g>
      <circle
        r={DISC_R}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ filter: 'drop-shadow(0 3px 5px rgba(61,36,18,0.45))' }}
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
  const svgRef = useRef<SVGSVGElement>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    from: number;
    color: PlayerColor;
    startClientX: number;
    startClientY: number;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const [drag, setDrag] = useState<{
    from: number;
    color: PlayerColor;
    startClientX: number;
    startClientY: number;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
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

  const getSvgPoint = (clientX: number, clientY: number): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return [point.x, point.y];
  };

  const getDropTarget = (from: number, x: number, y: number): number | null => {
    const targets = canJump
      ? board.map((value, idx) => (value === null ? idx : -1)).filter(idx => idx >= 0)
      : cfg.neighbors[from].filter(idx => board[idx] === null);
    let best: { node: number; distance: number } | null = null;
    for (const node of targets) {
      const [nx, ny] = cfg.nodes[node];
      const distance = Math.hypot(nx - x, ny - y);
      if (!best || distance < best.distance) best = { node, distance };
    }
    return best && best.distance <= HIT_R * 1.75 ? best.node : null;
  };

  const beginDrag = (from: number, color: PlayerColor, clientX: number, clientY: number): boolean => {
    const point = getSvgPoint(clientX, clientY);
    if (!point) return false;
    const nextDrag = {
      from,
      color,
      startClientX: clientX,
      startClientY: clientY,
      x: point[0],
      y: point[1],
      active: false,
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
    return true;
  };

  const updateDrag = (clientX: number, clientY: number): boolean => {
    const currentDrag = dragRef.current;
    if (!currentDrag) return false;
    const point = getSvgPoint(clientX, clientY);
    if (!point) return currentDrag.active;
    const moved = Math.hypot(clientX - currentDrag.startClientX, clientY - currentDrag.startClientY);
    const nextDrag = {
      ...currentDrag,
      x: point[0],
      y: point[1],
      active: currentDrag.active || moved > 5,
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
    return nextDrag.active;
  };

  const finishDrag = (clientX: number, clientY: number): boolean => {
    const currentDrag = dragRef.current;
    if (!currentDrag) return false;
    const point = getSvgPoint(clientX, clientY);
    const target = point ? getDropTarget(currentDrag.from, point[0], point[1]) : null;
    const wasActive = currentDrag.active;

    if (wasActive) {
      suppressClickRef.current = true;
      if (target !== null) {
        if (selectedNode !== currentDrag.from) dispatch({ type: 'CLICK_NODE', node: currentDrag.from });
        dispatch({ type: 'CLICK_NODE', node: target });
      }
    }

    dragRef.current = null;
    setDrag(null);
    return wasActive;
  };

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
            borderColor: currentPlayerIndex === pidx && !winner ? COLORS.yellow : undefined,
            background: currentPlayerIndex === pidx && !winner ? COLORS.darkUi : undefined,
            color: currentPlayerIndex === pidx && !winner ? '#fffaf0' : undefined,
            fontWeight: currentPlayerIndex === pidx && !winner ? 700 : undefined,
            boxShadow: currentPlayerIndex === pidx && !winner ? '0 2px 8px rgba(61,36,18,0.28)' : undefined,
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
      style={{ position: 'relative', background: COLORS.board, borderRadius: '1rem' }}
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
        ref={svgRef}
        id="muehle-board-svg"
        viewBox={svgViewBox}
        className="muehle-board-svg"
        onPointerMove={event => {
          if (updateDrag(event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerUp={event => {
          if (finishDrag(event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDrag(null);
        }}
        onMouseMove={event => {
          if (updateDrag(event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onMouseUp={event => {
          if (finishDrag(event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        style={{ width: '100%', display: 'block', userSelect: 'none', touchAction: 'none' }}
      >
        {/* Board-Linien */}
        {cfg.edges.map(([a, b_], i) => (
          <line
            key={`edge-${i}`}
            x1={cfg.nodes[a][0]} y1={cfg.nodes[a][1]}
            x2={cfg.nodes[b_][0]} y2={cfg.nodes[b_][1]}
            stroke={COLORS.boardLine}
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
              onClick={event => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                dispatch({ type: 'CLICK_NODE', node: idx });
              }}
              onPointerDown={event => {
                if (winner !== null || phase !== 'moving' || stoneColor !== currentColor) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                if (beginDrag(idx, stoneColor, event.clientX, event.clientY)) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onMouseDown={event => {
                if (winner !== null || phase !== 'moving' || stoneColor !== currentColor || dragRef.current) return;
                if (beginDrag(idx, stoneColor, event.clientX, event.clientY)) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              style={{ cursor: winner !== null ? 'default' : 'pointer' }}
            >
              {/* Unsichtbarer grosser Klickbereich */}
              <circle r={HIT_R} fill="transparent" />

              {/* Mulde (leeres Loch) – kleiner als Scheibe */}
              {isEmpty && (
                <circle
                  r={HOLE_R}
                  fill={isMoveTarget ? '#fff5e0' : '#6b3f1f'}
                  stroke={isMoveTarget ? COLORS.yellow : COLORS.darkUi}
                  strokeWidth="1"
                  className={isMoveTarget ? 'muehle-pulse' : ''}
                />
              )}

              {/* Ziel-Punkt bei leerem Move-Target */}
              {isMoveTarget && isEmpty && (
                <circle r={HOLE_R * 0.55} fill="rgba(245,158,11,0.82)" />
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
                  stroke={COLORS.yellow}
                  strokeWidth="1.5"
                  className="muehle-pulse"
                />
              )}
            </g>
          );
        })}
        {drag?.active && (
          <g transform={`translate(${drag.x},${drag.y})`} style={{ pointerEvents: 'none', opacity: 0.82 }}>
            <Disc color={drag.color} selected={false} removeHighlight={false} r={discR} />
          </g>
        )}
      </svg>

      {/* Gewinner-Overlay */}
      {winner !== null && (
        <div
          id="muehle-winner-overlay"
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
            background: 'rgba(76,46,23,0.78)', borderRadius: '1rem', zIndex: 10,
          }}
        >
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: '1.5rem', color: '#fff5e0', letterSpacing: '0.08em', margin: 0 }}>
            {players[winner].name} gewinnt!
          </p>
          <button
            id="muehle-winner-newgame"
            onClick={() => dispatch({ type: 'NEW_GAME' })}
            style={{
              padding: '0.5rem 1.5rem', borderRadius: '8px',
              background: COLORS.yellow, border: 'none',
              color: COLORS.text, fontFamily: "'Exo 2', sans-serif",
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
