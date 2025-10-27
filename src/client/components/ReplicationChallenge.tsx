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
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

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
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedNotes([]);
    recordingStartTimeRef.current = Date.now();

    // Start recording interval
    recordingIntervalRef.current = window.setInterval(() => {
      setCurrentTime(Date.now() - recordingStartTimeRef.current);
    }, 100);
  }, []);

  // Stop recording and compare
  const stopRecording = useCallback(() => {
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
    (note: string, velocity: number) => {
      if (!isRecording) return;

      const currentTime = Date.now() - recordingStartTimeRef.current;
      const newNote: RecordedNote = {
        note,
        velocity,
        startTime: currentTime / 1000, // Convert to seconds
        duration: 0.5, // Default duration
      };

      setRecordedNotes((prev) => [...prev, newNote]);
      onNotePlay(note, velocity);
    },
    [isRecording, onNotePlay]
  );

  // Play target track for reference
  const playTargetTrack = useCallback(() => {
    setIsPlaying(true);
    let currentIndex = 0;

    const playNextNote = () => {
      if (currentIndex < targetTrack.notes.length) {
        const note = targetTrack.notes[currentIndex];
        onNotePlay(note.note, note.velocity);
        currentIndex++;

        if (currentIndex < targetTrack.notes.length) {
          const nextNote = targetTrack.notes[currentIndex];
          const delay = (nextNote.startTime - note.startTime) * 1000;
          playbackIntervalRef.current = window.setTimeout(playNextNote, delay);
        } else {
          setIsPlaying(false);
        }
      }
    };

    playNextNote();
  }, [targetTrack.notes, onNotePlay]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
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

  // Auto-start when active
  useEffect(() => {
    if (isActive && !isRecording && !isPlaying) {
      // Auto-play target track first
      playTargetTrack();
    }
  }, [isActive, isRecording, isPlaying, playTargetTrack]);

  return (
    <div
      style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
        borderRadius: '0px',
        border: '4px solid #444',
        fontFamily: "'Press Start 2P', monospace",
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '10px' }}>
          🎵 REPLICATION CHALLENGE
        </h3>
        <p style={{ color: '#aaa', fontSize: '10px', marginBottom: '15px' }}>
          LISTEN TO THE TARGET TRACK, THEN REPLICATE IT!
        </p>
      </div>

      {/* Target Track Info */}
      <div
        style={{ marginBottom: '20px', padding: '15px', background: '#333', borderRadius: '8px' }}
      >
        <div style={{ color: '#4ecdc4', fontSize: '10px', marginBottom: '8px' }}>TARGET TRACK</div>
        <div style={{ color: 'white', fontSize: '12px', marginBottom: '5px' }}>
          Instrument: {instrument.toUpperCase()}
        </div>
        <div style={{ color: '#aaa', fontSize: '8px' }}>
          Notes: {targetTrack.notes.length} | Duration: {targetTrack.duration.toFixed(1)}s
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
        <button
          onClick={playTargetTrack}
          disabled={isPlaying || isRecording}
          style={{
            padding: '12px 24px',
            background: isPlaying ? '#666' : 'linear-gradient(135deg, #4ecdc4, #45b7d1)',
            color: 'white',
            border: '3px solid #333',
            borderRadius: '0px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: "'Press Start 2P', monospace",
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            boxShadow: '4px 4px 0px #333',
          }}
        >
          {isPlaying ? 'PLAYING...' : '🎵 PLAY TARGET'}
        </button>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            padding: '12px 24px',
            background: isRecording
              ? 'linear-gradient(135deg, #ff6b6b, #ee5a52)'
              : 'linear-gradient(135deg, #feca57, #ff9ff3)',
            color: 'white',
            border: '3px solid #333',
            borderRadius: '0px',
            fontSize: '10px',
            fontWeight: 'bold',
            fontFamily: "'Press Start 2P', monospace",
            cursor: 'pointer',
            boxShadow: '4px 4px 0px #333',
          }}
        >
          {isRecording ? '⏹️ STOP RECORDING' : '🎤 START RECORDING'}
        </button>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '5px' }}>
            🔴 RECORDING...
          </div>
          <div style={{ color: '#aaa', fontSize: '8px' }}>
            Time: {(currentTime / 1000).toFixed(1)}s | Notes: {recordedNotes.length}
          </div>
        </div>
      )}

      {/* Results */}
      {comparisonResults.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              color: '#feca57',
              fontSize: '12px',
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            RESULTS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              style={{
                padding: '10px',
                background: '#333',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#4ecdc4', fontSize: '8px' }}>ACCURACY</div>
              <div style={{ color: 'white', fontSize: '16px' }}>{accuracy.toFixed(1)}%</div>
            </div>
            <div
              style={{
                padding: '10px',
                background: '#333',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#feca57', fontSize: '8px' }}>SCORE</div>
              <div style={{ color: 'white', fontSize: '16px' }}>{score.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ textAlign: 'center', fontSize: '8px', color: '#aaa', lineHeight: 1.5 }}>
        <div>1. CLICK "PLAY TARGET" TO HEAR THE ORIGINAL</div>
        <div>2. CLICK "START RECORDING" TO BEGIN YOUR ATTEMPT</div>
        <div>3. PLAY THE SAME NOTES IN THE SAME TIMING</div>
        <div>4. CLICK "STOP RECORDING" WHEN DONE</div>
      </div>

      {/* Challenge Mode Indicator */}
      {challengeMode === 'challenge' && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#ff6b6b',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '8px',
            fontWeight: 'bold',
          }}
        >
          CHALLENGE MODE
        </div>
      )}
    </div>
  );
};
