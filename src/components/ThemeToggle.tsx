import React from 'react';

interface ThemeToggleProps {
  isSandTheme: boolean;
  onToggle: () => void;
  flipped?: boolean;
  idPrefix?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isSandTheme, onToggle, flipped = false, idPrefix = 'muehle-theme' }) => {
  const pos = flipped ? 'top' : 'bottom';
  return (
    <div
      id={`${idPrefix}-${pos}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        border: '1px solid rgba(138,83,41,0.45)',
        background: isSandTheme ? 'rgba(255,250,238,0.9)' : 'rgba(31,41,55,0.92)',
        color: isSandTheme ? '#3b220f' : '#f8fafc',
        borderRadius: '9999px',
        padding: '3px 6px 3px 9px',
        fontFamily: "'Exo 2', sans-serif",
        transform: flipped ? 'rotate(180deg)' : undefined,
      }}
    >
      <span style={{ fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Grau</span>
      <button
        id={`${idPrefix}-switch-${pos}`}
        type="button"
        role="switch"
        aria-checked={isSandTheme}
        aria-label="Farbschema Sand umschalten"
        onClick={onToggle}
        style={{
          width: 34,
          height: 20,
          border: '1px solid rgba(138,83,41,0.45)',
          borderRadius: 9999,
          background: isSandTheme ? '#4c2e17' : '#1f2937',
          padding: 2,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'block',
            width: 14,
            height: 14,
            borderRadius: 9999,
            background: isSandTheme ? '#f59e0b' : '#f8fafc',
            transform: isSandTheme ? 'translateX(14px)' : 'translateX(0)',
            transition: 'transform 0.15s, background 0.15s',
          }}
        />
      </button>
      <span style={{ fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Sand</span>
    </div>
  );
};

export default ThemeToggle;
