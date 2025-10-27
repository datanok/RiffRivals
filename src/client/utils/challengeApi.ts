// Challenge API utilities for creating and managing challenges

import type {
  CreateChallengeRequest,
  CreateChallengeResponse,
  TrackData,
} from '../../shared/index.js';

/**
 * Create a new challenge post
 */
export async function createChallenge(
  trackData: TrackData,
  options?: {
    title?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
    challengeSettings?: {
      allowedAttempts?: number;
      timeLimit?: number;
      accuracyThreshold?: number;
    };
  }
): Promise<CreateChallengeResponse> {
  const request: CreateChallengeRequest = {
    trackData,
    title: options?.title,
    difficulty: options?.difficulty,
    challengeSettings: options?.challengeSettings,
  };

  const response = await fetch('/api/create-challenge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Expected JSON but got:', text.substring(0, 200));
    throw new Error('Server returned non-JSON response');
  }

  const data: CreateChallengeResponse = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to create challenge');
  }

  return data;
}

/**
 * Create a challenge from an existing composition
 */
export async function createChallengeFromComposition(
  composition: any, // CompositionData
  options?: {
    title?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
    trackIndex?: number; // Which track to use as the challenge
  }
): Promise<CreateChallengeResponse> {
  if (!composition.layers || composition.layers.length === 0) {
    throw new Error('Composition must have at least one track');
  }

  // Use specified track or the first track
  const trackIndex = options?.trackIndex || 0;
  const challengeTrack = composition.layers[trackIndex];

  if (!challengeTrack) {
    throw new Error(`Track at index ${trackIndex} not found`);
  }

  return createChallenge(challengeTrack, {
    title: options?.title || `Challenge: ${composition.metadata.title || 'Untitled'}`,
    difficulty: options?.difficulty,
  });
}

/**
 * Get difficulty suggestions based on track characteristics
 */
export function suggestDifficulty(trackData: TrackData): {
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  reasons: string[];
  score: number;
} {
  const { notes, duration } = trackData;
  const noteCount = notes.length;
  const noteDensity = noteCount / (duration / 1000); // Notes per second

  // Calculate velocity variations
  const velocities = notes.map((n) => n.velocity);
  const velocityVariation = Math.max(...velocities) - Math.min(...velocities);

  // Calculate timing complexity
  const timings = notes.map((n) => n.startTime);
  const avgTimingGap =
    timings.length > 1
      ? (Math.max(...timings) - Math.min(...timings)) / (timings.length - 1)
      : 1000;

  let difficultyScore = 0;
  const reasons: string[] = [];

  // Note density scoring
  if (noteDensity > 8) {
    difficultyScore += 3;
    reasons.push('Very high note density (>8 notes/sec)');
  } else if (noteDensity > 5) {
    difficultyScore += 2;
    reasons.push('High note density (5-8 notes/sec)');
  } else if (noteDensity > 2) {
    difficultyScore += 1;
    reasons.push('Moderate note density (2-5 notes/sec)');
  } else {
    reasons.push('Low note density (<2 notes/sec)');
  }

  // Velocity variation scoring
  if (velocityVariation > 0.6) {
    difficultyScore += 2;
    reasons.push('High velocity variation (dynamic playing)');
  } else if (velocityVariation > 0.3) {
    difficultyScore += 1;
    reasons.push('Moderate velocity variation');
  } else {
    reasons.push('Consistent velocity');
  }

  // Timing complexity scoring
  if (avgTimingGap < 200) {
    difficultyScore += 2;
    reasons.push('Very fast timing (notes <200ms apart)');
  } else if (avgTimingGap < 500) {
    difficultyScore += 1;
    reasons.push('Fast timing (notes 200-500ms apart)');
  } else {
    reasons.push('Relaxed timing (notes >500ms apart)');
  }

  // Note count scoring
  if (noteCount > 100) {
    difficultyScore += 2;
    reasons.push('Very long composition (>100 notes)');
  } else if (noteCount > 50) {
    difficultyScore += 1;
    reasons.push('Long composition (50-100 notes)');
  } else {
    reasons.push('Short composition (<50 notes)');
  }

  let difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  if (difficultyScore >= 7) {
    difficulty = 'Expert';
  } else if (difficultyScore >= 5) {
    difficulty = 'Hard';
  } else if (difficultyScore >= 3) {
    difficulty = 'Medium';
  } else {
    difficulty = 'Easy';
  }

  return {
    difficulty,
    reasons,
    score: difficultyScore,
  };
}

/**
 * Get recommended challenge settings based on difficulty
 */
export function getRecommendedChallengeSettings(
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert',
  trackDuration: number
): {
  allowedAttempts: number;
  timeLimit: number;
  accuracyThreshold: number;
} {
  const settings = {
    Easy: {
      allowedAttempts: 5,
      timeLimit: trackDuration * 3,
      accuracyThreshold: 60,
    },
    Medium: {
      allowedAttempts: 4,
      timeLimit: trackDuration * 2.5,
      accuracyThreshold: 70,
    },
    Hard: {
      allowedAttempts: 3,
      timeLimit: trackDuration * 2,
      accuracyThreshold: 80,
    },
    Expert: {
      allowedAttempts: 2,
      timeLimit: trackDuration * 1.5,
      accuracyThreshold: 90,
    },
  };

  return settings[difficulty];
}
