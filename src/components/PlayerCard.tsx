// v1.0.0 | 2026-06-02 MEZ

import React, { useState, useRef } from 'react';
import { PlayerInfo, PlayerColor } from '../game/types';

interface PlayerCardProps {
  id: string;
  player: PlayerInfo;
  isActive: boolean;
  winner: number | null;
  playerIndex: number;
  winnerIndex: number | null;
  onRename: (name: string) => void;
  flipped?: boolean;
}

/** SVG-Kreis als Steinvorschau */
const StonePreview: React.FC<{ color: PlayerColor; size?: number }> = ({ color, size = 14 }) => {
  const gradId = `card-marble-${color.toLowerCase()}`;
  const discs: Record<PlayerColor, { stops: string[][]; stroke: string }> = {
    WHITE: { stops: [['0%','#ffffff'],['46%','#f8f1df'],['100%','#c8b898']], stroke: '#bfae8f' },
    BLACK: { stops: [['0%','#6a5544'],['42%','#2b2118'],['100%','#0f0a06']], stroke: '#0f0a06' },
    BLUE: { stops: [['0%','#93c5fd'],['42%','#2563eb'],['100%','#1e3a8a']], stroke: '#173a9a' },
    RED: { stops: [['0%','#fda4af'],['42%','#f43f5e'],['100%','#9f1239']], stroke: '#9f1239' },
    GREEN: { stops: [['0%','#86efac'],['42%','#22c55e'],['100%','#166534']], stroke: '#15803d' },
    YELLOW: { stops: [['0%','#fde68a'],['42%','#f59e0b'],['100%','#92400e']], stroke: '#92400e' },
  };
  const { stops, stroke } = discs[color];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="60%">
          {stops.map(([offset, stopColor]) => (
            <stop key={offset} offset={offset} stopColor={stopColor} />
          ))}
        </radialGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={size/2 - 1} fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1" />
    </svg>
  );
};

const PlayerCard: React.FC<PlayerCardProps> = ({
  id, player, isActive, winnerIndex, playerIndex, onRename, flipped = false,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWinner = winnerIndex === playerIndex;
  const hasWinner = winnerIndex !== null;

  const startEdit = () => {
    setDraft(player.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    setEditing(false);
  };

  const borderColor = isWinner
    ? '#f59e0b'
    : isActive && !hasWinner
    ? '#f59e0b'
    : 'rgba(76,46,23,0.32)';

  const bgColor = isWinner
    ? 'rgba(245,158,11,0.25)'
    : isActive && !hasWinner
    ? 'rgba(255,245,224,0.92)'
    : player.eliminated
    ? 'rgba(255,245,224,0.45)'
    : 'rgba(255,250,238,0.9)';

  return (
    <div
      id={id}
      className="muehle-player-card"
      style={{
        transform: flipped ? 'rotate(180deg)' : undefined,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        backdropFilter: 'blur(4px)',
        transition: 'border-color 0.15s, background 0.15s',
        flexShrink: 0,
        opacity: player.eliminated ? 0.45 : 1,
      }}
    >
      <div id={`${id}-header`} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        <StonePreview color={player.color} size={14} />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            id={`${id}-name-input`}
            className="muehle-card-name"
            style={{
              flex: 1, background: 'rgba(255,250,238,0.95)', border: '1px solid rgba(76,46,23,0.38)',
              borderRadius: '4px', padding: '2px 4px', color: '#3d2412', outline: 'none', minWidth: 0,
            }}
            maxLength={16}
            autoFocus
          />
        ) : (
          <button
            id={`${id}-name-btn`}
            onClick={startEdit}
            title="Namen bearbeiten"
            className="muehle-card-name"
            style={{ color: '#3d2412', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', whiteSpace: 'nowrap' }}
          >
            {player.name} ✎
          </button>
        )}
      </div>
      {/* Steine in Hand / auf Brett */}
      <div id={`${id}-stones`} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        {player.eliminated ? (
          <span style={{ fontSize: '10px', color: '#745033', fontStyle: 'italic' }}>Ausgeschieden</span>
        ) : (
          <>
            <span className="muehle-card-hand" title="Steine noch in der Hand">
              ✋{player.stonesInHand}
            </span>
            <span className="muehle-card-board" title="Steine auf dem Feld">
              ●{player.stonesOnBoard}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
