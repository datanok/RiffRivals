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
import {
  ChallengeScoreSubmission,
  type ChallengeScoreSubmissionData,
} from './components/ChallengeScoreSubmission.js';
import { ChallengeAnalytics } from './components/ChallengeAnalytics.js';
import { JamReply } from './components/JamReply.js';
import { FallingNotesChallenge } from './components/FallingNotesChallenge.js';
import { SimplifiedCreateMode } from './components/SimplifiedCreateMode.js';
import { ChartEditor } from './components/ChartEditor.js';
import { RemixChallenge } from './components/RemixChallenge.js';
import { ErrorHandler, type DhwaniError } from './utils/errorHandling.js';
import { DynamicSplashScreen } from './components/DynamicSplashScreen.js';
import { playButtonClick } from './utils/audioFeedback.js';
import { createDefaultChallenges } from './utils/improved_predefined_songs.js';
import type { ChartData } from '../shared/types/music.js';

// Initialize predefined challenges using the improved system
const initializeChallenges = () => {
  return createDefaultChallenges();
};

// Local difficulty calculation (temporary until shared utils are properly configured)
const calculateChallengeMetadata = (
  track: TrackData,
  challengeType: ChallengeType | 'both', // Support legacy 'both' type
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
    challengeType === 'falling_tiles'
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
  remixParentPostId: string | null; // For remix mode
  // Challenge system state
  availableChallenges: CompositionData[];
  selectedChallenge: CompositionData | null;
  selectedLayerIndex: number; // Which instrument layer to play
  currentChallengeType: ChallengeType; // 'replication' | 'falling_tiles'
  challengeScore: ChallengeScore | null;
  personalBest: ChallengeScore | null;
  leaderboardScores: ChallengeScore[];
  isChallengeActive: boolean; // Control whether challenge has started
  showScoreSubmission: boolean; // Show score submission interface
  // Jam session state
  jamSessionPostId: string | null;
  jamSessionComposition: CompositionData | null;
  // Jam creation state
  jamCreationComposition: CompositionData | null;
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
  const [challengeType, setChallengeType] = useState<ChallengeType | 'both'>('both');
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

      // Convert 'both' to a proper ChallengeType
      const finalChallengeType: ChallengeType =
        challengeType === 'both' ? 'falling_tiles' : challengeType;

      // Update composition with challenge settings
      const updatedComposition = {
        ...composition,
        metadata: {
          ...composition.metadata,
          challengeSettings: {
            challengeType: finalChallengeType,
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
                    {(['falling_tiles', 'replication', 'both'] as const).map((type) => (
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

// Recent Jam Sessions Component
const RecentJamSessions: React.FC<{
  onJoinJam: (postId: string) => void;
}> = ({ onJoinJam }) => {
  const [jamSessions, setJamSessions] = useState<
    Array<{
      postId: string;
      title: string;
      collaborators: string[];
      layerCount: number;
      createdAt: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJamSessions = async () => {
      try {
        const response = await fetch('/api/get-recent-jams');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setJamSessions(data.jamSessions || []);
          }
        }
      } catch (error) {
        console.error('Error fetching jam sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchJamSessions();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
          border: '3px solid #4ecdc4',
          padding: 'clamp(16px, 3vw, 24px)',
          borderRadius: '0',
          boxShadow: '0 0 15px rgba(78, 205, 196, 0.3), inset 0 0 15px rgba(78, 205, 196, 0.05)',
          marginBottom: 'clamp(20px, 4vh, 40px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: '#4ecdc4',
            fontSize: 'clamp(8px, 1.8vw, 10px)',
            letterSpacing: '2px',
            textShadow: '0 0 5px #4ecdc4',
          }}
        >
          ▸▸▸ LOADING JAM SESSIONS ◂◂◂
        </div>
      </div>
    );
  }

  if (jamSessions.length === 0) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
          border: '3px solid #4ecdc4',
          padding: 'clamp(16px, 3vw, 24px)',
          borderRadius: '0',
          boxShadow: '0 0 15px rgba(78, 205, 196, 0.3), inset 0 0 15px rgba(78, 205, 196, 0.05)',
          marginBottom: 'clamp(20px, 4vh, 40px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: '#4ecdc4',
            fontSize: 'clamp(8px, 1.8vw, 10px)',
            marginBottom: 'clamp(10px, 2vh, 16px)',
            letterSpacing: '2px',
            textShadow: '0 0 5px #4ecdc4',
          }}
        >
          ▸▸▸ RECENT JAM SESSIONS ◂◂◂
        </div>
        <div
          style={{
            color: '#fff',
            fontSize: 'clamp(7px, 1.5vw, 9px)',
            lineHeight: '2',
          }}
        >
          No jam sessions yet. Be the first to start one!
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
        border: '3px solid #4ecdc4',
        padding: 'clamp(16px, 3vw, 24px)',
        borderRadius: '0',
        boxShadow: '0 0 15px rgba(78, 205, 196, 0.3), inset 0 0 15px rgba(78, 205, 196, 0.05)',
        marginBottom: 'clamp(20px, 4vh, 40px)',
      }}
    >
      <div
        style={{
          color: '#4ecdc4',
          fontSize: 'clamp(8px, 1.8vw, 10px)',
          marginBottom: 'clamp(16px, 3vh, 24px)',
          letterSpacing: '2px',
          textShadow: '0 0 5px #4ecdc4',
          textAlign: 'center',
        }}
      >
        ▸▸▸ RECENT JAM SESSIONS ◂◂◂
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'clamp(12px, 2vw, 16px)',
        }}
      >
        {jamSessions.map((jam) => (
          <div
            key={jam.postId}
            onClick={() => onJoinJam(jam.postId)}
            style={{
              background: 'linear-gradient(135deg, #2a2a3e 0%, #1a1a2e 100%)',
              border: '2px solid #4ecdc4',
              padding: 'clamp(12px, 2vw, 16px)',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 0 #000, 0 0 8px rgba(78, 205, 196, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 0 #000, 0 0 12px rgba(78, 205, 196, 0.4)';
              e.currentTarget.style.borderColor = '#00ff88';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 0 #000, 0 0 8px rgba(78, 205, 196, 0.2)';
              e.currentTarget.style.borderColor = '#4ecdc4';
            }}
          >
            <div
              style={{
                color: '#fff',
                fontSize: 'clamp(8px, 1.6vw, 10px)',
                fontWeight: 'bold',
                marginBottom: '8px',
                textShadow: '0 0 3px #4ecdc4',
              }}
            >
              🎵 {jam.title}
            </div>

            <div
              style={{
                color: '#4ecdc4',
                fontSize: 'clamp(6px, 1.2vw, 8px)',
                marginBottom: '6px',
              }}
            >
              {jam.layerCount} LAYERS • {jam.collaborators.length} ARTISTS
            </div>

            {jam.collaborators.length > 0 && (
              <div
                style={{
                  color: '#aaa',
                  fontSize: 'clamp(5px, 1vw, 7px)',
                  marginBottom: '8px',
                }}
              >
                {jam.collaborators.slice(0, 3).join(', ')}
                {jam.collaborators.length > 3 && ` +${jam.collaborators.length - 3} more`}
              </div>
            )}

            <div
              style={{
                color: '#00ff88',
                fontSize: 'clamp(6px, 1.2vw, 8px)',
                fontWeight: 'bold',
                textAlign: 'center',
                marginTop: '8px',
                textShadow: '0 0 3px #00ff88',
              }}
            >
              ▸ CLICK TO JOIN ◂
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Retro Home Screen Component
const RetroHomeScreen: React.FC<{
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}> = ({ setAppState }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        padding: '16px',
        fontFamily: "'Press Start 2P', monospace",
        display: 'flex',
        alignItems: 'center',
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
          linear-gradient(0deg, transparent 24%, rgba(0, 212, 255, 0.05) 25%, rgba(0, 212, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 212, 255, 0.05) 75%, rgba(0, 212, 255, 0.05) 76%, transparent 77%, transparent),
          linear-gradient(90deg, transparent 24%, rgba(0, 212, 255, 0.05) 25%, rgba(0, 212, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 212, 255, 0.05) 75%, rgba(0, 212, 255, 0.05) 76%, transparent 77%, transparent)
        `,
          backgroundSize: '50px 50px',
          opacity: 0.3,
        }}
      />

      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header with pixel border */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'clamp(24px, 5vh, 48px)',
            background: 'linear-gradient(180deg, #1a1a3e 0%, #0f0f2e 100%)',
            padding: 'clamp(16px, 3vh, 24px)',
            border: '4px solid',
            borderImage: 'linear-gradient(45deg, #00d4ff, #ff00ff) 1',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.1)',
            position: 'relative',
          }}
        >
          {/* Scanline effect */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.03) 2px, rgba(0, 212, 255, 0.03) 4px)',
              pointerEvents: 'none',
            }}
          />

          <h1
            style={{
              color: '#00d4ff',
              fontSize: 'clamp(18px, 4vw, 36px)',
              marginBottom: '8px',
              textShadow: '0 0 10px #00d4ff, 2px 2px 0 #ff00ff',
              position: 'relative',
            }}
          >
            🎮 RIFFRIVALS
          </h1>
          <p
            style={{
              color: '#ff00ff',
              fontSize: 'clamp(7px, 1.5vw, 10px)',
              letterSpacing: '2px',
              textShadow: '0 0 5px #ff00ff',
              position: 'relative',
            }}
          >
            ▸ RHYTHM BATTLES BY THE COMMUNITY ◂
          </p>
        </div>

        {/* Mode Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'clamp(12px, 2vw, 20px)',
            marginBottom: 'clamp(20px, 4vh, 40px)',
          }}
        >
          <ModeCard
            emoji="🎸"
            title="CREATE"
            description="Record a musical loop"
            color="#ff6b6b"
            glowColor="rgba(255, 107, 107, 0.4)"
            onClick={() => setAppState((prev) => ({ ...prev, mode: 'create' }))}
          />
          <ModeCard
            emoji="🎼"
            title="CHART"
            description="Design falling tiles"
            color="#4ecdc4"
            glowColor="rgba(78, 205, 196, 0.4)"
            onClick={() => setAppState((prev) => ({ ...prev, mode: 'chart_creator' }))}
          />
          <ModeCard
            emoji="🎮"
            title="PLAY"
            description="Try challenges"
            color="#a29bfe"
            glowColor="rgba(162, 155, 254, 0.4)"
            onClick={() => setAppState((prev) => ({ ...prev, mode: 'challenge_select' }))}
          />
        </div>

        {/* Jam Session Quick Start - HIDDEN (set to false to show) */}
        {false && (
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
              border: '3px solid #ff6b6b',
              padding: 'clamp(16px, 3vw, 24px)',
              borderRadius: '0',
              boxShadow:
                '0 0 15px rgba(255, 107, 107, 0.3), inset 0 0 15px rgba(255, 107, 107, 0.05)',
              position: 'relative',
              marginTop: 'clamp(20px, 4vh, 40px)',
            }}
          >
            <div
              style={{
                color: '#ff6b6b',
                fontSize: 'clamp(8px, 1.8vw, 10px)',
                marginBottom: 'clamp(10px, 2vh, 16px)',
                letterSpacing: '2px',
                textShadow: '0 0 5px #ff6b6b',
                textAlign: 'center',
              }}
            >
              ▸▸▸ JAM SESSION ◂◂◂
            </div>
            <div
              style={{
                color: '#fff',
                fontSize: 'clamp(7px, 1.5vw, 9px)',
                lineHeight: '2',
                textAlign: 'center',
                marginBottom: 'clamp(10px, 2vh, 16px)',
              }}
            >
              Start a collaborative jam session! Create the first track and let others add layers.
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setAppState((prev) => ({ ...prev, mode: 'jam_create' }))}
                style={{
                  padding: 'clamp(8px, 2vw, 12px) clamp(16px, 3vw, 24px)',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
                  color: '#fff',
                  border: '2px solid #000',
                  borderRadius: '0',
                  fontSize: 'clamp(7px, 1.5vw, 9px)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', monospace",
                  boxShadow: '0 4px 0 #000, 0 0 10px rgba(255, 107, 107, 0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 6px 0 #000, 0 0 15px rgba(255, 107, 107, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 0 #000, 0 0 10px rgba(255, 107, 107, 0.4)';
                }}
              >
                🎵 START JAM SESSION
              </button>
            </div>
          </div>
        )}

        {/* Recent Jam Sessions */}
        <RecentJamSessions
          onJoinJam={(postId) => {
            // This will call handleStartJamSession with the postId
            const event = new CustomEvent('riffrivals:joinJam', {
              detail: { postId },
            });
            window.dispatchEvent(event);
          }}
        />

        {/* Info Box with retro styling */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
            border: '3px solid #00d4ff',
            padding: 'clamp(16px, 3vw, 24px)',
            borderRadius: '0',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.3), inset 0 0 15px rgba(0, 212, 255, 0.05)',
            position: 'relative',
          }}
        >
          {/* Corner decorations */}
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              width: '12px',
              height: '12px',
              background: '#00d4ff',
              boxShadow: '0 0 8px #00d4ff',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '12px',
              height: '12px',
              background: '#00d4ff',
              boxShadow: '0 0 8px #00d4ff',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              left: '-3px',
              width: '12px',
              height: '12px',
              background: '#00d4ff',
              boxShadow: '0 0 8px #00d4ff',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              right: '-3px',
              width: '12px',
              height: '12px',
              background: '#00d4ff',
              boxShadow: '0 0 8px #00d4ff',
            }}
          />

          <div
            style={{
              color: '#00d4ff',
              fontSize: 'clamp(8px, 1.8vw, 10px)',
              marginBottom: 'clamp(10px, 2vh, 16px)',
              letterSpacing: '2px',
              textShadow: '0 0 5px #00d4ff',
            }}
          >
            ▸▸▸ HOW IT WORKS ◂◂◂
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: 'clamp(7px, 1.5vw, 9px)',
              lineHeight: '2',
            }}
          >
            <div style={{ marginBottom: '4px' }}>▸ Create challenges by recording or designing</div>
            <div style={{ marginBottom: '4px' }}>▸ Compete for high scores on community levels</div>
            <div style={{ marginBottom: '4px' }}>▸ Vote for the best challenges</div>
            <div>▸ Remix and add your own twist</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mode Card Component
const ModeCard: React.FC<{
  emoji: string;
  title: string;
  description: string;
  color: string;
  glowColor: string;
  onClick: () => void;
}> = ({ emoji, title, description, color, glowColor, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered
          ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
          : 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 100%)',
        border: `4px solid ${color}`,
        borderRadius: '0',
        padding: 'clamp(20px, 4vw, 32px) clamp(16px, 3vw, 24px)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? `0 8px 0 #000, 0 0 20px ${glowColor}`
          : `0 4px 0 #000, 0 0 10px ${glowColor}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Scanline effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.02) 2px, rgba(255, 255, 255, 0.02) 4px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          fontSize: 'clamp(24px, 5vw, 40px)',
          marginBottom: 'clamp(8px, 2vh, 16px)',
          filter: isHovered ? 'drop-shadow(0 0 8px currentColor)' : 'none',
          transition: 'filter 0.2s',
          position: 'relative',
        }}
      >
        {emoji}
      </div>
      <h3
        style={{
          color: '#fff',
          fontSize: 'clamp(10px, 2vw, 14px)',
          marginBottom: 'clamp(6px, 1.5vh, 12px)',
          letterSpacing: '2px',
          textShadow: isHovered ? `0 0 10px ${color}` : 'none',
          transition: 'text-shadow 0.2s',
          position: 'relative',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: isHovered ? '#fff' : '#999',
          fontSize: 'clamp(7px, 1.5vw, 9px)',
          lineHeight: '1.5',
          transition: 'color 0.2s',
          position: 'relative',
        }}
      >
        {description}
      </p>
    </button>
  );
};

export const App = () => {
  const [appState, setAppState] = useState<AppState>({
    mode: 'home',
    currentPostId: null,
    currentComposition: null,
    username: null,
    remixParentPostId: null,
    // Challenge system state
    availableChallenges: initializeChallenges(),
    selectedChallenge: null,
    selectedLayerIndex: 0,
    currentChallengeType: 'replication',
    challengeScore: null,
    personalBest: null,
    leaderboardScores: [],
    isChallengeActive: false, // Control whether challenge has started
    showScoreSubmission: false, // Show score submission interface
    // Jam session state
    jamSessionPostId: null,
    jamSessionComposition: null,
    // Jam creation state
    jamCreationComposition: null,
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

  // Listen for remix events from RiffPost
  useEffect(() => {
    const handleRemixEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ postId: string; composition: CompositionData }>;
      const { postId, composition } = customEvent.detail;

      setAppState((prev) => ({
        ...prev,
        mode: 'remix',
        remixParentPostId: postId,
        currentComposition: composition,
        currentPostId: postId,
      }));
    };

    // Listen for join jam events from RecentJamSessions
    const handleJoinJamEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { postId } = customEvent.detail;
      if (postId) {
        void handleStartJamSession(postId);
      }
    };

    window.addEventListener('riffrivals:remix', handleRemixEvent);
    window.addEventListener('riffrivals:joinJam', handleJoinJamEvent);

    return () => {
      window.removeEventListener('riffrivals:remix', handleRemixEvent);
      window.removeEventListener('riffrivals:joinJam', handleJoinJamEvent);
    };
  }, []);

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

          // If we have a postId, navigate to challenge_select mode and load the composition
          if (data.postId) {
            // Check URL parameters first
            const urlParams = new URLSearchParams(window.location.search);
            const mode = urlParams.get('mode') as UIMode;

            // Allow specific modes from URL parameters
            if (mode && ['create', 'chart_creator', 'challenge_select', 'remix'].includes(mode)) {
              setAppState((prev) => ({ ...prev, mode }));
            } else {
              // We have a postId - fetch composition first, then navigate based on challenge type
              console.log('🔵 PostId detected, fetching composition...');

              // Fetch composition data first, then navigate to the appropriate mode
              try {
                const compositionResponse = await fetch('/api/get-composition', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ postId: data.postId }),
                });

                if (compositionResponse.ok) {
                  const compositionData = await compositionResponse.json();
                  console.log('🔵 Composition data received:', compositionData);

                  if (compositionData.success && compositionData.composition) {
                    const composition = compositionData.composition;
                    console.log('🔵 Composition metadata:', composition.metadata);
                    console.log('🔵 Server says isJamSession:', compositionData.isJamSession);

                    // Check if this is a jam session using server information
                    if (compositionData.isJamSession) {
                      console.log(
                        '🔵 Server confirmed jam session, redirecting to jam session mode'
                      );

                      // This is a jam session - redirect to jam session mode
                      void handleStartJamSession(data.postId);
                      return;
                    }

                    // Ensure composition has challengeSettings - create defaults if missing
                    let finalComposition = composition;
                    if (!composition.metadata.challengeSettings) {
                      console.log('🔵 No challenge settings found, generating defaults');

                      // Use first layer to calculate metadata, default to 'falling_tiles' challenge type
                      const firstTrack = composition.layers[0];
                      if (firstTrack) {
                        const challengeMetadata = calculateChallengeMetadata(
                          firstTrack,
                          'falling_tiles',
                          'auto'
                        );

                        finalComposition = {
                          ...composition,
                          metadata: {
                            ...composition.metadata,
                            challengeSettings: {
                              challengeType: 'falling_tiles',
                              baseDifficulty: 'auto',
                              calculatedDifficulty: challengeMetadata.calculatedDifficulty,
                              scoringWeights: challengeMetadata.scoringWeights,
                              allowedAttempts: 3,
                              timeLimit: Math.ceil(firstTrack.duration),
                              accuracyThreshold: 70,
                              leaderboard: [],
                            },
                          },
                        };
                        console.log(
                          '🔵 Generated default challenge settings:',
                          finalComposition.metadata.challengeSettings
                        );
                      }
                    } else {
                      console.log('🔵 Detected challenge post with challenge settings');
                      console.log('🔵 Challenge settings:', composition.metadata.challengeSettings);
                    }

                    // Determine the target mode based on challenge type
                    const challengeType =
                      finalComposition.metadata.challengeSettings?.challengeType || 'falling_tiles';

                    console.log('🔵 [REDIRECT] Challenge type extracted:', challengeType);
                    console.log('🔵 [REDIRECT] Challenge type comparison:', {
                      value: challengeType,
                      isFallingTiles: challengeType === 'falling_tiles',
                      typeof: typeof challengeType,
                      length: challengeType?.length,
                    });

                    const targetMode: UIMode =
                      challengeType === 'falling_tiles' ? 'falling_notes' : 'replication_challenge';

                    console.log('🔵 [REDIRECT] Target mode determined:', targetMode);
                    console.log('🔵 [REDIRECT] Full redirect info:', {
                      challengeType,
                      targetMode,
                      hasChallengeSettings: !!finalComposition.metadata.challengeSettings,
                      challengeSettings: finalComposition.metadata.challengeSettings,
                    });

                    // Always add the composition to availableChallenges at the top
                    // If it's a falling_tiles challenge, navigate directly to it
                    console.log('🔵 [REDIRECT] Setting app state with mode:', targetMode);
                    setAppState((prev) => {
                      const newState = {
                        ...prev,
                        selectedChallenge: finalComposition,
                        availableChallenges: [finalComposition, ...prev.availableChallenges],
                        currentChallengeType: challengeType,
                        mode: targetMode, // Navigate directly to the challenge mode
                        isChallengeActive: false, // Reset to show start button
                      };
                      console.log('🔵 [REDIRECT] New app state:', {
                        mode: newState.mode,
                        currentChallengeType: newState.currentChallengeType,
                        hasSelectedChallenge: !!newState.selectedChallenge,
                      });
                      return newState;
                    });
                    console.log('🔵 [REDIRECT] setAppState called successfully');
                  } else {
                    console.log(
                      '🔵 No composition found in response, navigating to challenge_select'
                    );
                    // Fallback to challenge_select if composition not found
                    setAppState((prev) => ({
                      ...prev,
                      mode: 'challenge_select',
                    }));
                  }
                } else if (compositionResponse.status === 404) {
                  // Try fetching as a chart (Chart Creator posts are stored as charts)
                  console.log('🔵 Composition not found (404), trying to fetch as chart...');

                  try {
                    const chartResponse = await fetch(`/api/get-chart/${data.postId}`);

                    if (chartResponse.ok) {
                      const chartData = await chartResponse.json();
                      console.log('🔵 Chart data received:', chartData);

                      if (chartData.success && chartData.chart) {
                        const chart = chartData.chart;

                        // Convert ChartData to CompositionData for falling notes challenge
                        const track: TrackData = {
                          id: `chart_${chart.id}_track`,
                          instrument: chart.instrument,
                          notes: chart.notes.map((note: any) => ({
                            note: note.lane,
                            velocity: note.velocity || 0.8,
                            startTime: note.time * 1000, // Convert seconds to milliseconds
                            duration: 0.5,
                          })),
                          tempo: chart.bpm,
                          duration: chart.duration,
                          userId: chart.createdBy,
                          timestamp: chart.createdAt,
                        };

                        const challengeMetadata = calculateChallengeMetadata(
                          track,
                          'falling_tiles',
                          chart.difficulty === 'easy'
                            ? 'easy'
                            : chart.difficulty === 'medium'
                              ? 'medium'
                              : chart.difficulty === 'hard'
                                ? 'hard'
                                : 'auto'
                        );

                        const composition: CompositionData = {
                          id: chart.id,
                          layers: [track],
                          metadata: {
                            title: chart.title,
                            collaborators: [chart.createdBy],
                            createdAt: chart.createdAt,
                            challengeSettings: {
                              challengeType: 'falling_tiles',
                              baseDifficulty: chart.difficulty as any,
                              calculatedDifficulty: challengeMetadata.calculatedDifficulty,
                              scoringWeights: challengeMetadata.scoringWeights,
                              allowedAttempts: 3,
                              timeLimit: Math.ceil(chart.duration),
                              accuracyThreshold: 70,
                              leaderboard: [],
                            },
                          },
                        };

                        console.log(
                          '🔵 [REDIRECT] Converted chart to composition, navigating to falling_notes'
                        );

                        // Navigate directly to falling_notes mode
                        setAppState((prev) => ({
                          ...prev,
                          selectedChallenge: composition,
                          availableChallenges: [composition, ...prev.availableChallenges],
                          currentChallengeType: 'falling_tiles',
                          mode: 'falling_notes',
                          isChallengeActive: false,
                        }));

                        return; // Exit early since we handled the chart
                      }
                    }
                  } catch (chartError) {
                    console.log('🔵 Failed to fetch chart:', chartError);
                  }

                  // Fallback to challenge_select if chart fetch also fails
                  console.log(
                    '🔵 Both composition and chart fetch failed, navigating to challenge_select'
                  );
                  setAppState((prev) => ({
                    ...prev,
                    mode: 'challenge_select',
                  }));
                } else {
                  console.log(
                    '🔵 Composition fetch failed with status:',
                    compositionResponse.status,
                    '- navigating to challenge_select'
                  );
                  // Fallback to challenge_select if fetch fails
                  setAppState((prev) => ({
                    ...prev,
                    mode: 'challenge_select',
                  }));
                }
              } catch (error) {
                console.log(
                  'Could not fetch composition data, navigating to challenge_select:',
                  error
                );
                // Fallback to challenge_select if error occurs
                setAppState((prev) => ({
                  ...prev,
                  mode: 'challenge_select',
                }));
              }
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
    setAppState((prev) => ({
      ...prev,
      mode: newMode,
      showScoreSubmission: false, // Reset score submission when changing modes
      challengeScore: null, // Clear any existing challenge score
      jamSessionPostId: null, // Reset jam session state
      jamSessionComposition: null,
      jamCreationComposition: null, // Reset jam creation state
    }));
    setError(null);
  }, []);

  const handleCancel = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      mode: 'home',
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
    // After creating a composition, switch to home mode
    setAppState((prev) => ({
      ...prev,
      mode: 'home',
      currentComposition: composition,
    }));
  }, []);

  // Challenge system handlers
  const handleChallengeSelect = useCallback(
    (challenge: CompositionData, challengeType: ChallengeType | 'both') => {
      console.log('🔵 [handleChallengeSelect] Called:', {
        challengeTitle: challenge.metadata.title,
        challengeType,
        challengeId: challenge.id,
      });
      const finalChallengeType: ChallengeType =
        challengeType === 'both' ? 'falling_tiles' : challengeType;

      console.log('🔵 [handleChallengeSelect] Final challenge type:', finalChallengeType);

      const newMode: UIMode =
        finalChallengeType === 'falling_tiles' ? 'falling_notes' : 'replication_challenge';
      console.log('🔵 [handleChallengeSelect] Setting mode to:', newMode);

      setAppState((prev) => {
        const newState = {
          ...prev,
          selectedChallenge: challenge,
          currentChallengeType: finalChallengeType,
          mode: newMode,
          isChallengeActive: false, // Reset to show start button
        };
        console.log('🔵 [handleChallengeSelect] New app state:', {
          mode: newState.mode,
          currentChallengeType: newState.currentChallengeType,
        });
        return newState;
      });
    },
    []
  );

  const handleChallengeComplete = useCallback((score: ChallengeScore) => {
    setAppState((prev) => ({
      ...prev,
      challengeScore: score,
      showScoreSubmission: true,
    }));
  }, []);

  const handleScoreSubmission = useCallback(
    async (submissionData: ChallengeScoreSubmissionData) => {
      try {
        const response = await fetch('/api/submit-challenge-score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId: appState.currentPostId,
            score: submissionData.score,
            shareOptions: submissionData.shareOptions,
            customMessage: submissionData.customMessage,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Score submitted successfully:', data);

          // Move to results screen
          setAppState((prev) => ({
            ...prev,
            showScoreSubmission: false,
            mode: 'challenge_results',
          }));
        } else {
          console.error('Failed to submit score:', response.status);
          alert('Failed to submit score. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting score:', error);
        alert('Network error while submitting score.');
      }
    },
    [appState.currentPostId]
  );

  const handleSkipScoreSubmission = useCallback(() => {
    // Just move to results without submitting
    setAppState((prev) => ({
      ...prev,
      showScoreSubmission: false,
      mode: 'challenge_results',
    }));
  }, []);

  // Jam session handlers
  const handleStartJamSession = useCallback(
    async (postId: string) => {
      try {
        // Fetch the composition for this post
        const response = await fetch('/api/get-composition', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.composition) {
            // Check if current user already has a layer in this composition
            const currentUser = appState.username;
            const userAlreadyContributed = data.composition.layers.some(
              (layer: TrackData) => layer.userId === currentUser
            );

            if (userAlreadyContributed) {
              alert(
                'You have already contributed to this jam session. Each user can only add one layer.'
              );
              return;
            }

            setAppState((prev) => ({
              ...prev,
              mode: 'jam_session',
              jamSessionPostId: postId,
              jamSessionComposition: data.composition,
            }));
          }
        }
      } catch (error) {
        console.error('Error starting jam session:', error);
        alert('Failed to start jam session');
      }
    },
    [appState.username]
  );

  const handleJamReplySubmit = useCallback((success: boolean, message?: string) => {
    if (success) {
      alert(message || 'Jam reply posted successfully!');
      setAppState((prev) => ({
        ...prev,
        mode: 'home',
        jamSessionPostId: null,
        jamSessionComposition: null,
      }));
    } else {
      alert(message || 'Failed to post jam reply');
    }
  }, []);

  const handleJamCancel = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      mode: 'home',
      jamSessionPostId: null,
      jamSessionComposition: null,
    }));
  }, []);

  // Jam creation handlers
  const handleJamCreate = useCallback(async (trackData: TrackData, title: string) => {
    try {
      const response = await fetch('/api/create-riff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackData,
          title: title || 'Jam Session',
          challengeType: 'jam_session', // Mark as jam session
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Jam session created successfully! Others can now add their layers.');
          setAppState((prev) => ({ ...prev, mode: 'home' }));
        } else {
          alert(`Failed: ${data.message}`);
        }
      } else {
        alert('Network error while creating jam session');
      }
    } catch (error) {
      console.error('Error creating jam session:', error);
      alert('Failed to create jam session');
    }
  }, []);

  const handleJamCreateCancel = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      mode: 'home',
      jamCreationComposition: null,
    }));
  }, []);

  const handleChallengeRetry = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      challengeScore: null,
      showScoreSubmission: false,
      mode:
        prev.currentChallengeType === 'falling_tiles' ? 'falling_notes' : 'replication_challenge',
    }));
  }, []);

  const handleChallengeBackToMenu = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      selectedChallenge: null,
      challengeScore: null,
      showScoreSubmission: false,
      mode: 'challenge_select',
    }));
  }, []);

  // Debug current app state
  console.log('🔵 [APP STATE] Current state:', {
    mode: appState.mode,
    hasSelectedChallenge: !!appState.selectedChallenge,
    hasCurrentPostId: !!appState.currentPostId,
    hasCurrentComposition: !!appState.currentComposition,
    currentChallengeType: appState.currentChallengeType,
    selectedChallengeTitle: appState.selectedChallenge?.metadata?.title,
    selectedChallengeType: appState.selectedChallenge?.metadata?.challengeSettings?.challengeType,
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
              <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg"
                      style={{ textShadow: '2px 2px 0px #ff6b6b, 4px 4px 0px #4ecdc4' }}
                    >
                      RiffRivals
                    </h1>
                    <span
                      className="hidden sm:inline text-xs text-purple-200 font-medium"
                      style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}
                    >
                      ARCADE MUSIC BATTLE
                    </span>
                  </div>

                  {appState.username && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
                      <span className="text-xs sm:text-sm text-purple-100 font-medium">
                        Player:{' '}
                        <span className="font-bold text-yellow-300">u/{appState.username}</span>
                      </span>

                      {/* Mode Navigation */}
                      <div className="flex gap-2 flex-wrap justify-center">
                        <button
                          onClick={() => {
                            playButtonClick();
                            handleModeChange('home');
                          }}
                          className={`
                      px-3 sm:px-4 py-2 text-xs font-bold transition-all transform hover:scale-105 shadow-lg
                      ${
                        appState.mode === 'home'
                          ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white'
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                      }
                    `}
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: '7px',
                            border: '2px solid #333',
                            boxShadow: '3px 3px 0px #333',
                            borderRadius: '0px',
                          }}
                        >
                          HOME
                        </button>

                        <button
                          onClick={() => {
                            playButtonClick();
                            handleModeChange('create');
                          }}
                          className={`
                      px-3 sm:px-4 py-2 text-xs font-bold transition-all transform hover:scale-105 shadow-lg
                      ${
                        appState.mode === 'create' || appState.mode === 'replication_challenge'
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                      }
                    `}
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: '7px',
                            border: '2px solid #333',
                            boxShadow: '3px 3px 0px #333',
                            borderRadius: '0px',
                          }}
                        >
                          CREATE
                        </button>

                        <button
                          onClick={() => {
                            playButtonClick();
                            handleModeChange('chart_creator');
                          }}
                          className={`
                      px-3 sm:px-4 py-2 text-xs font-bold transition-all transform hover:scale-105 shadow-lg
                      ${
                        appState.mode === 'chart_creator'
                          ? 'bg-gradient-to-r from-green-400 to-cyan-500 text-white'
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                      }
                    `}
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: '7px',
                            border: '2px solid #333',
                            boxShadow: '3px 3px 0px #333',
                            borderRadius: '0px',
                          }}
                        >
                          CHART
                        </button>

                        <button
                          onClick={() => {
                            playButtonClick();
                            handleModeChange('challenge_select');
                          }}
                          className={`
                        px-3 sm:px-4 py-2 text-xs font-bold transition-all transform hover:scale-105 shadow-lg
                        ${
                          appState.mode === 'challenge_select' || appState.mode === 'falling_notes'
                            ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 hover:from-gray-500 hover:to-gray-600'
                        }
                      `}
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: '7px',
                            border: '2px solid #333',
                            boxShadow: '3px 3px 0px #333',
                            borderRadius: '0px',
                          }}
                        >
                          PLAY
                        </button>
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
              {/* Home Screen - Mode Selection */}
              {appState.mode === 'home' && <RetroHomeScreen setAppState={setAppState} />}

              {/* Create Mode - Simplified Single Track Recording */}
              {appState.mode === 'create' && (
                <SimplifiedCreateMode
                  onTrackCreate={async (track: TrackData, title: string) => {
                    try {
                      const response = await fetch('/api/create-riff', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trackData: track, title }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                          alert('Challenge created successfully!');
                          setAppState((prev) => ({ ...prev, mode: 'home' }));
                        } else {
                          alert(`Failed: ${data.message}`);
                        }
                      } else {
                        alert('Network error while creating challenge');
                      }
                    } catch (error) {
                      console.error('Error creating challenge:', error);
                      alert('Failed to create challenge');
                    }
                  }}
                  onCancel={() => setAppState((prev) => ({ ...prev, mode: 'home' }))}
                />
              )}

              {/* Chart Creator Mode */}
              {appState.mode === 'chart_creator' && (
                <ChartEditor
                  instrument="drums"
                  onSave={async (chart: ChartData) => {
                    try {
                      const response = await fetch('/api/create-chart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chartData: chart }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                          alert('Chart published successfully!');
                          setAppState((prev) => ({ ...prev, mode: 'home' }));
                        } else {
                          alert(`Failed: ${data.message}`);
                        }
                      } else {
                        alert('Network error while publishing chart');
                      }
                    } catch (error) {
                      console.error('Error publishing chart:', error);
                      alert('Failed to publish chart');
                    }
                  }}
                  onCancel={() => setAppState((prev) => ({ ...prev, mode: 'home' }))}
                  audioEngine={challengeAudioEngineRef.current}
                />
              )}

              {/* Remix Mode */}
              {appState.mode === 'remix' &&
                appState.remixParentPostId &&
                appState.currentComposition && (
                  <RemixChallenge
                    parentPostId={appState.remixParentPostId}
                    parentComposition={appState.currentComposition}
                    onRemixCreate={async (
                      track: TrackData,
                      title: string,
                      parentPostId: string
                    ) => {
                      try {
                        const response = await fetch('/api/create-remix', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ parentPostId, trackData: track, title }),
                        });

                        if (response.ok) {
                          const data = await response.json();
                          if (data.success) {
                            alert('Remix created successfully!');
                            setAppState((prev) => ({
                              ...prev,
                              mode: 'home',
                              remixParentPostId: null,
                            }));
                          } else {
                            alert(`Failed: ${data.message}`);
                          }
                        } else {
                          alert('Network error while creating remix');
                        }
                      } catch (error) {
                        console.error('Error creating remix:', error);
                        alert('Failed to create remix');
                      }
                    }}
                    onCancel={() =>
                      setAppState((prev) => ({
                        ...prev,
                        mode: 'home',
                        remixParentPostId: null,
                      }))
                    }
                  />
                )}

              {/* Challenge System Modes */}
              {appState.mode === 'challenge_select' && (
                <ChallengeSelector
                  challenges={appState.availableChallenges}
                  onChallengeSelect={handleChallengeSelect}
                  onBack={() => handleModeChange('home')}
                  preSelectedChallenge={appState.selectedChallenge}
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

                  {/* Challenge Info Header */}
                  <div
                    style={{
                      textAlign: 'center',
                      marginBottom: '20px',
                      padding: '20px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: '8px',
                      border: '2px solid #4ecdc4',
                    }}
                  >
                    <h2
                      style={{
                        color: '#4ecdc4',
                        fontSize: '24px',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    >
                      {appState.selectedChallenge.metadata.title || 'Falling Tiles Challenge'}
                    </h2>
                    <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>
                      {appState.selectedChallenge.layers[appState.selectedLayerIndex]?.instrument ||
                        'drums'}{' '}
                      • Difficulty: medium
                    </p>

                    {!appState.isChallengeActive && (
                      <button
                        onClick={() => {
                          playButtonClick();
                          setAppState((prev) => ({ ...prev, isChallengeActive: true }));
                        }}
                        style={{
                          padding: '16px 32px',
                          background: 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)',
                          color: '#000',
                          border: '4px solid #000',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          fontFamily: "'Press Start 2P', monospace",
                          cursor: 'pointer',
                          textShadow: '1px 1px 0 #fff',
                          boxShadow: '0 4px 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)',
                        }}
                      >
                        ▶ START CHALLENGE
                      </button>
                    )}

                    {appState.isChallengeActive && (
                      <div style={{ color: '#00ff00', fontSize: '12px' }}>
                        Challenge in progress...
                      </div>
                    )}
                  </div>

                  {/* Layer/Instrument Selector */}
                  {!appState.isChallengeActive && appState.selectedChallenge.layers.length > 1 && (
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
                    isActive={appState.isChallengeActive}
                    onComplete={() => {
                      setAppState((prev) => ({ ...prev, isChallengeActive: false }));
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

              {/* Score Submission Interface */}
              {appState.showScoreSubmission &&
                appState.challengeScore &&
                appState.mode !== 'home' && (
                  <ChallengeScoreSubmission
                    score={appState.challengeScore}
                    onSubmit={handleScoreSubmission}
                    onSkip={handleSkipScoreSubmission}
                    challengeTitle={appState.selectedChallenge?.metadata.title || 'Challenge'}
                  />
                )}

              {/* Challenge Results */}
              {appState.mode === 'challenge_results' && appState.challengeScore && (
                <div>
                  <ChallengeResults
                    score={appState.challengeScore}
                    onRetry={handleChallengeRetry}
                    onShare={() => {
                      // Handle share functionality - could reopen score submission
                      setAppState((prev) => ({
                        ...prev,
                        showScoreSubmission: true,
                        mode: 'challenge_select',
                      }));
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
                        challengeType: 'falling_tiles',
                      }
                    }
                    leaderboardPosition={1} // This would be calculated from leaderboard
                  />

                  {/* Challenge Analytics */}
                  {appState.currentPostId && (
                    <div style={{ marginTop: '20px' }}>
                      <ChallengeAnalytics
                        postId={appState.currentPostId}
                        challengeTitle={appState.selectedChallenge?.metadata.title || 'Challenge'}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Jam Creation Mode */}
              {appState.mode === 'jam_create' && (
                <SimplifiedCreateMode
                  onTrackCreate={handleJamCreate}
                  onCancel={handleJamCreateCancel}
                  title="Create Jam Session"
                  description="Record the first track of a collaborative jam session. Others will be able to add their own layers!"
                  buttonText="🎵 START JAM SESSION"
                />
              )}

              {/* Jam Session Mode (Adding to existing) */}
              {appState.mode === 'jam_session' &&
                appState.jamSessionComposition &&
                appState.jamSessionPostId && (
                  <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                    <JamReply
                      parentComposition={appState.jamSessionComposition}
                      parentPostId={appState.jamSessionPostId}
                      onReplySubmit={handleJamReplySubmit}
                      onCancel={handleJamCancel}
                    />
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
