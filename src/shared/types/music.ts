// Core musical data structures for RiffRivals

export type InstrumentType = 'drums' | 'piano' | 'synth';

export type DrumType = 'kick' | 'snare' | 'hihat' | 'openhat' | 'crash' | 'ride' | 'tom1' | 'tom2';

export type BassString = 'E' | 'A' | 'D' | 'G'; // Deprecated - kept for backward compatibility

export type ChallengeType = 'replication' | 'falling_tiles';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'auto';

export type ScoringWeights = {
  timing: number;
  accuracy: number;
};

export type ChallengeSettings = {
  challengeType: ChallengeType;
  baseDifficulty: ChallengeDifficulty;
  calculatedDifficulty: number; // 0-100 complexity score
  scoringWeights: ScoringWeights;
  allowedAttempts: number;
  timeLimit: number;
  accuracyThreshold: number;
  leaderboard: ChallengeScore[];
};

export type NoteEvent = {
  note: string;
  velocity: number;
  startTime: number;
  duration: number;
};

export type TrackData = {
  id: string;
  instrument: InstrumentType;
  notes: NoteEvent[];
  tempo: number;
  duration: number;
  userId: string;
  timestamp: number;
};

export type CompositionData = {
  id: string;
  layers: TrackData[];
  metadata: {
    title?: string;
    collaborators: string[];
    createdAt: number;
    parentPostId?: string;
    challengeSettings?: ChallengeSettings;
  };
};

export type DhwaniPost = {
  postId: string;
  compositionData: CompositionData;
  postType: 'riff' | 'jam_reply';
  parentPostId?: string;
};

export type ChallengeScore = {
  userId: string;
  accuracy: number;
  timing: number;
  timingScore: number; // 0-100
  accuracyScore: number; // 0-100
  combinedScore: number; // weighted average
  perfectHits: number;
  greatHits: number;
  goodHits: number;
  missedNotes: number;
  completedAt: number;
  originalTrackId: string;
  challengeType: ChallengeType;
};

// Chart data for beatmap editor (Chart Creator Mode)
export type ChartNote = {
  id: string;
  time: number; // Time in seconds
  lane: string; // Lane identifier (e.g., 'kick', 'snare', 'hihat')
  velocity?: number; // Optional velocity (0-1)
};

export type ChartData = {
  id: string;
  title: string;
  bpm: number;
  instrument: InstrumentType;
  lanes: string[]; // e.g., ['kick', 'snare', 'hihat', 'tom', 'crash', 'ride']
  notes: ChartNote[];
  createdBy: string;
  cleared: boolean; // User must clear their own chart before posting
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // Total duration in seconds
  createdAt: number;
  parentChartId?: string; // For remixes
};
