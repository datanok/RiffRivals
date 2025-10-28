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

// RiffRivals API Types
import type {
  TrackData,
  CompositionData,
  ChallengeScore,
  ChartData,
  ChallengeType,
} from './music.js';

export type CreateRiffRequest = {
  trackData: TrackData;
  title?: string;
  challengeType?: ChallengeType;
  challengeSettings?: {
    allowedAttempts?: number;
    timeLimit?: number;
    accuracyThreshold?: number;
  };
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

// Chart Creator API Types
export type CreateChartRequest = {
  chartData: ChartData;
};

export type CreateChartResponse = {
  postId: string;
  success: boolean;
  message?: string;
  chartId?: string;
};

export type GetChartRequest = {
  postId: string;
};

export type GetChartResponse = {
  chart: ChartData;
  success: boolean;
  message?: string;
};

export type GetChartsRequest = {
  instrument?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  limit?: number;
  offset?: number;
};

export type GetChartsResponse = {
  charts: ChartData[];
  total: number;
  success: boolean;
  message?: string;
};

// Remix API Types
export type CreateRemixRequest = {
  parentPostId: string;
  trackData: TrackData;
  title?: string;
};

export type CreateRemixResponse = {
  postId: string;
  success: boolean;
  message?: string;
};
