import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  InstrumentType,
  DrumType,
  ChallengeType,
  ChallengeScore,
  ScoringWeights,
} from '../../shared/types/music.js';
import type { DhwaniAudioEngine } from '../audio/DhwaniAudioEngine.js';
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

interface FallingNote {
  id: string;
  type: InstrumentType;
  note: DrumType | PianoNote | BassNote | SynthNote;
  lane: number;
  startTime: number;
  hitTime: number;
  duration: number;
  velocity: number;
  hit?: boolean;
  missed?: boolean;
  hitStartTime?: number; // When the note was first hit
  hitEndTime?: number; // When the note was released
  isBeingHeld?: boolean; // Whether the note is currently being held
}

interface HitEffect {
  id: string;
  lane: number;
  accuracy: number;
  timestamp: number;
}

interface FallingNotesChallengeProps {
  instrument: InstrumentType;
  onNoteHit: (note: DrumType | PianoNote | BassNote | SynthNote, velocity: number) => void;
  onScoreUpdate: (score: number, accuracy: number) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  onComplete: () => void;
  songPattern?: (DrumType | PianoNote | BassNote | SynthNote)[];
  songNotes?: Array<{
    note: DrumType | PianoNote | BassNote | SynthNote;
    startTime: number;
    duration: number;
  }>;
  challengeMode?: 'practice' | 'challenge';
  scoreWeights?: ScoringWeights;
  onChallengeComplete?: (score: ChallengeScore) => void;
  audioEngine?: DhwaniAudioEngine | null; // DhwaniAudioEngine instance
}

const LANE_COUNT = 4;
const HIT_WINDOW = 100;
const LANE_WIDTH = 80;

const DIFFICULTY_SETTINGS = {
  easy: { noteInterval: 2000, noteDuration: 0, speed: 150 },
  medium: { noteInterval: 1500, noteDuration: 0, speed: 200 },
  hard: { noteInterval: 1000, noteDuration: 0, speed: 250 },
};

export const FallingNotesChallenge: React.FC<FallingNotesChallengeProps> = ({
  instrument,
  onNoteHit,
  onScoreUpdate,
  difficulty,
  isActive,
  onComplete,
  songPattern,
  songNotes,
  challengeMode = 'practice',
  scoreWeights = { timing: 0.7, accuracy: 0.3 },
  onChallengeComplete,
  audioEngine,
}: FallingNotesChallengeProps) => {
  // Suppress unused parameter warning for backward compatibility
  void scoreWeights;

  const [notes, setNotes] = useState<FallingNote[]>([]);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [combo, setCombo] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [keyPresses, setKeyPresses] = useState<Set<number>>(new Set());
  const [lastHitAccuracy, setLastHitAccuracy] = useState<string>('');
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [heldKeys, setHeldKeys] = useState<Set<number>>(new Set()); // Track which keys are currently held

  // Check audio initialization status
  useEffect(() => {
    if (audioEngine) {
      console.log('FallingNotesChallenge: Audio engine provided:', audioEngine);
      const checkAudioStatus = () => {
        try {
          const engineState = audioEngine.getEngineState();
          console.log('FallingNotesChallenge: Audio engine state:', engineState);
          setAudioInitialized(engineState.isInitialized);
        } catch (error) {
          console.error('FallingNotesChallenge: Error checking audio status:', error);
          setAudioInitialized(false);
        }
      };

      checkAudioStatus();
      const interval = setInterval(checkAudioStatus, 1000);
      return () => clearInterval(interval);
    } else {
      console.log('FallingNotesChallenge: No audio engine provided');
      setAudioInitialized(true); // Allow game to start even without audio engine
    }
  }, [audioEngine]);

  // Additional effect to handle audio engine changes
  useEffect(() => {
    if (audioEngine && !audioInitialized) {
      console.log('FallingNotesChallenge: Audio engine became available, checking status...');
      const checkStatus = () => {
        try {
          const engineState = audioEngine.getEngineState();
          if (engineState.isInitialized) {
            console.log('FallingNotesChallenge: Audio engine is now initialized');
            setAudioInitialized(true);
          }
        } catch (error) {
          console.error('FallingNotesChallenge: Error checking audio status:', error);
        }
      };

      // Check immediately and then periodically
      checkStatus();
      const interval = setInterval(checkStatus, 500);
      return () => clearInterval(interval);
    }
  }, [audioEngine, audioInitialized]);

  const initializeAudio = async () => {
    if (audioEngine) {
      try {
        console.log('FallingNotesChallenge: Initializing audio engine...');

        // First, try to unlock the audio context with a user gesture
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const tempContext = new AudioContextClass();
          if (tempContext.state === 'suspended') {
            await tempContext.resume();
            console.log('FallingNotesChallenge: Audio context unlocked');
          }
          void tempContext.close();
        }

        await audioEngine.initialize();
        console.log('FallingNotesChallenge: Audio initialized successfully');
        setAudioInitialized(true);
      } catch (error) {
        console.error('FallingNotesChallenge: Failed to initialize audio:', error);
        // Still allow the game to start
        setAudioInitialized(true);
      }
    } else {
      console.log('FallingNotesChallenge: No audio engine available for initialization');
      setAudioInitialized(true); // Allow game to start even without audio engine
    }
  };

  // Use refs to track hit counts in real-time for immediate access
  const hitCountsRef = useRef({
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
  });

  // Track song notes for actual timing
  const songNotesIndexRef = useRef(0);
  const completionCheckedRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const lastNoteTimeRef = useRef<number>(0);
  const hitCountRef = useRef<number>(0);
  const totalNotesRef = useRef<number>(0);

  const settings = DIFFICULTY_SETTINGS[difficulty];

  // Calculate detailed scores for challenge mode
  const calculateDetailedScores = useCallback(() => {
    const currentHitCounts = hitCountsRef.current;
    const totalNotes = totalNotesRef.current;
    const hitCount = hitCountRef.current;

    // Use the actual number of notes from the song/chart
    const totalChartNotes = songNotes?.length || totalNotes;

    // Count only notes that were successfully hit (exclude misses)
    const notesHit = currentHitCounts.perfect + currentHitCounts.great + currentHitCounts.good;

    console.log('=== SCORE CALCULATION START ===');
    console.log('Hit counts ref:', JSON.stringify(currentHitCounts));
    console.log('Total notes ref:', totalNotes);
    console.log('Hit count ref:', hitCount);
    console.log('Song notes length:', songNotes?.length || 0);
    console.log('Total chart notes:', totalChartNotes);
    console.log('Notes hit (perfect + great + good):', notesHit);
    console.log('Breakdown:', {
      perfect: currentHitCounts.perfect,
      great: currentHitCounts.great,
      good: currentHitCounts.good,
      miss: currentHitCounts.miss,
      total: notesHit + currentHitCounts.miss,
    });

    if (totalChartNotes === 0) {
      console.log('❌ No notes detected, returning zero scores');
      return {
        timingScore: 0,
        accuracyScore: 0,
        combinedScore: 0,
      };
    }

    // Score is simply based on how many notes were hit
    const accuracyScore = (notesHit / totalChartNotes) * 100;
    const combinedScore = accuracyScore; // Just use accuracy as the final score
    const timingScore = 0; // Not used anymore

    console.log('Score calculation:');
    console.log(
      `  notesHit (${notesHit}) / totalChartNotes (${totalChartNotes}) * 100 = ${accuracyScore}`
    );
    console.log(`  accuracyScore: ${accuracyScore}`);
    console.log(`  combinedScore: ${combinedScore}`);

    const result = {
      timingScore: Math.round(timingScore),
      accuracyScore: Math.round(accuracyScore),
      combinedScore: Math.round(combinedScore),
    };

    console.log('Final result:', result);
    console.log('=== SCORE CALCULATION END ===');
    return result;
  }, [songNotes]);

  // Create challenge score when game completes
  const createChallengeScore = useCallback((): ChallengeScore => {
    console.log('🏁 CREATING CHALLENGE SCORE - Final state:', {
      hitCountsRef: JSON.stringify(hitCountsRef.current),
      totalNotesRef: totalNotesRef.current,
      hitCountRef: hitCountRef.current,
      songNotesLength: songNotes?.length || 0,
    });

    const scores = calculateDetailedScores();
    const currentHitCounts = hitCountsRef.current;

    console.log('🏁 Challenge score created:', {
      scores,
      hitCounts: currentHitCounts,
      totalNotes: totalNotesRef.current,
      hitCount: hitCountRef.current,
    });
    return {
      userId: 'current_user', // This would come from Reddit context
      accuracy: scores.accuracyScore,
      timing: scores.timingScore,
      timingScore: scores.timingScore,
      accuracyScore: scores.accuracyScore,
      combinedScore: scores.combinedScore,
      perfectHits: currentHitCounts.perfect,
      greatHits: currentHitCounts.great,
      goodHits: currentHitCounts.good,
      missedNotes: currentHitCounts.miss,
      completedAt: Date.now(),
      originalTrackId: songPattern ? 'user_pattern' : 'random',
      challengeType: 'falling_notes' as ChallengeType,
    };
  }, [calculateDetailedScores, songPattern, songNotes]);

  // Map note to lane based on instrument type
  const getLaneForNote = useCallback(
    (note: DrumType | PianoNote | BassNote | SynthNote): number => {
      switch (instrument) {
        case 'drums': {
          const drumLanes: Partial<Record<DrumType, number>> = {
            'kick': 0,
            'snare': 1,
            'hihat': 2,
            'crash': 3,
            'openhat': 2,
            'ride': 3,
            'tom1': 1,
            'tom2': 2,
          };
          return drumLanes[note as DrumType] ?? 0;
        }
        case 'piano': {
          const pianoLanes: Record<PianoNote, number> = {
            'C4': 0,
            'D4': 1,
            'E4': 2,
            'F4': 3,
            'G4': 0, // Wrap around
            'A4': 1,
            'B4': 2,
            'C5': 3,
          };
          return pianoLanes[note as PianoNote] ?? 0;
        }
        case 'synth': {
          const synthLanes: Partial<Record<SynthNote, number>> = {
            'C4': 0,
            'C#4': 0,
            'D4': 1,
            'D#4': 1,
            'E4': 2,
            'F4': 2,
            'F#4': 3,
            'G4': 3,
            'G#4': 0, // Wrap around
            'A4': 1,
            'A#4': 2,
            'B4': 3,
            'C5': 3,
          };
          return synthLanes[note as SynthNote] ?? 0;
        }
        default:
          return 0;
      }
    },
    [instrument]
  );

  const generateNote = useCallback((): FallingNote => {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const now = Date.now();
    let note: DrumType | PianoNote | BassNote | SynthNote;

    if (songPattern && songPattern.length > 0) {
      const patternIndex = Math.floor(Math.random() * songPattern.length);
      note = songPattern[patternIndex] || 'kick';
    } else {
      switch (instrument) {
        case 'drums': {
          const drumTypes: DrumType[] = ['kick', 'snare', 'hihat', 'crash'];
          note = drumTypes[Math.floor(Math.random() * drumTypes.length)] || 'kick';
          break;
        }
        case 'piano': {
          const pianoNotes: PianoNote[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
          note = pianoNotes[Math.floor(Math.random() * pianoNotes.length)] || 'C4';
          break;
        }
        case 'synth': {
          const synthNotes: SynthNote[] = [
            'C4',
            'C#4',
            'D4',
            'D#4',
            'E4',
            'F4',
            'F#4',
            'G4',
            'G#4',
            'A4',
            'A#4',
            'B4',
          ];
          note = synthNotes[Math.floor(Math.random() * synthNotes.length)] || 'C4';
          break;
        }
        default:
          note = 'kick' as DrumType;
      }
    }

    return {
      id: `${now}-${lane}`,
      type: instrument,
      note,
      lane,
      startTime: now,
      hitTime: now + settings.speed * 1000,
      duration: settings.noteDuration,
      velocity: 0.8,
    };
  }, [instrument, settings.speed, settings.noteDuration, songPattern]);

  const stopChallenge = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // If in challenge mode, create and send challenge score
    if (challengeMode === 'challenge' && onChallengeComplete) {
      const challengeScore = createChallengeScore();
      onChallengeComplete(challengeScore);
    }
  }, [challengeMode, onChallengeComplete, createChallengeScore]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || !startTimeRef.current) return;

    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    setGameTime(elapsed);

    // Use actual song timing if available, otherwise use difficulty-based intervals
    if (songNotes && songNotes.length > 0) {
      // Check if it's time to spawn the next note from the song
      const currentSongNote = songNotes[songNotesIndexRef.current];
      if (currentSongNote && elapsed >= currentSongNote.startTime) {
        console.log(
          `FallingNotesChallenge: Spawning note ${songNotesIndexRef.current}: ${currentSongNote.note} at ${elapsed}ms (expected: ${currentSongNote.startTime}ms) in lane ${getLaneForNote(currentSongNote.note)}`
        );
        const newNote: FallingNote = {
          id: `${now}-${songNotesIndexRef.current}`,
          type: instrument,
          note: currentSongNote.note,
          lane: getLaneForNote(currentSongNote.note), // Map note to correct lane
          startTime: now,
          hitTime: now + settings.speed * 1000,
          duration: settings.noteDuration,
          velocity: 0.8,
        };
        setNotes((prevNotes) => [...prevNotes, newNote]);
        songNotesIndexRef.current++;
        // Don't increment totalNotesRef here - it's already set to songNotes.length at start
        console.log('📝 NOTE SPAWNED:', {
          noteIndex: songNotesIndexRef.current - 1,
          noteId: newNote.id,
          totalNotesRefNow: totalNotesRef.current,
          songNoteIndex: songNotesIndexRef.current,
          songNotesLength: songNotes.length,
        });
      }
    } else {
      // Fallback to difficulty-based intervals
      if (now - lastNoteTimeRef.current >= settings.noteInterval) {
        const newNote = generateNote();
        setNotes((prevNotes) => [...prevNotes, newNote]);
        lastNoteTimeRef.current = now;
        totalNotesRef.current++;
        console.log('📝 NOTE SPAWNED (random):', {
          noteId: newNote.id,
          totalNotesRefNow: totalNotesRef.current,
        });
      }
    }

    // Process notes - check for missed notes
    setNotes((prevNotes) => {
      const updatedNotes = prevNotes
        .map((note) => {
          const progress = (now - note.startTime) / 1000;
          const position = progress * settings.speed;

          // Check if note missed hit window
          if (position > 400 + HIT_WINDOW && !note.hit && !note.missed) {
            console.log('❌ NOTE MISSED:', {
              noteId: note.id,
              note: note.note,
              lane: note.lane,
              position: position,
              hitCountBefore: hitCountRef.current,
              totalNotes: totalNotesRef.current,
              hitCountsBefore: JSON.stringify(hitCountsRef.current),
            });

            setCombo(0);
            const newAccuracy = (hitCountRef.current / totalNotesRef.current) * 100;
            setAccuracy(newAccuracy);
            setLastHitAccuracy('MISS!');
            setTimeout(() => setLastHitAccuracy(''), 500);

            // Increment miss count
            hitCountsRef.current = {
              ...hitCountsRef.current,
              miss: hitCountsRef.current.miss + 1,
            };

            console.log('❌ NOTE MISSED - After update:', {
              hitCountAfter: hitCountRef.current,
              totalNotes: totalNotesRef.current,
              hitCountsAfter: JSON.stringify(hitCountsRef.current),
              calculatedAccuracy: newAccuracy,
            });

            return { ...note, missed: true };
          }
          return note;
        })
        .filter((note) => {
          // Remove hit notes immediately
          if (note.hit) return false;

          const progress = (now - note.startTime) / 1000;
          const position = progress * settings.speed;

          // Keep missed notes visible for a bit longer so players can see the red color
          if (note.missed) {
            return position < 600; // Keep missed notes visible longer
          }

          return position < 500;
        });

      // Check if all notes have been processed (hit or missed)
      const allSpawned = songNotes ? songNotesIndexRef.current >= songNotes.length : false;
      // All notes are processed if: all spawned AND no notes remain on screen
      // Don't end while missed notes are still visible (they need to scroll off)
      const noActiveNotesRemain = updatedNotes.length === 0;

      // Check for completion inside the callback where we have the updated state
      if (allSpawned && noActiveNotesRemain && !completionCheckedRef.current) {
        completionCheckedRef.current = true;
        console.log('🔵 [CHALLENGE] All notes processed, ending challenge:', {
          allSpawned,
          noActiveNotesRemain,
          updatedNotesLength: updatedNotes.length,
          songNotesLength: songNotes?.length,
          songNotesIndex: songNotesIndexRef.current,
        });
        // Wait a bit longer to show missed notes in red before ending
        setTimeout(() => {
          stopChallenge();
          onComplete();
        }, 800); // Give time for red missed notes to be visible
      }

      return updatedNotes;
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [
    isPlaying,
    settings,
    generateNote,
    stopChallenge,
    onComplete,
    songNotes,
    instrument,
    getLaneForNote,
  ]);

  const startChallenge = useCallback(async () => {
    console.log('FallingNotesChallenge: Starting challenge with songNotes:', songNotes);

    // Ensure audio engine is initialized before starting
    if (audioEngine) {
      console.log('FallingNotesChallenge: Audio engine available, ensuring initialization...');
      try {
        const currentState = audioEngine.getState();
        console.log('FallingNotesChallenge: Current audio state:', currentState);

        // Wait for initialization to complete if it's loading
        if (currentState === 'loading') {
          console.log('FallingNotesChallenge: Waiting for audio engine to finish loading...');
          // Wait up to 5 seconds for initialization
          let attempts = 0;
          while (audioEngine.getState() === 'loading' && attempts < 50) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
          const finalState = audioEngine.getState();
          console.log('FallingNotesChallenge: Audio state after waiting:', finalState);

          if (finalState === 'loading') {
            console.warn('FallingNotesChallenge: Audio engine still loading after timeout');
          }
        }

        // Initialize if idle
        if (audioEngine.getState() === 'idle') {
          console.log('FallingNotesChallenge: Initializing audio engine...');
          await audioEngine.initialize();
        }

        // Check if initialized
        const engineState = audioEngine.getEngineState();
        console.log('FallingNotesChallenge: Audio engine state after init:', engineState);
        setAudioInitialized(engineState.isInitialized);

        if (!engineState.isInitialized) {
          console.error('FallingNotesChallenge: Audio engine failed to initialize properly');
          // Still allow game to start
          setAudioInitialized(true);
        }
      } catch (error) {
        console.error('FallingNotesChallenge: Failed to initialize audio engine:', error);
        // Continue anyway - audio is optional
        setAudioInitialized(true);
      }
    } else {
      console.log('FallingNotesChallenge: No audio engine provided');
      setAudioInitialized(true);
    }

    setIsPlaying(true);
    setNotes([]);
    setScore(0);
    setAccuracy(100);
    setCombo(0);
    setGameTime(0);
    setHitEffects([]);
    setLastHitAccuracy('');
    hitCountRef.current = 0;
    totalNotesRef.current = 0;
    lastNoteTimeRef.current = Date.now();
    startTimeRef.current = Date.now();
    completionCheckedRef.current = false; // Reset completion check

    // Reset hit counts
    hitCountsRef.current = {
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
    };

    // Initialize song notes if available
    if (songNotes && songNotes.length > 0) {
      console.log('🎮 STARTING CHALLENGE - Song mode:', {
        songNotesCount: songNotes.length,
        songNotes: songNotes,
      });
      songNotesIndexRef.current = 0;
      totalNotesRef.current = songNotes.length; // Set total notes from song (FIXED: don't increment when spawning)
      console.log(
        '📊 Initialized totalNotesRef to:',
        totalNotesRef.current,
        `(from songNotes.length, will NOT increment when notes spawn)`
      );
    } else {
      console.log('🎮 STARTING CHALLENGE - Random mode (no song notes)');
      totalNotesRef.current = 0; // Will be incremented as notes are generated
      console.log(
        '📊 Initialized totalNotesRef:',
        totalNotesRef.current,
        '(will increment as notes spawn)'
      );
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, songNotes, audioEngine]);

  const handleNoteHit = useCallback(
    (noteId: string, lane: number) => {
      setNotes((prevNotes) => {
        const noteIndex = prevNotes.findIndex((n) => n.id === noteId && n.lane === lane);
        if (noteIndex === -1) return prevNotes;

        const note = prevNotes[noteIndex];
        if (!note) return prevNotes;

        const now = Date.now();
        const timeDiff = Math.abs(now - note.hitTime);
        const hitAccuracy = Math.max(0, 100 - timeDiff / 10);

        // Just count as a hit, no timing penalty
        const points = 100;
        const accuracyText = 'HIT!';

        console.log('🎯 NOTE HIT:', {
          noteId: note.id,
          note: note.note,
          lane: note.lane,
          hitCountBefore: hitCountRef.current,
          totalNotesBefore: totalNotesRef.current,
          hitCountsBefore: JSON.stringify(hitCountsRef.current),
        });

        setCombo((prev) => prev + 1);

        // Update detailed hit counts - just count as good
        hitCountsRef.current = {
          ...hitCountsRef.current,
          good: hitCountsRef.current.good + 1,
        };

        hitCountRef.current++;
        const newAccuracy = (hitCountRef.current / totalNotesRef.current) * 100;

        console.log('🎯 NOTE HIT - After update:', {
          hitCountAfter: hitCountRef.current,
          totalNotes: totalNotesRef.current,
          hitCountsAfter: JSON.stringify(hitCountsRef.current),
          calculatedAccuracy: newAccuracy,
          accuracyFormula: `${hitCountRef.current} / ${totalNotesRef.current} * 100 = ${newAccuracy}`,
        });

        const newScore = (prevScore: number) => {
          const updated = prevScore + points;
          onScoreUpdate(updated, newAccuracy);
          return updated;
        };
        setScore(newScore);
        setAccuracy(newAccuracy);

        setLastHitAccuracy(accuracyText);
        setTimeout(() => setLastHitAccuracy(''), 500);

        setHitEffects((prev) => [
          ...prev,
          {
            id: `${now}-${lane}`,
            lane,
            accuracy: hitAccuracy,
            timestamp: now,
          },
        ]);

        // Play the note sound
        console.log(
          'FallingNotesChallenge: Playing note sound:',
          note.note,
          'velocity:',
          note.velocity,
          'audioEngine available:',
          !!audioEngine,
          'audioInitialized:',
          audioInitialized
        );

        // Try to play the note directly if audio engine is available
        if (audioEngine && audioInitialized) {
          try {
            console.log(
              'FallingNotesChallenge: Attempting to play note directly with audio engine'
            );
            audioEngine.playNote(instrument, note.note, note.velocity);
          } catch (error) {
            console.error('FallingNotesChallenge: Error playing note directly:', error);
            // Fallback to parent callback
            onNoteHit(note.note, note.velocity);
          }
        } else {
          // Fallback to parent callback if no audio engine
          console.log('FallingNotesChallenge: Using fallback audio via parent callback');
          onNoteHit(note.note, note.velocity);
        }

        // Instead of removing the note immediately, mark it as being held
        const updatedNote = {
          ...note,
          hit: true,
          hitStartTime: now,
          isBeingHeld: true,
        };

        const newNotes = [...prevNotes];
        newNotes[noteIndex] = updatedNote;
        return newNotes;
      });
    },
    [onNoteHit, onScoreUpdate, audioEngine, audioInitialized, instrument]
  );

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!isPlaying) return;

      const key = event.key.toLowerCase();
      console.log('FallingNotesChallenge: Key pressed:', key);
      let lane = -1;

      switch (key) {
        case 'a':
        case '1':
          lane = 0;
          break;
        case 's':
        case '2':
          lane = 1;
          break;
        case 'd':
        case '3':
          lane = 2;
          break;
        case 'f':
        case '4':
          lane = 3;
          break;
      }

      if (lane >= 0) {
        // Only handle key press if not already held
        if (!heldKeys.has(lane)) {
          setHeldKeys((prev) => new Set(prev).add(lane));
          setKeyPresses((prev) => new Set(prev).add(lane));

          const hitNote = notes.find((note) => {
            if (note.lane !== lane || note.hit || note.missed) return false;

            // Calculate note position based on time elapsed
            const elapsed = Date.now() - note.startTime;
            const notePosition = (elapsed / 1000) * settings.speed;
            const hitLinePosition = 400; // Hit line is at y=400

            // Check if note is within hit window of the hit line
            return Math.abs(notePosition - hitLinePosition) <= HIT_WINDOW;
          });

          console.log('FallingNotesChallenge: Hit note found:', hitNote?.id, 'lane:', lane);
          if (hitNote?.id) {
            console.log('FallingNotesChallenge: Calling handleNoteHit for note:', hitNote.id);
            handleNoteHit(hitNote.id, lane);
          }
        }
      }
    },
    [isPlaying, notes, settings.speed, handleNoteHit, heldKeys]
  );

  const handleKeyRelease = useCallback(
    (event: KeyboardEvent) => {
      if (!isPlaying) return;

      const key = event.key.toLowerCase();
      let lane = -1;

      switch (key) {
        case 'a':
        case '1':
          lane = 0;
          break;
        case 's':
        case '2':
          lane = 1;
          break;
        case 'd':
        case '3':
          lane = 2;
          break;
        case 'f':
        case '4':
          lane = 3;
          break;
      }

      if (lane >= 0 && heldKeys.has(lane)) {
        setHeldKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lane);
          return newSet;
        });
        setKeyPresses((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lane);
          return newSet;
        });
      }
    },
    [isPlaying, heldKeys]
  );

  const handleTouchStart = useCallback(
    (lane: number) => {
      if (!isPlaying) return;

      if (!heldKeys.has(lane)) {
        setHeldKeys((prev) => new Set(prev).add(lane));
        setKeyPresses((prev) => new Set(prev).add(lane));

        const hitNote = notes.find((note) => {
          if (note.lane !== lane || note.hit || note.missed) return false;
          const elapsed = Date.now() - note.startTime;
          const notePosition = (elapsed / 1000) * settings.speed;
          const hitLinePosition = 400;
          return Math.abs(notePosition - hitLinePosition) <= HIT_WINDOW;
        });

        if (hitNote?.id) {
          handleNoteHit(hitNote.id, lane);
        }
      }
    },
    [isPlaying, heldKeys, notes, settings.speed, handleNoteHit]
  );

  const handleTouchEnd = useCallback(
    (lane: number) => {
      if (!isPlaying) return;

      if (heldKeys.has(lane)) {
        setHeldKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lane);
          return newSet;
        });
        setKeyPresses((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lane);
          return newSet;
        });
      }
    },
    [isPlaying, heldKeys]
  );

  useEffect(() => {
    if (isActive && !isPlaying) {
      void startChallenge();
    } else if (!isActive && isPlaying) {
      stopChallenge();
    }
  }, [isActive, isPlaying, startChallenge, stopChallenge]);

  useEffect(() => {
    if (isPlaying && startTimeRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gameLoop]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    window.addEventListener('keyup', handleKeyRelease);
    return () => window.removeEventListener('keyup', handleKeyRelease);
  }, [handleKeyRelease]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHitEffects((prev) => prev.filter((effect) => Date.now() - effect.timestamp < 500));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const renderGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
    if (!ctx) return;

    // Clear canvas efficiently with background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scanline effect
    for (let i = 0; i < canvas.height; i += 4) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, i, canvas.width, 2);
    }

    // Draw lanes
    for (let i = 0; i < LANE_COUNT; i++) {
      const pressed = keyPresses.has(i);
      ctx.fillStyle = pressed ? '#2a4a2a' : i % 2 === 0 ? '#1a1a2e' : '#16213e';
      ctx.fillRect(i * LANE_WIDTH, 0, LANE_WIDTH, canvas.height);

      // Lane border with glow
      ctx.strokeStyle = pressed ? '#00ff00' : '#0f3460';
      ctx.lineWidth = 2;
      ctx.strokeRect(i * LANE_WIDTH, 0, LANE_WIDTH, canvas.height);

      // Grid lines
      for (let j = 0; j < canvas.height; j += 50) {
        ctx.strokeStyle = 'rgba(15, 52, 96, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, j);
        ctx.lineTo((i + 1) * LANE_WIDTH, j);
        ctx.stroke();
      }
    }

    // Draw hit line with glow
    const gradient = ctx.createLinearGradient(0, 395, 0, 405);
    gradient.addColorStop(0, 'rgba(255, 0, 100, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 100, 1)');
    gradient.addColorStop(1, 'rgba(255, 0, 100, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 395, canvas.width, 10);

    ctx.strokeStyle = '#ff0064';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 400);
    ctx.lineTo(canvas.width, 400);
    ctx.stroke();

    // Draw hit effects
    const now = Date.now();
    hitEffects.forEach((effect) => {
      const age = now - effect.timestamp;
      const alpha = 1 - age / 500;
      const scale = 1 + age / 250;

      if (alpha > 0) {
        const x = effect.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const y = 400;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Explosion particles
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dist = age / 10;
          const px = Math.cos(angle) * dist;
          const py = Math.sin(angle) * dist;

          ctx.fillStyle = '#00ff00';

          ctx.fillRect(px - 2, py - 2, 4, 4);
        }

        // Center flash
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-15, -15, 30, 30);

        ctx.restore();
      }
    });

    // Draw notes
    notes.forEach((note) => {
      const progress = (now - note.startTime) / 1000;
      const position = progress * settings.speed;
      const y = position;

      if (y >= -50 && y <= canvas.height + 50) {
        const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const distanceToHitLine = Math.abs(y - 400);
        const inWindow = distanceToHitLine <= HIT_WINDOW;

        let color = '#00d9ff';
        if (note.missed) {
          color = '#ff0000'; // Brighter red for missed notes
          console.log('🔴 RENDERING MISSED NOTE:', note.id, 'at position', y);
        } else if (note.hit) {
          color = '#00ff00'; // Green for successfully hit notes
        } else if (inWindow) {
          color = '#ffff00'; // Yellow when in hit window (ready to hit)
        }

        // Note glow
        if (note.missed) {
          ctx.shadowBlur = 20; // Stronger glow for missed notes
          ctx.shadowColor = '#ff0000';
        } else if (note.hit) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ff00'; // Green glow for hit notes
        } else if (inWindow && !note.missed) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ffff00'; // Yellow glow when in hit window
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = color;
        }

        // Note body (8-bit style)
        ctx.fillStyle = color;
        ctx.fillRect(x - 25, y - 20, 50, 40);

        // Special visual treatment for missed notes
        if (note.missed) {
          // Add a pulsing red overlay for missed notes
          const pulseAlpha = 0.3 + 0.2 * Math.sin(now / 200);
          ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
          ctx.fillRect(x - 25, y - 20, 50, 40);

          // Add X mark for missed notes
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x - 15, y - 10);
          ctx.lineTo(x + 15, y + 10);
          ctx.moveTo(x + 15, y - 10);
          ctx.lineTo(x - 15, y + 10);
          ctx.stroke();
        } else {
          // Inner highlight for non-missed notes
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(x - 20, y - 15, 15, 10);
        }

        // Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = note.missed ? '#ff0000' : '#000'; // Red border for missed notes
        ctx.lineWidth = note.missed ? 4 : 3; // Thicker border for missed notes
        ctx.strokeRect(x - 25, y - 20, 50, 40);

        // Note icon (8-bit style) - only show for non-missed notes
        if (!note.missed) {
          ctx.fillStyle = '#000';
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('♪', x, y);
        }
      }
    });

    ctx.shadowBlur = 0;
  }, [notes, settings.speed, hitEffects, keyPresses]);

  useEffect(() => {
    if (isPlaying) {
      let animationId: number;
      const animate = () => {
        renderGame();
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationId);
    }
  }, [isPlaying, renderGame]);

  if (!isPlaying) {
    return (
      <div
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
          border: '4px solid #0f3460',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          fontFamily: 'monospace',
        }}
      >
        <h3
          style={{
            color: '#00d4ff',
            fontSize: '20px',
            marginBottom: '16px',
            textShadow: '0 0 10px #00d4ff, 2px 2px 0 #000',
            letterSpacing: '2px',
          }}
        >
          🎮 RHYTHM MASTER 🎮
        </h3>
        <p
          style={{
            color: '#00ff00',
            fontSize: '12px',
            marginBottom: '20px',
            textShadow: '1px 1px 0 #000',
          }}
        >
          PRESS START TO BEGIN!
        </p>

        {/* Audio Initialization Button */}
        {!audioInitialized && audioEngine && (
          <button
            onClick={initializeAudio}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(45deg, #ff6600, #ff8800)',
              color: '#fff',
              border: '3px solid #000',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              textShadow: '1px 1px 0 #000',
              boxShadow: '0 4px 0 #000, 0 0 20px rgba(255, 102, 0, 0.5)',
              transition: 'all 0.1s ease',
              marginBottom: '16px',
              letterSpacing: '1px',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #000, 0 0 20px rgba(255, 102, 0, 0.5)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 0 #000, 0 0 20px rgba(255, 102, 0, 0.5)';
            }}
          >
            🔊 INITIALIZE AUDIO
          </button>
        )}

        {/* Audio Status */}
        <div
          style={{
            marginBottom: '16px',
            padding: '8px 16px',
            background: audioInitialized ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
            border: `2px solid ${audioInitialized ? '#00ff00' : '#ff0000'}`,
            borderRadius: '4px',
            fontSize: '10px',
            color: audioInitialized ? '#00ff00' : '#ff0000',
            textShadow: '0 0 10px currentColor',
            fontFamily: 'monospace',
            letterSpacing: '1px',
          }}
        >
          {audioInitialized
            ? '✅ AUDIO READY'
            : audioEngine
              ? '❌ AUDIO NOT INITIALIZED'
              : '⚠️ NO AUDIO ENGINE'}
        </div>

        {/* Test Audio Button */}
        {audioEngine && (
          <button
            onClick={async () => {
              try {
                // Resume audio context first
                const engineState = audioEngine.getEngineState();
                console.log('FallingNotesChallenge: Current audio engine state:', engineState);

                if (!engineState.isInitialized) {
                  console.log('FallingNotesChallenge: Initializing audio engine...');
                  await audioEngine.initialize();
                  console.log('FallingNotesChallenge: Audio engine initialized');
                }

                console.log(
                  'FallingNotesChallenge: Testing audio with note:',
                  instrument === 'drums' ? 'kick' : 'C4'
                );
                audioEngine.playNote(instrument, instrument === 'drums' ? 'kick' : 'C4', 0.8);
                console.log('FallingNotesChallenge: Test note played successfully');
              } catch (error) {
                console.error('FallingNotesChallenge: Test audio failed:', error);
                alert(
                  'Audio test failed: ' + (error instanceof Error ? error.message : String(error))
                );
              }
            }}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
              color: '#fff',
              border: '3px solid #000',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              textShadow: '1px 1px 0 #000',
              boxShadow: '0 4px 0 #000, 0 0 20px rgba(78, 205, 196, 0.5)',
              transition: 'all 0.1s ease',
              marginBottom: '16px',
              letterSpacing: '1px',
            }}
          >
            🔊 TEST AUDIO
          </button>
        )}

        <button
          onClick={async () => {
            // Ensure audio context is ready before starting
            if (audioEngine && audioInitialized) {
              try {
                // Resume audio context if suspended
                const engineState = audioEngine.getEngineState();
                if (!engineState.isInitialized) {
                  console.log(
                    'FallingNotesChallenge: Initializing audio engine before game start...'
                  );
                  await audioEngine.initialize();
                }

                // Play a test sound to verify audio is working
                console.log('FallingNotesChallenge: Playing test sound before starting');
                audioEngine.playNote(instrument, instrument === 'drums' ? 'kick' : 'C4', 0.7);
              } catch (error) {
                console.error('FallingNotesChallenge: Test sound failed:', error);
              }
            }
            await startChallenge();
          }}
          disabled={false} // Allow starting even without audio
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)',
            color: '#000',
            border: '4px solid #000',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer',
            textShadow: '1px 1px 0 #fff',
            boxShadow: '0 4px 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)',
            letterSpacing: '2px',
            transition: 'all 0.1s',
            opacity: 1,
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(4px)';
            e.currentTarget.style.boxShadow = '0 0 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 0 #006600, 0 0 20px rgba(0, 255, 0, 0.5)';
          }}
        >
          ▶ START GAME
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        border: '4px solid #0f3460',
        boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.5)',
        fontFamily: 'monospace',
        overflow: 'hidden',
        maxWidth: '100vw',
        width: '100%',
        boxSizing: 'border-box',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Audio Initialization Button */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999 }}>
        <AudioInitButton
          onAudioInitialized={() => {
            setAudioInitialized(true);
          }}
          position="top-right"
        />
      </div>

      {/* Game Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px',
          fontSize: '14px',
        }}
      >
        <div
          style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid #0f3460',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              color: '#ffff00',
              textShadow: '0 0 10px #ffff00, 1px 1px 0 #000',
              marginBottom: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            SCORE: {score.toLocaleString()}
          </div>
          <div
            style={{
              color: '#ff6600',
              textShadow: '0 0 10px #ff6600, 1px 1px 0 #000',
              fontSize: '14px',
            }}
          >
            COMBO: x{combo}
          </div>
        </div>
        <div
          style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid #0f3460',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              color: '#00ff00',
              textShadow: '0 0 10px #00ff00, 1px 1px 0 #000',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            ACC: {accuracy.toFixed(1)}%
          </div>
          <div
            style={{
              color: '#00d4ff',
              textShadow: '0 0 10px #00d4ff, 1px 1px 0 #000',
              fontSize: '14px',
            }}
          >
            TIME: {Math.floor(gameTime / 1000)}s
          </div>
        </div>
      </div>

      {/* Hit Feedback - Desktop Only */}
      {lastHitAccuracy && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '20px',
            fontWeight: 'bold',
            color: lastHitAccuracy === 'MISS!' ? '#ff0064' : '#00ff00',
            textShadow: `0 0 20px ${lastHitAccuracy === 'MISS!' ? '#ff0064' : '#00ff00'}, 2px 2px 0 #000`,
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '12px 20px',
            borderRadius: '8px',
            border: `2px solid ${lastHitAccuracy === 'MISS!' ? '#ff0064' : '#00ff00'}`,
            zIndex: 1000,
            animation: 'pulse 0.3s ease-out',
            display: window.innerWidth > 768 ? 'block' : 'none', // Desktop only
          }}
        >
          {lastHitAccuracy}
        </div>
      )}

      {/* Game Canvas */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={480}
          style={{
            border: '4px solid #0f3460',
            background: '#0a0a0a',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.8)',
            maxWidth: 'calc(100vw - 40px)',
            maxHeight: 'calc(100vh - 300px)',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          marginBottom: '12px',
          flexWrap: 'wrap',
          padding: '0 8px',
        }}
      >
        {['A/1', 'S/2', 'D/3', 'F/4'].map((key, i) => (
          <button
            key={i}
            onTouchStart={(e) => {
              e.preventDefault();
              handleTouchStart(i);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleTouchEnd(i);
            }}
            style={{
              padding: '8px 12px',
              background: keyPresses.has(i)
                ? 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)'
                : 'linear-gradient(180deg, #333 0%, #222 100%)',
              border: '3px solid #000',
              borderRadius: '4px',
              color: keyPresses.has(i) ? '#000' : '#fff',
              fontSize: '10px',
              fontWeight: 'bold',
              boxShadow: keyPresses.has(i)
                ? '0 0 15px #00ff00, inset 0 2px 4px rgba(255,255,255,0.3)'
                : '0 4px 0 #111',
              transform: keyPresses.has(i) ? 'translateY(4px)' : 'translateY(0)',
              transition: 'all 0.05s',
              textShadow: keyPresses.has(i) ? 'none' : '1px 1px 0 #000',
              minWidth: '60px',
              textAlign: 'center',
              flex: '1 1 auto',
              maxWidth: '80px',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Difficulty Indicator */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '12px',
          color:
            difficulty === 'hard' ? '#ff0064' : difficulty === 'medium' ? '#ffff00' : '#00ff00',
          fontWeight: 'bold',
          textShadow: `0 0 10px ${difficulty === 'hard' ? '#ff0064' : difficulty === 'medium' ? '#ffff00' : '#00ff00'}, 1px 1px 0 #000`,
          letterSpacing: '2px',
        }}
      >
        DIFFICULTY: {difficulty.toUpperCase()}
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Prevent scrollbars and ensure proper mobile layout */
        body {
          overflow-x: hidden;
        }
        
        /* Improve touch responsiveness */
        button {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        /* Ensure canvas scales properly */
        canvas {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
};
