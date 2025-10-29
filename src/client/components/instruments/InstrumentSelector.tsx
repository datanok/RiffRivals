import React, { useState, useEffect, useRef } from 'react';
import type {
  InstrumentType,
  DrumType,
  BassString,
  WaveformType,
} from '../../../shared/types/music.js';
import { DrumKit } from './DrumKit.js';
import { Piano } from './Piano.js';
import { Synth } from './Synth.js';
import { DhwaniAudioEngine } from '../../audio/DhwaniAudioEngine.js';
import { BrowserCompatibility } from '../../utils/errorHandling.js';

type InstrumentSelectorProps = {
  onNotePlay: (instrument: InstrumentType, note: string, velocity: number) => void;
  isRecording: boolean;
  activeNotes: Set<string>;
  initialInstrument?: InstrumentType;
};

type InstrumentConfig = {
  type: InstrumentType;
  name: string;
  icon: string;
  description: string;
  color: string;
  glowColor: string;
};

const INSTRUMENTS: InstrumentConfig[] = [
  {
    type: 'drums',
    name: 'BEAT BLASTER',
    icon: '🥁',
    description: 'Drop sick beats',
    color: '#ff6b6b',
    glowColor: 'rgba(255, 107, 107, 0.4)',
  },
  {
    type: 'piano',
    name: 'MELODY MASTER',
    icon: '🎹',
    description: 'Epic melodies',
    color: '#4ecdc4',
    glowColor: 'rgba(78, 205, 196, 0.4)',
  },
  {
    type: 'synth',
    name: 'SYNTH MASTER',
    icon: '🎺',
    description: 'Electronic sounds',
    color: '#a29bfe',
    glowColor: 'rgba(162, 155, 254, 0.4)',
  },
];

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  onNotePlay,
  isRecording,
  activeNotes,
  initialInstrument = 'drums',
}) => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>(initialInstrument);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [audioInitializing, setAudioInitializing] = useState(false);
  const audioEngineRef = useRef<DhwaniAudioEngine | null>(null);

  // Initialize audio engine (requires user interaction)
  const initializeAudio = async () => {
    if (audioInitializing || audioInitialized) {
      console.log('Audio initialization already in progress or completed');
      return;
    }

    try {
      setAudioInitializing(true);
      console.log('Starting audio initialization...');

      const compatibility = BrowserCompatibility.checkCompatibility();
      console.log('Browser compatibility check:', compatibility);

      if (!compatibility.isSupported) {
        throw new Error(`Browser not supported: ${compatibility.missingFeatures.join(', ')}`);
      }

      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        throw new Error('Web Audio API not available');
      }

      console.log('Creating DhwaniAudioEngine instance...');
      audioEngineRef.current = new DhwaniAudioEngine();

      console.log('Initializing audio engine...');
      await audioEngineRef.current.initialize();

      console.log('Audio engine initialized successfully');
      setAudioInitialized(true);

      console.log('Testing audio playback...');
      audioEngineRef.current.playNote('drums', 'kick', 0.5);
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(
        `Audio initialization failed: ${errorMessage}\n\nPlease check your browser permissions and try again.`
      );
    } finally {
      setAudioInitializing(false);
    }
  };

  useEffect(() => {
    const autoInitialize = async () => {
      try {
        if (window.AudioContext || (window as any).webkitAudioContext) {
          console.log('Attempting automatic audio initialization...');
          await initializeAudio();
        }
      } catch (error) {
        console.log(
          'Automatic audio initialization failed, user interaction required:',
          error.message
        );
      }
    };

    const timeoutId = setTimeout(autoInitialize, 100);

    return () => {
      clearTimeout(timeoutId);
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setCurrentInstrument(selectedInstrument);
    }
  }, [selectedInstrument]);

  const handleInstrumentChange = async (instrument: InstrumentType) => {
    if (instrument === selectedInstrument) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedInstrument(instrument);
      setIsTransitioning(false);
    }, 150);
  };

  const handleDrumPlay = (drum: DrumType, velocity: number) => {
    if (audioEngineRef.current && audioInitialized) {
      audioEngineRef.current.playNote('drums', drum, velocity);
    }
    onNotePlay('drums', drum, velocity);
  };

  const handlePianoPlay = (note: string, velocity: number) => {
    if (audioEngineRef.current && audioInitialized) {
      audioEngineRef.current.playNote('piano', note, velocity);
    }
    onNotePlay('piano', note, velocity);
  };

  const handleSynthPlay = (note: string, velocity: number, waveform: WaveformType) => {
    if (audioEngineRef.current && audioInitialized) {
      audioEngineRef.current.playNote('synth', note, velocity);
    }
    onNotePlay('synth', note, velocity);
  };

  const renderCurrentInstrument = () => {
    if (isTransitioning) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 'clamp(150px, 30vh, 200px)',
            color: '#00d4ff',
            fontSize: 'clamp(10px, 2vw, 14px)',
            fontFamily: "'Press Start 2P', monospace",
            textShadow: '0 0 10px #00d4ff',
          }}
        >
          ▸▸▸ SWITCHING ◂◂◂
        </div>
      );
    }

    switch (selectedInstrument) {
      case 'drums':
        return (
          <DrumKit
            onNotePlay={handleDrumPlay}
            isRecording={isRecording}
            activeNotes={activeNotes as Set<DrumType>}
          />
        );
      case 'piano':
        return (
          <Piano
            onNotePlay={handlePianoPlay}
            isRecording={isRecording}
            activeNotes={activeNotes}
            octave={4}
          />
        );
      case 'synth':
        return (
          <Synth
            onNotePlay={handleSynthPlay}
            isRecording={isRecording}
            activeNotes={activeNotes}
            octave={4}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        padding: 'clamp(12px, 2vw, 24px)',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%)',
        width: '100%',
        minHeight: 'clamp(400px, 80vh, 600px)',
        border: '4px solid #00d4ff',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.05)',
        fontFamily: "'Press Start 2P', monospace",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Retro grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
          linear-gradient(0deg, transparent 24%, rgba(0, 212, 255, 0.03) 25%, rgba(0, 212, 255, 0.03) 26%, transparent 27%, transparent 74%, rgba(0, 212, 255, 0.03) 75%, rgba(0, 212, 255, 0.03) 76%, transparent 77%, transparent),
          linear-gradient(90deg, transparent 24%, rgba(0, 212, 255, 0.03) 25%, rgba(0, 212, 255, 0.03) 26%, transparent 27%, transparent 74%, rgba(0, 212, 255, 0.03) 75%, rgba(0, 212, 255, 0.03) 76%, transparent 77%, transparent)
        `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      {/* Corner decorations */}
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          width: '12px',
          height: '12px',
          background: '#00d4ff',
          boxShadow: '0 0 8px #00d4ff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '12px',
          height: '12px',
          background: '#00d4ff',
          boxShadow: '0 0 8px #00d4ff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          left: '-4px',
          width: '12px',
          height: '12px',
          background: '#00d4ff',
          boxShadow: '0 0 8px #00d4ff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          right: '-4px',
          width: '12px',
          height: '12px',
          background: '#00d4ff',
          boxShadow: '0 0 8px #00d4ff',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Audio Status */}
        {!audioInitialized && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: 'clamp(12px, 2vh, 20px)',
              padding: 'clamp(12px, 2vw, 20px)',
              background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
              border: '3px solid #ffa500',
              boxShadow: '0 0 15px rgba(255, 165, 0, 0.3)',
              position: 'relative',
            }}
          >
            {/* Scanlines */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.03) 2px, rgba(0, 212, 255, 0.03) 4px)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                color: '#ffa500',
                fontSize: 'clamp(10px, 2vw, 14px)',
                marginBottom: 'clamp(8px, 1.5vh, 12px)',
                textShadow: '0 0 10px #ffa500',
                position: 'relative',
              }}
            >
              🔊 AUDIO ENGINE READY
            </div>
            <p
              style={{
                color: '#ccc',
                fontSize: 'clamp(7px, 1.5vw, 9px)',
                marginBottom: 'clamp(10px, 2vh, 16px)',
                lineHeight: '1.6',
                position: 'relative',
              }}
            >
              CLICK TO POWER UP AND START!
            </p>
            <button
              onClick={initializeAudio}
              disabled={audioInitializing || audioInitialized}
              style={{
                padding: 'clamp(12px, 2vw, 16px) clamp(20px, 4vw, 32px)',
                background: audioInitialized
                  ? '#00ff00'
                  : audioInitializing
                    ? '#ffff00'
                    : '#4ecdc4',
                color: '#000',
                border: '3px solid #000',
                fontSize: 'clamp(8px, 1.8vw, 11px)',
                fontWeight: 'bold',
                fontFamily: "'Press Start 2P', monospace",
                cursor: audioInitializing || audioInitialized ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '4px 4px 0px #000',
                opacity: audioInitializing || audioInitialized ? 0.7 : 1,
                position: 'relative',
              }}
            >
              {audioInitialized ? '✅ READY!' : audioInitializing ? '⏳ INIT...' : '🎵 POWER UP'}
            </button>
          </div>
        )}

        {/* Instrument Selection */}
        <div style={{ marginBottom: 'clamp(16px, 3vh, 28px)' }}>
          <div
            style={{
              textAlign: 'center',
              color: '#00d4ff',
              fontSize: 'clamp(10px, 2vw, 16px)',
              marginBottom: 'clamp(12px, 2vh, 20px)',
              textShadow: '0 0 10px #00d4ff',
              letterSpacing: '2px',
            }}
          >
            {audioInitialized ? '🔊 ' : ''}CHOOSE YOUR WEAPON
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'clamp(8px, 2vw, 12px)',
              padding: 'clamp(12px, 2vw, 20px)',
              background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
              border: '2px solid #444',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            }}
          >
            {INSTRUMENTS.map((instrument) => {
              const isSelected = instrument.type === selectedInstrument;
              return (
                <button
                  key={instrument.type}
                  style={{
                    padding: 'clamp(12px, 2vw, 16px)',
                    border: `3px solid ${instrument.color}`,
                    background: isSelected
                      ? `linear-gradient(135deg, ${instrument.color} 0%, ${instrument.color}dd 100%)`
                      : 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'clamp(4px, 1vh, 6px)',
                    fontSize: 'clamp(8px, 1.6vw, 11px)',
                    fontFamily: "'Press Start 2P', monospace",
                    boxShadow: isSelected
                      ? `0 4px 0 #000, 0 0 15px ${instrument.glowColor}`
                      : '0 2px 0 #000',
                    transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => handleInstrumentChange(instrument.type)}
                  disabled={isTransitioning}
                >
                  {/* Scanlines */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.02) 2px, rgba(255, 255, 255, 0.02) 4px)',
                      pointerEvents: 'none',
                    }}
                  />

                  <span
                    style={{
                      fontSize: 'clamp(20px, 4vw, 28px)',
                      filter: isSelected ? `drop-shadow(0 0 8px ${instrument.color})` : 'none',
                      position: 'relative',
                    }}
                  >
                    {instrument.icon}
                  </span>
                  <span
                    style={{
                      textShadow: isSelected ? `0 0 8px ${instrument.color}` : 'none',
                      position: 'relative',
                    }}
                  >
                    {instrument.name}
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(6px, 1.2vw, 8px)',
                      opacity: 0.8,
                      position: 'relative',
                    }}
                  >
                    {instrument.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Instrument Interface */}
        <div
          style={{
            minHeight: 'clamp(200px, 40vh, 300px)',
            opacity: isTransitioning || !audioInitialized ? 0.5 : 1,
            transition: 'opacity 0.15s ease',
            pointerEvents: !audioInitialized ? 'none' : 'auto',
          }}
        >
          {renderCurrentInstrument()}
        </div>

        {/* Status Information */}
        <div
          style={{
            marginTop: 'clamp(12px, 2vh, 20px)',
            textAlign: 'center',
            color: '#00d4ff',
            fontSize: 'clamp(7px, 1.5vw, 9px)',
            textShadow: '0 0 5px #00d4ff',
          }}
        >
          ▸ {INSTRUMENTS.find((i) => i.type === selectedInstrument)?.name}
          {isRecording && (
            <span
              style={{
                marginLeft: 'clamp(8px, 2vw, 20px)',
                color: '#ff6b6b',
                textShadow: '0 0 5px #ff6b6b',
              }}
            >
              🔴 LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
