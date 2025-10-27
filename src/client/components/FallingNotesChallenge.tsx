import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  InstrumentType,
  DrumType,
  ChallengeType,
  ChallengeScore,
  ScoringWeights,
} from '../../shared/types/music.js';
import type { DhwaniAudioEngine } from '../audio/DhwaniAudioEngine.js';

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
  songDuration?: number;
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
  easy: { noteInterval: 2000, noteDuration: 1000, speed: 150 },
  medium: { noteInterval: 1500, noteDuration: 800, speed: 200 },
  hard: { noteInterval: 1000, noteDuration: 600, speed: 250 },
};

export const FallingNotesChallenge: React.FC<FallingNotesChallengeProps> = ({
  instrument,
  onNoteHit,
  onScoreUpdate,
  difficulty,
  isActive,
  onComplete,
  songPattern,
  songDuration,
  songNotes,
  challengeMode = 'practice',
  scoreWeights = { timing: 0.7, accuracy: 0.3 },
  onChallengeComplete,
  audioEngine,
}: FallingNotesChallengeProps) => {
  console.log('FallingNotesChallenge: Component rendered with props:', {
    instrument,
    songNotes: songNotes?.length || 0,
    audioEngine: !!audioEngine,
    isActive,
    difficulty,
  });
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
          const stats = audioEngine.getPerformanceStats();
          console.log('FallingNotesChallenge: Audio stats:', stats);
          setAudioInitialized(stats.isInitialized);
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
          const stats = audioEngine.getPerformanceStats();
          if (stats.isInitialized) {
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
        await audioEngine.initialize();
        console.log('FallingNotesChallenge: Audio initialized successfully');
        setAudioInitialized(true);
      } catch (error) {
        console.error('FallingNotesChallenge: Failed to initialize audio:', error);
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
    const totalHits =
      currentHitCounts.perfect +
      currentHitCounts.great +
      currentHitCounts.good +
      currentHitCounts.miss;
    console.log('Calculating scores:', { currentHitCounts, totalHits });

    if (totalHits === 0) {
      console.log('No hits detected, returning zero scores');
      return {
        timingScore: 0,
        accuracyScore: 0,
        combinedScore: 0,
      };
    }

    // Timing score based on hit quality
    const timingScore =
      (currentHitCounts.perfect * 100 + currentHitCounts.great * 75 + currentHitCounts.good * 50) /
      totalHits;

    // Accuracy score based on hit rate
    const accuracyScore =
      ((currentHitCounts.perfect + currentHitCounts.great + currentHitCounts.good) / totalHits) *
      100;

    // Combined score with weights
    const combinedScore = timingScore * scoreWeights.timing + accuracyScore * scoreWeights.accuracy;

    const result = {
      timingScore: Math.round(timingScore),
      accuracyScore: Math.round(accuracyScore),
      combinedScore: Math.round(combinedScore),
    };

    console.log('Calculated scores:', result);
    return result;
  }, [scoreWeights]);

  // Create challenge score when game completes
  const createChallengeScore = useCallback((): ChallengeScore => {
    const scores = calculateDetailedScores();
    const currentHitCounts = hitCountsRef.current;
    console.log('Creating challenge score:', {
      currentHitCounts,
      scores,
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
  }, [calculateDetailedScores, songPattern]);

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
        case 'bass': {
          const bassNotes: BassNote[] = ['E2', 'A2', 'D3', 'G3'];
          note = bassNotes[Math.floor(Math.random() * bassNotes.length)] || 'E2';
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
          `FallingNotesChallenge: Spawning note ${songNotesIndexRef.current}: ${currentSongNote.note} at ${elapsed}ms (expected: ${currentSongNote.startTime}ms)`
        );
        const newNote: FallingNote = {
          id: `${now}-${songNotesIndexRef.current}`,
          type: instrument,
          note: currentSongNote.note,
          lane: Math.floor(Math.random() * LANE_COUNT), // Random lane for now
          startTime: now,
          hitTime: now + settings.speed * 1000,
          duration: settings.noteDuration,
          velocity: 0.8,
        };
        setNotes((prevNotes) => [...prevNotes, newNote]);
        songNotesIndexRef.current++;
        totalNotesRef.current++;
      }
    } else {
      // Fallback to difficulty-based intervals
      if (now - lastNoteTimeRef.current >= settings.noteInterval) {
        const newNote = generateNote();
        setNotes((prevNotes) => [...prevNotes, newNote]);
        lastNoteTimeRef.current = now;
        totalNotesRef.current++;
      }
    }

    // Process notes - check for missed notes and duration completion
    setNotes((prevNotes) => {
      const updatedNotes = prevNotes
        .map((note) => {
          const progress = (now - note.startTime) / 1000;
          const position = progress * settings.speed;

          // Check if note should be released based on duration
          if (note.isBeingHeld && note.hitStartTime) {
            const heldDuration = now - note.hitStartTime;
            if (heldDuration >= note.duration) {
              // Note duration completed, release it
              const durationDiff = Math.abs(heldDuration - note.duration);
              const durationAccuracy = Math.max(0, 100 - (durationDiff / note.duration) * 100);

              // Award bonus points for good duration accuracy
              let durationBonus = 0;
              if (durationAccuracy >= 90) {
                durationBonus = 50;
              } else if (durationAccuracy >= 75) {
                durationBonus = 25;
              } else if (durationAccuracy >= 50) {
                durationBonus = 10;
              }

              if (durationBonus > 0) {
                setScore((prev) => prev + durationBonus);
                setLastHitAccuracy(`DURATION: ${Math.round(durationAccuracy)}%`);
                setTimeout(() => setLastHitAccuracy(''), 500);
              }

              // Mark as completed (will be filtered out)
              return { ...note, hit: true, isBeingHeld: false };
            }
          }

          // Check if note missed hit window
          if (position > 400 + HIT_WINDOW && !note.hit && !note.missed) {
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

            return { ...note, missed: true };
          }
          return note;
        })
        .filter((note) => {
          // Remove completed duration notes
          if (note.hit && !note.isBeingHeld) return false;

          const progress = (now - note.startTime) / 1000;
          const position = progress * settings.speed;
          return position < 500;
        });

      return updatedNotes;
    });

    // Check if all notes have been processed (hit or missed)
    const allNotesProcessed = songNotes ? songNotesIndexRef.current >= songNotes.length : false;
    const noActiveNotes = notes.every((note) => note.hit || note.missed);

    // Also check if we've exceeded the song duration as a fallback
    const gameDuration = songDuration || 30000;
    const timeExpired = elapsed >= gameDuration;

    if (allNotesProcessed && noActiveNotes) {
      // All notes have been processed, end the challenge
      stopChallenge();
      onComplete();
      return;
    } else if (timeExpired) {
      // Fallback: if time expires, end the challenge
      stopChallenge();
      onComplete();
      return;
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [
    isPlaying,
    settings,
    generateNote,
    stopChallenge,
    onComplete,
    songDuration,
    songNotes,
    notes,
    instrument,
  ]);

  const startChallenge = useCallback(async () => {
    console.log('FallingNotesChallenge: Starting challenge with songNotes:', songNotes);

    // Ensure audio engine is initialized before starting
    if (audioEngine && !audioInitialized) {
      console.log('FallingNotesChallenge: Audio engine not initialized, initializing...');
      try {
        await audioEngine.initialize();
        console.log('FallingNotesChallenge: Audio engine initialized successfully');
        setAudioInitialized(true);
      } catch (error) {
        console.error('FallingNotesChallenge: Failed to initialize audio engine:', error);
        // Continue anyway - audio is optional
      }
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

    // Reset hit counts
    hitCountsRef.current = {
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
    };

    // Initialize song notes if available
    if (songNotes && songNotes.length > 0) {
      console.log('Starting challenge with song notes:', songNotes);
      songNotesIndexRef.current = 0;
    } else {
      console.log('Starting challenge without song notes, using random generation');
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, songNotes, audioEngine, audioInitialized]);

  const handleNoteRelease = useCallback((lane: number) => {
    setNotes((prevNotes) => {
      const now = Date.now();

      // Find the note being held in this lane
      const noteIndex = prevNotes.findIndex((n) => n.lane === lane && n.isBeingHeld);
      if (noteIndex === -1) return prevNotes;

      const note = prevNotes[noteIndex];
      if (!note || !note.hitStartTime) return prevNotes;

      // Calculate duration accuracy
      const heldDuration = now - note.hitStartTime;
      const expectedDuration = note.duration;
      const durationDiff = Math.abs(heldDuration - expectedDuration);
      const durationAccuracy = Math.max(0, 100 - (durationDiff / expectedDuration) * 100);

      // Award bonus points for good duration accuracy
      let durationBonus = 0;
      if (durationAccuracy >= 90) {
        durationBonus = 50;
      } else if (durationAccuracy >= 75) {
        durationBonus = 25;
      } else if (durationAccuracy >= 50) {
        durationBonus = 10;
      }

      if (durationBonus > 0) {
        setScore((prev) => prev + durationBonus);
        setLastHitAccuracy(`DURATION: ${Math.round(durationAccuracy)}%`);
        setTimeout(() => setLastHitAccuracy(''), 500);
      }

      // Mark note as completed and remove it
      const newNotes = [...prevNotes];
      newNotes.splice(noteIndex, 1);
      return newNotes;
    });
  }, []);

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

        let points = 0;
        let accuracyText = '';
        let hitType: 'perfect' | 'great' | 'good' | 'miss' = 'miss';

        if (hitAccuracy >= 95) {
          points = 100;
          accuracyText = 'PERFECT!';
          hitType = 'perfect';
          setCombo((prev) => prev + 1);
        } else if (hitAccuracy >= 80) {
          points = 50;
          accuracyText = 'GREAT!';
          hitType = 'great';
          setCombo((prev) => prev + 1);
        } else if (hitAccuracy >= 60) {
          points = 25;
          accuracyText = 'GOOD';
          hitType = 'good';
          setCombo(0);
        } else {
          points = 10;
          accuracyText = 'OK';
          hitType = 'good'; // Changed from 'miss' to 'good' - any hit should count as a hit
          setCombo(0);
        }

        // Update detailed hit counts
        hitCountsRef.current = {
          ...hitCountsRef.current,
          [hitType]: hitCountsRef.current[hitType] + 1,
        };

        const multiplier = Math.min(2, 1 + combo / 10);
        points = Math.floor(points * multiplier);

        setScore((prev) => prev + points);
        hitCountRef.current++;

        const newAccuracy = (hitCountRef.current / totalNotesRef.current) * 100;
        setAccuracy(newAccuracy);
        onScoreUpdate(score + points, newAccuracy);

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
        if (audioEngine) {
          try {
            console.log(
              'FallingNotesChallenge: Attempting to play note directly with audio engine'
            );
            audioEngine.playNote(instrument, note.note, note.velocity);
          } catch (error) {
            console.error('FallingNotesChallenge: Error playing note directly:', error);
          }
        }

        onNoteHit(note.note, note.velocity);

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
    [combo, score, onNoteHit, onScoreUpdate, audioEngine, audioInitialized, instrument]
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

        // Handle note release
        handleNoteRelease(lane);
      }
    },
    [isPlaying, heldKeys, handleNoteRelease]
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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background with scanlines
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

          const color =
            effect.accuracy >= 95 ? '#00ff00' : effect.accuracy >= 80 ? '#ffff00' : '#ff6600';

          ctx.fillStyle = color;
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }

        // Center flash
        ctx.fillStyle =
          effect.accuracy >= 95 ? '#00ff00' : effect.accuracy >= 80 ? '#ffff00' : '#ff6600';
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
        if (note.missed) color = '#ff0064';
        else if (inWindow) color = '#00ff00';
        else if (note.isBeingHeld) color = '#ffff00'; // Yellow for held notes

        // Draw note duration trail
        if (note.duration > 0) {
          const durationHeight = (note.duration / 1000) * settings.speed;
          const trailY = y - durationHeight;

          // Duration trail gradient
          const trailGradient = ctx.createLinearGradient(x, trailY, x, y);
          trailGradient.addColorStop(0, 'rgba(0, 217, 255, 0.3)');
          trailGradient.addColorStop(1, 'rgba(0, 217, 255, 0.8)');

          ctx.fillStyle = trailGradient;
          ctx.fillRect(x - 15, trailY, 30, durationHeight);

          // Duration trail border
          ctx.strokeStyle = '#00d9ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 15, trailY, 30, durationHeight);
        }

        // Note glow
        if (inWindow && !note.missed) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ff00';
        } else if (note.isBeingHeld) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ffff00';
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = color;
        }

        // Note body (8-bit style)
        ctx.fillStyle = color;
        ctx.fillRect(x - 25, y - 20, 50, 40);

        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x - 20, y - 15, 15, 10);

        // Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 25, y - 20, 50, 40);

        // Note icon (8-bit style)
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', x, y);
      }
    });

    ctx.shadowBlur = 0;
  }, [notes, settings.speed, hitEffects, keyPresses]);

  useEffect(() => {
    if (isPlaying) {
      renderGame();
      const interval = setInterval(renderGame, 16);
      return () => clearInterval(interval);
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

        <button
          onClick={startChallenge}
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
        padding: '20px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        border: '4px solid #0f3460',
        boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.5)',
        fontFamily: 'monospace',
        overflow: 'hidden',
        maxWidth: '100%',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
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

      {/* Hit Feedback */}
      {lastHitAccuracy && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color:
              lastHitAccuracy === 'PERFECT!'
                ? '#00ff00'
                : lastHitAccuracy === 'GREAT!'
                  ? '#ffff00'
                  : lastHitAccuracy === 'GOOD'
                    ? '#ff6600'
                    : lastHitAccuracy === 'MISS!'
                      ? '#ff0064'
                      : '#fff',
            textShadow: `0 0 20px ${
              lastHitAccuracy === 'PERFECT!'
                ? '#00ff00'
                : lastHitAccuracy === 'GREAT!'
                  ? '#ffff00'
                  : lastHitAccuracy === 'GOOD'
                    ? '#ff6600'
                    : lastHitAccuracy === 'MISS!'
                      ? '#ff0064'
                      : '#fff'
            }, 2px 2px 0 #000`,
            marginBottom: '12px',
            animation: 'pulse 0.3s ease-out',
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
        }}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={500}
          style={{
            border: '4px solid #0f3460',
            background: '#0a0a0a',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.8)',
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        {['A/1', 'S/2', 'D/3', 'F/4'].map((key, i) => (
          <div
            key={i}
            style={{
              padding: '12px 16px',
              background: keyPresses.has(i)
                ? 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)'
                : 'linear-gradient(180deg, #333 0%, #222 100%)',
              border: '3px solid #000',
              borderRadius: '4px',
              color: keyPresses.has(i) ? '#000' : '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: keyPresses.has(i)
                ? '0 0 15px #00ff00, inset 0 2px 4px rgba(255,255,255,0.3)'
                : '0 4px 0 #111',
              transform: keyPresses.has(i) ? 'translateY(4px)' : 'translateY(0)',
              transition: 'all 0.05s',
              textShadow: keyPresses.has(i) ? 'none' : '1px 1px 0 #000',
            }}
          >
            {key}
          </div>
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
      `}</style>
    </div>
  );
};
