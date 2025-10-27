import React, { useState, useEffect, useRef } from 'react';
import type { WaveformType } from '../../../shared/types/music.js';

type SynthProps = {
  onNotePlay: (note: string, velocity: number, waveform: WaveformType) => void;
  isRecording: boolean;
  activeNotes: Set<string>;
  octave?: number;
};

const WAVEFORMS: { type: WaveformType; icon: string; color: string; label: string }[] = [
  { type: 'square', icon: '⬜', color: '#ff6b6b', label: 'SQUARE' },
  { type: 'sawtooth', icon: '📐', color: '#4ecdc4', label: 'SAW' },
  { type: 'sine', icon: '〰️', color: '#feca57', label: 'SINE' },
  { type: 'triangle', icon: '🔺', color: '#5f27cd', label: 'TRI' },
];

// 2 octave keyboard layout
const KEYS = [
  // First octave
  { note: 'C', type: 'white', key: 'A', row: 0 },
  { note: 'C#', type: 'black', key: 'W', row: 0 },
  { note: 'D', type: 'white', key: 'S', row: 0 },
  { note: 'D#', type: 'black', key: 'E', row: 0 },
  { note: 'E', type: 'white', key: 'D', row: 0 },
  { note: 'F', type: 'white', key: 'F', row: 0 },
  { note: 'F#', type: 'black', key: 'T', row: 0 },
  { note: 'G', type: 'white', key: 'G', row: 0 },
  { note: 'G#', type: 'black', key: 'Y', row: 0 },
  { note: 'A', type: 'white', key: 'H', row: 0 },
  { note: 'A#', type: 'black', key: 'U', row: 0 },
  { note: 'B', type: 'white', key: 'J', row: 0 },
  // Second octave
  { note: 'C', type: 'white', key: 'K', row: 1, octaveOffset: 1 },
  { note: 'C#', type: 'black', key: 'O', row: 1, octaveOffset: 1 },
  { note: 'D', type: 'white', key: 'L', row: 1, octaveOffset: 1 },
  { note: 'D#', type: 'black', key: 'P', row: 1, octaveOffset: 1 },
  { note: 'E', type: 'white', key: ';', row: 1, octaveOffset: 1 },
];

export const Synth: React.FC<SynthProps> = ({
  onNotePlay,
  isRecording,
  activeNotes,
  octave: initialOctave = 4,
}) => {
  const [octave, setOctave] = useState(initialOctave);
  const [waveform, setWaveform] = useState<WaveformType>('square');
  const pressedKeys = useRef(new Set<string>());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      if (pressedKeys.current.has(key)) return;
      pressedKeys.current.add(key);

      const keyConfig = KEYS.find((k) => k.key.toUpperCase() === key);
      if (keyConfig) {
        e.preventDefault();
        const noteOctave = octave + (keyConfig.octaveOffset || 0);
        const fullNote = `${keyConfig.note}${noteOctave}`;
        onNotePlay(fullNote, 0.8, waveform);
      }

      // Octave controls
      if (key === 'Z' && octave > 1) {
        setOctave((o) => o - 1);
      } else if (key === 'X' && octave < 6) {
        setOctave((o) => o + 1);
      }

      // Waveform selection (1-4)
      const waveIndex = parseInt(key) - 1;
      if (waveIndex >= 0 && waveIndex < WAVEFORMS.length) {
        setWaveform(WAVEFORMS[waveIndex].type);
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
  }, [octave, waveform, onNotePlay]);

  const handleNotePlay = (note: string, octaveOffset: number = 0) => {
    const noteOctave = octave + octaveOffset;
    const fullNote = `${note}${noteOctave}`;
    onNotePlay(fullNote, 0.8, waveform);
  };

  const getPadStyle = (keyConfig: (typeof KEYS)[0]) => {
    const noteOctave = octave + (keyConfig.octaveOffset || 0);
    const fullNote = `${keyConfig.note}${noteOctave}`;
    const isActive = activeNotes.has(fullNote);
    const currentWaveform = WAVEFORMS.find((w) => w.type === waveform);

    return {
      padding: '12px 8px',
      background: isActive ? currentWaveform?.color : '#2a2a2a',
      border: '4px solid #000',
      borderRadius: '8px',
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.1s ease',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      fontSize: '8px',
      fontWeight: 'bold' as const,
      color: isActive ? '#000' : '#fff',
      boxShadow: isActive
        ? `inset 0 4px 0 rgba(0,0,0,0.3), 0 0 20px ${currentWaveform?.color}`
        : 'inset 0 -4px 0 rgba(0,0,0,0.5)',
      transform: isActive ? 'translateY(4px) scale(1.05)' : 'translateY(0)',
      fontFamily: "'Press Start 2P', monospace",
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      minHeight: '70px',
    };
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
        maxWidth: '800px',
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
            textShadow: '3px 3px 0px #ff6b6b',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          🎺 SYNTH MASTER
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

        {/* Controls Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Octave Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '8px',
            }}
          >
            <button
              onClick={() => setOctave((o) => Math.max(1, o - 1))}
              disabled={octave <= 1}
              style={{
                padding: '8px 12px',
                background: octave <= 1 ? '#333' : '#4ecdc4',
                color: octave <= 1 ? '#666' : '#000',
                border: '4px solid #000',
                borderRadius: '8px',
                cursor: octave <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: "'Press Start 2P', monospace",
                boxShadow: octave <= 1 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
              }}
            >
              Z ◀
            </button>

            <div
              style={{
                padding: '8px 16px',
                background: '#2a2a2a',
                border: '4px solid #444',
                borderRadius: '8px',
                color: '#4ecdc4',
                fontSize: '9px',
                fontWeight: 'bold',
                minWidth: '90px',
                textAlign: 'center',
              }}
            >
              OCT {octave}
            </div>

            <button
              onClick={() => setOctave((o) => Math.min(6, o + 1))}
              disabled={octave >= 6}
              style={{
                padding: '8px 12px',
                background: octave >= 6 ? '#333' : '#4ecdc4',
                color: octave >= 6 ? '#666' : '#000',
                border: '4px solid #000',
                borderRadius: '8px',
                cursor: octave >= 6 ? 'not-allowed' : 'pointer',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: "'Press Start 2P', monospace",
                boxShadow: octave >= 6 ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,0.3)',
              }}
            >
              X ▶
            </button>
          </div>

          {/* Waveform Display */}
          <div
            style={{
              padding: '12px 20px',
              background: WAVEFORMS.find((w) => w.type === waveform)?.color,
              border: '4px solid #000',
              borderRadius: '8px',
              color: '#000',
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center',
              boxShadow: 'inset 0 4px 0 rgba(0,0,0,0.3)',
            }}
          >
            {WAVEFORMS.find((w) => w.type === waveform)?.icon}{' '}
            {WAVEFORMS.find((w) => w.type === waveform)?.label}
          </div>

          {/* Spacer for symmetry */}
          <div></div>
        </div>
      </div>

      {/* Waveform Selector */}
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
          WAVEFORM SELECT
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {WAVEFORMS.map((wave, index) => (
            <button
              key={wave.type}
              onClick={() => setWaveform(wave.type)}
              style={{
                padding: '12px',
                background: waveform === wave.type ? wave.color : '#2a2a2a',
                border: '4px solid #000',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                color: waveform === wave.type ? '#000' : '#fff',
                fontSize: '8px',
                fontWeight: 'bold',
                boxShadow:
                  waveform === wave.type
                    ? `inset 0 4px 0 rgba(0,0,0,0.3), 0 0 20px ${wave.color}`
                    : 'inset 0 -4px 0 rgba(0,0,0,0.5)',
                transform: waveform === wave.type ? 'translateY(4px)' : 'translateY(0)',
              }}
            >
              <span style={{ fontSize: '20px' }}>{wave.icon}</span>
              <span>{wave.label}</span>
              <div
                style={{
                  padding: '2px 6px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  fontSize: '7px',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Synth Pads - Grid Layout */}
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
          PLAY NOTES
        </div>

        {/* First Octave Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '6px',
            marginBottom: '8px',
          }}
        >
          {KEYS.filter((k) => k.row === 0).map((keyConfig) => (
            <button
              key={`${keyConfig.note}-${keyConfig.key}`}
              style={getPadStyle(keyConfig)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleNotePlay(keyConfig.note, keyConfig.octaveOffset);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleNotePlay(keyConfig.note, keyConfig.octaveOffset);
              }}
            >
              <span style={{ fontSize: '9px', lineHeight: 1 }}>{keyConfig.note}</span>
              <div
                style={{
                  padding: '2px 4px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '3px',
                  fontSize: '6px',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {keyConfig.key}
              </div>
            </button>
          ))}
        </div>

        {/* Second Octave Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '6px',
            maxWidth: '500px',
          }}
        >
          {KEYS.filter((k) => k.row === 1).map((keyConfig) => (
            <button
              key={`${keyConfig.note}-${keyConfig.key}`}
              style={getPadStyle(keyConfig)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleNotePlay(keyConfig.note, keyConfig.octaveOffset);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleNotePlay(keyConfig.note, keyConfig.octaveOffset);
              }}
            >
              <span style={{ fontSize: '9px', lineHeight: 1 }}>{keyConfig.note}</span>
              <div
                style={{
                  padding: '2px 4px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '3px',
                  fontSize: '6px',
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {keyConfig.key}
              </div>
            </button>
          ))}
        </div>
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
          🎮 TAP PADS OR USE KEYBOARD
        </div>
        <div
          style={{
            color: '#888',
            fontSize: '7px',
            lineHeight: 1.6,
          }}
        >
          ASDFGHJK + WETYUI • KL;OP (HIGH OCT)
          <br />
          1-4 CHANGE WAVEFORM • Z/X OCTAVE
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        button:active {
          transform: translateY(4px) scale(1.05) !important;
        }

        @media (max-width: 768px) {
          button {
            font-size: 7px !important;
            min-height: 60px !important;
          }
        }
      `}</style>
    </div>
  );
};
