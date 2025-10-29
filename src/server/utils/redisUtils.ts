// Redis utility functions for storing and retrieving musical data

import { redis } from '@devvit/web/server';
import type { CompositionData, ChallengeScore, ChartData } from '../../shared/types/music.js';
import { CompressionUtils, RedisKeyManager, RedisBatchOperations } from './compressionUtils.js';

/**
 * Store composition data in Redis with compression
 */
export async function storeComposition(
  postId: string,
  composition: CompositionData
): Promise<void> {
  try {
    const { data, isCompressed, originalSize, finalSize, compressionRatio } =
      await CompressionUtils.smartCompress(composition);

    const key = RedisKeyManager.generateCompositionKey(postId, isCompressed);
    await redis.set(key, data);

    // Log compression statistics
    if (isCompressed && compressionRatio) {
      console.log(
        `Composition ${postId} compressed: ${originalSize} -> ${finalSize} bytes (${compressionRatio.toFixed(2)}x)`
      );
    }
  } catch (error) {
    console.error(`Failed to store composition ${postId}:`, error);
    throw error;
  }
}

/**
 * Retrieve composition data from Redis with decompression
 */
export async function getComposition(postId: string): Promise<CompositionData | null> {
  try {
    // Try compressed version first
    let key = RedisKeyManager.generateCompositionKey(postId, true);
    let data = await redis.get(key);
    let isCompressed = true;

    // Fall back to uncompressed version
    if (!data) {
      key = RedisKeyManager.generateCompositionKey(postId, false);
      data = await redis.get(key);
      isCompressed = false;
    }

    // Try legacy key format for backward compatibility
    if (!data) {
      key = `composition:${postId}`;
      data = await redis.get(key);
      isCompressed = false;
    }

    if (!data) {
      return null;
    }

    return await CompressionUtils.smartDecompress(data, isCompressed);
  } catch (error) {
    console.error(`Failed to retrieve composition data for ${postId}:`, error);
    return null;
  }
}

/**
 * Store jam reply composition data with compression
 */
export async function storeJamReply(
  commentId: string,
  composition: CompositionData
): Promise<void> {
  try {
    const { data, isCompressed } = await CompressionUtils.smartCompress(composition);
    const key = `jam:${commentId}${isCompressed ? ':c' : ':u'}`;
    await redis.set(key, data);
  } catch (error) {
    console.error(`Failed to store jam reply ${commentId}:`, error);
    throw error;
  }
}

/**
 * Retrieve jam reply composition data with decompression
 */
export async function getJamReply(commentId: string): Promise<CompositionData | null> {
  try {
    // Try compressed version first
    let key = `jam:${commentId}:c`;
    let data = await redis.get(key);
    let isCompressed = true;

    // Fall back to uncompressed version
    if (!data) {
      key = `jam:${commentId}:u`;
      data = await redis.get(key);
      isCompressed = false;
    }

    // Try legacy key format for backward compatibility
    if (!data) {
      key = `jam:${commentId}`;
      data = await redis.get(key);
      isCompressed = false;
    }

    if (!data) {
      return null;
    }

    return await CompressionUtils.smartDecompress(data, isCompressed);
  } catch (error) {
    console.error(`Failed to retrieve jam reply data for ${commentId}:`, error);
    return null;
  }
}

/**
 * Store challenge score with analytics
 */
export async function storeChallengeScore(
  postId: string,
  userId: string,
  score: ChallengeScore,
  shareOptions?: {
    shareFullScore: boolean;
    shareAccuracy: boolean;
    shareTiming: boolean;
    shareCompletion: boolean;
    sharePersonalBest: boolean;
    makePublicComment: boolean;
  }
): Promise<void> {
  const timestamp = Date.now();

  // Store the full score privately
  const privateKey = `challenge:${postId}:${userId}:private`;
  const privateData = {
    ...score,
    shareOptions,
    submittedAt: timestamp,
  };
  await redis.set(privateKey, JSON.stringify(privateData));

  // Store public score based on share options
  if (shareOptions?.makePublicComment) {
    const publicKey = `challenge:${postId}:${userId}:public`;
    const publicData: any = {
      userId,
      submittedAt: timestamp,
    };

    if (shareOptions.shareFullScore) {
      publicData.fullScore = score;
    } else {
      if (shareOptions.shareAccuracy) publicData.accuracy = score.accuracy;
      if (shareOptions.shareTiming) publicData.timing = score.timing;
      if (shareOptions.shareCompletion) publicData.completed = true;
    }

    await redis.set(publicKey, JSON.stringify(publicData));
  }

  // Update leaderboard (always store for ranking, but mark privacy)
  const leaderboardKey = `leaderboard:${postId}`;
  await redis.zAdd(leaderboardKey, {
    member: `${userId}:${shareOptions?.makePublicComment ? 'public' : 'private'}`,
    score: score.accuracy,
  });

  // Update challenge analytics
  await updateChallengeAnalytics(postId, score, shareOptions?.shareCompletion !== false);
}

/**
 * Update challenge analytics
 */
async function updateChallengeAnalytics(
  postId: string,
  score: ChallengeScore,
  countCompletion: boolean = true
): Promise<void> {
  const analyticsKey = `analytics:${postId}`;

  // Get existing analytics or create new
  const existingData = await redis.get(analyticsKey);
  let analytics = existingData
    ? JSON.parse(existingData)
    : {
        totalAttempts: 0,
        totalCompletions: 0,
        averageAccuracy: 0,
        averageTiming: 0,
        highestScore: 0,
        scoreDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
        lastUpdated: Date.now(),
      };

  // Update analytics
  analytics.totalAttempts += 1;
  if (countCompletion) {
    analytics.totalCompletions += 1;
  }

  // Update averages (running average)
  const totalScores = analytics.totalAttempts;
  analytics.averageAccuracy =
    (analytics.averageAccuracy * (totalScores - 1) + score.accuracy) / totalScores;
  analytics.averageTiming =
    (analytics.averageTiming * (totalScores - 1) + score.timing) / totalScores;

  // Update highest score
  if (score.accuracy > analytics.highestScore) {
    analytics.highestScore = score.accuracy;
  }

  // Update score distribution
  const grade = getScoreGrade(score.accuracy);
  analytics.scoreDistribution[grade] = (analytics.scoreDistribution[grade] || 0) + 1;

  analytics.lastUpdated = Date.now();

  // Store updated analytics
  await redis.set(analyticsKey, JSON.stringify(analytics));
}

/**
 * Get score grade
 */
function getScoreGrade(accuracy: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 80) return 'A';
  if (accuracy >= 65) return 'B';
  if (accuracy >= 50) return 'C';
  return 'D';
}

/**
 * Get challenge scores for a post
 */
export async function getChallengeScores(postId: string): Promise<ChallengeScore[]> {
  const leaderboardKey = `leaderboard:${postId}`;

  // Get all users from the leaderboard
  const leaderboardData = await redis.zRange(leaderboardKey, 0, -1, { by: 'rank' });

  if (leaderboardData.length === 0) {
    return [];
  }

  const scores: ChallengeScore[] = [];
  for (const entry of leaderboardData) {
    const userId = entry.member;
    const key = `challenge:${postId}:${userId}`;
    const data = await redis.get(key);
    if (data) {
      try {
        scores.push(JSON.parse(data) as ChallengeScore);
      } catch (error) {
        console.error(`Failed to parse challenge score for ${key}:`, error);
      }
    }
  }

  return scores.sort((a, b) => b.accuracy - a.accuracy);
}

/**
 * Get leaderboard for a post
 */
export async function getLeaderboard(
  postId: string,
  limit: number = 10
): Promise<Array<{ userId: string; score: number }>> {
  const leaderboardKey = `leaderboard:${postId}`;

  // Get top scores in descending order (highest first)
  // Use negative indices to get from the end (highest scores)
  const results = await redis.zRange(leaderboardKey, -limit, -1, { by: 'rank' });

  const leaderboard: Array<{ userId: string; score: number }> = [];
  for (const entry of results) {
    leaderboard.push({
      userId: entry.member,
      score: entry.score,
    });
  }

  return leaderboard;
}

/**
 * Get challenge analytics
 */
export async function getChallengeAnalytics(postId: string): Promise<{
  totalAttempts: number;
  totalCompletions: number;
  completionRate: number;
  averageAccuracy: number;
  averageTiming: number;
  highestScore: number;
  scoreDistribution: Record<string, number>;
  lastUpdated: number;
} | null> {
  const analyticsKey = `analytics:${postId}`;
  const data = await redis.get(analyticsKey);

  if (!data) {
    return null;
  }

  const analytics = JSON.parse(data);
  return {
    ...analytics,
    completionRate:
      analytics.totalAttempts > 0
        ? (analytics.totalCompletions / analytics.totalAttempts) * 100
        : 0,
  };
}

/**
 * Get user's personal best for a challenge
 */
export async function getUserPersonalBest(
  postId: string,
  userId: string
): Promise<ChallengeScore | null> {
  const privateKey = `challenge:${postId}:${userId}:private`;
  const data = await redis.get(privateKey);

  if (!data) {
    return null;
  }

  const scoreData = JSON.parse(data);
  return scoreData as ChallengeScore;
}

/**
 * Store chart data in Redis with compression
 */
export async function storeChart(postId: string, chart: ChartData): Promise<void> {
  try {
    const { data, isCompressed, originalSize, finalSize, compressionRatio } =
      await CompressionUtils.smartCompress(chart);

    const key = `chart:${postId}${isCompressed ? ':c' : ':u'}`;
    await redis.set(key, data);

    // Store chart metadata for browsing/filtering
    const metadataKey = `chart:meta:${postId}`;
    await redis.hSet(metadataKey, {
      id: chart.id,
      title: chart.title,
      instrument: chart.instrument,
      difficulty: chart.difficulty,
      duration: chart.duration.toString(),
      bpm: chart.bpm.toString(),
      createdBy: chart.createdBy,
      createdAt: chart.createdAt.toString(),
      cleared: chart.cleared ? '1' : '0',
      noteCount: chart.notes.length.toString(),
    });

    // Add to instrument-specific index
    const instrumentIndexKey = `charts:by-instrument:${chart.instrument}`;
    await redis.zAdd(instrumentIndexKey, { member: postId, score: chart.createdAt });

    // Add to difficulty-specific index
    const difficultyIndexKey = `charts:by-difficulty:${chart.difficulty}`;
    await redis.zAdd(difficultyIndexKey, { member: postId, score: chart.createdAt });

    // Add to global charts index
    const globalIndexKey = 'charts:all';
    await redis.zAdd(globalIndexKey, { member: postId, score: chart.createdAt });

    // Log compression statistics
    if (isCompressed && compressionRatio) {
      console.log(
        `Chart ${postId} compressed: ${originalSize} -> ${finalSize} bytes (${compressionRatio.toFixed(2)}x)`
      );
    }
  } catch (error) {
    console.error(`Failed to store chart ${postId}:`, error);
    throw error;
  }
}

/**
 * Retrieve chart data from Redis with decompression
 */
export async function getChart(postId: string): Promise<ChartData | null> {
  try {
    // Try compressed version first
    let key = `chart:${postId}:c`;
    let data = await redis.get(key);
    let isCompressed = true;

    // Fall back to uncompressed version
    if (!data) {
      key = `chart:${postId}:u`;
      data = await redis.get(key);
      isCompressed = false;
    }

    // Try legacy key format for backward compatibility
    if (!data) {
      key = `chart:${postId}`;
      data = await redis.get(key);
      isCompressed = false;
    }

    if (!data) {
      return null;
    }

    return await CompressionUtils.smartDecompress(data, isCompressed);
  } catch (error) {
    console.error(`Failed to retrieve chart data for ${postId}:`, error);
    return null;
  }
}

/**
 * Get chart metadata without loading full chart data
 */
export async function getChartMetadata(postId: string): Promise<any | null> {
  try {
    const metadataKey = `chart:meta:${postId}`;
    const metadata = await redis.hGetAll(metadataKey);

    if (!metadata || Object.keys(metadata).length === 0) {
      return null;
    }

    return {
      id: metadata.id,
      title: metadata.title,
      instrument: metadata.instrument,
      difficulty: metadata.difficulty,
      duration: parseFloat(metadata.duration),
      bpm: parseInt(metadata.bpm),
      createdBy: metadata.createdBy,
      createdAt: parseInt(metadata.createdAt),
      cleared: metadata.cleared === '1',
      noteCount: parseInt(metadata.noteCount),
    };
  } catch (error) {
    console.error(`Failed to retrieve chart metadata for ${postId}:`, error);
    return null;
  }
}

/**
 * Get charts by filters
 */
export async function getCharts(
  instrument?: string,
  difficulty?: 'easy' | 'medium' | 'hard',
  limit: number = 20,
  offset: number = 0
): Promise<{ charts: ChartData[]; total: number }> {
  try {
    let indexKey = 'charts:all';

    // Use specific index if filters are provided
    if (instrument) {
      indexKey = `charts:by-instrument:${instrument}`;
    } else if (difficulty) {
      indexKey = `charts:by-difficulty:${difficulty}`;
    }

    // Get total count
    const total = await redis.zCard(indexKey);

    // Get chart IDs (newest first)
    const chartIds = await redis.zRange(indexKey, -limit - offset, -1 - offset, { by: 'rank' });

    // Load full chart data for each ID
    const charts: ChartData[] = [];
    for (const entry of chartIds) {
      const postId = entry.member;
      const chart = await getChart(postId);
      if (chart) {
        charts.push(chart);
      }
    }

    return { charts: charts.reverse(), total };
  } catch (error) {
    console.error('Failed to retrieve charts:', error);
    return { charts: [], total: 0 };
  }
}
