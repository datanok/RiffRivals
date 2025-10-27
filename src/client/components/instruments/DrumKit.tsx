import React, { useEffect, useRef } from 'react';

type DrumType = 'kick' | 'snare' | 'hihat' | 'openhat' | 'tom1' | 'tom2' | 'crash' | 'ride';

type DrumKitProps = {
  onNotePlay: (drum: DrumType, velocity: number) => void;
  isRecording: boolean;
  activeNotes: Set<DrumType>;
  disabled?: boolean;
};

const DRUM_LAYOUT = [
  {
    type: 'crash' as DrumType,
    label: 'CRASH',
    key: 'Q',
    position: { row: 0, col: 0 },
    color: '#ff6b6b',
    icon: '💥',
  },
  {
    type: 'tom1' as DrumType,
    label: 'TOM 1',
    key: 'W',
    position: { row: 0, col: 1 },
    color: '#45b7d1',
    icon: '🥁',
  },
  {
    type: 'tom2' as DrumType,
    label: 'TOM 2',
    key: 'E',
    position: { row: 0, col: 2 },
    color: '#96ceb4',
    icon: '🥁',
  },
  {
    type: 'ride' as DrumType,
    label: 'RIDE',
    key: 'R',
    position: { row: 0, col: 3 },
    color: '#4ecdc4',
    icon: '🔔',
  },
  {
    type: 'hihat' as DrumType,
    label: 'HI-HAT',
    key: 'A',
    position: { row: 1, col: 0 },
    color: '#ff9ff3',
    icon: '🎵',
  },
  {
    type: 'snare' as DrumType,
    label: 'SNARE',
    key: 'S',
    position: { row: 1, col: 1 },
    color: '#feca57',
    icon: '🎯',
  },
  {
    type: 'kick' as DrumType,
    label: 'KICK',
    key: 'D',
    position: { row: 1, col: 2 },
    color: '#5f27cd',
    icon: '💥',
  },
  {
    type: 'openhat' as DrumType,
    label: 'OPEN HAT',
    key: 'F',
    position: { row: 1, col: 3 },
    color: '#54a0ff',
    icon: '🎶',
  },
];

export const DrumKit: React.FC<DrumKitProps> = ({
  onNotePlay,
  isRecording,
  activeNotes,
  disabled = false,
}) => {
  const pressedKeys = useRef(new Set<string>());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      // Prevent repeat triggers
      if (pressedKeys.current.has(key)) return;
      pressedKeys.current.add(key);

      const drum = DRUM_LAYOUT.find((d) => d.key === key);
      if (drum) {
        e.preventDefault();
        onNotePlay(drum.type, 0.8);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      pressedKeys.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onNotePlay]);

  const handleDrumHit = (drumType: DrumType, event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    onNotePlay(drumType, 0.8);
  };

  const getDrumPadStyle = (drum: (typeof DRUM_LAYOUT)[0]) => {
    const isActive = activeNotes?.has(drum.type) || false;

    return {
      padding: '0',
      margin: '0',
      borderRadius: '8px',
      border: '4px solid #000',
      background: isActive ? drum.color : '#2a2a2a',
      color: isActive ? '#000' : '#fff',
      fontSize: '10px',
      fontWeight: 'bold' as const,
      fontFamily: "'Press Start 2P', monospace",
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.1s ease',
      width: '100%',
      aspectRatio: '1',
      textAlign: 'center' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      boxShadow: isActive
        ? `inset 0 4px 0 rgba(0,0,0,0.3), 0 0 20px ${drum.color}`
        : 'inset 0 -4px 0 rgba(0,0,0,0.5), 0 4px 0 #000',
      transform: isActive ? 'translateY(4px)' : 'translateY(0)',
      textShadow: isActive ? '1px 1px 0px rgba(0,0,0,0.5)' : '2px 2px 0px #000',
      position: 'relative' as const,
      overflow: 'hidden',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
    };
  };

  return (
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        border: '4px solid #000',
        boxShadow: '0 8px 0 #000, 0 12px 30px rgba(0,0,0,0.6)',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: '16px',
          textAlign: 'center',
          padding: '12px',
          background: '#000',
          borderRadius: '8px',
          border: '4px solid #444',
          boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '3px 3px 0px #ff6b6b',
            marginBottom: '8px',
          }}
        >
          🥁 BEAT BLASTER
        </div>
        {isRecording && (
          <div
            style={{
              color: '#ff6b6b',
              fontSize: '10px',
              animation: 'pulse 1s infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                background: '#ff6b6b',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'blink 1s infinite',
              }}
            ></span>
            REC
          </div>
        )}
      </div>

      {/* Drum Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {DRUM_LAYOUT.map((drum) => (
          <div
            key={drum.type}
            style={{
              gridRow: drum.position.row + 1,
              gridColumn: drum.position.col + 1,
            }}
          >
            <button
              style={getDrumPadStyle(drum)}
              onMouseDown={(e) => handleDrumHit(drum.type, e)}
              onTouchStart={(e) => handleDrumHit(drum.type, e)}
              disabled={false}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{drum.icon}</span>
              <span style={{ fontSize: '8px', lineHeight: 1.2 }}>{drum.label}</span>
              <div
                style={{
                  marginTop: '4px',
                  padding: '2px 6px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '4px',
                  fontSize: '8px',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {drum.key}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px',
          background: '#000',
          borderRadius: '8px',
          border: '4px solid #444',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: '#4ecdc4',
            fontSize: '8px',
            fontWeight: 'bold',
            textShadow: '1px 1px 0px #000',
            marginBottom: '4px',
          }}
        >
          🎮 TAP PADS OR USE KEYBOARD
        </div>
        <div
          style={{
            color: '#888',
            fontSize: '7px',
            lineHeight: 1.6,
          }}
        >
          QWER / ASDF KEYS
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        button:active {
          transform: translateY(4px) !important;
        }

        @media (max-width: 640px) {
          button {
            font-size: 8px !important;
          }
          button span:first-child {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
