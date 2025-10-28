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
 * Store challenge score
 */
export async function storeChallengeScore(
  postId: string,
  userId: string,
  score: ChallengeScore
): Promise<void> {
  const key = `challenge:${postId}:${userId}`;
  await redis.set(key, JSON.stringify(score));

  // Also add to leaderboard
  const leaderboardKey = `leaderboard:${postId}`;
  await redis.zAdd(leaderboardKey, { member: userId, score: score.accuracy });
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
