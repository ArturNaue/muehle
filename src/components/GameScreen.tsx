// v1.2.0 | 2026-06-02 MEZ

import React, { useEffect, useReducer, useState } from 'react';
import { gameReducer, makeInitialState } from '../game/reducer';
import { currentSnapshot } from '../game/types';
import Board from './Board';
import { UpdateOverlay } from '../App';
import ThemeToggle from './ThemeToggle';

const titleStyle: React.CSSProperties = {
  fontFamily: "'Exo 2', sans-serif", fontWeight: 900, letterSpacing: '0.12em',
};
const COLORS = {
  appBg: '#f7e1bd',
  text: '#3d2412',
  textStrong: '#3b220f',
  mutedText: '#745033',
  darkUi: '#4c2e17',
  panel: 'rgba(255, 245, 224, 0.84)',
  panelStrong: 'rgba(255, 250, 238, 0.9)',
  yellow: '#f59e0b',
};

interface GameScreenProps {
  initialState: ReturnType<typeof makeInitialState>;
  swUpdating: boolean;
  onNewSetup: () => void;
  theme: 'classic' | 'sand';
  onToggleTheme: () => void;
}

// ─── Setup-Bestätigungs-Modal ────────────────────────────────────────────────

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
        background: 'rgba(76,46,23,0.58)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onStay} // Klick auf Hintergrund = Abbrechen
    >
      <div
        style={{
          background: COLORS.panelStrong,
          border: '1px solid rgba(76,46,23,0.35)',
          borderRadius: '14px',
          padding: '1.75rem 1.5rem',
          maxWidth: '320px', width: '100%',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          boxShadow: '0 25px 50px rgba(61,36,18,0.32)',
        }}
        onClick={e => e.stopPropagation()} // Klick im Kasten nicht weiterleiten
      >
        <p style={{
          fontFamily: "'Exo 2', sans-serif", fontWeight: 700,
          fontSize: '1.0625rem', color: COLORS.textStrong, margin: 0, textAlign: 'center',
        }}>
          Spiel verlassen?
        </p>
        <p style={{
          fontFamily: "'Exo 2', sans-serif", fontWeight: 300,
          fontSize: '0.8125rem', color: COLORS.mutedText, margin: 0, textAlign: 'center',
        }}>
          Der aktuelle Spielstand geht verloren.
        </p>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            id="muehle-menu-confirm-stay"
            onClick={onStay}
            style={{
              flex: 1, padding: '0.625rem',
              background: 'rgba(255,245,224,0.84)',
              border: '1px solid rgba(76,46,23,0.35)',
              borderRadius: '8px', color: COLORS.text,
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
              background: COLORS.darkUi,
              border: `1px solid ${COLORS.darkUi}`,
              borderRadius: '8px', color: '#fffaf0',
              fontFamily: "'Exo 2', sans-serif", fontWeight: 600,
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Zum Setup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GameScreen ───────────────────────────────────────────────────────────────

function GameScreen({ initialState, swUpdating, onNewSetup, theme, onToggleTheme }: GameScreenProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [showMenuConfirm, setShowMenuConfirm] = useState(false);
  const snap = currentSnapshot(state);
  const pc = state.playerCount;
  const is2Player = pc === 2;

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  useEffect(() => {
    const currentPlayer = snap.players[snap.currentPlayerIndex];
    if (!currentPlayer?.isAI || snap.winner !== null || showMenuConfirm) return;
    const timer = window.setTimeout(() => dispatch({ type: 'AI_MOVE' }), 450);
    return () => window.clearTimeout(timer);
  }, [snap, showMenuConfirm]);

  const handleMenuClick = () => {
    // Im Gameover oder wenn noch kein Zug gemacht wurde: direkt zum Setup
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
        >Setup</button>
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
          fontSize: '1.875rem', color: COLORS.textStrong, textTransform: 'uppercase',
          textAlign: 'center', margin: 0,
          transform: flipped ? 'rotate(180deg)' : undefined,
        }}
      >
        Mühle
      </h1>
    );
  };

  const attribution = (flipped: boolean) => {
    const pos = flipped ? 'top' : 'bottom';
    return (
      <a
        id={`muehle-attribution-${pos}`}
        href="https://www.artur.ch" target="_blank" rel="noopener noreferrer"
        style={{
          fontSize: '10px', color: 'rgba(116,80,51,0.6)',
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
      style={{ position: 'relative', background: COLORS.appBg }}
    >
      {swUpdating && <UpdateOverlay />}

      {/* Setup-Bestätigungs-Modal */}
      {showMenuConfirm && (
        <MenuConfirm
          onStay={() => setShowMenuConfirm(false)}
          onLeave={onNewSetup}
        />
      )}

      {/* 2-Spieler: oben gespiegelt */}
      {is2Player && attribution(true)}
      {is2Player && heading(true)}
      {is2Player && <ThemeToggle isSandTheme={theme === 'sand'} onToggle={onToggleTheme} flipped />}
      {is2Player && controls(true)}

      {/* 3-Spieler: normaler Header */}
      {!is2Player && heading(false)}

      {/* Spielfeld */}
      <main id="muehle-main" className="w-full flex justify-center">
        <Board snap={snap} playerCount={pc} boardVariant={state.boardVariant} dispatch={dispatch} />
      </main>

      {/* Steuerung unten */}
      {controls(false)}
      <ThemeToggle isSandTheme={theme === 'sand'} onToggle={onToggleTheme} />
      {is2Player && heading(false)}
      {attribution(false)}
    </div>
  );
}

export default GameScreen;
