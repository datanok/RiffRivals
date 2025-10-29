import React, { useState, useEffect, useRef } from 'react';

type PianoProps = {
  onNotePlay: (note: string, velocity: number) => void;
  isRecording: boolean;
  activeNotes: Set<string>;
  octave?: number;
  disabled?: boolean;
};

// 1.5 octaves - perfect for mobile and gameplay
const KEYS = [
  { note: 'C', type: 'white', key: 'A' },
  { note: 'C#', type: 'black', key: 'W' },
  { note: 'D', type: 'white', key: 'S' },
  { note: 'D#', type: 'black', key: 'E' },
  { note: 'E', type: 'white', key: 'D' },
  { note: 'F', type: 'white', key: 'F' },
  { note: 'F#', type: 'black', key: 'T' },
  { note: 'G', type: 'white', key: 'G' },
  { note: 'G#', type: 'black', key: 'Y' },
  { note: 'A', type: 'white', key: 'H' },
  { note: 'A#', type: 'black', key: 'U' },
  { note: 'B', type: 'white', key: 'J' },
  { note: 'C', type: 'white', key: 'K', octaveOffset: 1 },
];

export const Piano: React.FC<PianoProps> = ({
  onNotePlay,
  isRecording,
  activeNotes,
  octave: initialOctave = 4,
  disabled = false,
}) => {
  const [octave, setOctave] = useState(initialOctave);
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

      const keyConfig = KEYS.find((k) => k.key === key);
      if (keyConfig) {
        e.preventDefault();
        const noteOctave = octave + (keyConfig.octaveOffset || 0);
        const fullNote = `${keyConfig.note}${noteOctave}`;
        onNotePlay(fullNote, 0.7);
      }

      // Octave controls
      if (key === 'Z' && octave > 1) {
        setOctave((o) => o - 1);
      } else if (key === 'X' && octave < 7) {
        setOctave((o) => o + 1);
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
  }, [octave, onNotePlay]);

  const handleKeyPress = (note: string, octaveOffset: number = 0) => {
    const noteOctave = octave + octaveOffset;
    const fullNote = `${note}${noteOctave}`;
    onNotePlay(fullNote, 0.7);
  };

  const getWhiteKeyStyle = (note: string, octaveOffset: number = 0) => {
    const noteOctave = octave + octaveOffset;
    const fullNote = `${note}${noteOctave}`;
    const isActive = activeNotes?.has(fullNote) || false;

    return {
      width: 'calc(100% / 8)',
      minWidth: '45px',
      height: '160px',
      background: isActive ? '#feca57' : '#e8e8e8',
      border: '4px solid #000',
      borderRadius: '0 0 8px 8px',
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.1s ease',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: '12px',
      fontSize: '10px',
      fontWeight: 'bold' as const,
      color: isActive ? '#000' : '#666',
      boxShadow: isActive
        ? 'inset 0 4px 0 rgba(0,0,0,0.3), 0 0 20px #feca57'
        : 'inset 0 -4px 0 rgba(0,0,0,0.2)',
      transform: isActive ? 'translateY(4px)' : 'translateY(0)',
      position: 'relative' as const,
      zIndex: 1,
      fontFamily: "'Press Start 2P', monospace",
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      gap: '8px',
    };
  };

  const getBlackKeyStyle = (note: string, octaveOffset: number = 0) => {
    const noteOctave = octave + octaveOffset;
    const fullNote = `${note}${noteOctave}`;
    const isActive = activeNotes?.has(fullNote) || false;

    return {
      width: '30px',
      height: '100px',
      background: isActive ? '#ff6b6b' : '#2a2a2a',
      border: '4px solid #000',
      borderRadius: '0 0 6px 6px',
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.1s ease',
      position: 'absolute' as const,
      zIndex: 2,
      left: '50%',
      transform: isActive ? 'translateX(-50%) translateY(4px)' : 'translateX(-50%)',
      boxShadow: isActive
        ? 'inset 0 4px 0 rgba(0,0,0,0.4), 0 0 20px #ff6b6b'
        : 'inset 0 -4px 0 rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: '8px',
      fontSize: '8px',
      fontWeight: 'bold' as const,
      color: isActive ? '#fff' : '#888',
      fontFamily: "'Press Start 2P', monospace",
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      gap: '6px',
    };
  };

  const handleOctaveChange = (direction: 'up' | 'down') => {
    if (direction === 'up' && octave < 7) {
      setOctave(octave + 1);
    } else if (direction === 'down' && octave > 1) {
      setOctave(octave - 1);
    }
  };

  const whiteKeys = KEYS.filter((k) => k.type === 'white');
  const blackKeys = KEYS.filter((k) => k.type === 'black');

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
            textShadow: '3px 3px 0px #4ecdc4',
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          🎹 MELODY MAKER
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

        {/* Octave Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <button
            onClick={() => handleOctaveChange('down')}
            disabled={octave <= 1}
            style={{
              padding: '8px 16px',
              background: octave <= 1 ? '#333' : '#4ecdc4',
              color: octave <= 1 ? '#666' : '#000',
              border: '4px solid #000',
              borderRadius: '8px',
              cursor: octave <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: octave <= 1 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
              transition: 'all 0.1s ease',
            }}
          >
            ◀ Z
          </button>

          <div
            style={{
              padding: '8px 20px',
              background: '#2a2a2a',
              border: '4px solid #444',
              borderRadius: '8px',
              color: '#4ecdc4',
              fontSize: '10px',
              fontWeight: 'bold',
              minWidth: '120px',
              textAlign: 'center',
            }}
          >
            OCTAVE {octave}
          </div>

          <button
            onClick={() => handleOctaveChange('up')}
            disabled={octave >= 7}
            style={{
              padding: '8px 16px',
              background: octave >= 7 ? '#333' : '#4ecdc4',
              color: octave >= 7 ? '#666' : '#000',
              border: '4px solid #000',
              borderRadius: '8px',
              cursor: octave >= 7 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: octave >= 7 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
              transition: 'all 0.1s ease',
            }}
          >
            X ▶
          </button>
        </div>
      </div>

      {/* Piano Keys */}
      <div
        style={{
          position: 'relative',
          background: '#000',
          padding: '16px',
          borderRadius: '12px',
          border: '4px solid #444',
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)',
        }}
      >
        {/* White keys container */}
        <div
          style={{
            display: 'flex',
            position: 'relative',
          }}
        >
          {whiteKeys.map((keyConfig, index) => (
            <button
              key={`${keyConfig.note}-${index}`}
              style={getWhiteKeyStyle(keyConfig.note, keyConfig.octaveOffset)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleKeyPress(keyConfig.note, keyConfig.octaveOffset);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleKeyPress(keyConfig.note, keyConfig.octaveOffset);
              }}
            >
              <span style={{ fontSize: '10px', lineHeight: 1 }}>{keyConfig.note}</span>
              <div
                style={{
                  padding: '2px 6px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  fontSize: '7px',
                  border: '2px solid rgba(0,0,0,0.3)',
                }}
              >
                {keyConfig.key}
              </div>
            </button>
          ))}
        </div>

        {/* Black keys overlay */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            display: 'flex',
            pointerEvents: 'none',
          }}
        >
          {whiteKeys.map((keyConfig, index) => {
            // Find if there's a black key after this white key
            const blackKey = blackKeys.find((bk) => {
              const whiteNoteIndex = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(keyConfig.note);
              const blackNoteBase = bk.note.replace('#', '');
              return blackNoteBase === keyConfig.note;
            });

            return (
              <div
                key={`container-${index}`}
                style={{
                  width: 'calc(100% / 8)',
                  minWidth: '45px',
                  position: 'relative',
                }}
              >
                {blackKey && (
                  <button
                    style={{
                      ...getBlackKeyStyle(blackKey.note, keyConfig.octaveOffset),
                      pointerEvents: 'auto',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleKeyPress(blackKey.note, keyConfig.octaveOffset);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleKeyPress(blackKey.note, keyConfig.octaveOffset);
                    }}
                  >
                    <span style={{ fontSize: '7px', lineHeight: 1 }}>{blackKey.note}</span>
                    <div
                      style={{
                        padding: '2px 4px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '3px',
                        fontSize: '6px',
                        border: '2px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {blackKey.key}
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '16px',
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
          🎮 TAP KEYS OR USE KEYBOARD
        </div>
        <div
          style={{
            color: '#888',
            fontSize: '7px',
            lineHeight: 1.6,
          }}
        >
          ASDFGHJK FOR WHITE KEYS
          <br />
          WETYUI FOR BLACK KEYS
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
            min-width: 38px !important;
          }
        }
      `}</style>
    </div>
  );
};
