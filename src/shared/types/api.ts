export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// Dhwani API Types
import type { TrackData, CompositionData, ChallengeScore } from './music.js';

export type CreateRiffRequest = {
  trackData: TrackData;
  title?: string;
  isChallenge?: boolean;
};

export type CreateRiffResponse = {
  postId: string;
  success: boolean;
  message?: string;
};

export type CreateJamReplyRequest = {
  parentPostId: string;
  newTrackData: TrackData;
  combinedComposition: CompositionData;
};

export type CreateJamReplyResponse = {
  commentId: string;
  success: boolean;
  message?: string;
};

export type GetCompositionRequest = {
  postId: string;
};

export type GetCompositionResponse = {
  composition: CompositionData;
  success: boolean;
  message?: string;
};

export type GetThreadCompositionRequest = {
  postId: string;
  commentId?: string;
};

export type GetThreadCompositionResponse = {
  composition: CompositionData;
  threadData: {
    postId: string;
    commentId?: string;
    parentIds: string[];
  };
  success: boolean;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  error?: string;
};

export type SubmitChallengeScoreRequest = {
  postId: string;
  score: ChallengeScore;
};

export type SubmitChallengeScoreResponse = {
  success: boolean;
  message?: string;
  commentId?: string;
};

export type GetLeaderboardRequest = {
  postId: string;
  limit?: number;
};

export type GetLeaderboardResponse = {
  leaderboard: Array<{
    userId: string;
    score: number;
    rank: number;
    completedAt: number;
  }>;
  success: boolean;
  message?: string;
};

export type GetChallengeScoresRequest = {
  postId: string;
};

export type GetChallengeScoresResponse = {
  scores: ChallengeScore[];
  success: boolean;
  message?: string;
};

export type CreateChallengeRequest = {
  trackData: TrackData;
  title?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  challengeSettings?: {
    allowedAttempts?: number;
    timeLimit?: number;
    accuracyThreshold?: number;
  };
};

export type CreateChallengeResponse = {
  postId: string;
  success: boolean;
  message?: string;
  difficulty?: string;
};
