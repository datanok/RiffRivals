import React, { useState, useEffect, useRef } from 'react';

type BassString = 'G' | 'D' | 'A' | 'E';

type BassProps = {
  onNotePlay: (string: BassString, fret: number) => void;
  isRecording: boolean;
  selectedFret: number;
  activeNotes: Set<string>;
  disabled?: boolean;
};

const BASS_STRINGS: BassString[] = ['G', 'D', 'A', 'E']; // High to low

const STRING_CONFIG = [
  { string: 'G' as BassString, key: '1', color: '#ff6b6b', icon: '━' },
  { string: 'D' as BassString, key: '2', color: '#4ecdc4', icon: '━' },
  { string: 'A' as BassString, key: '3', color: '#feca57', icon: '━' },
  { string: 'E' as BassString, key: '4', color: '#5f27cd', icon: '━' },
];

const STRING_NOTES = {
  'E': ['E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2'],
  'A': ['A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2'],
  'D': ['D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3'],
  'G': ['G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3'],
};

export const Bass: React.FC<BassProps> = ({
  onNotePlay,
  isRecording,
  selectedFret: initialSelectedFret,
  activeNotes,
  disabled = false,
}) => {
  const [selectedFret, setSelectedFret] = useState(initialSelectedFret);
  const pressedKeys = useRef(new Set<string>());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard events when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      if (pressedKeys.current.has(key)) return;
      pressedKeys.current.add(key);

      // String keys (1-4)
      const stringConfig = STRING_CONFIG.find((s) => s.key === key);
      if (stringConfig) {
        e.preventDefault();
        onNotePlay(stringConfig.string, selectedFret);
      }

      // Fret selection (Q/W for -1/+1, A/S for -5/+5)
      if (key === 'Q' && selectedFret > 0) {
        setSelectedFret((f) => Math.max(0, f - 1));
      } else if (key === 'W' && selectedFret < 12) {
        setSelectedFret((f) => Math.min(12, f + 1));
      } else if (key === 'A' && selectedFret > 0) {
        setSelectedFret((f) => Math.max(0, f - 5));
      } else if (key === 'S' && selectedFret < 12) {
        setSelectedFret((f) => Math.min(12, f + 5));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.key.toUpperCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedFret, onNotePlay]);

  const handleStringPlay = (bassString: BassString) => {
    onNotePlay(bassString, selectedFret);
  };

  const handleFretSelect = (fret: number) => {
    setSelectedFret(fret);
  };

  const getStringStyle = (config: (typeof STRING_CONFIG)[0]) => {
    const note = STRING_NOTES[config.string][selectedFret];
    const isActive = note ? activeNotes?.has(note) || false : false;

    return {
      width: '100%',
      height: '60px',
      background: isActive ? config.color : '#2a2a2a',
      border: '4px solid #000',
      borderRadius: '8px',
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.1s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      margin: '8px 0',
      color: isActive ? '#000' : '#fff',
      fontSize: '10px',
      fontWeight: 'bold' as const,
      fontFamily: "'Press Start 2P', monospace",
      boxShadow: isActive
        ? `inset 0 4px 0 rgba(0,0,0,0.3), 0 0 20px ${config.color}`
        : 'inset 0 -4px 0 rgba(0,0,0,0.5)',
      transform: isActive ? 'translateY(4px)' : 'translateY(0)',
      textShadow: isActive ? '1px 1px 0px rgba(0,0,0,0.5)' : '2px 2px 0px #000',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
    };
  };

  const getFretStyle = (fret: number) => {
    const isSelected = fret === selectedFret;
    const isFretMarker = [3, 5, 7, 9, 12].includes(fret);

    return {
      width: '100%',
      aspectRatio: '1',
      minWidth: '35px',
      background: isSelected ? '#feca57' : isFretMarker ? '#444' : '#2a2a2a',
      border: '4px solid #000',
      borderRadius: '8px',
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.1s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isSelected ? '#000' : '#fff',
      fontSize: '10px',
      fontWeight: 'bold' as const,
      fontFamily: "'Press Start 2P', monospace",
      boxShadow: isSelected
        ? 'inset 0 4px 0 rgba(0,0,0,0.3), 0 0 20px #feca57'
        : 'inset 0 -4px 0 rgba(0,0,0,0.5)',
      transform: isSelected ? 'translateY(4px)' : 'translateY(0)',
      textShadow: isSelected ? '1px 1px 0px rgba(0,0,0,0.5)' : '2px 2px 0px #000',
      WebkitTapHighlightColor: 'transparent',
      position: 'relative' as const,
    };
  };

  return (
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '700px',
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
            textShadow: '3px 3px 0px #5f27cd',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          🎸 BASS BLAST
          {isRecording && (
            <span
              style={{
                marginLeft: '12px',
                color: '#ff6b6b',
                fontSize: '10px',
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
                  marginRight: '6px',
                }}
              ></span>
              REC
            </span>
          )}
        </div>

        {/* Fret Display */}
        <div
          style={{
            padding: '8px 16px',
            background: '#2a2a2a',
            border: '4px solid #444',
            borderRadius: '8px',
            color: '#feca57',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          FRET: {selectedFret}
        </div>
      </div>

      {/* Fret Selector */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          background: '#000',
          borderRadius: '8px',
          border: '4px solid #444',
        }}
      >
        <div
          style={{
            color: '#888',
            fontSize: '8px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          SELECT FRET POSITION
        </div>

        {/* Quick controls */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setSelectedFret((f) => Math.max(0, f - 5))}
            disabled={selectedFret === 0}
            style={{
              padding: '8px 12px',
              background: selectedFret === 0 ? '#333' : '#4ecdc4',
              color: selectedFret === 0 ? '#666' : '#000',
              border: '4px solid #000',
              borderRadius: '8px',
              cursor: selectedFret === 0 ? 'not-allowed' : 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: selectedFret === 0 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
            }}
          >
            A ◀◀
          </button>

          <button
            onClick={() => setSelectedFret((f) => Math.max(0, f - 1))}
            disabled={selectedFret === 0}
            style={{
              padding: '8px 12px',
              background: selectedFret === 0 ? '#333' : '#4ecdc4',
              color: selectedFret === 0 ? '#666' : '#000',
              border: '4px solid #000',
              borderRadius: '8px',
              cursor: selectedFret === 0 ? 'not-allowed' : 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: selectedFret === 0 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
            }}
          >
            Q ◀
          </button>

          <button
            onClick={() => setSelectedFret((f) => Math.min(12, f + 1))}
            disabled={selectedFret === 12}
            style={{
              padding: '8px 12px',
              background: selectedFret === 12 ? '#333' : '#4ecdc4',
              color: selectedFret === 12 ? '#666' : '#000',
              border: '4px solid #000',
              borderRadius: '8px',
              cursor: selectedFret === 12 ? 'not-allowed' : 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: selectedFret === 12 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
            }}
          >
            W ▶
          </button>

          <button
            onClick={() => setSelectedFret((f) => Math.min(12, f + 5))}
            disabled={selectedFret === 12}
            style={{
              padding: '8px 12px',
              background: selectedFret === 12 ? '#333' : '#4ecdc4',
              color: selectedFret === 12 ? '#666' : '#000',
              border: '4px solid #000',
              borderRadius: '8px',
              cursor: selectedFret === 12 ? 'not-allowed' : 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: selectedFret === 12 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
            }}
          >
            S ▶▶
          </button>
        </div>

        {/* Fret grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(13, 1fr)',
            gap: '6px',
            padding: '12px',
            background: '#2a2a2a',
            borderRadius: '8px',
            border: '4px solid #444',
          }}
        >
          {Array.from({ length: 13 }, (_, fret) => (
            <button key={fret} style={getFretStyle(fret)} onClick={() => handleFretSelect(fret)}>
              {fret}
            </button>
          ))}
        </div>
      </div>

      {/* Bass Strings */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          background: '#000',
          borderRadius: '8px',
          border: '4px solid #444',
        }}
      >
        <div
          style={{
            color: '#888',
            fontSize: '8px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          PLAY STRINGS
        </div>
        {STRING_CONFIG.map((config) => {
          const note = STRING_NOTES[config.string][selectedFret];
          return (
            <button
              key={config.string}
              style={getStringStyle(config)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleStringPlay(config.string);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleStringPlay(config.string);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    fontSize: '8px',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {config.key}
                </div>
                <span style={{ fontSize: '20px' }}>{config.icon}</span>
                <span>{config.string}</span>
              </div>
              <span style={{ fontSize: '8px', opacity: 0.9 }}>{note}</span>
            </button>
          );
        })}
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
            marginBottom: '4px',
          }}
        >
          🎮 TAP STRINGS OR USE KEYBOARD
        </div>
        <div
          style={{
            color: '#888',
            fontSize: '7px',
            lineHeight: 1.6,
          }}
        >
          1234 FOR STRINGS • Q/W FRET ±1
          <br />
          A/S FRET ±5
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
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
        }
      `}</style>
    </div>
  );
};
