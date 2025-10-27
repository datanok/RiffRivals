// Core musical data structures for Dhwani

export type InstrumentType = 'drums' | 'piano' | 'bass' | 'synth';

export type DrumType = 'kick' | 'snare' | 'hihat' | 'openhat' | 'crash' | 'ride' | 'tom1' | 'tom2';

export type BassString = 'E' | 'A' | 'D' | 'G';

export type ChallengeType = 'falling_notes' | 'replication' | 'both';

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
