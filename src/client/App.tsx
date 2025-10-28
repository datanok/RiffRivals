import React, { useState, useCallback, useEffect, useRef } from 'react';
import type {
  CompositionData,
  TrackData,
  UIMode,
  InstrumentType,
  ChallengeScore,
  ChallengeType,
  DrumType,
} from '../shared/index.js';
import { DhwaniAudioEngine } from './audio/DhwaniAudioEngine.js';

// Local type definitions for challenge system
type PianoNote = 'C4' | 'D4' | 'E4' | 'F4' | 'G4' | 'A4' | 'B4' | 'C5';
type BassNote = 'E2' | 'A2' | 'D3' | 'G3';
type SynthNote =
  | 'C4'
  | 'C#4'
  | 'D4'
  | 'D#4'
  | 'E4'
  | 'F4'
  | 'F#4'
  | 'G4'
  | 'G#4'
  | 'A4'
  | 'A#4'
  | 'B4'
  | 'C5';
import { RiffPost } from './components/RiffPost.js';
import { JamReply } from './components/JamReply.js';
import { CompositionManager } from './components/CompositionManager.js';
import { InstrumentSelector } from './components/instruments/InstrumentSelector.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { LoadingState } from './components/LoadingSpinner.js';
import { ErrorMessage } from './components/ErrorMessage.js';
import { BrowserCompatibilityCheck } from './components/BrowserCompatibilityCheck.js';
import { GameMechanics } from './components/GameMechanics.js';
import { VisualEffects } from './components/VisualEffects.js';
import { ChallengeSelector } from './components/ChallengeSelector.js';
import { ReplicationChallenge } from './components/ReplicationChallenge.js';
import { ChallengeResults } from './components/ChallengeResults.js';
import { Leaderboard } from './components/Leaderboard.js';
import { FallingNotesChallenge } from './components/FallingNotesChallenge.js';
import { ErrorHandler, type DhwaniError } from './utils/errorHandling.js';
import { playButtonClick } from './utils/audioFeedback.js';
import { createDefaultChallenges } from './utils/improved_predefined_songs.js';

// Initialize predefined challenges using the improved system
const initializeChallenges = () => {
  return createDefaultChallenges();
};

// Local difficulty calculation (temporary until shared utils are properly configured)
const calculateChallengeMetadata = (
  track: TrackData,
  challengeType: 'falling_notes' | 'replication' | 'both',
  baseDifficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'auto'
) => {
  const { notes, instrument, duration } = track;

  if (notes.length === 0) {
    return {
      calculatedDifficulty: 0,
      adjustedDifficulty: 0,
      scoringWeights: { timing: 0.5, accuracy: 0.5 },
      difficultyLabel: 'Easy',
      estimatedDuration: duration,
      noteCount: 0,
      complexity: {
        noteDensity: 0,
        noteVariety: 0,
        timingComplexity: 0,
      },
    };
  }

  // Simple difficulty calculation
  const instrumentWeights: Record<InstrumentType, number> = {
    drums: 1.0,
    piano: 1.2,
    bass: 1.1,
    synth: 1.3,
  };

  const noteDensity = notes.length / duration;
  const uniqueNotes = new Set(notes.map((n) => n.note)).size;
  const varietyScore = (uniqueNotes / notes.length) * 100;

  const baseScore = (noteDensity * 10 + varietyScore) * instrumentWeights[instrument];
  const calculatedDifficulty = Math.min(100, Math.max(0, baseScore));

  const baseMultipliers: Record<string, number> = {
    easy: 0.6,
    medium: 0.8,
    hard: 1.2,
    expert: 1.5,
    auto: 1.0,
  };

  const adjustedDifficulty = calculatedDifficulty * (baseMultipliers[baseDifficulty] || 1.0);

  const scoringWeights =
    challengeType === 'falling_notes'
      ? { timing: 0.7, accuracy: 0.3 }
      : challengeType === 'replication'
        ? { timing: 0.3, accuracy: 0.7 }
        : { timing: 0.5, accuracy: 0.5 };

  return {
    calculatedDifficulty,
    adjustedDifficulty: Math.min(100, Math.max(0, adjustedDifficulty)),
    scoringWeights,
    difficultyLabel:
      adjustedDifficulty >= 75
        ? 'Expert'
        : adjustedDifficulty >= 50
          ? 'Hard'
          : adjustedDifficulty >= 25
            ? 'Medium'
            : 'Easy',
    estimatedDuration: duration,
    noteCount: notes.length,
    complexity: {
      noteDensity,
      noteVariety: uniqueNotes,
      timingComplexity: 0,
    },
  };
};

type AppState = {
  mode: UIMode;
  currentPostId: string | null;
  currentComposition: CompositionData | null;
  username: string | null;
  // Challenge system state
  availableChallenges: CompositionData[];
  selectedChallenge: CompositionData | null;
  selectedLayerIndex: number; // Which instrument layer to play
  currentChallengeType: 'falling_notes' | 'replication';
  challengeScore: ChallengeScore | null;
  personalBest: ChallengeScore | null;
  leaderboardScores: ChallengeScore[];
};

// Predefined songs for challenge mode
const PREDEFINED_SONGS = [
  {
    id: 'song1',
    name: '🎶 TWINKLE TWINKLE LITTLE STAR',
    description: 'Classic nursery melody, perfect for beginners.',
    instrument: 'piano' as InstrumentType,
    difficulty: 'easy' as const,
    pattern: [
      'C4',
      'C4',
      'G4',
      'G4',
      'A4',
      'A4',
      'G4',
      'F4',
      'F4',
      'E4',
      'E4',
      'D4',
      'D4',
      'C4',
      'G4',
      'G4',
      'F4',
      'F4',
      'E4',
      'E4',
      'D4',
      'G4',
      'G4',
      'F4',
      'F4',
      'E4',
      'E4',
      'D4',
      'C4',
      'C4',
      'G4',
      'G4',
      'A4',
      'A4',
      'G4',
    ],
    duration: 20000, // 20s
  },
  {
    id: 'song2',
    name: '🎹 FUR ELISE',
    description: 'Beethoven’s famous classical piano intro.',
    instrument: 'piano' as InstrumentType,
    difficulty: 'medium' as const,
    pattern: [
      'E5',
      'D#5',
      'E5',
      'D#5',
      'E5',
      'B4',
      'D5',
      'C5',
      'A4',
      'C4',
      'E4',
      'A4',
      'B4',
      'E4',
      'G#4',
      'B4',
      'C5',
      'E5',
      'D#5',
      'E5',
      'D#5',
      'E5',
      'B4',
      'D5',
      'C5',
      'A4',
    ],
    duration: 25000,
  },
  {
    id: 'song3',
    name: '🎸 SMOKE ON THE WATER',
    description: 'Deep Purple’s iconic rock riff.',
    instrument: 'guitar' as InstrumentType,
    difficulty: 'easy' as const,
    pattern: ['E3', 'G3', 'A3', 'E3', 'G3', 'A#3', 'A3', 'E3', 'G3', 'A3', 'G3', 'E3'],
    duration: 15000,
  },
  {
    id: 'song4',
    name: '🎸 SEVEN NATION ARMY',
    description: 'The White Stripes’ unforgettable bass riff.',
    instrument: 'bass' as InstrumentType,
    difficulty: 'medium' as const,
    pattern: ['E3', 'E3', 'G3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2'],
    duration: 18000,
  },
  {
    id: 'song5',
    name: '🎹 CANON IN D',
    description: 'Pachelbel’s Canon main progression.',
    instrument: 'piano' as InstrumentType,
    difficulty: 'hard' as const,
    pattern: [
      'D4',
      'A3',
      'B3',
      'F#3',
      'G3',
      'D3',
      'G3',
      'A3',
      'D4',
      'A3',
      'B3',
      'F#3',
      'G3',
      'D3',
      'G3',
      'A3',
    ],
    duration: 30000,
  },
  {
    id: 'song6',
    name: '🎵 MARY HAD A LITTLE LAMB',
    description: 'Simple children’s song for timing practice.',
    instrument: 'piano' as InstrumentType,
    difficulty: 'easy' as const,
    pattern: [
      'E4',
      'D4',
      'C4',
      'D4',
      'E4',
      'E4',
      'E4',
      'D4',
      'D4',
      'D4',
      'E4',
      'G4',
      'G4',
      'E4',
      'D4',
      'C4',
      'D4',
      'E4',
      'E4',
      'E4',
    ],
    duration: 18000,
  },
  {
    id: 'song7',
    name: '🎶 BELIEVER - IMAGINE DRAGONS',
    description: 'Simplified lead synth pattern for rhythm mode.',
    instrument: 'synth' as InstrumentType,
    difficulty: 'medium' as const,
    pattern: [
      'E4',
      'E4',
      'F4',
      'G4',
      'G4',
      'G4',
      'E4',
      'D4',
      'C4',
      'E4',
      'F4',
      'G4',
      'E4',
      'D4',
      'C4',
      'D4',
      'E4',
    ],
    duration: 22000,
  },
  {
    id: 'song8',
    name: '🥁 WE WILL ROCK YOU',
    description: 'Drum stomp-clap pattern for rhythm timing.',
    instrument: 'drums' as InstrumentType,
    difficulty: 'easy' as const,
    pattern: [
      'kick',
      'kick',
      'snare',
      'kick',
      'kick',
      'snare',
      'kick',
      'kick',
      'snare',
      'kick',
      'kick',
      'snare',
    ],
    duration: 18000,
  },
  {
    id: 'song9',
    name: '🎸 HOTEL CALIFORNIA',
    description: 'Guitar chord pattern from Eagles’ classic.',
    instrument: 'guitar' as InstrumentType,
    difficulty: 'hard' as const,
    pattern: [
      'B4',
      'F#4',
      'A4',
      'E4',
      'G4',
      'D4',
      'E4',
      'F#4',
      'B4',
      'F#4',
      'A4',
      'E4',
      'G4',
      'D4',
      'E4',
      'F#4',
    ],
    duration: 35000,
  },
  {
    id: 'song10',
    name: '🎹 LET IT BE - THE BEATLES',
    description: 'Beautiful piano chord progression.',
    instrument: 'piano' as InstrumentType,
    difficulty: 'medium' as const,
    pattern: ['C4', 'G3', 'A3', 'F3', 'C4', 'G3', 'F3', 'C4', 'A3', 'F3', 'C4', 'G3', 'F3', 'C4'],
    duration: 30000,
  },
];

// FallingNotesMode component for the Guitar Hero style challenge
const FallingNotesMode: React.FC = () => {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const audioEngineRef = useRef<DhwaniAudioEngine | null>(null);

  // Initialize audio engine for challenges
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        audioEngineRef.current = new DhwaniAudioEngine();
        // Don't initialize immediately - wait for user interaction
        console.log('Challenge audio engine created, will initialize on first interaction');
      } catch (error) {
        console.error('Failed to create challenge audio engine:', error);
      }
    };

    void initializeAudio();

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  const handleNoteHit = useCallback(async (note: string, velocity: number) => {
    // Ensure audio engine is initialized and ready
    if (audioEngineRef.current) {
      try {
        // Make sure audio engine is initialized
        if (audioEngineRef.current.getState() === 'idle') {
          console.log('FallingNotesMode: Initializing audio engine on first note hit');
          await audioEngineRef.current.initialize();
        }

        console.log('FallingNotesMode: Playing note:', note, 'on drums');
        audioEngineRef.current.playNote('drums', note, velocity);
      } catch (error) {
        console.error('FallingNotesMode: Error playing note:', error);
      }
    } else {
      console.warn('FallingNotesMode: Audio engine not available');
    }
    console.log('Note hit:', note, velocity);
  }, []);

  const handleScoreUpdate = useCallback((_score: number, _accuracy: number) => {
    // Score updates handled internally by FallingNotesChallenge
  }, []);

  const handleChallengeComplete = useCallback(() => {
    setIsChallengeActive(false);
    // Could show results screen here
  }, []);

  if (isChallengeActive) {
    const selectedSongData = PREDEFINED_SONGS.find((song) => song.id === selectedSong);
    return (
      <div className="max-w-4xl mx-auto p-6">
        <FallingNotesChallenge
          instrument="drums"
          onNoteHit={handleNoteHit}
          onScoreUpdate={handleScoreUpdate}
          difficulty={selectedSongData?.difficulty || difficulty}
          isActive={isChallengeActive}
          onComplete={handleChallengeComplete}
          songPattern={selectedSongData?.pattern as (DrumType | PianoNote | BassNote | SynthNote)[]}
          audioEngine={audioEngineRef.current}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div
        className="bg-gradient-to-br from-purple-800 to-blue-800 rounded-2xl border-4 border-purple-400 p-8 shadow-2xl"
        style={{
          borderStyle: 'solid',
          borderWidth: '4px',
          borderImage:
            'repeating-linear-gradient(45deg, #ff6b6b, #ff6b6b 8px, #4ecdc4 8px, #4ecdc4 16px) 1',
          borderRadius: '0px',
        }}
      >
        <h2
          className="text-3xl font-bold text-white mb-4 text-center drop-shadow-lg"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            textShadow: '3px 3px 0px #ff6b6b, 6px 6px 0px #4ecdc4',
          }}
        >
          🥁 DRUM RHYTHM CHALLENGE
        </h2>
        <p
          className="text-purple-100 mb-8 text-center text-lg"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
        >
          CHOOSE A SONG AND HIT THE DRUM NOTES AS THEY FALL! LIKE DRUM HERO!
        </p>

        {/* Song Selection */}
        <div className="mb-8">
          <h3
            className="text-xl font-bold text-white mb-4 text-center"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px' }}
          >
            🎵 CHOOSE A SONG
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PREDEFINED_SONGS.map((song) => (
              <button
                key={song.id}
                onClick={() => {
                  setSelectedSong(song.id);
                  setDifficulty(song.difficulty);
                }}
                className={`p-4 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg ${
                  selectedSong === song.id
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                }`}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '10px',
                  border: '3px solid #333',
                  boxShadow: '6px 6px 0px #333',
                  borderRadius: '0px',
                }}
              >
                <div className="text-center">
                  <div className="text-lg mb-2">{song.name}</div>
                  <div className="text-xs opacity-80 mb-2">{song.description}</div>
                  <div className="text-xs">🥁 DRUMS • {song.difficulty.toUpperCase()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Challenge Button */}
        <div className="text-center">
          <button
            onClick={() => setIsChallengeActive(true)}
            disabled={!selectedSong}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-xl text-lg"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '12px',
              border: '4px solid #333',
              boxShadow: '8px 8px 0px #333',
              borderRadius: '0px',
            }}
          >
            🚀 START CHALLENGE!
          </button>
        </div>

        {/* Instructions */}
        <div
          className="mt-8 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border-2 border-purple-300"
          style={{
            borderRadius: '0px',
            borderStyle: 'solid',
            borderWidth: '2px',
            borderImage:
              'repeating-linear-gradient(90deg, #ff6b6b, #ff6b6b 4px, #4ecdc4 4px, #4ecdc4 8px) 1',
          }}
        >
          <h4
            className="text-lg font-bold text-white mb-2 text-center"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
          >
            🎮 HOW TO PLAY
          </h4>
          <ul
            className="text-purple-100 text-sm space-y-1"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
          >
            <li>• CHOOSE A SONG TO PLAY ON DRUMS</li>
            <li>• NOTES WILL FALL FROM THE TOP OF THE SCREEN</li>
            <li>• HIT THE CORRESPONDING KEY WHEN THE NOTE REACHES THE RED LINE</li>
            <li>• USE KEYS A, S, D, F OR 1, 2, 3, 4 TO HIT NOTES</li>
            <li>• PERFECT TIMING GIVES MORE POINTS AND BUILDS COMBO</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// CreateMode component for handling composition creation
const CreateMode: React.FC<{ onCompositionCreate: (composition: CompositionData) => void }> = ({
  onCompositionCreate,
}) => {
  const [composition, setComposition] = useState<CompositionData>({
    id: `comp_${Date.now()}`,
    layers: [],
    metadata: {
      title: '',
      createdAt: Date.now(),
      collaborators: [],
    },
  });

  const [isRecording, setIsRecording] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [currentTrackNotes, setCurrentTrackNotes] = useState<
    Array<{
      note: string;
      velocity: number;
      timestamp: number;
    }>
  >([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('drums');
  const [gameScore, setGameScore] = useState({ combo: 0, streak: 0 });

  // Challenge mode state
  const [isChallengeMode, setIsChallengeMode] = useState(false);
  const [challengeType, setChallengeType] = useState<'falling_notes' | 'replication' | 'both'>(
    'both'
  );
  const [baseDifficulty, setBaseDifficulty] = useState<'easy' | 'medium' | 'hard' | 'auto'>('auto');
  const [calculatedDifficulty, setCalculatedDifficulty] = useState<number>(0);

  const handleCompositionChange = useCallback((newComposition: CompositionData) => {
    setComposition(newComposition);
  }, []);

  const handleTrackAdd = useCallback(
    (track: TrackData) => {
      const newComposition = {
        ...composition,
        layers: [...composition.layers, track],
      };
      setComposition(newComposition);
    },
    [composition]
  );

  const handleTrackRemove = useCallback(
    (trackId: string) => {
      const newComposition = {
        ...composition,
        layers: composition.layers.filter((track) => track.id !== trackId),
      };
      setComposition(newComposition);
    },
    [composition]
  );

  const handleNotePlay = useCallback(
    (instrument: InstrumentType, note: string, velocity: number) => {
      // Update current instrument if it changed
      if (instrument !== currentInstrument) {
        setCurrentInstrument(instrument);
      }

      // Add to active notes for visual feedback
      setActiveNotes((prev) => new Set([...prev, note]));

      // Remove from active notes after a short delay
      setTimeout(() => {
        setActiveNotes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(note);
          return newSet;
        });
      }, 200);

      // Record the note if recording is active
      if (isRecording) {
        const currentTime = Date.now();
        const relativeTime = (currentTime - recordingStartTime) / 1000; // Convert to seconds

        setCurrentTrackNotes((prev) => [
          ...prev,
          {
            note,
            velocity,
            timestamp: relativeTime,
          },
        ]);
      }
    },
    [isRecording, recordingStartTime, currentInstrument]
  );

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingStartTime(Date.now());
    setCurrentTrackNotes([]);
  }, []);

  const stopRecording = useCallback(() => {
    if (currentTrackNotes.length === 0) {
      alert('No notes recorded. Please play some notes while recording.');
      setIsRecording(false);
      return;
    }

    // Create a new track from recorded notes
    const duration = Math.max(...currentTrackNotes.map((n) => n.timestamp)) + 1; // Add 1 second buffer

    const newTrack: TrackData = {
      id: `track_${Date.now()}`,
      instrument: currentInstrument,
      notes: currentTrackNotes.map((n) => ({
        note: n.note,
        velocity: n.velocity,
        startTime: n.timestamp,
        duration: 0.5, // Default note duration
      })),
      tempo: 120, // Default tempo
      duration,
      userId: 'current_user', // Will be set by server
      timestamp: Date.now(),
    };

    // Calculate challenge metadata if in challenge mode
    if (isChallengeMode) {
      const challengeMetadata = calculateChallengeMetadata(newTrack, challengeType, baseDifficulty);
      setCalculatedDifficulty(challengeMetadata.adjustedDifficulty);

      // Update composition with challenge settings
      const updatedComposition = {
        ...composition,
        metadata: {
          ...composition.metadata,
          challengeSettings: {
            challengeType,
            baseDifficulty,
            calculatedDifficulty: challengeMetadata.calculatedDifficulty,
            scoringWeights: challengeMetadata.scoringWeights,
            allowedAttempts: 3,
            timeLimit: Math.ceil(duration),
            accuracyThreshold: 70,
            leaderboard: [],
          },
        },
      };
      setComposition(updatedComposition);
    }

    handleTrackAdd(newTrack);
    setIsRecording(false);
    setCurrentTrackNotes([]);
  }, [
    currentTrackNotes,
    currentInstrument,
    handleTrackAdd,
    isChallengeMode,
    challengeType,
    baseDifficulty,
    composition,
  ]);

  const clearRecording = useCallback(() => {
    setCurrentTrackNotes([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (composition.layers.length === 0) {
      alert('Please add at least one track before saving');
      return;
    }

    try {
      // Create the riff post
      const response = await fetch('/api/create-riff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackData: composition.layers[0], // For now, use the first track
          title: composition.metadata.title || 'Untitled Riff',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success) {
        onCompositionCreate(composition);
        alert('Riff created successfully!');
      } else {
        alert(`Failed to create riff: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating riff:', error);
      alert('Network error while creating riff');
    }
  }, [composition, onCompositionCreate]);

  const handleScoreUpdate = useCallback((score: { combo: number; streak: number }) => {
    setGameScore({ combo: score.combo, streak: score.streak });
  }, []);

  return (
    <div className="space-y-6">
      {/* Game Mechanics Overlay */}
      <GameMechanics
        isRecording={isRecording}
        noteCount={currentTrackNotes.length}
        onScoreUpdate={handleScoreUpdate}
      />

      {/* Visual Effects Overlay */}
      <VisualEffects
        activeNotes={activeNotes}
        isRecording={isRecording}
        comboCount={gameScore.combo}
        streakCount={gameScore.streak}
      />

      <div
        className="bg-gradient-to-br from-purple-800 to-blue-800 rounded-2xl border-4 border-purple-400 p-8 shadow-2xl"
        style={{
          borderStyle: 'solid',
          borderWidth: '4px',
          borderImage:
            'repeating-linear-gradient(45deg, #ff6b6b, #ff6b6b 8px, #4ecdc4 8px, #4ecdc4 16px) 1',
          borderRadius: '0px',
        }}
      >
        <h2
          className="text-3xl font-bold text-white mb-4 text-center drop-shadow-lg"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            textShadow: '3px 3px 0px #ff6b6b, 6px 6px 0px #4ecdc4',
          }}
        >
          🎮 CREATE YOUR EPIC BEAT
        </h2>
        <p
          className="text-purple-100 mb-8 text-center text-lg"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
        >
          CHOOSE YOUR WEAPON AND DROP SOME SICK BEATS! THE CROWD IS WAITING...
        </p>

        {/* Recording Controls */}
        <div
          className="mb-8 p-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border-2 border-purple-300"
          style={{
            borderRadius: '0px',
            borderStyle: 'solid',
            borderWidth: '2px',
            borderImage:
              'repeating-linear-gradient(90deg, #ff6b6b, #ff6b6b 4px, #4ecdc4 4px, #4ecdc4 8px) 1',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px' }}
            >
              🎤 RECORDING STUDIO
            </h3>
            <div className="flex items-center gap-3">
              {isRecording && (
                <span
                  className="flex items-center gap-2 text-red-400 font-bold text-lg animate-pulse"
                  style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
                >
                  <span
                    className="w-4 h-4 bg-red-500 rounded-full animate-bounce"
                    style={{ borderRadius: '0px' }}
                  ></span>
                  🔴 LIVE RECORDING ({currentTrackNotes.length} NOTES)
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-3"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '10px',
                  border: '3px solid #333',
                  boxShadow: '6px 6px 0px #333',
                  borderRadius: '0px',
                }}
              >
                <span
                  className="w-4 h-4 bg-white rounded-full animate-pulse"
                  style={{ borderRadius: '0px' }}
                ></span>
                🎬 START REC
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 shadow-lg flex items-center gap-3"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '10px',
                  border: '3px solid #333',
                  boxShadow: '6px 6px 0px #333',
                  borderRadius: '0px',
                }}
              >
                <span className="w-4 h-4 bg-white" style={{ borderRadius: '0px' }}></span>
                ⏹️ STOP & ADD
              </button>
            )}

            {currentTrackNotes.length > 0 && (
              <button
                onClick={clearRecording}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '10px',
                  border: '3px solid #333',
                  boxShadow: '6px 6px 0px #333',
                  borderRadius: '0px',
                }}
              >
                🗑️ CLEAR ({currentTrackNotes.length})
              </button>
            )}
          </div>

          {/* Challenge Mode Settings */}
          <div
            className="mb-6 p-4 bg-gradient-to-r from-yellow-800 to-orange-800 rounded-xl border-2 border-yellow-400"
            style={{
              borderRadius: '0px',
              borderStyle: 'solid',
              borderWidth: '2px',
              borderImage:
                'repeating-linear-gradient(90deg, #ffd700, #ffd700 4px, #ff6b6b, #ff6b6b 8px) 1',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4
                className="text-lg font-bold text-white"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
              >
                🏆 CHALLENGE MODE
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChallengeMode}
                  onChange={(e) => setIsChallengeMode(e.target.checked)}
                  className="w-4 h-4"
                />
                <span
                  className="text-white font-bold"
                  style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
                >
                  CREATE AS CHALLENGE
                </span>
              </label>
            </div>

            {isChallengeMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Challenge Type */}
                <div>
                  <label
                    className="block text-yellow-200 font-bold mb-2"
                    style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
                  >
                    CHALLENGE TYPE
                  </label>
                  <div className="flex gap-2">
                    {(['falling_notes', 'replication', 'both'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setChallengeType(type)}
                        className={`px-3 py-2 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg text-xs ${
                          challengeType === type
                            ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                        }`}
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: '6px',
                          border: '2px solid #333',
                          boxShadow: '4px 4px 0px #333',
                          borderRadius: '0px',
                        }}
                      >
                        {type.replace('_', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base Difficulty */}
                <div>
                  <label
                    className="block text-yellow-200 font-bold mb-2"
                    style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
                  >
                    BASE DIFFICULTY
                  </label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard', 'auto'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setBaseDifficulty(diff)}
                        className={`px-3 py-2 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg text-xs ${
                          baseDifficulty === diff
                            ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                        }`}
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: '6px',
                          border: '2px solid #333',
                          boxShadow: '4px 4px 0px #333',
                          borderRadius: '0px',
                        }}
                      >
                        {diff.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Difficulty Preview */}
            {isChallengeMode && calculatedDifficulty > 0 && (
              <div className="mt-4 p-3 bg-black rounded-lg border-2 border-yellow-400">
                <div className="flex justify-between items-center">
                  <span
                    className="text-yellow-200 font-bold"
                    style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
                  >
                    CALCULATED DIFFICULTY:
                  </span>
                  <span
                    className="text-white font-bold"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '12px',
                      color:
                        calculatedDifficulty >= 75
                          ? '#ff6b6b'
                          : calculatedDifficulty >= 50
                            ? '#ffa500'
                            : calculatedDifficulty >= 25
                              ? '#ffd700'
                              : '#45ff45',
                    }}
                  >
                    {calculatedDifficulty.toFixed(0)} -{' '}
                    {calculatedDifficulty >= 75
                      ? 'EXPERT'
                      : calculatedDifficulty >= 50
                        ? 'HARD'
                        : calculatedDifficulty >= 25
                          ? 'MEDIUM'
                          : 'EASY'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Instrument Selector */}
          <div
            className="bg-gradient-to-br from-black to-gray-900 rounded-xl p-6 w-full border-2 border-purple-500 shadow-inner"
            style={{
              borderRadius: '0px',
              borderStyle: 'solid',
              borderWidth: '2px',
              borderImage:
                'repeating-linear-gradient(45deg, #ff6b6b, #ff6b6b 6px, #4ecdc4 6px, #4ecdc4 12px) 1',
            }}
          >
            <InstrumentSelector
              onNotePlay={handleNotePlay}
              isRecording={isRecording}
              activeNotes={activeNotes}
              initialInstrument={currentInstrument}
            />
          </div>
        </div>

        {/* Composition Manager */}
        <CompositionManager
          composition={composition}
          onCompositionChange={handleCompositionChange}
          onTrackAdd={handleTrackAdd}
          onTrackRemove={handleTrackRemove}
          readOnly={false}
        />

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSave}
            disabled={composition.layers.length === 0}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-xl text-lg"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '12px',
              border: '4px solid #333',
              boxShadow: '8px 8px 0px #333',
              borderRadius: '0px',
            }}
          >
            🚀 LAUNCH YOUR BEAT!
          </button>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  const [appState, setAppState] = useState<AppState>({
    mode: 'create',
    currentPostId: null,
    currentComposition: null,
    username: null,
    // Challenge system state
    availableChallenges: initializeChallenges(),
    selectedChallenge: null,
    selectedLayerIndex: 0,
    currentChallengeType: 'falling_notes',
    challengeScore: null,
    personalBest: null,
    leaderboardScores: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DhwaniError | string | null>(null);
  const [isCompatible, setIsCompatible] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const challengeAudioEngineRef = useRef<DhwaniAudioEngine | null>(null);

  // Initialize challenge audio engine
  useEffect(() => {
    const initializeChallengeAudio = async () => {
      try {
        challengeAudioEngineRef.current = new DhwaniAudioEngine();
        // Don't initialize immediately - wait for user interaction
        console.log('Main challenge audio engine created, will initialize on first use');
      } catch (error) {
        console.error('Failed to create main challenge audio engine:', error);
      }
    };

    void initializeChallengeAudio();

    return () => {
      if (challengeAudioEngineRef.current) {
        challengeAudioEngineRef.current.dispose();
      }
    };
  }, []);

  // Global audio initialization on first user interaction
  useEffect(() => {
    const handleFirstInteraction = async () => {
      if (audioInitialized) return;

      try {
        console.log('First user interaction detected, initializing audio...');

        // Create a simple audio context to unlock audio
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          console.log('Audio context unlocked for future use');
          setAudioInitialized(true);
        }
      } catch (error) {
        console.log('Failed to initialize audio on first interaction:', error);
      }
    };

    // Listen for any user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };
  }, [audioInitialized]);

  // Initialize app and get user context
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get initial data from server
        console.log('Attempting to initialize app...');
        const response = await fetch('/api/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Init response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Init failed with status:', response.status, 'Response:', errorText);
          throw new Error(`Server initialization failed (${response.status}): ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Expected JSON but got:', text.substring(0, 200));
          throw new Error('Server returned non-JSON response. This might be a routing issue.');
        }

        const data = await response.json();
        console.log('Init successful, received data:', data);

        if (data.username) {
          setAppState((prev) => ({
            ...prev,
            username: data.username,
            currentPostId: data.postId || null,
          }));

          // If we have a postId, determine the initial mode
          if (data.postId) {
            // Check URL parameters or context to determine if this is a jam reply or challenge
            const urlParams = new URLSearchParams(window.location.search);
            const mode = urlParams.get('mode') as UIMode;

            if (mode === 'jam' || mode === 'challenge') {
              setAppState((prev) => ({ ...prev, mode }));
            } else {
              setAppState((prev) => ({ ...prev, mode: 'playback' }));
            }
          }
        }
      } catch (err: unknown) {
        console.error('Failed to initialize app:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          type: typeof err,
          err,
        });
        const dhwaniError = ErrorHandler.handleNetworkError(err as Error, '/api/init');
        setError(dhwaniError);
      } finally {
        setLoading(false);
      }
    };

    // Only initialize if browser is compatible
    if (isCompatible) {
      void initializeApp();
    }
  }, [isCompatible]);

  const handleModeChange = useCallback((newMode: UIMode) => {
    console.log('Mode changing to:', newMode);
    setAppState((prev) => ({ ...prev, mode: newMode }));
    setError(null);
  }, []);

  const handleJamRequest = useCallback((composition: CompositionData) => {
    setAppState((prev) => ({
      ...prev,
      mode: 'jam',
      currentComposition: composition,
    }));
  }, []);

  const handleJamReplySubmit = useCallback((success: boolean, message?: string) => {
    if (success) {
      // Return to playback mode and refresh
      setAppState((prev) => ({
        ...prev,
        mode: 'playback',
        currentComposition: null,
      }));

      // Show success message
      alert(message || 'Jam reply posted successfully!');
    } else {
      const dhwaniError = ErrorHandler.createError(
        'reddit_api_error',
        message || 'Failed to post jam reply',
        undefined,
        'medium'
      );
      setError(dhwaniError);
    }
  }, []);

  const handleCancel = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      mode: prev.currentPostId ? 'playback' : 'create',
      currentComposition: null,
    }));
    setError(null);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    // Trigger re-initialization
    setAppState((prev) => ({ ...prev }));
  }, []);

  const handleCompatibilityChecked = useCallback((compatible: boolean) => {
    setIsCompatible(compatible);
    if (!compatible) {
      setLoading(false);
    }
  }, []);

  const handleCompositionCreate = useCallback((composition: CompositionData) => {
    // After creating a composition, switch to playback mode
    setAppState((prev) => ({
      ...prev,
      mode: 'playback',
      currentComposition: composition,
    }));
  }, []);

  // Challenge system handlers
  const handleChallengeSelect = useCallback(
    (challenge: CompositionData, challengeType: ChallengeType) => {
      if (challengeType === 'both') {
        // For 'both' type, default to falling_notes
        challengeType = 'falling_notes';
      }
      setAppState((prev) => ({
        ...prev,
        selectedChallenge: challenge,
        currentChallengeType: challengeType as 'falling_notes' | 'replication',
        mode: challengeType === 'falling_notes' ? 'falling_notes' : 'replication_challenge',
      }));
    },
    []
  );

  const handleChallengeComplete = useCallback((score: ChallengeScore) => {
    setAppState((prev) => ({
      ...prev,
      challengeScore: score,
      mode: 'challenge_results',
    }));
  }, []);

  const handleChallengeRetry = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      challengeScore: null,
      mode:
        prev.currentChallengeType === 'falling_notes' ? 'falling_notes' : 'replication_challenge',
    }));
  }, []);

  const handleChallengeBackToMenu = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      selectedChallenge: null,
      challengeScore: null,
      mode: 'challenge_select',
    }));
  }, []);

  // Debug current app state
  console.log('App: Current state:', {
    mode: appState.mode,
    hasSelectedChallenge: !!appState.selectedChallenge,
    hasCurrentPostId: !!appState.currentPostId,
    hasCurrentComposition: !!appState.currentComposition,
  });

  // Splash Screen Component
  if (showSplash) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center"
        style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
      >
        <div className="text-center p-8">
          <h1
            className="text-6xl font-bold text-white mb-8 drop-shadow-lg animate-pulse"
            style={{ textShadow: '4px 4px 0px #ff6b6b, 8px 8px 0px #4ecdc4' }}
          >
            🎮 RiffRivals
          </h1>
          <p className="text-xl text-purple-200 mb-8" style={{ fontSize: '12px' }}>
            ARCADE MUSIC BATTLE ARENA
          </p>
          <button
            onClick={async () => {
              // Initialize audio context on user interaction
              try {
                const AudioContextClass =
                  window.AudioContext ||
                  (window as unknown as { webkitAudioContext: typeof AudioContext })
                    .webkitAudioContext;
                if (AudioContextClass) {
                  const tempContext = new AudioContextClass();
                  if (tempContext.state === 'suspended') {
                    await tempContext.resume();
                  }
                  await tempContext.close();
                }
                setAudioInitialized(true);
                playButtonClick();
              } catch (error) {
                console.log('Failed to initialize audio context:', error);
              }
              setShowSplash(false);
            }}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-xl text-lg"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '16px',
              border: '4px solid #333',
              boxShadow: '8px 8px 0px #333',
              borderRadius: '0px',
            }}
          >
            🚀 PLAY GAME
          </button>
          <p className="text-purple-300 mt-4 text-sm" style={{ fontSize: '8px' }}>
            Click to start and enable audio
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserCompatibilityCheck onCompatibilityChecked={handleCompatibilityChecked}>
        <LoadingState
          isLoading={loading}
          error={error ? (typeof error === 'string' ? error : error.message) : null}
          loadingMessage="🎮 Loading RiffRivals Arena..."
          onRetry={handleRetry}
        >
          <div
            className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
            style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
          >
            {/* Header */}
            <header
              className="bg-gradient-to-r from-purple-800 to-blue-800 border-b-4 border-purple-400 shadow-2xl"
              style={{
                borderStyle: 'solid',
                borderWidth: '4px',
                borderImage:
                  'repeating-linear-gradient(45deg, #ff6b6b, #ff6b6b 10px, #4ecdc4 10px, #4ecdc4 20px) 1',
              }}
            >
              <div className="w-full px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1
                      className="text-3xl font-bold text-white drop-shadow-lg"
                      style={{ textShadow: '4px 4px 0px #ff6b6b, 8px 8px 0px #4ecdc4' }}
                    >
                      🎮 RiffRivals
                    </h1>
                    <span
                      className="text-sm text-purple-200 font-medium"
                      style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
                    >
                      ARCADE MUSIC BATTLE
                    </span>
                  </div>

                  {appState.username && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-purple-100 font-medium">
                        Player:{' '}
                        <span className="font-bold text-yellow-300">u/{appState.username}</span>
                      </span>

                      {/* Mode Navigation */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            playButtonClick();
                            handleModeChange('create');
                          }}
                          className={`
                      px-4 py-2 text-sm rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg
                      ${
                        appState.mode === 'create'
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                      }
                    `}
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: '8px',
                            border: '2px solid #333',
                            boxShadow: '4px 4px 0px #333',
                            borderRadius: '0px',
                          }}
                        >
                          🎮 CREATE
                        </button>

                        <button
                          onClick={() => {
                            playButtonClick();
                            handleModeChange('challenge_select');
                          }}
                          className={`
                        px-4 py-2 text-sm rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg
                        ${
                          appState.mode === 'challenge_select' ||
                          appState.mode === 'falling_notes' ||
                          appState.mode === 'replication_challenge'
                            ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                        }
                      `}
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: '8px',
                            border: '2px solid #333',
                            boxShadow: '4px 4px 0px #333',
                            borderRadius: '0px',
                          }}
                        >
                          🏆 CHALLENGES
                        </button>

                        {appState.currentPostId && (
                          <button
                            onClick={() => {
                              playButtonClick();
                              handleModeChange('playback');
                            }}
                            className={`
                        px-4 py-2 text-sm rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg
                        ${
                          appState.mode === 'playback'
                            ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                        }
                      `}
                            style={{
                              fontFamily: "'Press Start 2P', monospace",
                              fontSize: '8px',
                              border: '2px solid #333',
                              boxShadow: '4px 4px 0px #333',
                              borderRadius: '0px',
                            }}
                          >
                            🕹️ ARENA
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-4 py-6">
              {error && (
                <div className="mb-6">
                  <ErrorMessage
                    error={error}
                    onRetry={handleRetry}
                    onDismiss={() => setError(null)}
                    showDetails={false}
                  />
                </div>
              )}

              {/* Render current mode */}
              {appState.mode === 'create' && (
                <CreateMode onCompositionCreate={handleCompositionCreate} />
              )}

              {appState.mode === 'playback' && appState.currentPostId && (
                <RiffPost
                  postId={appState.currentPostId}
                  onJamRequest={handleJamRequest}
                  onCreateFirst={() => handleModeChange('create')}
                  onChallengeRequest={(composition, challengeType) => {
                    console.log(
                      'App: handleChallengeRequest called with:',
                      composition,
                      challengeType
                    );
                    // For post-specific challenges, go directly to the selected challenge mode
                    const newMode =
                      challengeType === 'falling_notes' ? 'falling_notes' : 'replication_challenge';
                    console.log('App: Setting mode to:', newMode);
                    setAppState((prev) => ({
                      ...prev,
                      mode: newMode,
                      currentComposition: composition,
                      selectedChallenge: composition,
                      currentChallengeType: challengeType,
                    }));
                  }}
                />
              )}

              {appState.mode === 'jam' && appState.currentComposition && appState.currentPostId && (
                <JamReply
                  parentComposition={appState.currentComposition}
                  parentPostId={appState.currentPostId}
                  onReplySubmit={handleJamReplySubmit}
                  onCancel={handleCancel}
                />
              )}

              {appState.mode === 'challenge' && <FallingNotesMode />}

              {/* Challenge System Modes */}
              {appState.mode === 'challenge_select' && (
                <ChallengeSelector
                  challenges={appState.availableChallenges}
                  onChallengeSelect={handleChallengeSelect}
                  onBack={() => handleModeChange('create')}
                />
              )}

              {appState.mode === 'falling_notes' && appState.selectedChallenge && (
                <>
                  {console.log(
                    'App: Rendering FallingNotesChallenge with mode:',
                    appState.mode,
                    'selectedChallenge:',
                    appState.selectedChallenge
                  )}
                  {/* Layer/Instrument Selector */}
                  {appState.selectedChallenge.layers.length > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'center',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {appState.selectedChallenge.layers.map((layer, index) => {
                        const instrumentIcons = {
                          drums: '🥁',
                          piano: '🎹',
                          bass: '🎸',
                          synth: '🎛️',
                        };
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              playButtonClick();
                              setAppState((prev) => ({
                                ...prev,
                                selectedLayerIndex: index,
                              }));
                            }}
                            style={{
                              padding: '10px 20px',
                              background:
                                appState.selectedLayerIndex === index
                                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  : '#2a2a3e',
                              color: '#fff',
                              border:
                                appState.selectedLayerIndex === index
                                  ? '3px solid #00ff88'
                                  : '2px solid #444',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontFamily: "'Press Start 2P', monospace",
                              fontSize: '10px',
                              textTransform: 'uppercase',
                              transition: 'all 0.2s',
                            }}
                          >
                            {instrumentIcons[layer.instrument as keyof typeof instrumentIcons]}{' '}
                            {layer.instrument}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <FallingNotesChallenge
                    instrument={
                      appState.selectedChallenge.layers[appState.selectedLayerIndex]?.instrument ||
                      'drums'
                    }
                    onNoteHit={async (note, velocity) => {
                      // Play audio when note is hit
                      console.log('App: Playing note:', note, 'with velocity:', velocity);
                      console.log(
                        'App: Audio engine available:',
                        !!challengeAudioEngineRef.current
                      );

                      if (
                        challengeAudioEngineRef.current &&
                        appState.selectedChallenge?.layers[0]
                      ) {
                        try {
                          // Ensure audio engine is initialized (check the actual initialized state)
                          const engineState = challengeAudioEngineRef.current.getEngineState();
                          if (
                            !engineState.isInitialized &&
                            challengeAudioEngineRef.current.getState() !== 'loading'
                          ) {
                            console.log('App: Initializing audio engine on first note hit');
                            await challengeAudioEngineRef.current.initialize();
                          }

                          const instrument = appState.selectedChallenge.layers[0].instrument;
                          console.log('App: Playing note on instrument:', instrument);
                          challengeAudioEngineRef.current.playNote(instrument, note, velocity);
                        } catch (error) {
                          console.error('App: Error playing note:', error);
                        }
                      } else {
                        console.log('App: Audio engine not available or challenge not selected');
                      }
                    }}
                    onScoreUpdate={(_score, _accuracy) => {
                      // Score updates handled internally
                    }}
                    difficulty="medium"
                    isActive={true}
                    onComplete={() => {
                      // Challenge completed
                    }}
                    songPattern={
                      appState.selectedChallenge.layers[appState.selectedLayerIndex]?.notes.map(
                        (n) => n.note
                      ) as (DrumType | PianoNote | BassNote | SynthNote)[]
                    }
                    songNotes={(() => {
                      const songNotes = appState.selectedChallenge.layers[
                        appState.selectedLayerIndex
                      ]?.notes?.map((note) => ({
                        note: note.note as DrumType | PianoNote | BassNote | SynthNote,
                        startTime: note.startTime,
                        duration: note.duration,
                      }));
                      console.log('App: SongNotes for falling notes:', songNotes);
                      return songNotes || [];
                    })()}
                    challengeMode="challenge"
                    scoreWeights={
                      appState.selectedChallenge.metadata.challengeSettings?.scoringWeights || {
                        timing: 0.5,
                        accuracy: 0.5,
                      }
                    }
                    onChallengeComplete={handleChallengeComplete}
                    audioEngine={challengeAudioEngineRef.current}
                  />
                </>
              )}

              {appState.mode === 'replication_challenge' &&
                appState.selectedChallenge &&
                appState.selectedChallenge.layers[appState.selectedLayerIndex] && (
                  <div>
                    {/* Layer/Instrument Selector */}
                    {appState.selectedChallenge.layers.length > 1 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '10px',
                          justifyContent: 'center',
                          marginBottom: '20px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {appState.selectedChallenge.layers.map((layer, index) => {
                          const instrumentIcons = {
                            drums: '🥁',
                            piano: '🎹',
                            bass: '🎸',
                            synth: '🎛️',
                          };
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                playButtonClick();
                                setAppState((prev) => ({
                                  ...prev,
                                  selectedLayerIndex: index,
                                }));
                              }}
                              style={{
                                padding: '10px 20px',
                                background:
                                  appState.selectedLayerIndex === index
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : '#2a2a3e',
                                color: '#fff',
                                border:
                                  appState.selectedLayerIndex === index
                                    ? '3px solid #00ff88'
                                    : '2px solid #444',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontFamily: "'Press Start 2P', monospace",
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                transition: 'all 0.2s',
                              }}
                            >
                              {instrumentIcons[layer.instrument as keyof typeof instrumentIcons]}{' '}
                              {layer.instrument}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <ReplicationChallenge
                      targetTrack={appState.selectedChallenge.layers[appState.selectedLayerIndex]!}
                      instrument={
                        appState.selectedChallenge.layers[appState.selectedLayerIndex]!.instrument
                      }
                      onNotePlay={(_note, _velocity) => {
                        // Audio is handled internally in ReplicationChallenge
                      }}
                      onScoreUpdate={(_score, _accuracy) => {
                        // Score updates handled internally
                      }}
                      difficulty="medium"
                      isActive={true}
                      onComplete={() => {
                        // Challenge completed
                      }}
                      challengeMode="challenge"
                      scoreWeights={
                        appState.selectedChallenge.metadata.challengeSettings?.scoringWeights || {
                          timing: 0.5,
                          accuracy: 0.5,
                        }
                      }
                      onChallengeComplete={handleChallengeComplete}
                      audioEngine={challengeAudioEngineRef.current}
                    />
                  </div>
                )}

              {appState.mode === 'challenge_results' && appState.challengeScore && (
                <ChallengeResults
                  score={appState.challengeScore}
                  onRetry={handleChallengeRetry}
                  onShare={() => {
                    // Handle share functionality
                  }}
                  onBackToMenu={handleChallengeBackToMenu}
                  personalBest={
                    appState.personalBest || {
                      userId: 'current_user',
                      accuracy: 0,
                      timing: 0,
                      timingScore: 0,
                      accuracyScore: 0,
                      combinedScore: 0,
                      perfectHits: 0,
                      greatHits: 0,
                      goodHits: 0,
                      missedNotes: 0,
                      completedAt: Date.now(),
                      originalTrackId: '',
                      challengeType: 'falling_notes',
                    }
                  }
                  leaderboardPosition={1} // This would be calculated from leaderboard
                />
              )}

              {appState.mode === 'leaderboard' && appState.selectedChallenge && (
                <Leaderboard
                  scores={appState.leaderboardScores}
                  currentUserId={appState.username || 'current_user'}
                  onScoreClick={(_score) => {
                    // Handle score click
                  }}
                />
              )}

              {/* Fallback for unknown states */}
              {!appState.currentPostId && appState.mode === 'playback' && (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6 animate-bounce">🎮</div>
                  <h2
                    className="text-4xl font-bold text-white mb-4 drop-shadow-lg"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      textShadow: '4px 4px 0px #ff6b6b, 8px 8px 0px #4ecdc4',
                    }}
                  >
                    WELCOME TO RIFFRIVALS!
                  </h2>
                  <p
                    className="text-purple-200 mb-8 text-xl"
                    style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px' }}
                  >
                    THE ULTIMATE MUSIC BATTLE ARENA WHERE BEATS COLLIDE AND LEGENDS ARE BORN
                  </p>
                  <button
                    onClick={() => handleModeChange('create')}
                    className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-bold hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105 shadow-xl text-lg"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '12px',
                      border: '4px solid #333',
                      boxShadow: '8px 8px 0px #333',
                      borderRadius: '0px',
                    }}
                  >
                    🎮 START YOUR MUSICAL JOURNEY
                  </button>
                </div>
              )}
            </main>

            {/* Footer */}
            <footer
              className="bg-gradient-to-r from-purple-800 to-blue-800 border-t-4 border-purple-400 mt-12"
              style={{
                borderStyle: 'solid',
                borderWidth: '4px',
                borderImage:
                  'repeating-linear-gradient(45deg, #ff6b6b, #ff6b6b 10px, #4ecdc4 10px, #4ecdc4 20px) 1',
              }}
            >
              <div className="w-full px-4 py-6">
                <div
                  className="flex items-center justify-center gap-6 text-sm text-purple-200"
                  style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
                >
                  <span className="font-bold">🎮 BUILT FOR RIFFRIVALS</span>
                  <span className="text-purple-400">|</span>
                  <span>POWERED BY TONE.JS</span>
                  <span className="text-purple-400">|</span>
                  <span className="font-bold">🎵 BATTLE WITH BEATS!</span>
                </div>
              </div>
            </footer>
          </div>
        </LoadingState>
      </BrowserCompatibilityCheck>
    </ErrorBoundary>
  );
};
