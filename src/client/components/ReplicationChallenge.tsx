import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  InstrumentType,
  DrumType,
  ChallengeType,
  ChallengeScore,
  ScoringWeights,
  TrackData,
  NoteEvent,
} from '../../shared/types/music.js';
import { DrumKit, Piano, Bass, Synth } from './instruments/index.js';
import { DhwaniAudioEngine } from '../audio/DhwaniAudioEngine.js';
import { playButtonClick } from '../utils/audioFeedback.js';
import { AudioInitButton } from './AudioInitButton.js';

// Local type definitions for notes
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

type NoteType = DrumType | PianoNote | BassNote | SynthNote;

interface ReplicationChallengeProps {
  targetTrack: TrackData;
  instrument: InstrumentType;
  onNotePlay: (note: string, velocity: number) => void;
  onScoreUpdate: (score: number, accuracy: number) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  onComplete: () => void;
  challengeMode?: 'practice' | 'challenge';
  scoreWeights?: ScoringWeights;
  onChallengeComplete?: (score: ChallengeScore) => void;
  audioEngine?: DhwaniAudioEngine | null;
}

interface RecordedNote {
  note: string;
  velocity: number;
  startTime: number;
  duration: number;
}

interface ComparisonResult {
  noteMatch: boolean;
  timingMatch: boolean;
  velocityMatch: boolean;
  accuracy: number;
}

const TIMING_TOLERANCE = 0.2; // 200ms tolerance for timing
const VELOCITY_TOLERANCE = 0.3; // 30% velocity tolerance

export const ReplicationChallenge: React.FC<ReplicationChallengeProps> = ({
  targetTrack,
  instrument,
  onNotePlay,
  onScoreUpdate,
  difficulty,
  isActive,
  onComplete,
  challengeMode = 'practice',
  scoreWeights = { timing: 0.3, accuracy: 0.7 },
  onChallengeComplete,
  audioEngine,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const localAudioEngineRef = useRef<DhwaniAudioEngine | null>(null);

  // Enhanced scoring for challenge mode
  const [hitCounts, setHitCounts] = useState({
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
  });

  const recordingStartTimeRef = useRef<number>(0);
  const playbackIntervalRef = useRef<number | undefined>(undefined);
  const recordingIntervalRef = useRef<number | undefined>(undefined);

  // Initialize local audio engine if not provided
  useEffect(() => {
    const initAudio = async () => {
      if (!audioEngine && !localAudioEngineRef.current) {
        console.log('ReplicationChallenge: Creating local audio engine');
        localAudioEngineRef.current = new DhwaniAudioEngine();
      }
    };
    void initAudio();

    return () => {
      if (localAudioEngineRef.current && !audioEngine) {
        localAudioEngineRef.current.dispose();
      }
    };
  }, [audioEngine]);

  // Get the active audio engine (either passed or local)
  const getAudioEngine = useCallback(() => {
    return audioEngine || localAudioEngineRef.current;
  }, [audioEngine]);

  // Ensure audio engine is initialized before use
  const ensureAudioInitialized = useCallback(async () => {
    const engine = getAudioEngine();
    if (!engine) {
      console.warn('ReplicationChallenge: No audio engine available');
      return false;
    }

    // Check if engine is already initialized
    const engineState = engine.getEngineState();
    if (engineState.isInitialized) {
      console.log('ReplicationChallenge: Audio engine already initialized');
      return true;
    }

    console.log('ReplicationChallenge: Initializing audio engine');
    try {
      await engine.initialize();
      setAudioInitialized(true);
      console.log('ReplicationChallenge: Audio engine initialized successfully');
      return true;
    } catch (error) {
      console.error('ReplicationChallenge: Failed to initialize audio engine:', error);
      return false;
    }
  }, [getAudioEngine]);

  // Calculate detailed scores for challenge mode
  const calculateDetailedScores = useCallback(() => {
    const totalHits = hitCounts.perfect + hitCounts.great + hitCounts.good + hitCounts.miss;

    if (totalHits === 0) {
      return {
        timingScore: 0,
        accuracyScore: 0,
        combinedScore: 0,
      };
    }

    // Timing score based on hit quality
    const timingScore =
      (hitCounts.perfect * 100 + hitCounts.great * 75 + hitCounts.good * 50) / totalHits;

    // Accuracy score based on hit rate
    const accuracyScore =
      ((hitCounts.perfect + hitCounts.great + hitCounts.good) / totalHits) * 100;

    // Combined score with weights
    const combinedScore = timingScore * scoreWeights.timing + accuracyScore * scoreWeights.accuracy;

    return {
      timingScore: Math.round(timingScore),
      accuracyScore: Math.round(accuracyScore),
      combinedScore: Math.round(combinedScore),
    };
  }, [hitCounts, scoreWeights]);

  // Create challenge score when game completes
  const createChallengeScore = useCallback((): ChallengeScore => {
    const scores = calculateDetailedScores();
    return {
      userId: 'current_user', // This would come from Reddit context
      accuracy: scores.accuracyScore,
      timing: scores.timingScore,
      timingScore: scores.timingScore,
      accuracyScore: scores.accuracyScore,
      combinedScore: scores.combinedScore,
      perfectHits: hitCounts.perfect,
      greatHits: hitCounts.great,
      goodHits: hitCounts.good,
      missedNotes: hitCounts.miss,
      completedAt: Date.now(),
      originalTrackId: targetTrack.id,
      challengeType: 'replication' as ChallengeType,
    };
  }, [calculateDetailedScores, hitCounts, targetTrack.id]);

  // Compare recorded notes with target notes
  const compareNotes = useCallback(
    (recorded: RecordedNote[], target: NoteEvent[]): ComparisonResult[] => {
      const results: ComparisonResult[] = [];

      // Sort both arrays by start time
      const sortedRecorded = [...recorded].sort((a, b) => a.startTime - b.startTime);
      const sortedTarget = [...target].sort((a, b) => a.startTime - b.startTime);

      // Compare each target note with the closest recorded note
      sortedTarget.forEach((targetNote) => {
        const closestRecorded = sortedRecorded.find(
          (recordedNote) =>
            Math.abs(recordedNote.startTime - targetNote.startTime) <= TIMING_TOLERANCE
        );

        if (closestRecorded) {
          const noteMatch = closestRecorded.note === targetNote.note;
          const timingMatch =
            Math.abs(closestRecorded.startTime - targetNote.startTime) <= TIMING_TOLERANCE;
          const velocityMatch =
            Math.abs(closestRecorded.velocity - targetNote.velocity) <= VELOCITY_TOLERANCE;

          let accuracy = 0;
          if (noteMatch && timingMatch && velocityMatch) {
            accuracy = 100;
          } else if (noteMatch && timingMatch) {
            accuracy = 80;
          } else if (noteMatch) {
            accuracy = 60;
          } else {
            accuracy = 0;
          }

          results.push({
            noteMatch,
            timingMatch,
            velocityMatch,
            accuracy,
          });
        } else {
          // No recorded note found for this target note
          results.push({
            noteMatch: false,
            timingMatch: false,
            velocityMatch: false,
            accuracy: 0,
          });
        }
      });

      return results;
    },
    []
  );

  // Start recording
  const startRecording = useCallback(async () => {
    // Ensure audio is initialized before recording
    const initialized = await ensureAudioInitialized();
    if (!initialized) {
      console.warn('Audio not initialized - please click the audio button first');
      return;
    }

    playButtonClick();
    setIsRecording(true);
    setRecordedNotes([]);
    recordingStartTimeRef.current = Date.now();

    // Start recording interval
    recordingIntervalRef.current = window.setInterval(() => {
      setCurrentTime(Date.now() - recordingStartTimeRef.current);
    }, 100);
  }, [ensureAudioInitialized]);

  // Stop recording and compare
  const stopRecording = useCallback(() => {
    playButtonClick();
    setIsRecording(false);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    // Compare recorded notes with target
    const results = compareNotes(recordedNotes, targetTrack.notes);
    setComparisonResults(results);

    // Calculate scores
    const totalNotes = targetTrack.notes.length;
    const correctNotes = results.filter((r) => r.noteMatch).length;
    const perfectNotes = results.filter((r) => r.accuracy === 100).length;
    const greatNotes = results.filter((r) => r.accuracy === 80).length;
    const goodNotes = results.filter((r) => r.accuracy === 60).length;
    const missedNotes = results.filter((r) => r.accuracy === 0).length;

    const accuracyScore = (correctNotes / totalNotes) * 100;
    const timingScore = results.reduce((sum, r) => sum + r.accuracy, 0) / totalNotes;

    setAccuracy(accuracyScore);
    setScore(timingScore);

    // Update hit counts
    setHitCounts({
      perfect: perfectNotes,
      great: greatNotes,
      good: goodNotes,
      miss: missedNotes,
    });

    onScoreUpdate(timingScore, accuracyScore);

    // If in challenge mode, create and send challenge score
    if (challengeMode === 'challenge' && onChallengeComplete) {
      const challengeScore = createChallengeScore();
      onChallengeComplete(challengeScore);
    }
  }, [
    recordedNotes,
    targetTrack.notes,
    compareNotes,
    onScoreUpdate,
    challengeMode,
    onChallengeComplete,
    createChallengeScore,
  ]);

  // Handle note play during recording
  const handleNotePlay = useCallback(
    async (note: string, velocity: number) => {
      // Ensure audio is initialized
      const initialized = await ensureAudioInitialized();
      if (!initialized) {
        console.warn('Audio not initialized - cannot play note');
        return;
      }

      // Play the sound through audio engine
      const engine = getAudioEngine();
      if (engine) {
        const engineState = engine.getEngineState();
        if (engineState.isInitialized) {
          console.log('ReplicationChallenge: Playing note:', note, 'on instrument:', instrument);
          engine.playNote(instrument, note, velocity);
        }
      }

      // Add visual feedback - highlight the note
      setActiveNotes((prev) => new Set([...prev, note]));

      // Remove highlight after a short delay
      setTimeout(() => {
        setActiveNotes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(note);
          return newSet;
        });
      }, 200); // 200ms highlight duration

      if (!isRecording) {
        onNotePlay(note, velocity);
        return;
      }

      const currentTime = Date.now() - recordingStartTimeRef.current;
      const newNote: RecordedNote = {
        note,
        velocity,
        startTime: currentTime / 1000, // Convert to seconds
        duration: 0, // Instant button press (no long notes)
      };

      setRecordedNotes((prev) => [...prev, newNote]);
      onNotePlay(note, velocity);
    },
    [isRecording, onNotePlay, instrument, ensureAudioInitialized, getAudioEngine]
  );

  // Play target track for reference
  const playTargetTrack = useCallback(async () => {
    // Ensure audio is initialized before playing
    const initialized = await ensureAudioInitialized();
    if (!initialized) {
      console.warn('Audio not initialized - cannot play target track');
      return;
    }

    playButtonClick();
    setIsPlaying(true);
    setActiveNotes(new Set()); // Clear any existing active notes
    let currentIndex = 0;

    const engine = getAudioEngine();

    const playNextNote = () => {
      if (currentIndex < targetTrack.notes.length) {
        const note = targetTrack.notes[currentIndex];
        if (!note) return;

        // Highlight the note
        setActiveNotes((prev) => new Set([...prev, note.note]));

        // Play through audio engine
        if (engine) {
          const engineState = engine.getEngineState();
          if (engineState.isInitialized) {
            engine.playNote(instrument, note.note, note.velocity);
          }
        }

        // Also call parent callback
        onNotePlay(note.note, note.velocity);
        currentIndex++;

        // Remove highlight after a short duration (note duration)
        const highlightDuration = Math.max(note.duration * 1000, 200); // At least 200ms
        setTimeout(() => {
          setActiveNotes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(note.note);
            return newSet;
          });
        }, highlightDuration);

        if (currentIndex < targetTrack.notes.length) {
          const nextNote = targetTrack.notes[currentIndex];
          if (nextNote) {
            const delay = (nextNote.startTime - note.startTime) * 1000;
            playbackIntervalRef.current = window.setTimeout(playNextNote, delay);
          }
        } else {
          setIsPlaying(false);
          // Clear all active notes when playback ends
          setTimeout(() => setActiveNotes(new Set()), highlightDuration);
        }
      }
    };

    playNextNote();
  }, [targetTrack.notes, onNotePlay, instrument, ensureAudioInitialized, getAudioEngine]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setActiveNotes(new Set()); // Clear active notes when stopping
    if (playbackIntervalRef.current) {
      clearTimeout(playbackIntervalRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (playbackIntervalRef.current) {
        clearTimeout(playbackIntervalRef.current);
      }
    };
  }, []);

  // Auto-start when active (only once)
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    if (isActive && !isRecording && !isPlaying && !hasAutoPlayedRef.current) {
      // Auto-play target track first (only once)
      playTargetTrack();
      hasAutoPlayedRef.current = true;
    }
  }, [isActive, isRecording, isPlaying, playTargetTrack]);

  return (
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        borderRadius: '0px',
        border: '4px solid #0f3460',
        boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.5)',
        fontFamily: 'monospace',
        maxWidth: '100%',
        width: '100%',
        minHeight: '100vh',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Audio Initialization Button */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999 }}>
        <AudioInitButton
          onAudioInitialized={async () => {
            setAudioInitialized(true);
            await ensureAudioInitialized();
          }}
          position="top-right"
        />
      </div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h3
          style={{
            color: '#00d4ff',
            fontSize: '18px',
            marginBottom: '10px',
            textShadow: '0 0 10px #00d4ff, 2px 2px 0 #000',
            letterSpacing: '2px',
          }}
        >
          🎵 REPLICATION CHALLENGE
        </h3>
        <p
          style={{
            color: '#00ff00',
            fontSize: '10px',
            marginBottom: '15px',
            textShadow: '1px 1px 0 #000',
          }}
        >
          LISTEN TO THE TARGET TRACK, THEN REPLICATE IT!
        </p>
      </div>

      {/* Target Track Info */}
      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid #0f3460',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            color: '#00d4ff',
            fontSize: '10px',
            marginBottom: '8px',
            textShadow: '0 0 10px #00d4ff',
          }}
        >
          TARGET TRACK
        </div>
        <div
          style={{
            color: 'white',
            fontSize: '12px',
            marginBottom: '5px',
            textShadow: '1px 1px 0 #000',
          }}
        >
          Instrument: {instrument.toUpperCase()}
        </div>
        <div style={{ color: '#aaa', fontSize: '8px' }}>
          Notes: {targetTrack.notes.length} | Duration: {targetTrack.duration.toFixed(1)}s
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={playTargetTrack}
          disabled={isPlaying || isRecording}
          style={{
            padding: '12px 24px',
            background:
              isPlaying || isRecording
                ? 'linear-gradient(180deg, #666 0%, #444 100%)'
                : 'linear-gradient(180deg, #00d4ff 0%, #0099cc 100%)',
            color: isPlaying || isRecording ? '#999' : '#000',
            border: '4px solid #000',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: isPlaying || isRecording ? 'not-allowed' : 'pointer',
            textShadow: isPlaying || isRecording ? '1px 1px 0 #000' : '1px 1px 0 #fff',
            boxShadow:
              isPlaying || isRecording
                ? '0 4px 0 #333'
                : '0 4px 0 #006699, 0 0 20px rgba(0, 212, 255, 0.5)',
            letterSpacing: '1px',
            transition: 'all 0.1s',
            opacity: isPlaying || isRecording ? 0.6 : 1,
          }}
          onMouseDown={(e) => {
            if (!isPlaying && !isRecording) {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = '0 0 0 #006699, 0 0 20px rgba(0, 212, 255, 0.5)';
            }
          }}
          onMouseUp={(e) => {
            if (!isPlaying && !isRecording) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 0 #006699, 0 0 20px rgba(0, 212, 255, 0.5)';
            }
          }}
        >
          {isPlaying ? '🎵 PLAYING...' : '🎵 PLAY TARGET'}
        </button>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isPlaying}
          style={{
            padding: '12px 24px',
            background: isRecording
              ? 'linear-gradient(180deg, #ff0064 0%, #cc0050 100%)'
              : isPlaying
                ? 'linear-gradient(180deg, #666 0%, #444 100%)'
                : 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)',
            color: isPlaying ? '#999' : '#000',
            border: '4px solid #000',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            textShadow: isPlaying ? '1px 1px 0 #000' : '1px 1px 0 #fff',
            boxShadow: isRecording
              ? '0 4px 0 #990040, 0 0 20px rgba(255, 0, 100, 0.5)'
              : isPlaying
                ? '0 4px 0 #333'
                : '0 4px 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)',
            letterSpacing: '1px',
            transition: 'all 0.1s',
            opacity: isPlaying ? 0.6 : 1,
          }}
          onMouseDown={(e) => {
            if (!isPlaying) {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = isRecording
                ? '0 0 0 #990040, 0 0 20px rgba(255, 0, 100, 0.5)'
                : '0 0 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)';
            }
          }}
          onMouseUp={(e) => {
            if (!isPlaying) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isRecording
                ? '0 4px 0 #990040, 0 0 20px rgba(255, 0, 100, 0.5)'
                : '0 4px 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)';
            }
          }}
        >
          {isRecording ? '⏹️ STOP RECORDING' : '🎤 START RECORDING'}
        </button>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '12px',
            background: 'rgba(255, 0, 100, 0.2)',
            border: '2px solid #ff0064',
            borderRadius: '8px',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        >
          <div
            style={{
              color: '#ff0064',
              fontSize: '14px',
              marginBottom: '5px',
              fontWeight: 'bold',
              textShadow: '0 0 10px #ff0064',
            }}
          >
            🔴 RECORDING...
          </div>
          <div style={{ color: '#fff', fontSize: '10px' }}>
            Time: {(currentTime / 1000).toFixed(1)}s | Notes Played: {recordedNotes.length}
          </div>
        </div>
      )}

      {/* Results */}
      {comparisonResults.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              color: '#ffff00',
              fontSize: '14px',
              marginBottom: '10px',
              textAlign: 'center',
              fontWeight: 'bold',
              textShadow: '0 0 10px #ffff00, 2px 2px 0 #000',
              letterSpacing: '2px',
            }}
          >
            📊 RESULTS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                padding: '15px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid #0f3460',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: '#00d4ff',
                  fontSize: '10px',
                  marginBottom: '8px',
                  textShadow: '0 0 10px #00d4ff',
                }}
              >
                ACCURACY
              </div>
              <div
                style={{
                  color: accuracy >= 80 ? '#00ff00' : accuracy >= 60 ? '#ffff00' : '#ff0064',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textShadow: `0 0 10px ${accuracy >= 80 ? '#00ff00' : accuracy >= 60 ? '#ffff00' : '#ff0064'}`,
                }}
              >
                {accuracy.toFixed(1)}%
              </div>
            </div>
            <div
              style={{
                padding: '15px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid #0f3460',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: '#ffff00',
                  fontSize: '10px',
                  marginBottom: '8px',
                  textShadow: '0 0 10px #ffff00',
                }}
              >
                SCORE
              </div>
              <div
                style={{
                  color: score >= 80 ? '#00ff00' : score >= 60 ? '#ffff00' : '#ff0064',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textShadow: `0 0 10px ${score >= 80 ? '#00ff00' : score >= 60 ? '#ffff00' : '#ff0064'}`,
                }}
              >
                {score.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Hit Breakdown */}
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid #0f3460',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                color: '#00d4ff',
                fontSize: '10px',
                marginBottom: '8px',
                textAlign: 'center',
                textShadow: '0 0 10px #00d4ff',
              }}
            >
              HIT BREAKDOWN
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                fontSize: '8px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#00ff00', textShadow: '0 0 5px #00ff00' }}>PERFECT</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>{hitCounts.perfect}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ffff00', textShadow: '0 0 5px #ffff00' }}>GREAT</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>{hitCounts.great}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff6600', textShadow: '0 0 5px #ff6600' }}>GOOD</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>{hitCounts.good}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff0064', textShadow: '0 0 5px #ff0064' }}>MISS</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>{hitCounts.miss}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instrument Interface */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            color: '#4ecdc4',
            fontSize: '10px',
            marginBottom: '10px',
            textAlign: 'center',
          }}
        >
          {isRecording ? '🎤 RECORDING - PLAY THE INSTRUMENT' : '🎹 INSTRUMENT'}
        </div>
        <div
          style={{
            background: '#1a1a1a',
            padding: '15px',
            borderRadius: '8px',
            border: isRecording ? '3px solid #ff6b6b' : '3px solid #333',
            transition: 'border-color 0.3s',
          }}
        >
          {instrument === 'drums' && (
            <DrumKit
              onNotePlay={(note, velocity) => handleNotePlay(note, velocity)}
              isRecording={isRecording}
              activeNotes={activeNotes as Set<DrumType>}
            />
          )}
          {instrument === 'piano' && (
            <Piano
              onNotePlay={handleNotePlay}
              isRecording={isRecording}
              activeNotes={activeNotes}
            />
          )}
          {instrument === 'bass' && (
            <Bass
              onNotePlay={handleNotePlay}
              isRecording={isRecording}
              activeNotes={activeNotes}
              selectedFret={0}
            />
          )}
          {instrument === 'synth' && (
            <Synth
              onNotePlay={handleNotePlay}
              isRecording={isRecording}
              activeNotes={activeNotes}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '9px',
          color: '#aaa',
          lineHeight: 1.8,
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid #0f3460',
          borderRadius: '8px',
        }}
      >
        <div style={{ color: '#00d4ff', marginBottom: '8px', fontWeight: 'bold' }}>
          📖 HOW TO PLAY
        </div>
        <div>1. CLICK "PLAY TARGET" TO HEAR THE ORIGINAL</div>
        <div>2. CLICK "START RECORDING" TO BEGIN YOUR ATTEMPT</div>
        <div>3. PLAY THE INSTRUMENT ABOVE TO REPLICATE THE PATTERN</div>
        <div>4. CLICK "STOP RECORDING" WHEN DONE</div>
      </div>

      {/* Challenge Mode Indicator */}
      {challengeMode === 'challenge' && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'linear-gradient(135deg, #ff0064, #cc0050)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '2px solid #000',
            fontSize: '10px',
            fontWeight: 'bold',
            boxShadow: '0 4px 0 #990040, 0 0 20px rgba(255, 0, 100, 0.5)',
            textShadow: '1px 1px 0 #000',
            letterSpacing: '1px',
          }}
        >
          🏆 CHALLENGE MODE
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};
