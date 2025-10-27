// Difficulty calculation utilities for challenge system

import type { TrackData, InstrumentType, ChallengeDifficulty } from '../types/music.js';

/**
 * Calculate difficulty score (0-100) based on track complexity
 */
export function calculateDifficulty(track: TrackData): number {
  const { notes, instrument, duration, tempo } = track;

  if (notes.length === 0) return 0;

  // Base instrument complexity weights
  const instrumentWeights: Record<InstrumentType, number> = {
    drums: 1.0,
    piano: 1.2,
    bass: 1.1,
    synth: 1.3,
  };

  const instrumentWeight = instrumentWeights[instrument];

  // Note density (notes per second)
  const noteDensity = notes.length / duration;
  const densityScore = Math.min(100, noteDensity * 10); // Scale to 0-100

  // Note variety (unique notes vs total notes)
  const uniqueNotes = new Set(notes.map((n) => n.note)).size;
  const varietyScore = (uniqueNotes / notes.length) * 100;

  // Timing complexity (syncopation and rhythm patterns)
  const timingComplexity = calculateTimingComplexity(notes);

  // Duration factor (longer tracks are harder)
  const durationScore = Math.min(50, duration / 2); // Max 50 points for duration

  // Tempo factor (faster = harder)
  const tempoScore = Math.min(30, (tempo - 60) / 2); // Scale from 60 BPM

  // Calculate weighted average
  const baseScore =
    densityScore * 0.3 +
    varietyScore * 0.2 +
    timingComplexity * 0.25 +
    durationScore * 0.15 +
    tempoScore * 0.1;

  // Apply instrument weight
  const finalScore = baseScore * instrumentWeight;

  return Math.min(100, Math.max(0, finalScore));
}

/**
 * Calculate timing complexity based on note patterns
 */
function calculateTimingComplexity(notes: Array<{ startTime: number; duration: number }>): number {
  if (notes.length < 2) return 0;

  // Sort notes by start time
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);

  let complexity = 0;
  const intervals: number[] = [];

  // Calculate intervals between consecutive notes
  for (let i = 1; i < sortedNotes.length; i++) {
    const interval = sortedNotes[i].startTime - sortedNotes[i - 1].startTime;
    intervals.push(interval);
  }

  if (intervals.length === 0) return 0;

  // Calculate variance in intervals (syncopation)
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
    intervals.length;

  // Convert variance to 0-100 score
  const varianceScore = Math.min(100, Math.sqrt(variance) * 10);

  // Check for polyrhythmic patterns (notes with different durations)
  const durations = notes.map((n) => n.duration);
  const uniqueDurations = new Set(durations).size;
  const durationVarietyScore = (uniqueDurations / durations.length) * 50;

  complexity = varianceScore * 0.7 + durationVarietyScore * 0.3;

  return Math.min(100, complexity);
}

/**
 * Adjust calculated difficulty with base difficulty setting
 */
export function adjustDifficultyWithBase(calculated: number, base: ChallengeDifficulty): number {
  const baseMultipliers: Record<ChallengeDifficulty, number> = {
    easy: 0.6,
    medium: 0.8,
    hard: 1.2,
    auto: 1.0,
  };

  const multiplier = baseMultipliers[base];
  const adjusted = calculated * multiplier;

  return Math.min(100, Math.max(0, adjusted));
}

/**
 * Get difficulty label from score
 */
export function getDifficultyLabel(score: number): string {
  if (score < 25) return 'Easy';
  if (score < 50) return 'Medium';
  if (score < 75) return 'Hard';
  return 'Expert';
}

/**
 * Calculate scoring weights based on challenge type and difficulty
 */
export function calculateScoringWeights(
  challengeType: 'falling_notes' | 'replication' | 'both',
  difficulty: number
): { timing: number; accuracy: number } {
  switch (challengeType) {
    case 'falling_notes':
      return { timing: 0.7, accuracy: 0.3 };
    case 'replication':
      return { timing: 0.3, accuracy: 0.7 };
    case 'both':
      // Adjust based on difficulty - harder challenges emphasize timing more
      const timingWeight = 0.4 + (difficulty / 100) * 0.3; // 0.4 to 0.7
      return { timing: timingWeight, accuracy: 1 - timingWeight };
    default:
      return { timing: 0.5, accuracy: 0.5 };
  }
}

/**
 * Calculate challenge metadata for a track
 */
export function calculateChallengeMetadata(
  track: TrackData,
  challengeType: 'falling_notes' | 'replication' | 'both',
  baseDifficulty: ChallengeDifficulty
) {
  const calculatedDifficulty = calculateDifficulty(track);
  const adjustedDifficulty = adjustDifficultyWithBase(calculatedDifficulty, baseDifficulty);
  const scoringWeights = calculateScoringWeights(challengeType, adjustedDifficulty);

  return {
    calculatedDifficulty,
    adjustedDifficulty,
    scoringWeights,
    difficultyLabel: getDifficultyLabel(adjustedDifficulty),
    estimatedDuration: track.duration,
    noteCount: track.notes.length,
    complexity: {
      noteDensity: track.notes.length / track.duration,
      noteVariety: new Set(track.notes.map((n) => n.note)).size,
      timingComplexity: calculateTimingComplexity(track.notes),
    },
  };
}
