// Redis data compression utilities for optimized storage

import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import type { CompositionData, TrackData } from '../../shared/types/music.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Compression utilities for Redis storage optimization
 */
export class CompressionUtils {
  /**
   * Compress composition data for Redis storage
   */
  static async compressComposition(composition: CompositionData): Promise<string> {
    try {
      // First, optimize the data structure
      const optimized = this.optimizeCompositionData(composition);

      // Convert to JSON
      const jsonString = JSON.stringify(optimized);

      // Compress with gzip
      const compressed = await gzipAsync(Buffer.from(jsonString, 'utf8'));

      // Return base64 encoded compressed data
      return compressed.toString('base64');
    } catch (error) {
      console.error('Failed to compress composition:', error);
      throw new Error('Compression failed');
    }
  }

  /**
   * Decompress composition data from Redis
   */
  static async decompressComposition(compressedData: string): Promise<CompositionData> {
    try {
      // Decode from base64
      const compressed = Buffer.from(compressedData, 'base64');

      // Decompress with gunzip
      const decompressed = await gunzipAsync(compressed);

      // Parse JSON
      const parsed = JSON.parse(decompressed.toString('utf8'));

      // Restore optimized data structure
      return this.restoreCompositionData(parsed);
    } catch (error) {
      console.error('Failed to decompress composition:', error);
      throw new Error('Decompression failed');
    }
  }

  /**
   * Optimize composition data structure for compression
   */
  private static optimizeCompositionData(composition: CompositionData): any {
    return {
      id: composition.id,
      l: composition.layers.map((track) => this.optimizeTrackData(track)),
      m: {
        t: composition.metadata.title,
        c: composition.metadata.collaborators,
        ca: composition.metadata.createdAt,
        p: composition.metadata.parentPostId,
      },
    };
  }

  /**
   * Optimize track data structure
   */
  private static optimizeTrackData(track: TrackData): any {
    return {
      id: track.id,
      i: this.encodeInstrument(track.instrument),
      n: track.notes.map((note) => this.optimizeNoteData(note)),
      t: track.tempo,
      d: Math.round(track.duration),
      u: track.userId,
      ts: track.timestamp,
    };
  }

  /**
   * Optimize note data structure
   */
  private static optimizeNoteData(note: any): any {
    return [
      note.note,
      Math.round(note.velocity * 100), // Store as integer 0-100
      Math.round(note.startTime), // Round to milliseconds
      Math.round(note.duration), // Round to milliseconds
    ];
  }

  /**
   * Encode instrument type to single character
   */
  private static encodeInstrument(instrument: string): string {
    const mapping: Record<string, string> = {
      drums: 'd',
      piano: 'p',
      bass: 'b',
    };
    return mapping[instrument] || instrument;
  }

  /**
   * Decode instrument type from single character
   */
  private static decodeInstrument(encoded: string): string {
    const mapping: Record<string, string> = {
      d: 'drums',
      p: 'piano',
      b: 'bass',
    };
    return mapping[encoded] || encoded;
  }

  /**
   * Restore composition data structure from optimized format
   */
  private static restoreCompositionData(optimized: any): CompositionData {
    return {
      id: optimized.id,
      layers: optimized.l.map((track: any) => this.restoreTrackData(track)),
      metadata: {
        title: optimized.m.t,
        collaborators: optimized.m.c,
        createdAt: optimized.m.ca,
        parentPostId: optimized.m.p,
      },
    };
  }

  /**
   * Restore track data structure
   */
  private static restoreTrackData(optimized: any): TrackData {
    return {
      id: optimized.id,
      instrument: this.decodeInstrument(optimized.i) as any,
      notes: optimized.n.map((note: any) => this.restoreNoteData(note)),
      tempo: optimized.t,
      duration: optimized.d,
      userId: optimized.u,
      timestamp: optimized.ts,
    };
  }

  /**
   * Restore note data structure
   */
  private static restoreNoteData(optimized: any): any {
    return {
      note: optimized[0],
      velocity: optimized[1] / 100, // Convert back to 0-1 range
      startTime: optimized[2],
      duration: optimized[3],
    };
  }

  /**
   * Calculate compression ratio
   */
  static calculateCompressionRatio(original: string, compressed: string): number {
    const originalSize = Buffer.byteLength(original, 'utf8');
    const compressedSize = Buffer.byteLength(compressed, 'base64');
    return originalSize / compressedSize;
  }

  /**
   * Get size information for data
   */
  static getSizeInfo(
    data: string,
    isCompressed = false
  ): {
    bytes: number;
    kb: number;
    mb: number;
  } {
    const bytes = Buffer.byteLength(data, isCompressed ? 'base64' : 'utf8');
    return {
      bytes,
      kb: bytes / 1024,
      mb: bytes / (1024 * 1024),
    };
  }

  /**
   * Check if compression is beneficial
   */
  static shouldCompress(data: string): boolean {
    const size = this.getSizeInfo(data);
    // Compress if data is larger than 1KB
    return size.kb > 1;
  }

  /**
   * Smart compression that only compresses if beneficial
   */
  static async smartCompress(composition: CompositionData): Promise<{
    data: string;
    isCompressed: boolean;
    originalSize: number;
    finalSize: number;
    compressionRatio?: number;
  }> {
    const originalJson = JSON.stringify(composition);
    const originalSize = this.getSizeInfo(originalJson).bytes;

    if (!this.shouldCompress(originalJson)) {
      return {
        data: originalJson,
        isCompressed: false,
        originalSize,
        finalSize: originalSize,
      };
    }

    try {
      const compressed = await this.compressComposition(composition);
      const finalSize = this.getSizeInfo(compressed, true).bytes;
      const compressionRatio = originalSize / finalSize;

      // Only use compression if it saves at least 20%
      if (compressionRatio >= 1.2) {
        return {
          data: compressed,
          isCompressed: true,
          originalSize,
          finalSize,
          compressionRatio,
        };
      } else {
        return {
          data: originalJson,
          isCompressed: false,
          originalSize,
          finalSize: originalSize,
        };
      }
    } catch (error) {
      // Fall back to uncompressed if compression fails
      return {
        data: originalJson,
        isCompressed: false,
        originalSize,
        finalSize: originalSize,
      };
    }
  }

  /**
   * Smart decompression that handles both compressed and uncompressed data
   */
  static async smartDecompress(data: string, isCompressed: boolean): Promise<CompositionData> {
    if (isCompressed) {
      return this.decompressComposition(data);
    } else {
      return JSON.parse(data);
    }
  }
}

/**
 * Redis key management for optimized storage
 */
export class RedisKeyManager {
  private static readonly KEY_PREFIX = 'dhwani:';
  private static readonly COMPRESSION_MARKER = ':c:';
  private static readonly UNCOMPRESSED_MARKER = ':u:';

  /**
   * Generate Redis key for composition with compression marker
   */
  static generateCompositionKey(postId: string, isCompressed: boolean): string {
    const marker = isCompressed ? this.COMPRESSION_MARKER : this.UNCOMPRESSED_MARKER;
    return `${this.KEY_PREFIX}composition${marker}${postId}`;
  }

  /**
   * Parse Redis key to determine if data is compressed
   */
  static parseCompositionKey(key: string): {
    postId: string;
    isCompressed: boolean;
  } {
    const isCompressed = key.includes(this.COMPRESSION_MARKER);
    const marker = isCompressed ? this.COMPRESSION_MARKER : this.UNCOMPRESSED_MARKER;
    const postId = key.split(marker)[1];

    return { postId, isCompressed };
  }

  /**
   * Generate key for challenge scores
   */
  static generateChallengeKey(trackId: string): string {
    return `${this.KEY_PREFIX}challenge:${trackId}`;
  }

  /**
   * Generate key for leaderboard
   */
  static generateLeaderboardKey(trackId: string): string {
    return `${this.KEY_PREFIX}leaderboard:${trackId}`;
  }

  /**
   * Generate key for user data
   */
  static generateUserKey(userId: string): string {
    return `${this.KEY_PREFIX}user:${userId}`;
  }

  /**
   * Generate key for temporary data with TTL
   */
  static generateTempKey(type: string, id: string): string {
    return `${this.KEY_PREFIX}temp:${type}:${id}`;
  }
}

/**
 * Batch operations for Redis efficiency
 */
export class RedisBatchOperations {
  private operations: Array<{
    type: 'set' | 'get' | 'del';
    key: string;
    value?: string;
    ttl?: number;
  }> = [];

  /**
   * Add set operation to batch
   */
  addSet(key: string, value: string, ttl?: number) {
    this.operations.push({ type: 'set', key, value, ttl });
    return this;
  }

  /**
   * Add get operation to batch
   */
  addGet(key: string) {
    this.operations.push({ type: 'get', key });
    return this;
  }

  /**
   * Add delete operation to batch
   */
  addDelete(key: string) {
    this.operations.push({ type: 'del', key });
    return this;
  }

  /**
   * Execute all operations in batch
   */
  async execute(redis: any): Promise<any[]> {
    if (this.operations.length === 0) {
      return [];
    }

    // Use Redis pipeline for batch operations
    const pipeline = redis.pipeline();

    for (const op of this.operations) {
      switch (op.type) {
        case 'set':
          if (op.ttl) {
            pipeline.setex(op.key, op.ttl, op.value);
          } else {
            pipeline.set(op.key, op.value);
          }
          break;
        case 'get':
          pipeline.get(op.key);
          break;
        case 'del':
          pipeline.del(op.key);
          break;
      }
    }

    const results = await pipeline.exec();
    this.operations = []; // Clear operations after execution

    return results.map((result: any) => result[1]); // Extract values from Redis pipeline results
  }

  /**
   * Clear all pending operations
   */
  clear() {
    this.operations = [];
    return this;
  }

  /**
   * Get number of pending operations
   */
  size(): number {
    return this.operations.length;
  }
}
