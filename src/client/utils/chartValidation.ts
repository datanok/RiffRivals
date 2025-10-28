// Chart validation utilities for Chart Creator Mode

import type { ChartData, ChartNote } from '../../shared/types/music.js';

/**
 * Validate timing alignment of notes
 * Notes should align with beats based on BPM within ±0.1s tolerance
 */
export function validateTiming(
  notes: ChartNote[],
  bpm: number
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const beatDuration = 60 / bpm; // Duration of one beat in seconds
  const tolerance = 0.1; // ±0.1s tolerance

  notes.forEach((note, index) => {
    // Calculate the nearest beat
    const nearestBeat = Math.round(note.time / beatDuration);
    const expectedTime = nearestBeat * beatDuration;
    const timeDiff = Math.abs(note.time - expectedTime);

    if (timeDiff > tolerance) {
      errors.push(
        `Note ${index + 1} at ${note.time.toFixed(2)}s is ${timeDiff.toFixed(2)}s off from nearest beat (expected: ${expectedTime.toFixed(2)}s)`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate note density - ensure reasonable number of notes
 * Too many notes = unplayable, too few = boring
 */
export function validateDensity(
  notes: ChartNote[],
  duration: number
): {
  isValid: boolean;
  errors: string[];
  notesPerSecond: number;
} {
  const errors: string[] = [];
  const notesPerSecond = notes.length / duration;

  // Minimum: 0.5 notes per second (1 note every 2 seconds)
  // Maximum: 10 notes per second (very fast)
  const MIN_DENSITY = 0.5;
  const MAX_DENSITY = 10;

  if (notesPerSecond < MIN_DENSITY) {
    errors.push(
      `Chart has too few notes (${notesPerSecond.toFixed(2)} notes/sec). Minimum: ${MIN_DENSITY} notes/sec`
    );
  }

  if (notesPerSecond > MAX_DENSITY) {
    errors.push(
      `Chart has too many notes (${notesPerSecond.toFixed(2)} notes/sec). Maximum: ${MAX_DENSITY} notes/sec`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    notesPerSecond,
  };
}

/**
 * Check for overlapping notes in the same lane
 * Notes in the same lane should not overlap
 */
export function validateNoOverlaps(notes: ChartNote[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const laneNotes = new Map<string, ChartNote[]>();

  // Group notes by lane
  notes.forEach((note) => {
    if (!laneNotes.has(note.lane)) {
      laneNotes.set(note.lane, []);
    }
    laneNotes.get(note.lane)!.push(note);
  });

  // Check for overlaps within each lane
  laneNotes.forEach((laneNotesArray, lane) => {
    const sortedNotes = [...laneNotesArray].sort((a, b) => a.time - b.time);

    for (let i = 0; i < sortedNotes.length - 1; i++) {
      const currentNote = sortedNotes[i];
      const nextNote = sortedNotes[i + 1];

      // Check if notes are too close (within 0.1s)
      if (nextNote && currentNote && nextNote.time - currentNote.time < 0.1) {
        errors.push(
          `Notes in lane "${lane}" at ${currentNote.time.toFixed(2)}s and ${nextNote.time.toFixed(2)}s are too close together`
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that chart duration matches the last note time
 */
export function validateDuration(
  notes: ChartNote[],
  duration: number
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (notes.length === 0) {
    errors.push('Chart has no notes');
    return { isValid: false, errors };
  }

  const lastNoteTime = Math.max(...notes.map((n) => n.time));

  // Duration should be at least 1 second after the last note
  if (duration < lastNoteTime + 1) {
    errors.push(
      `Chart duration (${duration}s) should be at least 1 second after last note (${lastNoteTime.toFixed(2)}s)`
    );
  }

  // Duration shouldn't be too long (more than 5 seconds after last note)
  if (duration > lastNoteTime + 5) {
    errors.push(
      `Chart duration (${duration}s) is too long. Last note is at ${lastNoteTime.toFixed(2)}s`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive chart validation
 * Runs all validation checks
 */
export function validateChart(chart: ChartData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic checks
  if (!chart.title || chart.title.trim().length === 0) {
    errors.push('Chart must have a title');
  }

  if (chart.bpm < 60 || chart.bpm > 240) {
    errors.push('BPM must be between 60 and 240');
  }

  if (chart.notes.length === 0) {
    errors.push('Chart must have at least one note');
  }

  if (chart.duration <= 0) {
    errors.push('Chart duration must be greater than 0');
  }

  if (chart.lanes.length === 0) {
    errors.push('Chart must have at least one lane');
  }

  // Validate all notes have valid lanes
  const validLanes = new Set(chart.lanes);
  chart.notes.forEach((note, index) => {
    if (!validLanes.has(note.lane)) {
      errors.push(`Note ${index + 1} has invalid lane: "${note.lane}"`);
    }
  });

  // Run detailed validations if basic checks pass
  if (chart.notes.length > 0 && chart.duration > 0) {
    // REMOVED: Timing validation - users have full freedom to place notes anywhere
    // const timingValidation = validateTiming(chart.notes, chart.bpm);
    // REMOVED: Density validation - users can have as many or as few notes as they want
    // const densityValidation = validateDensity(chart.notes, chart.duration);
    // REMOVED: Overlap validation - users can place notes however they want
    // const overlapValidation = validateNoOverlaps(chart.notes);
    // REMOVED: Duration validation - users have full control
    // const durationValidation = validateDuration(chart.notes, chart.duration);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate difficulty rating based on chart characteristics
 */
export function calculateDifficulty(chart: ChartData): 'easy' | 'medium' | 'hard' {
  const notesPerSecond = chart.notes.length / chart.duration;
  const uniqueLanes = new Set(chart.notes.map((n) => n.lane)).size;

  // Calculate complexity score
  let complexityScore = 0;

  // Notes per second factor
  if (notesPerSecond < 2) complexityScore += 1;
  else if (notesPerSecond < 4) complexityScore += 2;
  else complexityScore += 3;

  // Lane usage factor
  if (uniqueLanes <= 2) complexityScore += 1;
  else if (uniqueLanes <= 4) complexityScore += 2;
  else complexityScore += 3;

  // BPM factor
  if (chart.bpm < 100) complexityScore += 1;
  else if (chart.bpm < 140) complexityScore += 2;
  else complexityScore += 3;

  // Determine difficulty
  if (complexityScore <= 4) return 'easy';
  if (complexityScore <= 7) return 'medium';
  return 'hard';
}

/**
 * Snap time to nearest beat based on BPM
 */
export function snapToGrid(time: number, bpm: number, subdivision: number = 4): number {
  const beatDuration = 60 / bpm;
  const gridSize = beatDuration / subdivision; // e.g., 16th notes
  return Math.round(time / gridSize) * gridSize;
}

/**
 * Check if user has cleared their own chart
 * This would be called after the user successfully plays through the chart
 */
export function requireClearance(
  chart: ChartData,
  playScore: { accuracy: number; timing: number }
): {
  cleared: boolean;
  message: string;
} {
  const MIN_ACCURACY = 70; // Minimum 70% accuracy to clear
  const MIN_TIMING = 70; // Minimum 70% timing to clear

  if (playScore.accuracy >= MIN_ACCURACY && playScore.timing >= MIN_TIMING) {
    return {
      cleared: true,
      message: 'Chart cleared! You can now publish it.',
    };
  }

  return {
    cleared: false,
    message: `You must clear your own chart before publishing. Required: ${MIN_ACCURACY}% accuracy and ${MIN_TIMING}% timing. Your score: ${playScore.accuracy.toFixed(1)}% accuracy, ${playScore.timing.toFixed(1)}% timing.`,
  };
}
