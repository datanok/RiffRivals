import type { CompositionData, TrackData, InstrumentType } from '../../shared/types/music.js';

// Challenge difficulty definitions
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeLength = 'short' | 'medium' | 'long';

interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  instrument: InstrumentType;
  difficulty: ChallengeDifficulty;
  length: ChallengeLength;
  challengeType: 'falling_tiles' | 'replication';
  notes: Array<{
    note: string;
    startTime: number;
    duration: number;
    velocity: number;
  }>;
  tempo: number;
  totalDuration: number;
}

// Piano challenges
const PIANO_CHALLENGES: ChallengeDefinition[] = [
  // Easy Piano Challenges
  {
    id: 'piano_easy_short_falling',
    title: 'Piano Basics - Falling Tiles',
    description: 'Simple C major scale pattern for beginners',
    instrument: 'piano',
    difficulty: 'easy',
    length: 'short',
    challengeType: 'falling_tiles',
    tempo: 100,
    totalDuration: 15000,
    notes: [
      { note: 'C4', startTime: 0, duration: 500, velocity: 0.7 },
      { note: 'D4', startTime: 1000, duration: 500, velocity: 0.7 },
      { note: 'E4', startTime: 2000, duration: 500, velocity: 0.7 },
      { note: 'F4', startTime: 3000, duration: 500, velocity: 0.7 },
      { note: 'G4', startTime: 4000, duration: 500, velocity: 0.7 },
      { note: 'A4', startTime: 5000, duration: 500, velocity: 0.7 },
      { note: 'B4', startTime: 6000, duration: 500, velocity: 0.7 },
      { note: 'C5', startTime: 7000, duration: 500, velocity: 0.7 },
      { note: 'B4', startTime: 8000, duration: 500, velocity: 0.7 },
      { note: 'A4', startTime: 9000, duration: 500, velocity: 0.7 },
      { note: 'G4', startTime: 10000, duration: 500, velocity: 0.7 },
      { note: 'F4', startTime: 11000, duration: 500, velocity: 0.7 },
      { note: 'E4', startTime: 12000, duration: 500, velocity: 0.7 },
      { note: 'D4', startTime: 13000, duration: 500, velocity: 0.7 },
      { note: 'C4', startTime: 14000, duration: 500, velocity: 0.7 },
    ],
  },
  {
    id: 'piano_easy_short_replication',
    title: 'Twinkle Twinkle - Replication',
    description: 'Classic nursery rhyme melody to replicate',
    instrument: 'piano',
    difficulty: 'easy',
    length: 'short',
    challengeType: 'replication',
    tempo: 120,
    totalDuration: 16000,
    notes: [
      { note: 'C4', startTime: 0, duration: 500, velocity: 0.8 },
      { note: 'C4', startTime: 500, duration: 500, velocity: 0.8 },
      { note: 'G4', startTime: 1000, duration: 500, velocity: 0.8 },
      { note: 'G4', startTime: 1500, duration: 500, velocity: 0.8 },
      { note: 'A4', startTime: 2000, duration: 500, velocity: 0.8 },
      { note: 'A4', startTime: 2500, duration: 500, velocity: 0.8 },
      { note: 'G4', startTime: 3000, duration: 1000, velocity: 0.8 },
      { note: 'F4', startTime: 4000, duration: 500, velocity: 0.8 },
      { note: 'F4', startTime: 4500, duration: 500, velocity: 0.8 },
      { note: 'E4', startTime: 5000, duration: 500, velocity: 0.8 },
      { note: 'E4', startTime: 5500, duration: 500, velocity: 0.8 },
      { note: 'D4', startTime: 6000, duration: 500, velocity: 0.8 },
      { note: 'D4', startTime: 6500, duration: 500, velocity: 0.8 },
      { note: 'C4', startTime: 7000, duration: 1000, velocity: 0.8 },
    ],
  },
  // Medium Piano Challenges
  {
    id: 'piano_medium_medium_falling',
    title: 'Piano Arpeggios - Falling Tiles',
    description: 'C major arpeggio patterns with moderate speed',
    instrument: 'piano',
    difficulty: 'medium',
    length: 'medium',
    challengeType: 'falling_tiles',
    tempo: 140,
    totalDuration: 25000,
    notes: [
      // C major arpeggio pattern
      { note: 'C4', startTime: 0, duration: 400, velocity: 0.8 },
      { note: 'E4', startTime: 400, duration: 400, velocity: 0.8 },
      { note: 'G4', startTime: 800, duration: 400, velocity: 0.8 },
      { note: 'C5', startTime: 1200, duration: 400, velocity: 0.8 },
      { note: 'G4', startTime: 1600, duration: 400, velocity: 0.8 },
      { note: 'E4', startTime: 2000, duration: 400, velocity: 0.8 },
      // F major arpeggio
      { note: 'F4', startTime: 2400, duration: 400, velocity: 0.8 },
      { note: 'A4', startTime: 2800, duration: 400, velocity: 0.8 },
      { note: 'C5', startTime: 3200, duration: 400, velocity: 0.8 },
      { note: 'F4', startTime: 3600, duration: 400, velocity: 0.8 },
      // G major arpeggio
      { note: 'G4', startTime: 4000, duration: 400, velocity: 0.8 },
      { note: 'B4', startTime: 4400, duration: 400, velocity: 0.8 },
      { note: 'D4', startTime: 4800, duration: 400, velocity: 0.8 },
      { note: 'G4', startTime: 5200, duration: 400, velocity: 0.8 },
      // Repeat pattern with variations
      { note: 'C4', startTime: 6000, duration: 300, velocity: 0.9 },
      { note: 'E4', startTime: 6300, duration: 300, velocity: 0.9 },
      { note: 'G4', startTime: 6600, duration: 300, velocity: 0.9 },
      { note: 'C5', startTime: 6900, duration: 300, velocity: 0.9 },
      { note: 'E4', startTime: 7200, duration: 300, velocity: 0.9 },
      { note: 'G4', startTime: 7500, duration: 300, velocity: 0.9 },
      { note: 'C4', startTime: 7800, duration: 300, velocity: 0.9 },
      { note: 'F4', startTime: 8100, duration: 300, velocity: 0.9 },
    ],
  },
  {
    id: 'piano_medium_medium_replication',
    title: 'Für Elise Opening - Replication',
    description: "Beethoven's famous piano piece opening",
    instrument: 'piano',
    difficulty: 'medium',
    length: 'medium',
    challengeType: 'replication',
    tempo: 120,
    totalDuration: 20000,
    notes: [
      { note: 'E4', startTime: 0, duration: 300, velocity: 0.8 },
      { note: 'D4', startTime: 300, duration: 300, velocity: 0.8 },
      { note: 'E4', startTime: 600, duration: 300, velocity: 0.8 },
      { note: 'D4', startTime: 900, duration: 300, velocity: 0.8 },
      { note: 'E4', startTime: 1200, duration: 300, velocity: 0.8 },
      { note: 'B4', startTime: 1500, duration: 300, velocity: 0.8 },
      { note: 'D4', startTime: 1800, duration: 300, velocity: 0.8 },
      { note: 'C4', startTime: 2100, duration: 300, velocity: 0.8 },
      { note: 'A4', startTime: 2400, duration: 600, velocity: 0.8 },
      { note: 'C4', startTime: 3000, duration: 300, velocity: 0.7 },
      { note: 'E4', startTime: 3300, duration: 300, velocity: 0.7 },
      { note: 'A4', startTime: 3600, duration: 300, velocity: 0.8 },
      { note: 'B4', startTime: 3900, duration: 600, velocity: 0.8 },
    ],
  },
  // Hard Piano Challenges
  {
    id: 'piano_hard_long_falling',
    title: 'Piano Virtuoso - Falling Tiles',
    description: 'Complex classical patterns with rapid note sequences',
    instrument: 'piano',
    difficulty: 'hard',
    length: 'long',
    challengeType: 'falling_tiles',
    tempo: 180,
    totalDuration: 40000,
    notes: [
      // Fast chromatic runs
      { note: 'C4', startTime: 0, duration: 200, velocity: 0.9 },
      { note: 'D4', startTime: 200, duration: 200, velocity: 0.9 },
      { note: 'E4', startTime: 400, duration: 200, velocity: 0.9 },
      { note: 'F4', startTime: 600, duration: 200, velocity: 0.9 },
      { note: 'G4', startTime: 800, duration: 200, velocity: 0.9 },
      { note: 'A4', startTime: 1000, duration: 200, velocity: 0.9 },
      { note: 'B4', startTime: 1200, duration: 200, velocity: 0.9 },
      { note: 'C5', startTime: 1400, duration: 200, velocity: 0.9 },
      // Complex chord progressions
      { note: 'C4', startTime: 2000, duration: 150, velocity: 1.0 },
      { note: 'E4', startTime: 2000, duration: 150, velocity: 1.0 },
      { note: 'G4', startTime: 2000, duration: 150, velocity: 1.0 },
      { note: 'F4', startTime: 2300, duration: 150, velocity: 1.0 },
      { note: 'A4', startTime: 2300, duration: 150, velocity: 1.0 },
      { note: 'C5', startTime: 2300, duration: 150, velocity: 1.0 },
      // Rapid alternating patterns
      { note: 'C4', startTime: 3000, duration: 100, velocity: 0.8 },
      { note: 'G4', startTime: 3100, duration: 100, velocity: 0.8 },
      { note: 'C4', startTime: 3200, duration: 100, velocity: 0.8 },
      { note: 'G4', startTime: 3300, duration: 100, velocity: 0.8 },
      { note: 'E4', startTime: 3400, duration: 100, velocity: 0.8 },
      { note: 'A4', startTime: 3500, duration: 100, velocity: 0.8 },
      { note: 'E4', startTime: 3600, duration: 100, velocity: 0.8 },
      { note: 'A4', startTime: 3700, duration: 100, velocity: 0.8 },
    ],
  },
];

// Drum challenges
const DRUM_CHALLENGES: ChallengeDefinition[] = [
  // Easy Drum Challenges
  {
    id: 'drums_easy_short_falling',
    title: 'Basic Beat - Falling Tiles',
    description: 'Simple kick and snare pattern',
    instrument: 'drums',
    difficulty: 'easy',
    length: 'short',
    challengeType: 'falling_tiles',
    tempo: 100,
    totalDuration: 16000,
    notes: [
      { note: 'kick', startTime: 0, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 1000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 2000, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 3000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 4000, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 5000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 6000, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 7000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 8000, duration: 200, velocity: 0.9 },
      { note: 'kick', startTime: 8500, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 9000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 10000, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 11000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 12000, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 13000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 14000, duration: 200, velocity: 0.9 },
      { note: 'snare', startTime: 15000, duration: 200, velocity: 0.8 },
    ],
  },
  {
    id: 'drums_easy_short_replication',
    title: 'We Will Rock You - Replication',
    description: 'Famous stomp-stomp-clap pattern',
    instrument: 'drums',
    difficulty: 'easy',
    length: 'short',
    challengeType: 'replication',
    tempo: 110,
    totalDuration: 12000,
    notes: [
      { note: 'kick', startTime: 0, duration: 300, velocity: 1.0 },
      { note: 'kick', startTime: 500, duration: 300, velocity: 1.0 },
      { note: 'snare', startTime: 1000, duration: 300, velocity: 0.9 },
      { note: 'kick', startTime: 2000, duration: 300, velocity: 1.0 },
      { note: 'kick', startTime: 2500, duration: 300, velocity: 1.0 },
      { note: 'snare', startTime: 3000, duration: 300, velocity: 0.9 },
      { note: 'kick', startTime: 4000, duration: 300, velocity: 1.0 },
      { note: 'kick', startTime: 4500, duration: 300, velocity: 1.0 },
      { note: 'snare', startTime: 5000, duration: 300, velocity: 0.9 },
      { note: 'kick', startTime: 6000, duration: 300, velocity: 1.0 },
      { note: 'kick', startTime: 6500, duration: 300, velocity: 1.0 },
      { note: 'snare', startTime: 7000, duration: 300, velocity: 0.9 },
    ],
  },
  // Medium Drum Challenges
  {
    id: 'drums_medium_medium_falling',
    title: 'Rock Groove - Falling Tiles',
    description: 'Standard rock beat with hi-hat patterns',
    instrument: 'drums',
    difficulty: 'medium',
    length: 'medium',
    challengeType: 'falling_tiles',
    tempo: 130,
    totalDuration: 24000,
    notes: [
      // Bar 1
      { note: 'kick', startTime: 0, duration: 200, velocity: 0.9 },
      { note: 'hihat', startTime: 0, duration: 100, velocity: 0.6 },
      { note: 'hihat', startTime: 500, duration: 100, velocity: 0.6 },
      { note: 'snare', startTime: 1000, duration: 200, velocity: 0.8 },
      { note: 'hihat', startTime: 1000, duration: 100, velocity: 0.6 },
      { note: 'hihat', startTime: 1500, duration: 100, velocity: 0.6 },
      // Bar 2
      { note: 'kick', startTime: 2000, duration: 200, velocity: 0.9 },
      { note: 'hihat', startTime: 2000, duration: 100, velocity: 0.6 },
      { note: 'kick', startTime: 2500, duration: 200, velocity: 0.9 },
      { note: 'hihat', startTime: 2500, duration: 100, velocity: 0.6 },
      { note: 'snare', startTime: 3000, duration: 200, velocity: 0.8 },
      { note: 'hihat', startTime: 3000, duration: 100, velocity: 0.6 },
      { note: 'hihat', startTime: 3500, duration: 100, velocity: 0.6 },
      // Continue pattern...
    ],
  },
  // Hard Drum Challenges
  {
    id: 'drums_hard_long_falling',
    title: 'Polyrhythmic Madness - Falling Tiles',
    description: 'Complex polyrhythmic patterns with all drum elements',
    instrument: 'drums',
    difficulty: 'hard',
    length: 'long',
    challengeType: 'falling_tiles',
    tempo: 160,
    totalDuration: 45000,
    notes: [
      // Complex polyrhythmic pattern
      { note: 'kick', startTime: 0, duration: 150, velocity: 1.0 },
      { note: 'hihat', startTime: 0, duration: 100, velocity: 0.7 },
      { note: 'hihat', startTime: 250, duration: 100, velocity: 0.5 },
      { note: 'snare', startTime: 375, duration: 150, velocity: 0.9 },
      { note: 'hihat', startTime: 500, duration: 100, velocity: 0.7 },
      { note: 'kick', startTime: 625, duration: 150, velocity: 1.0 },
      { note: 'hihat', startTime: 750, duration: 100, velocity: 0.5 },
      { note: 'snare', startTime: 875, duration: 150, velocity: 0.9 },
      { note: 'crash', startTime: 1000, duration: 200, velocity: 0.8 },
      { note: 'kick', startTime: 1000, duration: 150, velocity: 1.0 },
      // Add more complex patterns...
    ],
  },
];

// Bass challenges
const BASS_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'bass_easy_short_falling',
    title: 'Bass Foundation - Falling Tiles',
    description: 'Simple bass line patterns',
    instrument: 'bass',
    difficulty: 'easy',
    length: 'short',
    challengeType: 'falling_tiles',
    tempo: 100,
    totalDuration: 16000,
    notes: [
      { note: 'E2', startTime: 0, duration: 1000, velocity: 0.8 },
      { note: 'A2', startTime: 2000, duration: 1000, velocity: 0.8 },
      { note: 'D3', startTime: 4000, duration: 1000, velocity: 0.8 },
      { note: 'G3', startTime: 6000, duration: 1000, velocity: 0.8 },
      { note: 'E2', startTime: 8000, duration: 1000, velocity: 0.8 },
      { note: 'A2', startTime: 10000, duration: 1000, velocity: 0.8 },
      { note: 'D3', startTime: 12000, duration: 1000, velocity: 0.8 },
      { note: 'G3', startTime: 14000, duration: 1000, velocity: 0.8 },
    ],
  },
  {
    id: 'bass_medium_medium_replication',
    title: 'Seven Nation Army - Replication',
    description: 'Iconic bass riff from The White Stripes',
    instrument: 'bass',
    difficulty: 'medium',
    length: 'medium',
    challengeType: 'replication',
    tempo: 124,
    totalDuration: 18000,
    notes: [
      { note: 'E2', startTime: 0, duration: 500, velocity: 0.9 },
      { note: 'E2', startTime: 500, duration: 500, velocity: 0.9 },
      { note: 'G3', startTime: 1000, duration: 500, velocity: 0.9 },
      { note: 'E2', startTime: 1500, duration: 500, velocity: 0.9 },
      { note: 'D3', startTime: 2000, duration: 500, velocity: 0.9 },
      { note: 'A2', startTime: 2500, duration: 1000, velocity: 0.9 },
      { note: 'G3', startTime: 3500, duration: 1500, velocity: 0.9 },
    ],
  },
];

// Combine all challenges
export const ALL_PREDEFINED_CHALLENGES: ChallengeDefinition[] = [
  ...PIANO_CHALLENGES,
  ...DRUM_CHALLENGES,
  ...BASS_CHALLENGES,
];

// Convert challenge definition to composition data
export function challengeToComposition(challenge: ChallengeDefinition): CompositionData {
  const track: TrackData = {
    id: `track_${challenge.id}`,
    instrument: challenge.instrument,
    notes: challenge.notes,
    tempo: challenge.tempo,
    duration: challenge.totalDuration / 1000, // Convert to seconds
    userId: 'system',
    timestamp: Date.now(),
  };

  return {
    id: `comp_${challenge.id}`,
    layers: [track],
    metadata: {
      title: challenge.title,
      createdAt: Date.now(),
      collaborators: ['system'],
      challengeSettings: {
        challengeType: challenge.challengeType,
        baseDifficulty: challenge.difficulty,
        calculatedDifficulty:
          challenge.difficulty === 'easy' ? 30 : challenge.difficulty === 'medium' ? 60 : 90,
        scoringWeights:
          challenge.challengeType === 'falling_tiles'
            ? { timing: 0.8, accuracy: 0.2 }
            : { timing: 0.3, accuracy: 0.7 },
        allowedAttempts: 5,
        timeLimit: Math.ceil(challenge.totalDuration / 1000),
        accuracyThreshold:
          challenge.difficulty === 'easy' ? 60 : challenge.difficulty === 'medium' ? 70 : 80,
        leaderboard: [],
      },
    },
  };
}

// Get challenges by filters
export function getChallengesByFilter(
  difficulty?: ChallengeDifficulty,
  instrument?: InstrumentType,
  challengeType?: 'falling_tiles' | 'replication',
  length?: ChallengeLength
): ChallengeDefinition[] {
  return ALL_PREDEFINED_CHALLENGES.filter((challenge) => {
    if (difficulty && challenge.difficulty !== difficulty) return false;
    if (instrument && challenge.instrument !== instrument) return false;
    if (challengeType && challenge.challengeType !== challengeType) return false;
    if (length && challenge.length !== length) return false;
    return true;
  });
}
