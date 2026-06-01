// v1.2.0 | 2026-05-31 MEZ

import React, { useReducer, useState } from 'react';
import { gameReducer, makeInitialState } from '../game/reducer';
import { currentSnapshot } from '../game/types';
import { BOARD_VARIANT_LABELS } from '../game/constants';
import Board from './Board';
import { UpdateOverlay } from '../App';

const titleStyle: React.CSSProperties = {
  fontFamily: "'Exo 2', sans-serif", fontWeight: 900, letterSpacing: '0.12em',
};
const subtitleStyle: React.CSSProperties = {
  fontFamily: "'Exo 2', sans-serif", fontWeight: 300,
};

interface GameScreenProps {
  initialState: ReturnType<typeof makeInitialState>;
  swUpdating: boolean;
  onNewSetup: () => void;
}

// ─── Menü-Bestätigungs-Modal ─────────────────────────────────────────────────

interface MenuConfirmProps {
  onStay: () => void;
  onLeave: () => void;
}

function MenuConfirm({ onStay, onLeave }: MenuConfirmProps) {
  return (
    <div
      id="muehle-menu-confirm"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(3,7,18,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onStay} // Klick auf Hintergrund = Abbrechen
    >
      <div
        style={{
          background: 'rgb(17,24,39)',
          border: '1px solid rgb(55,65,81)',
          borderRadius: '14px',
          padding: '1.75rem 1.5rem',
          maxWidth: '320px', width: '100%',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()} // Klick im Kasten nicht weiterleiten
      >
        <p style={{
          fontFamily: "'Exo 2', sans-serif", fontWeight: 700,
          fontSize: '1.0625rem', color: 'white', margin: 0, textAlign: 'center',
        }}>
          Spiel verlassen?
        </p>
        <p style={{
          fontFamily: "'Exo 2', sans-serif", fontWeight: 300,
          fontSize: '0.8125rem', color: 'rgb(156,163,175)', margin: 0, textAlign: 'center',
        }}>
          Der aktuelle Spielstand geht verloren.
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            id="muehle-menu-confirm-stay"
            onClick={onStay}
            style={{
              flex: 1, padding: '0.625rem',
              background: 'rgb(31,41,55)',
              border: '1px solid rgb(55,65,81)',
              borderRadius: '8px', color: 'rgb(209,213,219)',
              fontFamily: "'Exo 2', sans-serif", fontWeight: 600,
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            ← Weiterspielen
          </button>
          <button
            id="muehle-menu-confirm-leave"
            onClick={onLeave}
            style={{
              flex: 1, padding: '0.625rem',
              background: 'rgba(185,28,28,0.3)',
              border: '1px solid rgb(127,29,29)',
              borderRadius: '8px', color: 'rgb(252,165,165)',
              fontFamily: "'Exo 2', sans-serif", fontWeight: 600,
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Zum Menü
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GameScreen ───────────────────────────────────────────────────────────────

function GameScreen({ initialState, swUpdating, onNewSetup }: GameScreenProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [showMenuConfirm, setShowMenuConfirm] = useState(false);
  const snap = currentSnapshot(state);
  const pc = state.playerCount;
  const is2Player = pc === 2;

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const handleMenuClick = () => {
    // Im Gameover oder wenn noch kein Zug gemacht wurde: direkt zum Menü
    if (snap.winner !== null || state.historyIndex === 0) {
      onNewSetup();
    } else {
      setShowMenuConfirm(true);
    }
  };

  const controls = (flipped: boolean) => {
    const pos = flipped ? 'top' : 'bottom';
    return (
      <div
        id={`muehle-controls-${pos}`}
        className="flex gap-2"
        style={{ transform: flipped ? 'rotate(180deg)' : undefined }}
      >
        <button
          id={`muehle-btn-undo-${pos}`}
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          className="muehle-ctrl-btn"
        >← Undo</button>
        <button
          id={`muehle-btn-redo-${pos}`}
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={!canRedo}
          className="muehle-ctrl-btn"
        >Redo →</button>
        <button
          id={`muehle-btn-new-${pos}`}
          onClick={() => dispatch({ type: 'NEW_GAME' })}
          className="muehle-ctrl-btn"
        >Neu</button>
        <button
          id={`muehle-btn-setup-${pos}`}
          onClick={handleMenuClick}
          className="muehle-ctrl-btn"
        >Menü</button>
      </div>
    );
  };

  const heading = (flipped: boolean) => {
    const pos = flipped ? 'top' : 'bottom';
    return (
      <h1
        id={`muehle-heading-${pos}`}
        style={{
          ...titleStyle,
          fontSize: '1.875rem', color: 'white', textTransform: 'uppercase',
          textAlign: 'center', margin: 0,
          transform: flipped ? 'rotate(180deg)' : undefined,
        }}
      >
        Mühle
      </h1>
    );
  };

  const subtitle = (flipped: boolean) => {
    const pos = flipped ? 'top' : 'bottom';
    return (
      <p
        id={`muehle-subtitle-${pos}`}
        style={{
          ...subtitleStyle,
          color: 'rgb(107,114,128)', fontSize: '0.8125rem',
          textAlign: 'center', margin: 0,
          transform: flipped ? 'rotate(180deg)' : undefined,
        }}
      >
        {pc}-Spieler · {BOARD_VARIANT_LABELS[state.boardVariant]}
      </p>
    );
  };

  const attribution = (flipped: boolean) => {
    const pos = flipped ? 'top' : 'bottom';
    return (
      <a
        id={`muehle-attribution-${pos}`}
        href="https://www.artur.ch" target="_blank" rel="noopener noreferrer"
        style={{
          fontSize: '10px', color: 'rgba(156,163,175,0.5)',
          textDecoration: 'none', fontFamily: "'Exo 2', sans-serif",
          transform: flipped ? 'rotate(180deg)' : undefined,
          display: 'block', textAlign: 'center',
        }}
      >
        © A.N. 05/2026
      </a>
    );
  };

  return (
    <div
      id="muehle-app-root"
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 gap-4"
      style={{ position: 'relative' }}
    >
      {swUpdating && <UpdateOverlay />}

      {/* Menü-Bestätigungs-Modal */}
      {showMenuConfirm && (
        <MenuConfirm
          onStay={() => setShowMenuConfirm(false)}
          onLeave={onNewSetup}
        />
      )}

      {/* 2-Spieler: oben gespiegelt */}
      {is2Player && attribution(true)}
      {is2Player && subtitle(true)}
      {is2Player && heading(true)}
      {is2Player && controls(true)}

      {/* 3-Spieler: normaler Header */}
      {!is2Player && heading(false)}
      {!is2Player && subtitle(false)}

      {/* Spielfeld */}
      <main id="muehle-main" className="w-full flex justify-center">
        <Board snap={snap} playerCount={pc} boardVariant={state.boardVariant} dispatch={dispatch} />
      </main>

      {/* Steuerung unten */}
      {controls(false)}
      {is2Player && heading(false)}
      {is2Player && subtitle(false)}
      {attribution(false)}
    </div>
  );
}

export default GameScreen;
