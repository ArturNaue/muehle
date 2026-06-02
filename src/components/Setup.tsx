// v1.3.0 | 2026-06-02 MEZ

import React, { useState } from 'react';
import { DEFAULT_NAMES, STONES_BY_VARIANT, BOARD_VARIANT_LABELS, getBoardConfig, getPlayerColors } from '../game/constants';
import { BoardVariant } from '../game/constants';
import { PlayerColor } from '../game/types';

interface SetupProps {
  onStart: (playerCount: 2 | 3, names: string[], boardVariant: BoardVariant, aiPlayers: boolean[]) => void;
}

const titleStyle: React.CSSProperties = {
  fontFamily: "'Exo 2', sans-serif", fontWeight: 900, letterSpacing: '0.12em',
};

const COLORS = {
  appBg: '#f7e1bd',
  board: '#d99a52',
  boardEdge: '#8a5329',
  darkUi: '#4c2e17',
  text: '#3d2412',
  textStrong: '#3b220f',
  mutedText: '#745033',
  panel: 'rgba(255, 245, 224, 0.84)',
  panelStrong: 'rgba(255, 250, 238, 0.9)',
  yellow: '#f59e0b',
};

const PLAYER_DISC: Record<PlayerColor, { bg: string; border: string }> = {
  WHITE: { bg: '#f8f1df', border: '#bfae8f' },
  BLACK: { bg: '#2b2118', border: '#0f0a06' },
  BLUE: { bg: '#2563eb', border: '#173a9a' },
  RED: { bg: '#f43f5e', border: '#9f1239' },
  GREEN: { bg: '#22c55e', border: '#15803d' },
  YELLOW: { bg: '#f59e0b', border: '#92400e' },
};

/** Kleiner Steinkreis (Scheibe) als Farbvorschau */
const DiscPreview: React.FC<{ color: PlayerColor }> = ({ color }) => {
  const { bg, border } = PLAYER_DISC[color];
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
      background: bg, border: `1.5px solid ${border}`,
      boxShadow: '0 2px 4px rgba(61,36,18,0.34)', flexShrink: 0,
    }} />
  );
};

/** Mini-SVG-Vorschau – Form und Linien entsprechen dem echten Spielfeld */
const BoardPreview: React.FC<{ variant: BoardVariant; active: boolean }> = ({ variant, active }) => {
  const lc  = active ? COLORS.darkUi : COLORS.boardEdge;   // Linienfarbe
  const nc  = active ? COLORS.yellow : COLORS.darkUi; // Knotenfarbe
  const bg  = active ? 'rgba(217,154,82,0.72)' : 'rgba(255,245,224,0.58)'; // Hintergrund
  const s   = 58; // SVG-Grösse
  const cfg = getBoardConfig(variant);
  const xs = cfg.nodes.map(([x]) => x);
  const ys = cfg.nodes.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = Math.max(maxX - minX, maxY - minY) * 0.12;

  return (
    <svg width={s} height={s} viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} style={{ display: 'block' }}>
      <rect x={minX - pad} y={minY - pad} width={maxX - minX + pad * 2} height={maxY - minY + pad * 2} rx={pad * 0.22} fill={bg} />
      {cfg.edges.map(([a, b], i) => (
        <line
          key={`edge-${i}`}
          x1={cfg.nodes[a][0]} y1={cfg.nodes[a][1]}
          x2={cfg.nodes[b][0]} y2={cfg.nodes[b][1]}
          stroke={lc}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {cfg.nodes.map(([x, y], i) => (
        <circle key={`node-${i}`} cx={x} cy={y} r="5" fill={nc} />
      ))}
    </svg>
  );
};

// ─── Wiederverwendbarer Varianten-Button ──────────────────────────────────────

interface VBtnProps {
  v: BoardVariant; active: boolean; pc: 2|3;
  onSelect: (v: BoardVariant) => void;
  onStart: (v: BoardVariant) => void;
  wide?: boolean;
}

const VariantButton: React.FC<VBtnProps> = ({ v, active, pc, onSelect, onStart, wide }) => (
  <button
    id={`muehle-setup-variant-${v}`}
    onClick={() => onSelect(v)}
    onDoubleClick={() => onStart(v)}
    style={{
      width: '100%',
      padding: '0.5rem 0.375rem',
      borderRadius: '8px',
      border: active ? `1px solid ${COLORS.yellow}` : '1px solid rgba(76,46,23,0.32)',
      background: active ? 'rgba(245,158,11,0.22)' : COLORS.panelStrong,
      color: active ? COLORS.textStrong : COLORS.text,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: wide ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: wide ? 'center' : undefined,
      gap: wide ? '0.75rem' : '5px',
      transition: 'all 0.15s',
    }}
  >
    <BoardPreview variant={v} active={active} />
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', lineHeight: 1.25, fontFamily: "'Exo 2', sans-serif", fontWeight: active ? 700 : 400 }}>
        {BOARD_VARIANT_LABELS[v]}
      </div>
      <div style={{ fontSize: '0.6rem', color: active ? COLORS.darkUi : COLORS.mutedText, marginTop: '1px' }}>
        {STONES_BY_VARIANT[v][pc]} Scheiben
      </div>
    </div>
  </button>
);

// ─── Setup Screen ─────────────────────────────────────────────────────────────

const Setup: React.FC<SetupProps> = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState<2 | 3>(2);
  const [boardVariant, setBoardVariant] = useState<BoardVariant>('standard');
  const [names, setNames] = useState<string[]>([
    DEFAULT_NAMES.WHITE, DEFAULT_NAMES.BLACK, DEFAULT_NAMES.GREEN,
  ]);
  const [aiByColor, setAiByColor] = useState<Partial<Record<PlayerColor, boolean>>>({});
  const playerColors = getPlayerColors(playerCount);

  const changePlayerCount = (count: 2 | 3) => {
    setPlayerCount(count);
    setNames(getPlayerColors(count).map(color => DEFAULT_NAMES[color]));
  };

  const updateName = (idx: number, value: string) => {
    const updated = [...names];
    updated[idx] = value;
    setNames(updated);
  };

  const toggleAI = (color: PlayerColor) => {
    setAiByColor(prev => ({ ...prev, [color]: !prev[color] }));
  };

  const startGame = (count: 2 | 3 = playerCount, variant: BoardVariant = boardVariant) => {
    const colors = getPlayerColors(count);
    const useCurrentNames = count === playerCount;
    const trimmed = colors.map((color, i) =>
      (useCurrentNames ? names[i]?.trim() : '') || DEFAULT_NAMES[color]
    );
    onStart(count, trimmed, variant, colors.map(color => Boolean(aiByColor[color])));
  };

  const cardStyle = (active: boolean): React.CSSProperties => ({
    background: active ? COLORS.panelStrong : COLORS.panel,
    border: '1px solid rgba(76,46,23,0.28)',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    width: '100%',
    maxWidth: '400px',
  });

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.625rem 0', borderRadius: '8px',
    border: active ? `1px solid ${COLORS.yellow}` : '1px solid rgba(76,46,23,0.32)',
    background: active ? COLORS.darkUi : COLORS.panelStrong,
    color: active ? '#fffaf0' : COLORS.text,
    cursor: 'pointer', fontFamily: "'Exo 2', sans-serif",
    fontWeight: active ? 700 : 400, fontSize: '0.875rem',
    transition: 'all 0.15s',
  });

  return (
    <div id="muehle-setup" style={{
      minHeight: '100vh', background: COLORS.appBg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', gap: '1.25rem',
    }}>
      {/* Titel */}
      <div style={{ textAlign: 'center' }}>
        <h1 id="muehle-setup-title" style={{ ...titleStyle, fontSize: '2.5rem', color: COLORS.textStrong, margin: 0 }}>
          MÜHLE
        </h1>
      </div>

      {/* Spieleranzahl */}
      <div id="muehle-setup-count" style={cardStyle(false)}>
        <p style={{ color: COLORS.mutedText, fontSize: '0.7rem', marginBottom: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Anzahl Spieler
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {([2, 3] as (2|3)[]).map(n => (
            <button key={n} id={`muehle-setup-count-${n}`}
              onClick={() => changePlayerCount(n)} style={btnStyle(playerCount === n)}
              onDoubleClick={() => startGame(n)}
            >
              {n} Spieler
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1rem' }}>
          <p style={{ color: COLORS.mutedText, fontSize: '0.7rem', marginBottom: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Spielernamen
          </p>
          {playerColors.map((color, idx) => (
            <div key={color} id={`muehle-setup-name-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <DiscPreview color={color} />
              <input
                value={names[idx]}
                onChange={e => updateName(idx, e.target.value)}
                maxLength={16}
                placeholder={DEFAULT_NAMES[color]}
                style={{
                  flex: 1, background: COLORS.panelStrong, border: '1px solid rgba(76,46,23,0.35)',
                  borderRadius: '6px', padding: '0.375rem 0.625rem',
                  color: COLORS.text, fontFamily: "'Exo 2', sans-serif", fontSize: '0.875rem', outline: 'none',
                }}
              />
              <button
                id={`muehle-setup-ai-${idx}`}
                onClick={() => toggleAI(color)}
                style={{
                  padding: '0.375rem 0.55rem',
                  minWidth: '42px',
                  borderRadius: '6px',
                  border: aiByColor[color] ? `1px solid ${COLORS.yellow}` : '1px solid rgba(76,46,23,0.35)',
                  background: aiByColor[color] ? COLORS.darkUi : COLORS.panelStrong,
                  color: aiByColor[color] ? '#fffaf0' : COLORS.text,
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: aiByColor[color] ? 700 : 500,
                  cursor: 'pointer',
                }}
                title={aiByColor[color] ? 'KI deaktivieren' : 'KI aktivieren'}
              >
                KI
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Spielfeld-Variante */}
      <div id="muehle-setup-variant" style={cardStyle(false)}>
        <p style={{ color: COLORS.mutedText, fontSize: '0.7rem', marginBottom: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Spielfeld
        </p>
        {/* Einheitliches Raster – alle Varianten gleich gross */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {(['standard', 'sonnenmuhle', 'zwolf', 'morabaraba', 'vollmuhle', 'hexagonal', 'sonne', 'funfeck'] as BoardVariant[]).map(v => (
            <VariantButton key={v} v={v} active={boardVariant === v} pc={playerCount}
              onSelect={setBoardVariant}
              onStart={v => startGame(playerCount, v)}
            />
          ))}
        </div>
      </div>

      {/* Start */}
      <button
        id="muehle-setup-start"
        onClick={() => startGame()}
        style={{
          padding: '0.75rem 2.5rem', borderRadius: '10px',
          background: COLORS.darkUi, border: 'none',
          color: '#fffaf0', fontFamily: "'Exo 2', sans-serif",
          fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em',
          cursor: 'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        SPIEL STARTEN
      </button>

      <a href="https://www.artur.ch" target="_blank" rel="noopener noreferrer"
        style={{ fontSize: '10px', color: 'rgba(116,80,51,0.62)', textDecoration: 'none', fontFamily: "'Exo 2', sans-serif" }}
      >
        © A.N. 05/2026
      </a>
    </div>
  );
};

export default Setup;
