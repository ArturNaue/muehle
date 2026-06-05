// v1.0.0 | 2026-06-02 MEZ

import React from 'react';
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
    BLACK: { stops: [['0%','#4a4036'],['42%','#17120d'],['100%','#050302']], stroke: '#050302' },
    BLUE: { stops: [['0%','#93c5fd'],['42%','#2563eb'],['100%','#1e3a8a']], stroke: '#173a9a' },
    RED: { stops: [['0%','#fda4af'],['42%','#f43f5e'],['100%','#9f1239']], stroke: '#9f1239' },
    GREEN: { stops: [['0%','#86efac'],['42%','#22c55e'],['100%','#166534']], stroke: '#15803d' },
    YELLOW: { stops: [['0%','#fde68a'],['42%','#f59e0b'],['100%','#92400e']], stroke: '#92400e' },
    BROWN: { stops: [['0%','#8b5e34'],['42%','#5a351d'],['100%','#2f1a0d']], stroke: '#2f1a0d' },
    PURPLE: { stops: [['0%','#c4b5fd'],['42%','#8b5cf6'],['100%','#6d28d9']], stroke: '#6d28d9' },
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
  id, player, isActive, winnerIndex, playerIndex, flipped = false,
}) => {
  const isWinner = winnerIndex === playerIndex;
  const hasWinner = winnerIndex !== null;

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
        <span
          id={`${id}-name`}
          className="muehle-card-name"
          style={{ color: '#3d2412', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {player.name}
        </span>
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
