import React, { useState, useEffect, useRef } from 'react';

type VisualEffect = {
  id: number;
  type: 'note' | 'combo' | 'streak';
  x: number;
  y: number;
  color: string;
  text: string;
  timestamp: number;
};

type VisualEffectsProps = {
  activeNotes: Set<string>;
  isRecording: boolean;
  comboCount: number;
  streakCount: number;
};

export const VisualEffects: React.FC<VisualEffectsProps> = ({
  activeNotes,
  isRecording,
  comboCount,
  streakCount,
}) => {
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [lastNoteCount, setLastNoteCount] = useState(0);
  const effectIdRef = useRef(0);

  // Create note hit effects
  useEffect(() => {
    const currentNoteCount = activeNotes.size;
    if (currentNoteCount > lastNoteCount) {
      const newNotes = currentNoteCount - lastNoteCount;

      for (let i = 0; i < newNotes; i++) {
        const effect: VisualEffect = {
          id: effectIdRef.current++,
          type: 'note',
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          color: getRandomColor(),
          text: getRandomNoteText(),
          timestamp: Date.now(),
        };

        setEffects((prev) => [...prev, effect]);

        // Remove effect after animation
        setTimeout(() => {
          setEffects((prev) => prev.filter((e) => e.id !== effect.id));
        }, 2000);
      }
    }
    setLastNoteCount(currentNoteCount);
  }, [activeNotes.size, lastNoteCount]);

  // Create combo effects
  useEffect(() => {
    if (comboCount > 0 && comboCount % 5 === 0) {
      const effect: VisualEffect = {
        id: effectIdRef.current++,
        type: 'combo',
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        color: '#ff6b6b',
        text: `${comboCount} COMBO!`,
        timestamp: Date.now(),
      };

      setEffects((prev) => [...prev, effect]);

      setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== effect.id));
      }, 3000);
    }
  }, [comboCount]);

  // Create streak effects
  useEffect(() => {
    if (streakCount > 0 && streakCount % 10 === 0) {
      const effect: VisualEffect = {
        id: effectIdRef.current++,
        type: 'streak',
        x: window.innerWidth / 2,
        y: window.innerHeight / 3,
        color: '#4ecdc4',
        text: `${streakCount} STREAK!`,
        timestamp: Date.now(),
      };

      setEffects((prev) => [...prev, effect]);

      setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== effect.id));
      }, 3000);
    }
  }, [streakCount]);

  const getRandomColor = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ff9ff3', '#54a0ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getRandomNoteText = () => {
    const texts = ['♪', '♫', '♬', '♭', '♯', '♪', '♫', '♬'];
    return texts[Math.floor(Math.random() * texts.length)];
  };

  const getEffectStyle = (effect: VisualEffect) => {
    const baseStyle = {
      position: 'fixed' as const,
      left: effect.x,
      top: effect.y,
      color: effect.color,
      fontSize: effect.type === 'note' ? '24px' : '32px',
      fontWeight: 'bold',
      pointerEvents: 'none' as const,
      zIndex: 1000,
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      userSelect: 'none' as const,
    };

    switch (effect.type) {
      case 'note':
        return {
          ...baseStyle,
          animation: 'noteFloat 2s ease-out forwards',
        };
      case 'combo':
        return {
          ...baseStyle,
          fontSize: '48px',
          animation: 'comboBounce 3s ease-out forwards',
        };
      case 'streak':
        return {
          ...baseStyle,
          fontSize: '40px',
          animation: 'streakGlow 3s ease-out forwards',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <>
      {/* Visual Effects */}
      {effects.map((effect) => (
        <div key={effect.id} style={getEffectStyle(effect)}>
          {effect.text}
        </div>
      ))}

      {/* Recording Pulse Effect */}
      {isRecording && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '200px',
            border: '4px solid #ff6b6b',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 500,
            animation: 'recordingPulse 1s ease-in-out infinite',
            opacity: 0.3,
          }}
        />
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes noteFloat {
            0% { 
              transform: translateY(0) scale(1); 
              opacity: 1; 
            }
            100% { 
              transform: translateY(-100px) scale(0.5); 
              opacity: 0; 
            }
          }
          
          @keyframes comboBounce {
            0% { 
              transform: translate(-50%, -50%) scale(0.5); 
              opacity: 0; 
            }
            20% { 
              transform: translate(-50%, -50%) scale(1.2); 
              opacity: 1; 
            }
            40% { 
              transform: translate(-50%, -50%) scale(0.9); 
              opacity: 1; 
            }
            60% { 
              transform: translate(-50%, -50%) scale(1.1); 
              opacity: 1; 
            }
            100% { 
              transform: translate(-50%, -50%) scale(1); 
              opacity: 0; 
            }
          }
          
          @keyframes streakGlow {
            0% { 
              transform: translate(-50%, -50%) scale(0.8); 
              opacity: 0; 
              filter: brightness(1);
            }
            30% { 
              transform: translate(-50%, -50%) scale(1.1); 
              opacity: 1; 
              filter: brightness(1.5);
            }
            70% { 
              transform: translate(-50%, -50%) scale(1); 
              opacity: 1; 
              filter: brightness(1.2);
            }
            100% { 
              transform: translate(-50%, -50%) scale(1); 
              opacity: 0; 
              filter: brightness(1);
            }
          }
          
          @keyframes recordingPulse {
            0% { 
              transform: translate(-50%, -50%) scale(1); 
              opacity: 0.3; 
            }
            50% { 
              transform: translate(-50%, -50%) scale(1.2); 
              opacity: 0.1; 
            }
            100% { 
              transform: translate(-50%, -50%) scale(1); 
              opacity: 0.3; 
            }
          }
        `}
      </style>
    </>
  );
};
