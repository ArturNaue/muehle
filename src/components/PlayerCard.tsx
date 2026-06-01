// v1.0.0 | 2026-05-31 MEZ

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
  const stops =
    color === 'WHITE'  ? [['0%','#fff'],['45%','#dcdce0'],['100%','#a8a8b0']] :
    color === 'BLACK'  ? [['0%','#6b6b72'],['40%','#28282f'],['100%','#0a0a0d']] :
    /* RED */            [['0%','#f87171'],['40%','#b91c1c'],['100%','#450a0a']];
  const stroke =
    color === 'WHITE' ? '#bbb' : color === 'BLACK' ? '#111' : '#7f1d1d';

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
    ? 'rgb(251,191,36)'
    : isActive && !hasWinner
    ? 'rgb(245,158,11)'
    : 'rgb(31,41,55)';

  const bgColor = isWinner
    ? 'rgba(120,53,15,0.5)'
    : isActive && !hasWinner
    ? 'rgba(120,53,15,0.35)'
    : player.eliminated
    ? 'rgba(17,24,39,0.4)'
    : 'rgba(17,24,39,0.85)';

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
              flex: 1, background: 'rgb(31,41,55)', border: '1px solid rgb(75,85,99)',
              borderRadius: '4px', padding: '2px 4px', color: 'white', outline: 'none', minWidth: 0,
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
            style={{ color: 'rgb(156,163,175)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', whiteSpace: 'nowrap' }}
          >
            {player.name} ✎
          </button>
        )}
      </div>
      {/* Steine in Hand / auf Brett */}
      <div id={`${id}-stones`} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        {player.eliminated ? (
          <span style={{ fontSize: '10px', color: 'rgb(156,163,175)', fontStyle: 'italic' }}>Ausgeschieden</span>
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
