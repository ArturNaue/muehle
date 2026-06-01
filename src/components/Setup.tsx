// v1.3.0 | 2026-05-31 MEZ

import React, { useState } from 'react';
import { DEFAULT_NAMES, PLAYER_COLORS, STONES_BY_VARIANT, BOARD_VARIANT_LABELS, BOARD_VARIANT_DESC } from '../game/constants';
import { BoardVariant } from '../game/constants';
import { PlayerColor } from '../game/types';

interface SetupProps {
  onStart: (playerCount: 2 | 3, names: string[], boardVariant: BoardVariant) => void;
}

const titleStyle: React.CSSProperties = {
  fontFamily: "'Exo 2', sans-serif", fontWeight: 900, letterSpacing: '0.12em',
};

/** Kleiner Steinkreis (Scheibe) als Farbvorschau */
const DiscPreview: React.FC<{ color: PlayerColor }> = ({ color }) => {
  const bg =
    color === 'WHITE' ? 'rgb(230,230,220)' :
    color === 'BLACK' ? 'rgb(28,28,33)'    :
    'rgb(176,22,22)';
  const border =
    color === 'WHITE' ? 'rgb(170,170,160)' :
    color === 'BLACK' ? 'rgb(65,65,72)'    :
    'rgb(120,10,10)';
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
      background: bg, border: `1.5px solid ${border}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.5)', flexShrink: 0,
    }} />
  );
};

/** Mini-SVG-Vorschau – Form und Linien entsprechen dem echten Spielfeld */
const BoardPreview: React.FC<{ variant: BoardVariant; active: boolean }> = ({ variant, active }) => {
  const lc  = active ? 'rgb(200,155,60)'  : 'rgb(80,95,115)';   // Linienfarbe
  const nc  = active ? 'rgb(240,195,80)'  : 'rgb(110,130,150)'; // Knotenfarbe
  const bg  = active ? 'rgba(60,45,15,0.5)' : 'rgba(30,38,52,0.7)'; // Hintergrund
  const s   = 58; // SVG-Grösse

  // ── Quadratisches Brett (Standard, Sonnenmühle, Zwölf-Mann, Morabaraba) ──────
  if (variant !== 'hexagonal') {
    const hasSonneDiag   = variant === 'sonnenmuhle' || variant === 'vollmuhle';
    const hasMorabaDiag  = variant === 'morabaraba'  || variant === 'vollmuhle';
    const strokeW = 0.48;

    // Eck-Diagonalen (Sonnenmühle): [0,8,16] usw.
    const sonneDiag: [number,number,number,number][] = [
      [-6,-6, -4,-4], [-4,-4, -2,-2],
      [ 6,-6,  4,-4], [ 4,-4,  2,-2],
      [-6, 6, -4, 4], [-4, 4, -2, 2],
      [ 6, 6,  4, 4], [ 4, 4,  2, 2],
    ];
    // X-Diagonalen (Morabaraba): Mittelpunkt→Ecken nächster Ring
    const morabaDiag: [number,number,number,number][] = [
      [0,-6,-4,-4],[0,-6, 4,-4], [6,0, 4,-4],[6,0, 4,4],
      [0, 6,-4, 4],[0, 6, 4, 4],[-6,0,-4,-4],[-6,0,-4,4],
      [0,-4,-2,-2],[0,-4, 2,-2], [4,0, 2,-2],[4,0, 2,2],
      [0, 4,-2, 2],[0, 4, 2, 2],[-4,0,-2,-2],[-4,0,-2,2],
    ];

    const squareNodes = [
      [-6,-6],[0,-6],[6,-6], [-6,0],[6,0], [-6,6],[0,6],[6,6],
      [-4,-4],[0,-4],[4,-4], [-4,0],[4,0], [-4,4],[0,4],[4,4],
      [-2,-2],[0,-2],[2,-2], [-2,0],[2,0], [-2,2],[0,2],[2,2],
    ];

    return (
      <svg width={s} height={s} viewBox="-7.5 -7.5 15 15" style={{ display: 'block' }}>
        <rect x="-7.5" y="-7.5" width="15" height="15" rx="1.5" fill={bg} />
        {/* Ringe */}
        <rect x="-6" y="-6" width="12" height="12" fill="none" stroke={lc} strokeWidth={strokeW} />
        <rect x="-4" y="-4" width="8"  height="8"  fill="none" stroke={lc} strokeWidth={strokeW} />
        <rect x="-2" y="-2" width="4"  height="4"  fill="none" stroke={lc} strokeWidth={strokeW} />
        {/* Kreuzverbindungen */}
        <line x1="0" y1="-6" x2="0" y2="-2" stroke={lc} strokeWidth={strokeW}/>
        <line x1="0" y1="2"  x2="0" y2="6"  stroke={lc} strokeWidth={strokeW}/>
        <line x1="-6" y1="0" x2="-2" y2="0" stroke={lc} strokeWidth={strokeW}/>
        <line x1="2"  y1="0" x2="6"  y2="0" stroke={lc} strokeWidth={strokeW}/>
        {/* Eck-Diagonalen (Sonnenmühle) */}
        {hasSonneDiag && sonneDiag.map(([x1,y1,x2,y2],i) =>
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={lc} strokeWidth={strokeW}/>
        )}
        {/* X-Diagonalen (Morabaraba) */}
        {hasMorabaDiag && morabaDiag.map(([x1,y1,x2,y2],i) =>
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={lc} strokeWidth="0.38"/>
        )}
        {/* Knoten */}
        {squareNodes.map(([x,y],i) =>
          <circle key={i} cx={x} cy={y} r="0.72" fill={nc}/>
        )}
      </svg>
    );
  }

  // ── Hexagonales Brett (36 Knoten: 12 pro Ring) ───────────────────────────────
  // Ecke bei geradem k (Radius R), Seitenmittelpunkt bei ungeradem k (Radius R·√3/2)
  function hp(R: number, k: number): [number,number] {
    const r = k % 2 === 0 ? R : R * Math.sqrt(3) / 2;
    const a = k * Math.PI / 6;
    return [+(r * Math.sin(a)).toFixed(2), -(r * Math.cos(a)).toFixed(2)];
  }
  const hexR = [6.0, 4.0, 2.0]; // Umkreisradien der 3 Ringe (in viewBox-Einheiten)
  const hexNodes = hexR.flatMap(r => Array.from({length:12},(_,k) => hp(r,k)));

  const hexPoly = (R: number) =>
    Array.from({length:12},(_,k) => hp(R,k)).map(([x,y])=>`${x},${y}`).join(' ');

  return (
    <svg width={s} height={s} viewBox="-7.5 -7.5 15 15" style={{ display: 'block' }}>
      {/* Kreisförmiger Hintergrund */}
      <circle cx="0" cy="0" r="7.2" fill={bg} />
      {/* 3 Sechseck-Ringe (12-Eck als Polygon) */}
      {hexR.map((r,i) => (
        <polygon key={i} points={hexPoly(r)} fill="none" stroke={lc} strokeWidth="0.45"/>
      ))}
      {/* Alle 12 Speichen (radial durch alle 3 Ringe) */}
      {Array.from({length:12},(_,k) => {
        const [ox,oy] = hp(hexR[0],k);
        const [ix,iy] = hp(hexR[2],k);
        return <line key={k} x1={ox} y1={oy} x2={ix} y2={iy} stroke={lc} strokeWidth="0.45"/>;
      })}
      {/* Alle 36 Knoten */}
      {hexNodes.map(([x,y],i) =>
        <circle key={i} cx={x} cy={y} r="0.65" fill={nc}/>
      )}
    </svg>
  );
};

// ─── Wiederverwendbarer Varianten-Button ──────────────────────────────────────

interface VBtnProps {
  v: BoardVariant; active: boolean; pc: 2|3;
  onSelect: (v: BoardVariant) => void; wide?: boolean;
}

const VariantButton: React.FC<VBtnProps> = ({ v, active, pc, onSelect, wide }) => (
  <button
    id={`muehle-setup-variant-${v}`}
    onClick={() => onSelect(v)}
    style={{
      width: '100%',
      padding: '0.5rem 0.375rem',
      borderRadius: '8px',
      border: active ? '1px solid rgb(245,158,11)' : '1px solid rgb(55,65,81)',
      background: active ? 'rgba(120,53,15,0.4)' : 'rgb(31,41,55)',
      color: active ? 'rgb(251,191,36)' : 'rgb(209,213,219)',
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
      <div style={{ fontSize: '0.6rem', color: active ? 'rgba(251,191,36,0.7)' : 'rgb(107,114,128)', marginTop: '1px' }}>
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
    DEFAULT_NAMES.WHITE, DEFAULT_NAMES.BLACK, DEFAULT_NAMES.RED,
  ]);

  const updateName = (idx: number, value: string) => {
    const updated = [...names];
    updated[idx] = value;
    setNames(updated);
  };

  const handleStart = () => {
    const trimmed = names.slice(0, playerCount).map((n, i) =>
      n.trim() || DEFAULT_NAMES[PLAYER_COLORS[i]]
    );
    onStart(playerCount, trimmed, boardVariant);
  };

  const cardStyle = (active: boolean): React.CSSProperties => ({
    background: 'rgba(17,24,39,0.85)',
    border: `1px solid ${active ? 'rgb(31,41,55)' : 'rgb(31,41,55)'}`,
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    width: '100%',
    maxWidth: '400px',
  });

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.625rem 0', borderRadius: '8px',
    border: active ? '1px solid rgb(245,158,11)' : '1px solid rgb(55,65,81)',
    background: active ? 'rgba(120,53,15,0.4)' : 'rgb(31,41,55)',
    color: active ? 'rgb(251,191,36)' : 'rgb(209,213,219)',
    cursor: 'pointer', fontFamily: "'Exo 2', sans-serif",
    fontWeight: active ? 700 : 400, fontSize: '0.875rem',
    transition: 'all 0.15s',
  });

  return (
    <div id="muehle-setup" style={{
      minHeight: '100vh', background: 'rgb(3,7,18)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', gap: '1.25rem',
    }}>
      {/* Titel */}
      <div style={{ textAlign: 'center' }}>
        <h1 id="muehle-setup-title" style={{ ...titleStyle, fontSize: '2.5rem', color: 'white', margin: 0 }}>
          MÜHLE
        </h1>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 300, color: 'rgb(107,114,128)', marginTop: '0.25rem' }}>
          Klassisches Brettspiel · Offline PWA
        </p>
      </div>

      {/* Spieleranzahl */}
      <div id="muehle-setup-count" style={cardStyle(false)}>
        <p style={{ color: 'rgb(156,163,175)', fontSize: '0.7rem', marginBottom: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Anzahl Spieler
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {([2, 3] as (2|3)[]).map(n => (
            <button key={n} id={`muehle-setup-count-${n}`}
              onClick={() => setPlayerCount(n)} style={btnStyle(playerCount === n)}
            >
              {n} Spieler
            </button>
          ))}
        </div>
        <p style={{ color: 'rgb(75,85,99)', fontSize: '0.68rem', marginTop: '0.5rem' }}>
          {playerCount === 2
            ? `Je ${STONES_BY_VARIANT[boardVariant][2]} Scheiben – klassische Mühle`
            : `Je ${STONES_BY_VARIANT[boardVariant][3]} Scheiben – letzter Spieler gewinnt`}
        </p>
      </div>

      {/* Spielfeld-Variante */}
      <div id="muehle-setup-variant" style={cardStyle(false)}>
        <p style={{ color: 'rgb(156,163,175)', fontSize: '0.7rem', marginBottom: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Spielfeld
        </p>
        {/* Einheitliches 2×3 Raster – alle 6 Varianten gleich gross */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {(['standard', 'sonnenmuhle', 'zwolf', 'morabaraba', 'vollmuhle', 'hexagonal'] as BoardVariant[]).map(v => (
            <VariantButton key={v} v={v} active={boardVariant === v} pc={playerCount}
              onSelect={setBoardVariant} />
          ))}
        </div>
        <p style={{ color: 'rgb(75,85,99)', fontSize: '0.68rem', marginTop: '0.5rem' }}>
          {BOARD_VARIANT_DESC[boardVariant]}
        </p>
      </div>

      {/* Spielernamen */}
      <div id="muehle-setup-names" style={{ ...cardStyle(false), display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <p style={{ color: 'rgb(156,163,175)', fontSize: '0.7rem', marginBottom: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Spielernamen
        </p>
        {PLAYER_COLORS.slice(0, playerCount).map((color, idx) => (
          <div key={color} id={`muehle-setup-name-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <DiscPreview color={color} />
            <input
              value={names[idx]}
              onChange={e => updateName(idx, e.target.value)}
              maxLength={16}
              placeholder={DEFAULT_NAMES[color]}
              style={{
                flex: 1, background: 'rgb(31,41,55)', border: '1px solid rgb(55,65,81)',
                borderRadius: '6px', padding: '0.375rem 0.625rem',
                color: 'white', fontFamily: "'Exo 2', sans-serif", fontSize: '0.875rem', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Start */}
      <button
        id="muehle-setup-start"
        onClick={handleStart}
        style={{
          padding: '0.75rem 2.5rem', borderRadius: '10px',
          background: 'rgb(245,158,11)', border: 'none',
          color: 'rgb(3,7,18)', fontFamily: "'Exo 2', sans-serif",
          fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em',
          cursor: 'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        SPIEL STARTEN
      </button>

      <a href="https://www.artur.ch" target="_blank" rel="noopener noreferrer"
        style={{ fontSize: '10px', color: 'rgba(156,163,175,0.4)', textDecoration: 'none', fontFamily: "'Exo 2', sans-serif" }}
      >
        © A.N. 05/2026
      </a>
    </div>
  );
};

export default Setup;
