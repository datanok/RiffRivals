import React, { useEffect, useRef } from 'react';

type DrumType = 'kick' | 'snare' | 'hihat' | 'openhat' | 'tom1' | 'tom2' | 'crash' | 'ride';

type DrumKitProps = {
  onNotePlay: (drum: DrumType, velocity: number) => void;
  isRecording: boolean;
  activeNotes: Set<DrumType>;
  disabled?: boolean;
};

const DRUM_LAYOUT = [
  // Cymbals - top corners
  {
    type: 'crash' as DrumType,
    label: 'CRASH',
    key: 'Q',
    size: 'cymbal',
    position: { top: '5%', left: '8%' },
    color: '#ff6b6b',
    icon: '💥',
  },
  {
    type: 'ride' as DrumType,
    label: 'RIDE',
    key: 'E',
    size: 'cymbal',
    position: { top: '5%', right: '8%' },
    color: '#4ecdc4',
    icon: '🔔',
  },
  // Toms - mounted above snare
  {
    type: 'tom1' as DrumType,
    label: 'TOM 1',
    key: 'W',
    size: 'tom',
    position: { top: '18%', left: '28%' },
    color: '#45b7d1',
    icon: '🥁',
  },
  {
    type: 'tom2' as DrumType,
    label: 'TOM 2',
    key: 'R',
    size: 'tom',
    position: { top: '18%', right: '28%' },
    color: '#96ceb4',
    icon: '🥁',
  },
  // Hi-hat - left side
  {
    type: 'hihat' as DrumType,
    label: 'HI-HAT',
    key: 'A',
    size: 'small-cymbal',
    position: { top: '42%', left: '5%' },
    color: '#ff9ff3',
    icon: '🎵',
  },
  // Snare - center
  {
    type: 'snare' as DrumType,
    label: 'SNARE',
    key: 'S',
    size: 'snare',
    position: { top: '48%', left: '50%', transform: 'translateX(-50%)' },
    color: '#feca57',
    icon: '🎯',
  },
  // Open hi-hat - right side
  {
    type: 'openhat' as DrumType,
    label: 'OPEN HAT',
    key: 'D',
    size: 'small-cymbal',
    position: { top: '42%', right: '5%' },
    color: '#54a0ff',
    icon: '🎶',
  },
  // Kick drum - bottom center
  {
    type: 'kick' as DrumType,
    label: 'KICK',
    key: 'SPACE',
    size: 'kick',
    position: { bottom: '8%', left: '50%', transform: 'translateX(-50%)' },
    color: '#5f27cd',
    icon: '💥',
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
      const key = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();

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
      const key = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
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

    const sizes = {
      'kick': { width: '140px', height: '140px' },
      'snare': { width: '110px', height: '110px' },
      'tom': { width: '90px', height: '90px' },
      'cymbal': { width: '100px', height: '100px' },
      'small-cymbal': { width: '85px', height: '85px' },
    };

    const size = sizes[drum.size as keyof typeof sizes];

    return {
      padding: '0',
      margin: '0',
      borderRadius: '50%',
      border: '4px solid #000',
      background: isActive ? drum.color : '#2a2a2a',
      color: isActive ? '#000' : '#fff',
      fontSize: '10px',
      fontWeight: 'bold' as const,
      fontFamily: "'Press Start 2P', monospace",
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.1s ease',
      width: size.width,
      height: size.height,
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
      position: 'absolute' as const,
      overflow: 'hidden',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      ...drum.position,
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

      {/* Drum Kit - Real drum layout */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '500px',
          marginBottom: '16px',
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
      >
        {DRUM_LAYOUT.map((drum) => (
          <button
            key={drum.type}
            style={getDrumPadStyle(drum)}
            onMouseDown={(e) => handleDrumHit(drum.type, e)}
            onTouchStart={(e) => handleDrumHit(drum.type, e)}
            disabled={false}
          >
            <span style={{ fontSize: drum.size === 'kick' ? '24px' : '18px', lineHeight: 1 }}>
              {drum.icon}
            </span>
            <span style={{ fontSize: '6px', lineHeight: 1.2 }}>{drum.label}</span>
            <div
              style={{
                marginTop: '2px',
                padding: '2px 4px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                fontSize: '5px',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              {drum.key}
            </div>
          </button>
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
          Q W E R / A S D / SPACE
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

        @media (max-width: 768px) {
          button {
            font-size: 8px !important;
          }
          button span:first-child {
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  );
};
