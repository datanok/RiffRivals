import React, { useState, useCallback } from 'react';
import * as Tone from 'tone';

interface AudioInitButtonProps {
  onAudioInitialized?: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export const AudioInitButton: React.FC<AudioInitButtonProps> = ({
  onAudioInitialized,
  position = 'top-right',
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    center: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
  };

  const initializeAudio = useCallback(async () => {
    if (isInitialized || isInitializing) return;

    setIsInitializing(true);
    try {
      console.log('AudioInitButton: Starting audio initialization...');

      // Start Tone.js
      await Tone.start();
      console.log('AudioInitButton: Tone.js started');

      // Resume audio context if suspended
      if (Tone.getContext().state !== 'running') {
        await Tone.getContext().resume();
        console.log('AudioInitButton: Audio context resumed');
      }

      // Play a test beep sound to confirm audio is working
      const synth = new Tone.Synth({
        oscillator: {
          type: 'sine',
        },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5,
        },
      }).toDestination();

      // Play a pleasant chord progression
      const now = Tone.now();
      synth.triggerAttackRelease('C5', '16n', now);
      synth.triggerAttackRelease('E5', '16n', now + 0.1);
      synth.triggerAttackRelease('G5', '16n', now + 0.2);

      // Clean up after playing
      setTimeout(() => {
        synth.dispose();
      }, 1000);

      setIsInitialized(true);
      console.log('AudioInitButton: Audio initialized successfully');

      if (onAudioInitialized) {
        onAudioInitialized();
      }
    } catch (error) {
      console.error('AudioInitButton: Failed to initialize audio:', error);
      alert('Failed to initialize audio. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing, onAudioInitialized]);

  // Play a click sound when button is pressed
  const playClickSound = useCallback(() => {
    try {
      if (Tone.getContext().state === 'running') {
        const synth = new Tone.Synth({
          oscillator: {
            type: 'triangle',
          },
          envelope: {
            attack: 0.001,
            decay: 0.05,
            sustain: 0,
            release: 0.05,
          },
        }).toDestination();

        synth.triggerAttackRelease('C6', '32n');

        setTimeout(() => {
          synth.dispose();
        }, 200);
      }
    } catch (error) {
      console.log('Could not play click sound:', error);
    }
  }, []);

  if (isInitialized) {
    // Show a small indicator that audio is initialized
    return (
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(to right, rgb(34, 197, 94), rgb(22, 163, 74))',
            color: 'white',
            padding: '8px 12px',
            boxShadow: '4px 4px 0px #333',
            fontSize: '8px',
            borderRadius: '0px',
            border: '2px solid #333',
          }}
        >
          <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>🔊</span>
          <span>AUDIO ON</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <button
        onClick={() => {
          playClickSound();
          void initializeAudio();
        }}
        disabled={isInitializing}
        style={{
          padding: '12px 16px',
          background: isInitializing
            ? 'linear-gradient(to right, rgb(251, 191, 36), rgb(249, 115, 22))'
            : 'linear-gradient(to right, rgb(239, 68, 68), rgb(219, 39, 119))',
          color: 'white',
          border: '3px solid #333',
          boxShadow: '6px 6px 0px #333',
          borderRadius: '0px',
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: isInitializing ? 'not-allowed' : 'pointer',
          transition: 'all 0.1s',
          animation: isInitializing ? 'pulse 1s ease-in-out infinite' : 'none',
        }}
        onMouseDown={(e) => {
          if (!isInitializing) {
            e.currentTarget.style.transform = 'translateY(4px)';
            e.currentTarget.style.boxShadow = '2px 2px 0px #333';
          }
        }}
        onMouseUp={(e) => {
          if (!isInitializing) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '6px 6px 0px #333';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{isInitializing ? '⏳' : '🔇'}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span>{isInitializing ? 'INITIALIZING...' : '🎵 ENABLE AUDIO'}</span>
            <span style={{ fontSize: '6px', opacity: 0.8 }}>
              {isInitializing ? 'PLEASE WAIT' : 'CLICK TO TEST'}
            </span>
          </div>
        </div>
      </button>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
