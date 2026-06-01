// v1.2.0 | 2026-05-31 MEZ

import React, { useState, useEffect } from 'react';
import { makeInitialState } from './game/reducer';
import { PLAYER_COLORS, BoardVariant } from './game/constants';
import GameScreen from './components/GameScreen';
import Setup from './components/Setup';

function App() {
  // gameKey: jedes neue Spiel bekommt einen einzigartigen Key → GameScreen wird
  // immer neu gemountet → useReducer startet mit dem RICHTIGEN initialState
  const [gameKey, setGameKey] = useState(0);
  const [initialGameState, setInitialGameState] = useState<ReturnType<typeof makeInitialState> | null>(null);
  const [swUpdating, setSwUpdating] = useState(false);

  useEffect(() => {
    const handler = () => setSwUpdating(true);
    window.addEventListener('sw-update-start', handler);
    return () => window.removeEventListener('sw-update-start', handler);
  }, []);

  const handleStart = (count: 2 | 3, names: string[], boardVariant: BoardVariant) => {
    const s = makeInitialState(count, boardVariant);
    PLAYER_COLORS.slice(0, count).forEach((_, i) => {
      if (names[i]) s.history[0].players[i].name = names[i];
    });
    setInitialGameState(s);
    setGameKey(k => k + 1); // immer inkrementieren → garantiertes Remount
  };

  if (!initialGameState) {
    return (
      <>
        {swUpdating && <UpdateOverlay />}
        <Setup onStart={handleStart} />
      </>
    );
  }

  return (
    <GameScreen
      key={gameKey}                         // ← Fix: Counter statt Spielernamen
      initialState={initialGameState}
      swUpdating={swUpdating}
      onNewSetup={() => setInitialGameState(null)}
    />
  );
}

// ─── Update Overlay ───────────────────────────────────────────────────────────

export function UpdateOverlay() {
  return (
    <div
      id="muehle-update-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(3,7,18,0.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px',
      }}
    >
      <div style={{
        width: '48px', height: '48px',
        border: '4px solid rgba(245,158,11,0.2)',
        borderTopColor: 'rgb(245,158,11)',
        borderRadius: '50%',
        animation: 'muehle-spin 0.8s linear infinite',
      }} />
      <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: '16px', color: 'rgb(245,158,11)', letterSpacing: '0.05em' }}>
        Neue Version wird geladen…
      </p>
      <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 300, fontSize: '13px', color: 'rgba(156,163,175,0.7)' }}>
        Die App startet automatisch neu.
      </p>
    </div>
  );
}

export default App;
