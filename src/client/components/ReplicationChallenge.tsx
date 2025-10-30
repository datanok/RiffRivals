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

// No timing or velocity tolerance needed - sequence-based scoring only

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
  // Suppress unused parameter warnings
  void difficulty;
  void onComplete;
  void scoreWeights;
  const [isPlaying, setIsPlaying] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const localAudioEngineRef = useRef<DhwaniAudioEngine | null>(null);

  // Auto-detection states (no recording needed)
  const [detectedNotes, setDetectedNotes] = useState<RecordedNote[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [showNextNote, setShowNextNote] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [wrongNoteMessage, setWrongNoteMessage] = useState<string>('');

  // Enhanced scoring for challenge mode
  const [hitCounts, setHitCounts] = useState({
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
  });

  const playbackIntervalRef = useRef<number | undefined>(undefined);
  const listeningStartTimeRef = useRef<number>(0);

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

  // Calculate detailed scores for challenge mode (simplified - no timing penalties)
  const calculateDetailedScores = useCallback(() => {
    const totalNotes = targetTrack.notes.length;

    if (totalNotes === 0) {
      return {
        timingScore: 0,
        accuracyScore: 0,
        combinedScore: 0,
      };
    }

    // Simple scoring: perfect notes get 100%, missed notes get 0%
    const accuracyScore = (hitCounts.perfect / totalNotes) * 100;
    const timingScore = accuracyScore; // Same as accuracy since no timing requirements
    const combinedScore = accuracyScore; // Same as accuracy

    return {
      timingScore: Math.round(timingScore),
      accuracyScore: Math.round(accuracyScore),
      combinedScore: Math.round(combinedScore),
    };
  }, [hitCounts, targetTrack.notes.length]);

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

  // Compare detected notes with target notes (sequence-based, no timing requirements)
  const compareNotes = useCallback(
    (detected: RecordedNote[], target: NoteEvent[]): ComparisonResult[] => {
      const results: ComparisonResult[] = [];

      // Debug: comparing notes
      console.log('🔍 Comparing notes:', {
        detected: detected.map((n) => n.note),
        target: target.map((n) => n.note),
      });

      // Sort target notes by their original order (not by time)
      const sortedTarget = [...target].sort((a, b) => a.startTime - b.startTime);

      // Compare each target note with detected notes in sequence order
      sortedTarget.forEach((targetNote, index) => {
        const detectedNote = detected[index]; // Match by sequence position, not timing

        if (detectedNote) {
          const noteMatch = detectedNote.note === targetNote.note;
          // Ignore timing and velocity for easier scoring
          const timingMatch = true; // Always true - no timing requirements
          const velocityMatch = true; // Always true - no velocity requirements

          // Simple scoring: 100% if note matches, 0% if not
          const accuracy = noteMatch ? 100 : 0;

          // Log note comparison result
          console.log(
            `🎵 Note ${index}: ${detectedNote.note} vs ${targetNote.note} = ${noteMatch ? '✅' : '❌'}`
          );

          results.push({
            noteMatch,
            timingMatch,
            velocityMatch,
            accuracy,
          });
        } else {
          // No detected note at this position
          console.log(`🎵 Note ${index}: MISSING vs ${targetNote.note} = ❌`);
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

  // Start listening for notes (auto-detection)
  const startListening = useCallback(async () => {
    const initialized = await ensureAudioInitialized();
    if (!initialized) {
      console.warn('Audio not initialized - please click the audio button first');
      return;
    }

    playButtonClick();
    setIsListening(true);
    setDetectedNotes([]);
    setCurrentNoteIndex(0);
    setHasStartedPlaying(false);
    listeningStartTimeRef.current = Date.now();
  }, [ensureAudioInitialized]);

  // Auto-complete when all notes are detected
  const checkCompletion = useCallback(
    (currentDetectedNotes?: RecordedNote[], noteIndex?: number) => {
      const indexToCheck = noteIndex !== undefined ? noteIndex : currentNoteIndex;

      console.log('🔍 checkCompletion called:', {
        currentNoteIndex,
        indexToCheck,
        targetLength: targetTrack.notes.length,
        hasStartedPlaying,
        detectedNotesLength: detectedNotes.length,
        currentDetectedNotesLength: currentDetectedNotes?.length,
      });

      if (indexToCheck >= targetTrack.notes.length && hasStartedPlaying) {
        console.log('🏆 COMPLETION CONDITION MET - Starting challenge completion process');
        setIsListening(false);

        // Use the passed detected notes or the state
        const notesToUse = currentDetectedNotes || detectedNotes;

        // Compare detected notes with target (sequence-based)
        const results = compareNotes(notesToUse, targetTrack.notes);
        setComparisonResults(results);

        // Debug logging
        console.log('🎯 Challenge Complete - Scoring:');
        console.log(
          'Detected notes:',
          notesToUse.map((n) => n.note)
        );
        console.log(
          'Target notes:',
          targetTrack.notes.map((n) => n.note)
        );
        console.log('Comparison results:', results);

        // Count correct vs wrong notes from the comparison results
        const totalNotes = targetTrack.notes.length;
        const correctNotes = results.filter((r) => r.noteMatch).length;
        const wrongNotes = notesToUse.length - correctNotes;

        console.log('📊 Scoring calculation:', {
          totalNotes,
          totalNotesPlayed: notesToUse.length,
          correctNotes,
          wrongNotes,
          accuracyScore: (correctNotes / totalNotes) * 100,
        });

        // Count correct notes as "perfect" and wrong notes as "miss"
        const perfectNotes = correctNotes;
        const missedNotes = totalNotes - correctNotes;

        const accuracyScore = (correctNotes / totalNotes) * 100;
        const finalScore = accuracyScore; // Same as accuracy since no timing penalty

        setAccuracy(accuracyScore);
        setScore(finalScore);

        // Update hit counts (simplified)
        setHitCounts({
          perfect: perfectNotes,
          great: 0, // No "great" category needed
          good: 0, // No "good" category needed
          miss: missedNotes,
        });

        console.log('📊 Final scores set:', {
          accuracyScore,
          finalScore,
          hitCounts: {
            perfect: perfectNotes,
            great: 0,
            good: 0,
            miss: missedNotes,
          },
        });

        onScoreUpdate(finalScore, accuracyScore);

        // If in challenge mode, create and send challenge score
        if (challengeMode === 'challenge' && onChallengeComplete) {
          // Create challenge score with current values (not state)
          const currentHitCounts = {
            perfect: perfectNotes,
            great: 0,
            good: 0,
            miss: missedNotes,
          };

          const challengeScore: ChallengeScore = {
            userId: 'current_user',
            accuracy: accuracyScore,
            timing: finalScore,
            timingScore: finalScore,
            accuracyScore: accuracyScore,
            combinedScore: finalScore,
            perfectHits: currentHitCounts.perfect,
            greatHits: currentHitCounts.great,
            goodHits: currentHitCounts.good,
            missedNotes: currentHitCounts.miss,
            completedAt: Date.now(),
            originalTrackId: targetTrack.id,
            challengeType: 'replication' as ChallengeType,
          };

          console.log('🏆 Sending challenge score:', challengeScore);
          onChallengeComplete(challengeScore);
        }
      }
    },
    [
      currentNoteIndex,
      targetTrack.notes.length,
      hasStartedPlaying,
      detectedNotes,
      targetTrack.notes,
      compareNotes,
      onScoreUpdate,
      challengeMode,
      onChallengeComplete,
      createChallengeScore,
    ]
  );

  // Note: checkCompletion is now called manually when notes are added
  // to ensure we have the latest detectedNotes state

  // Handle note play with auto-detection
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
      }, 200);

      // Auto-detect notes when listening
      if (isListening) {
        setHasStartedPlaying(true);

        // Check if we've already completed all notes
        if (currentNoteIndex >= targetTrack.notes.length) {
          console.log('🎯 All notes already completed, ignoring additional input');
          return; // Don't process any more notes
        }

        // Check if this matches the expected note
        const expectedNote = targetTrack.notes[currentNoteIndex];

        console.log(
          `🎯 Note played: ${note}, Expected: ${expectedNote?.note}, Index: ${currentNoteIndex}`
        );

        // Add ALL notes played (correct and wrong) to detected notes
        const currentTime = Date.now() - listeningStartTimeRef.current;
        const newNote: RecordedNote = {
          note,
          velocity,
          startTime: currentTime / 1000,
          duration: 0,
        };

        const newIndex = currentNoteIndex + 1;
        const isCorrect = expectedNote && note === expectedNote.note;

        setDetectedNotes((prev) => {
          const updated = [...prev, newNote];
          console.log(
            `${isCorrect ? '✅' : '❌'} Added note (${isCorrect ? 'correct' : 'wrong'}). All notes played:`,
            updated.map((n) => n.note)
          );

          // Check completion immediately with the updated notes
          if (newIndex >= targetTrack.notes.length && hasStartedPlaying) {
            console.log('🎯 All notes played, triggering completion...');
            // Use setTimeout to ensure state updates are complete
            setTimeout(() => checkCompletion(updated, newIndex), 50);
          }

          return updated;
        });

        // Always advance to next note (regardless of correct/wrong)
        setCurrentNoteIndex(newIndex);
        setShowNextNote(true);

        if (!isCorrect && expectedNote) {
          console.log(`❌ Wrong note! Expected ${expectedNote.note}, got ${note}`);
          // Show visual feedback for wrong notes
          setWrongNoteMessage(`Wrong note! Expected: ${expectedNote.note}`);
          setTimeout(() => setWrongNoteMessage(''), 2000);
        }
      }

      onNotePlay(note, velocity);
    },
    [
      isListening,
      onNotePlay,
      instrument,
      ensureAudioInitialized,
      getAudioEngine,
      currentNoteIndex,
      targetTrack.notes,
      hasStartedPlaying,
      checkCompletion,
    ]
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
      if (playbackIntervalRef.current) {
        clearTimeout(playbackIntervalRef.current);
      }
    };
  }, []);

  // Auto-start when active (only once)
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    if (isActive && !isListening && !isPlaying && !hasAutoPlayedRef.current) {
      // Auto-play target track first (only once)
      playTargetTrack();
      hasAutoPlayedRef.current = true;
    }
  }, [isActive, isListening, isPlaying, playTargetTrack]);

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
          disabled={isPlaying || isListening}
          style={{
            padding: '12px 24px',
            background:
              isPlaying || isListening
                ? 'linear-gradient(180deg, #666 0%, #444 100%)'
                : 'linear-gradient(180deg, #00d4ff 0%, #0099cc 100%)',
            color: isPlaying || isListening ? '#999' : '#000',
            border: '4px solid #000',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: isPlaying || isListening ? 'not-allowed' : 'pointer',
            textShadow: isPlaying || isListening ? '1px 1px 0 #000' : '1px 1px 0 #fff',
            boxShadow:
              isPlaying || isListening
                ? '0 4px 0 #333'
                : '0 4px 0 #006699, 0 0 20px rgba(0, 212, 255, 0.5)',
            letterSpacing: '1px',
            transition: 'all 0.1s',
            opacity: isPlaying || isListening ? 0.6 : 1,
          }}
        >
          {isPlaying ? '🎵 PLAYING...' : '🎵 PLAY TARGET'}
        </button>

        <button
          onClick={startListening}
          disabled={isPlaying || isListening}
          style={{
            padding: '12px 24px',
            background: isListening
              ? 'linear-gradient(180deg, #ff6600 0%, #cc5500 100%)'
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
            boxShadow: isListening
              ? '0 4px 0 #994400, 0 0 20px rgba(255, 102, 0, 0.5)'
              : isPlaying
                ? '0 4px 0 #333'
                : '0 4px 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)',
            letterSpacing: '1px',
            transition: 'all 0.1s',
            opacity: isPlaying ? 0.6 : 1,
          }}
        >
          {isListening ? '🎯 LISTENING...' : '🎯 START CHALLENGE'}
        </button>

        {isListening && hasStartedPlaying && currentNoteIndex < targetTrack.notes.length && (
          <button
            onClick={() => {
              // Force completion with current progress
              console.log('🔄 Finish Early clicked, forcing completion...');
              checkCompletion(detectedNotes, currentNoteIndex);
            }}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(180deg, #ff9500 0%, #cc7700 100%)',
              color: '#000',
              border: '4px solid #000',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              textShadow: '1px 1px 0 #fff',
              boxShadow: '0 4px 0 #996600, 0 0 20px rgba(255, 149, 0, 0.5)',
              letterSpacing: '1px',
              transition: 'all 0.1s',
            }}
          >
            ✅ FINISH EARLY
          </button>
        )}
      </div>

      {/* Challenge Status */}
      {isListening && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '12px',
            background: 'rgba(255, 102, 0, 0.2)',
            border: '2px solid #ff6600',
            borderRadius: '8px',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        >
          <div
            style={{
              color: currentNoteIndex >= targetTrack.notes.length ? '#00ff00' : '#ff6600',
              fontSize: '14px',
              marginBottom: '5px',
              fontWeight: 'bold',
              textShadow: `0 0 10px ${currentNoteIndex >= targetTrack.notes.length ? '#00ff00' : '#ff6600'}`,
            }}
          >
            {currentNoteIndex >= targetTrack.notes.length
              ? '🏆 CHALLENGE COMPLETE'
              : '🎯 CHALLENGE ACTIVE'}
          </div>
          <div style={{ color: '#fff', fontSize: '10px' }}>
            Progress: {currentNoteIndex} / {targetTrack.notes.length} notes played
            {currentNoteIndex >= targetTrack.notes.length ? (
              <div style={{ marginTop: '5px', color: '#00ff00', fontWeight: 'bold' }}>
                ✅ ALL NOTES COMPLETED!
              </div>
            ) : (
              showNextNote && (
                <div style={{ marginTop: '5px', color: '#00ff00' }}>
                  Next: {targetTrack.notes[currentNoteIndex]?.note}
                </div>
              )
            )}
            {wrongNoteMessage && (
              <div style={{ marginTop: '5px', color: '#ff0064', fontWeight: 'bold' }}>
                {wrongNoteMessage}
              </div>
            )}
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
          {isListening ? '🎯 PLAY THE NOTES TO MATCH THE TARGET' : '🎹 INSTRUMENT'}
        </div>
        <div
          style={{
            background: '#1a1a1a',
            padding: '15px',
            borderRadius: '8px',
            border: isListening ? '3px solid #ff6600' : '3px solid #333',
            transition: 'border-color 0.3s',
          }}
        >
          {instrument === 'drums' && (
            <DrumKit
              onNotePlay={(note, velocity) => handleNotePlay(note, velocity)}
              isRecording={isListening}
              activeNotes={activeNotes as Set<DrumType>}
            />
          )}
          {instrument === 'piano' && (
            <Piano
              onNotePlay={handleNotePlay}
              isRecording={isListening}
              activeNotes={activeNotes}
            />
          )}
          {instrument === 'bass' && (
            <Bass
              onNotePlay={handleNotePlay}
              isRecording={isListening}
              activeNotes={activeNotes}
              selectedFret={0}
            />
          )}
          {instrument === 'synth' && (
            <Synth
              onNotePlay={handleNotePlay}
              isRecording={isListening}
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
        <div>2. CLICK "START CHALLENGE" TO BEGIN</div>
        <div>3. PLAY THE NOTES ON THE INSTRUMENT TO MATCH THE TARGET</div>
        <div>4. CHALLENGE COMPLETES AUTOMATICALLY WHEN ALL NOTES ARE PLAYED</div>
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
