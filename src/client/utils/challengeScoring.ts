// Challenge scoring system for Dhwani
// Implements note accuracy calculation and timing precision scoring

import type { TrackData, NoteEvent } from '../../shared/types/music.js';

export type ScoreBreakdown = {
  noteAccuracy: number;
  timingAccuracy: number;
  velocityAccuracy: number;
  overallScore: number;
  totalNotes: number;
  correctNotes: number;
  missedNotes: number;
  extraNotes: number;
  timingErrors: number[];
  velocityErrors: number[];
  grade: string;
  feedback: string[];
};

export type ScoringConfig = {
  timingTolerance: number; // seconds
  velocityTolerance: number; // 0-1 range
  noteAccuracyWeight: number; // 0-1 range
  timingAccuracyWeight: number; // 0-1 range
  velocityAccuracyWeight: number; // 0-1 range
  perfectThreshold: number; // score threshold for perfect grade
  excellentThreshold: number; // score threshold for excellent grade
  goodThreshold: number; // score threshold for good grade
  fairThreshold: number; // score threshold for fair grade
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  timingTolerance: 0.1, // 100ms tolerance
  velocityTolerance: 0.2, // 20% velocity tolerance
  noteAccuracyWeight: 0.5, // 50% weight for note accuracy
  timingAccuracyWeight: 0.3, // 30% weight for timing
  velocityAccuracyWeight: 0.2, // 20% weight for velocity
  perfectThreshold: 95,
  excellentThreshold: 85,
  goodThreshold: 70,
  fairThreshold: 55,
};

/**
 * Calculate comprehensive challenge score comparing user input to original track
 */
export function calculateChallengeScore(
  originalTrack: TrackData,
  recordedTrack: TrackData,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoreBreakdown {
  // Normalize tracks to same tempo if different
  const normalizedOriginal = normalizeTrackTempo(originalTrack, originalTrack.tempo);
  const normalizedRecorded = normalizeTrackTempo(recordedTrack, originalTrack.tempo);

  // Calculate note accuracy
  const noteAccuracyResult = calculateNoteAccuracy(
    normalizedOriginal.notes,
    normalizedRecorded.notes,
    config
  );

  // Calculate timing accuracy
  const timingAccuracyResult = calculateTimingAccuracy(
    normalizedOriginal.notes,
    normalizedRecorded.notes,
    config
  );

  // Calculate velocity accuracy
  const velocityAccuracyResult = calculateVelocityAccuracy(
    normalizedOriginal.notes,
    normalizedRecorded.notes,
    config
  );

  // Calculate weighted overall score
  const overallScore =
    noteAccuracyResult.accuracy * config.noteAccuracyWeight +
    timingAccuracyResult.accuracy * config.timingAccuracyWeight +
    velocityAccuracyResult.accuracy * config.velocityAccuracyWeight;

  // Generate grade and feedback
  const grade = calculateGrade(overallScore, config);
  const feedback = generateFeedback(
    noteAccuracyResult,
    timingAccuracyResult,
    velocityAccuracyResult,
    overallScore,
    config
  );

  return {
    noteAccuracy: Math.round(noteAccuracyResult.accuracy * 10) / 10,
    timingAccuracy: Math.round(timingAccuracyResult.accuracy * 10) / 10,
    velocityAccuracy: Math.round(velocityAccuracyResult.accuracy * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
    totalNotes: normalizedOriginal.notes.length,
    correctNotes: noteAccuracyResult.correctNotes,
    missedNotes: noteAccuracyResult.missedNotes,
    extraNotes: noteAccuracyResult.extraNotes,
    timingErrors: timingAccuracyResult.errors,
    velocityErrors: velocityAccuracyResult.errors,
    grade,
    feedback,
  };
}

/**
 * Normalize track tempo for fair comparison
 */
function normalizeTrackTempo(track: TrackData, targetTempo: number): TrackData {
  if (track.tempo === targetTempo) {
    return track;
  }

  const tempoRatio = targetTempo / track.tempo;
  const normalizedNotes = track.notes.map((note) => ({
    ...note,
    startTime: note.startTime * tempoRatio,
    duration: note.duration * tempoRatio,
  }));

  return {
    ...track,
    notes: normalizedNotes,
    tempo: targetTempo,
    duration: track.duration * tempoRatio,
  };
}

/**
 * Calculate note accuracy by matching notes between original and recorded tracks
 */
function calculateNoteAccuracy(
  originalNotes: NoteEvent[],
  recordedNotes: NoteEvent[],
  config: ScoringConfig
): {
  accuracy: number;
  correctNotes: number;
  missedNotes: number;
  extraNotes: number;
} {
  if (originalNotes.length === 0) {
    return {
      accuracy: recordedNotes.length === 0 ? 100 : 0,
      correctNotes: 0,
      missedNotes: 0,
      extraNotes: recordedNotes.length,
    };
  }

  // Create a map of original notes by pitch for efficient lookup
  const originalNoteMap = new Map<string, NoteEvent[]>();
  originalNotes.forEach((note) => {
    if (!originalNoteMap.has(note.note)) {
      originalNoteMap.set(note.note, []);
    }
    originalNoteMap.get(note.note)!.push(note);
  });

  let correctNotes = 0;
  let extraNotes = 0;
  const matchedOriginalIndices = new Set<number>();

  // Check each recorded note against original notes
  recordedNotes.forEach((recordedNote) => {
    const originalNotesForPitch = originalNoteMap.get(recordedNote.note) || [];
    let bestMatch: { note: NoteEvent; index: number; timeDiff: number } | null = null;

    // Find the closest unmatched original note within timing tolerance
    originalNotesForPitch.forEach((originalNote) => {
      const globalIndex = originalNotes.findIndex(
        (n, i) => n === originalNote && !matchedOriginalIndices.has(i)
      );

      if (globalIndex === -1) return; // Already matched

      const timeDiff = Math.abs(originalNote.startTime - recordedNote.startTime);

      if (timeDiff <= config.timingTolerance) {
        if (!bestMatch || timeDiff < bestMatch.timeDiff) {
          bestMatch = { note: originalNote, index: globalIndex, timeDiff };
        }
      }
    });

    if (bestMatch) {
      correctNotes++;
      matchedOriginalIndices.add(bestMatch.index);
    } else {
      extraNotes++;
    }
  });

  const missedNotes = originalNotes.length - correctNotes;
  const accuracy = (correctNotes / originalNotes.length) * 100;

  return {
    accuracy,
    correctNotes,
    missedNotes,
    extraNotes,
  };
}

/**
 * Calculate timing accuracy for matched notes
 */
function calculateTimingAccuracy(
  originalNotes: NoteEvent[],
  recordedNotes: NoteEvent[],
  config: ScoringConfig
): {
  accuracy: number;
  errors: number[];
} {
  const timingErrors: number[] = [];

  // Match notes and calculate timing differences
  recordedNotes.forEach((recordedNote) => {
    const originalNotesForPitch = originalNotes.filter((n) => n.note === recordedNote.note);

    if (originalNotesForPitch.length === 0) return;

    // Find closest original note by timing
    let closestTimeDiff = Infinity;
    originalNotesForPitch.forEach((originalNote) => {
      const timeDiff = Math.abs(originalNote.startTime - recordedNote.startTime);
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
      }
    });

    if (closestTimeDiff <= config.timingTolerance) {
      timingErrors.push(closestTimeDiff);
    }
  });

  // Calculate accuracy based on average timing error
  const avgTimingError =
    timingErrors.length > 0
      ? timingErrors.reduce((sum, err) => sum + err, 0) / timingErrors.length
      : 0;

  const accuracy = Math.max(0, (1 - avgTimingError / config.timingTolerance) * 100);

  return {
    accuracy,
    errors: timingErrors,
  };
}

/**
 * Calculate velocity accuracy for matched notes
 */
function calculateVelocityAccuracy(
  originalNotes: NoteEvent[],
  recordedNotes: NoteEvent[],
  config: ScoringConfig
): {
  accuracy: number;
  errors: number[];
} {
  const velocityErrors: number[] = [];

  // Match notes and calculate velocity differences
  recordedNotes.forEach((recordedNote) => {
    const originalNotesForPitch = originalNotes.filter((n) => n.note === recordedNote.note);

    if (originalNotesForPitch.length === 0) return;

    // Find closest original note by timing
    let closestNote: NoteEvent | null = null;
    let closestTimeDiff = Infinity;

    originalNotesForPitch.forEach((originalNote) => {
      const timeDiff = Math.abs(originalNote.startTime - recordedNote.startTime);
      if (timeDiff < closestTimeDiff && timeDiff <= config.timingTolerance) {
        closestTimeDiff = timeDiff;
        closestNote = originalNote;
      }
    });

    if (closestNote) {
      const velocityDiff = Math.abs(closestNote.velocity - recordedNote.velocity);
      velocityErrors.push(velocityDiff);
    }
  });

  // Calculate accuracy based on average velocity error
  const avgVelocityError =
    velocityErrors.length > 0
      ? velocityErrors.reduce((sum, err) => sum + err, 0) / velocityErrors.length
      : 0;

  const accuracy = Math.max(0, (1 - avgVelocityError / config.velocityTolerance) * 100);

  return {
    accuracy,
    errors: velocityErrors,
  };
}

/**
 * Calculate letter grade based on overall score
 */
function calculateGrade(score: number, config: ScoringConfig): string {
  if (score >= config.perfectThreshold) return 'S';
  if (score >= config.excellentThreshold) return 'A';
  if (score >= config.goodThreshold) return 'B';
  if (score >= config.fairThreshold) return 'C';
  return 'D';
}

/**
 * Generate helpful feedback based on performance
 */
function generateFeedback(
  noteResult: { accuracy: number; correctNotes: number; missedNotes: number; extraNotes: number },
  timingResult: { accuracy: number; errors: number[] },
  velocityResult: { accuracy: number; errors: number[] },
  overallScore: number,
  config: ScoringConfig
): string[] {
  const feedback: string[] = [];

  // Overall performance feedback
  if (overallScore >= config.perfectThreshold) {
    feedback.push('🎉 Perfect performance! You nailed it!');
  } else if (overallScore >= config.excellentThreshold) {
    feedback.push('🌟 Excellent work! Very close to perfect.');
  } else if (overallScore >= config.goodThreshold) {
    feedback.push('👍 Good job! Keep practicing to improve.');
  } else if (overallScore >= config.fairThreshold) {
    feedback.push('📈 Fair attempt. Focus on accuracy and timing.');
  } else {
    feedback.push("💪 Keep practicing! You'll get better with time.");
  }

  // Note accuracy feedback
  if (noteResult.accuracy < 70) {
    if (noteResult.missedNotes > noteResult.extraNotes) {
      feedback.push('🎯 Try to hit more of the original notes - you missed quite a few.');
    } else if (noteResult.extraNotes > noteResult.missedNotes) {
      feedback.push("🎵 You played extra notes. Focus on playing only what's in the original.");
    } else {
      feedback.push('🎼 Work on note accuracy - listen carefully to the original pattern.');
    }
  } else if (noteResult.accuracy >= 90) {
    feedback.push('🎯 Excellent note accuracy!');
  }

  // Timing feedback
  if (timingResult.accuracy < 70) {
    const avgError =
      timingResult.errors.reduce((sum, err) => sum + err, 0) / timingResult.errors.length;
    if (avgError > config.timingTolerance * 0.7) {
      feedback.push('⏰ Focus on timing - try to match the rhythm more closely.');
    } else {
      feedback.push('🥁 Work on your timing precision for better scores.');
    }
  } else if (timingResult.accuracy >= 90) {
    feedback.push('⏱️ Great timing precision!');
  }

  // Velocity feedback
  if (velocityResult.accuracy < 70) {
    feedback.push('🔊 Pay attention to how hard you hit the notes - dynamics matter!');
  } else if (velocityResult.accuracy >= 90) {
    feedback.push('🎚️ Excellent control of note dynamics!');
  }

  return feedback;
}

/**
 * Get color class for score display based on score value
 */
export function getScoreColor(score: number): string {
  if (score >= 95) return 'text-purple-600';
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 55) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get background color class for score display
 */
export function getScoreBackgroundColor(score: number): string {
  if (score >= 95) return 'bg-purple-50 border-purple-200';
  if (score >= 85) return 'bg-green-50 border-green-200';
  if (score >= 70) return 'bg-blue-50 border-blue-200';
  if (score >= 55) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}
