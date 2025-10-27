import React, { useState, useEffect, useRef } from 'react';
import type {
  InstrumentType,
  DrumType,
  BassString,
  WaveformType,
} from '../../../shared/types/music.js';
import { DrumKit } from './DrumKit.js';
import { Piano } from './Piano.js';
import { Bass } from './Bass.js';
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
};

const INSTRUMENTS: InstrumentConfig[] = [
  {
    type: 'drums',
    name: '🥁 BEAT BLASTER',
    icon: '🥁',
    description: 'DROP SICK BEATS AND CRUSH RHYTHMS',
    color: '#ff6b6b',
  },
  {
    type: 'piano',
    name: '🎹 MELODY MASTER',
    icon: '🎹',
    description: 'CREATE EPIC MELODIES AND HARMONIES',
    color: '#4ecdc4',
  },
  {
    type: 'bass',
    name: '🎸 BASS DESTROYER',
    icon: '🎸',
    description: 'LAY DOWN THE FOUNDATION WITH DEEP BASS',
    color: '#45b7d1',
  },
  {
    type: 'synth',
    name: '🎺 SYNTH MASTER',
    icon: '🎺',
    description: 'CRAFT ELECTRONIC SOUNDS AND SYNTHESIS',
    color: '#5f27cd',
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

      // Check browser compatibility first
      const compatibility = BrowserCompatibility.checkCompatibility();
      console.log('Browser compatibility check:', compatibility);

      if (!compatibility.isSupported) {
        throw new Error(`Browser not supported: ${compatibility.missingFeatures.join(', ')}`);
      }

      // Check Web Audio API availability
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        throw new Error('Web Audio API not available');
      }

      console.log('Creating DhwaniAudioEngine instance...');
      audioEngineRef.current = new DhwaniAudioEngine();

      console.log('Initializing audio engine...');
      await audioEngineRef.current.initialize();

      console.log('Audio engine initialized successfully');
      setAudioInitialized(true);

      // Test audio playback
      console.log('Testing audio playback...');
      audioEngineRef.current.playNote('drums', 'kick', 0.5);
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Show more detailed error message
      const errorMessage = error.message || 'Unknown error occurred';
      alert(
        `Audio initialization failed: ${errorMessage}\n\nPlease check your browser permissions and try again.`
      );
    } finally {
      setAudioInitializing(false);
    }
  };

  // Auto-initialize audio engine on mount (with user interaction)
  useEffect(() => {
    // Try to initialize audio engine automatically
    // This will work if the user has already interacted with the page
    const autoInitialize = async () => {
      try {
        // Check if we can initialize without user interaction
        if (window.AudioContext || (window as any).webkitAudioContext) {
          console.log('Attempting automatic audio initialization...');
          await initializeAudio();
        }
      } catch (error) {
        console.log(
          'Automatic audio initialization failed, user interaction required:',
          error.message
        );
        // This is expected - we'll show the button for user interaction
      }
    };

    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(autoInitialize, 100);

    return () => {
      clearTimeout(timeoutId);
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  // Update audio engine's current instrument when selection changes
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setCurrentInstrument(selectedInstrument);
    }
  }, [selectedInstrument]);

  const handleInstrumentChange = async (instrument: InstrumentType) => {
    if (instrument === selectedInstrument) return;

    setIsTransitioning(true);

    // Small delay for smooth transition effect
    setTimeout(() => {
      setSelectedInstrument(instrument);
      setIsTransitioning(false);
    }, 150);
  };

  const handleDrumPlay = (drum: DrumType, velocity: number) => {
    // Play audio if engine is ready
    if (audioEngineRef.current && audioInitialized) {
      audioEngineRef.current.playNote('drums', drum, velocity);
    }
    // Also call the callback for recording/tracking
    onNotePlay('drums', drum, velocity);
  };

  const handlePianoPlay = (note: string, velocity: number) => {
    // Play audio if engine is ready
    if (audioEngineRef.current && audioInitialized) {
      audioEngineRef.current.playNote('piano', note, velocity);
    }
    // Also call the callback for recording/tracking
    onNotePlay('piano', note, velocity);
  };

  const handleBassPlay = (bassString: BassString, fret: number) => {
    // Convert bass string and fret to note name
    const stringNotes = {
      'E': ['E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2'],
      'A': ['A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2'],
      'D': ['D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3'],
      'G': ['G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3'],
    };

    const note = stringNotes[bassString][fret];
    if (note) {
      // Play audio if engine is ready
      if (audioEngineRef.current && audioInitialized) {
        audioEngineRef.current.playNote('bass', note, 0.8);
      }
      // Also call the callback for recording/tracking
      onNotePlay('bass', note, 0.8);
    }
  };

  const handleSynthPlay = (note: string, velocity: number, waveform: WaveformType) => {
    // Play audio if engine is ready
    if (audioEngineRef.current && audioInitialized) {
      audioEngineRef.current.playNote('synth', note, velocity);
    }
    // Also call the callback for recording/tracking
    onNotePlay('synth', note, velocity);
  };

  const getInstrumentButtonStyle = (instrument: InstrumentConfig) => {
    const isSelected = instrument.type === selectedInstrument;

    return {
      padding: '16px 20px',
      margin: '6px',
      borderRadius: '0px',
      border: `4px solid ${isSelected ? instrument.color : '#666'}`,
      background: isSelected
        ? `linear-gradient(135deg, ${instrument.color}, ${instrument.color}dd)`
        : 'linear-gradient(135deg, #444, #333)',
      color: isSelected ? 'white' : '#ccc',
      cursor: 'pointer',
      userSelect: 'none' as const,
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '6px',
      minWidth: '120px',
      fontSize: '12px',
      fontWeight: 'bold',
      fontFamily: "'Press Start 2P', monospace",
      boxShadow: isSelected
        ? `6px 6px 0px #333, 0 8px 25px ${instrument.color}60`
        : '4px 4px 0px #333, 0 4px 15px rgba(0,0,0,0.4)',
      transform: isSelected ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
      textShadow: isSelected ? '2px 2px 0px #333' : '1px 1px 0px #333',
    };
  };

  const renderCurrentInstrument = () => {
    if (isTransitioning) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            color: 'white',
            fontSize: '16px',
          }}
        >
          Switching instruments...
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
      case 'bass':
        return (
          <Bass
            onNotePlay={handleBassPlay}
            isRecording={isRecording}
            selectedFret={0}
            activeNotes={activeNotes}
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
        padding: '24px',
        background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
        borderRadius: '0px',
        width: '100%',
        minHeight: '450px',
        border: '4px solid #444',
        boxShadow: '6px 6px 0px #333, 0 10px 30px rgba(0,0,0,0.5)',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Audio Status */}
      {!audioInitialized && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '20px',
            background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
            borderRadius: '16px',
            border: '2px solid #ffa500',
            boxShadow: '0 8px 20px rgba(255, 165, 0, 0.3)',
          }}
        >
          <div
            style={{
              color: '#ffa500',
              fontSize: '16px',
              marginBottom: '12px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              textShadow: '2px 2px 0px #333',
            }}
          >
            🔊 AUDIO ENGINE READY TO LAUNCH!
          </div>
          <p
            style={{
              color: '#ccc',
              fontSize: '10px',
              marginBottom: '16px',
              lineHeight: '1.4',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            CLICK BELOW TO POWER UP THE AUDIO ENGINE AND START YOUR MUSICAL BATTLE!
          </p>
          <button
            onClick={() => {
              console.log('POWER UP AUDIO ENGINE button clicked!');
              initializeAudio();
            }}
            disabled={audioInitializing || audioInitialized}
            style={{
              padding: '16px 32px',
              background: audioInitialized
                ? 'linear-gradient(135deg, #00ff00, #00cc00)'
                : audioInitializing
                  ? 'linear-gradient(135deg, #ffff00, #ffcc00)'
                  : 'linear-gradient(135deg, #4ecdc4, #45b7d1)',
              color: 'white',
              border: '4px solid #333',
              borderRadius: '0px',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: "'Press Start 2P', monospace",
              cursor: audioInitializing || audioInitialized ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '6px 6px 0px #333',
              textShadow: '2px 2px 0px #333',
              opacity: audioInitializing || audioInitialized ? 0.7 : 1,
            }}
            onMouseOver={(e) => {
              if (!audioInitializing && !audioInitialized) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #45b7d1, #4ecdc4)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseOut={(e) => {
              if (!audioInitializing && !audioInitialized) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4ecdc4, #45b7d1)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {audioInitialized
              ? '✅ AUDIO ENGINE READY!'
              : audioInitializing
                ? '⏳ INITIALIZING...'
                : '🎵 POWER UP AUDIO ENGINE'}
          </button>
        </div>
      )}

      {/* Instrument Selection */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            textAlign: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '20px',
            fontFamily: "'Press Start 2P', monospace",
            textShadow: '3px 3px 0px #ff6b6b',
          }}
        >
          🎮 CHOOSE YOUR WEAPON {audioInitialized && '🔊'}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '20px',
            background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
            borderRadius: '16px',
            border: '2px solid #444',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
          }}
        >
          {INSTRUMENTS.map((instrument) => (
            <button
              key={instrument.type}
              style={getInstrumentButtonStyle(instrument)}
              onClick={() => handleInstrumentChange(instrument.type)}
              disabled={isTransitioning}
            >
              <span style={{ fontSize: '24px' }}>{instrument.icon}</span>
              <span>{instrument.name}</span>
              <span
                style={{
                  fontSize: '11px',
                  opacity: 0.8,
                  fontWeight: 'normal',
                }}
              >
                {instrument.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Instrument Interface */}
      <div
        style={{
          minHeight: '300px',
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
          marginTop: '20px',
          textAlign: 'center',
          color: '#aaa',
          fontSize: '10px',
          fontWeight: 'bold',
          fontFamily: "'Press Start 2P', monospace",
          textShadow: '1px 1px 0px #333',
        }}
      >
        🎯 ACTIVE: {INSTRUMENTS.find((i) => i.type === selectedInstrument)?.name}
        {isRecording && (
          <span
            style={{
              marginLeft: '20px',
              color: '#ff6b6b',
              fontWeight: 'bold',
              animation: 'pulse 1s infinite',
            }}
          >
            🔴 LIVE RECORDING
          </span>
        )}
      </div>
    </div>
  );
};
