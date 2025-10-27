// Performance optimization utilities for Dhwani

import type { CompositionData, TrackData } from '../../shared/types/music.js';

/**
 * Lazy loading manager for large compositions
 */
export class LazyCompositionLoader {
  private loadedTracks = new Map<string, TrackData>();
  private loadingPromises = new Map<string, Promise<TrackData>>();
  private maxConcurrentLoads = 3;
  private currentLoads = 0;

  /**
   * Load a track with lazy loading and caching
   */
  async loadTrack(trackId: string, loadFunction: () => Promise<TrackData>): Promise<TrackData> {
    // Return cached track if available
    if (this.loadedTracks.has(trackId)) {
      return this.loadedTracks.get(trackId)!;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(trackId)) {
      return this.loadingPromises.get(trackId)!;
    }

    // Wait if too many concurrent loads
    while (this.currentLoads >= this.maxConcurrentLoads) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Create loading promise
    const loadPromise = this.performLoad(trackId, loadFunction);
    this.loadingPromises.set(trackId, loadPromise);

    try {
      const track = await loadPromise;
      this.loadedTracks.set(trackId, track);
      return track;
    } finally {
      this.loadingPromises.delete(trackId);
    }
  }

  private async performLoad(
    trackId: string,
    loadFunction: () => Promise<TrackData>
  ): Promise<TrackData> {
    this.currentLoads++;
    try {
      return await loadFunction();
    } finally {
      this.currentLoads--;
    }
  }

  /**
   * Preload tracks in the background
   */
  preloadTracks(trackIds: string[], loadFunction: (id: string) => Promise<TrackData>) {
    // Load tracks with lower priority
    setTimeout(() => {
      trackIds.forEach(async (trackId) => {
        if (!this.loadedTracks.has(trackId) && !this.loadingPromises.has(trackId)) {
          try {
            await this.loadTrack(trackId, () => loadFunction(trackId));
          } catch (error) {
            console.warn(`Failed to preload track ${trackId}:`, error);
          }
        }
      });
    }, 100);
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    this.loadedTracks.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      loadedTracks: this.loadedTracks.size,
      loadingTracks: this.loadingPromises.size,
      currentLoads: this.currentLoads,
    };
  }
}

/**
 * Audio context manager for proper cleanup and resource management
 */
export class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private cleanupCallbacks: (() => void)[] = [];
  private suspendTimeout: NodeJS.Timeout | null = null;
  private lastActivity = Date.now();

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  /**
   * Initialize audio context with user gesture
   */
  async initializeAudioContext(): Promise<AudioContext> {
    console.log('AudioContextManager: initializeAudioContext called');

    if (this.audioContext && this.isInitialized) {
      console.log('AudioContextManager: Using existing audio context');
      this.markActivity();
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContextManager: Resuming suspended context');
        await this.audioContext.resume();
      }
      return this.audioContext;
    }

    try {
      console.log('AudioContextManager: Creating new audio context');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContextManager: Audio context created, state:', this.audioContext.state);

      // Ensure context is running
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContextManager: Resuming newly created context');
        await this.audioContext.resume();
        console.log('AudioContextManager: Context resumed, new state:', this.audioContext.state);
      }

      this.isInitialized = true;
      this.markActivity();
      this.setupAutoSuspend();
      this.setupVisibilityHandling();
      this.startKeepAlive();

      console.log('AudioContextManager: Audio context initialized successfully');
      return this.audioContext;
    } catch (error) {
      console.error('AudioContextManager: Failed to initialize audio context:', error);
      console.error('AudioContextManager: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      throw new Error('Audio not supported in this browser');
    }
  }

  /**
   * Get the current audio context
   */
  getAudioContext(): AudioContext | null {
    this.markActivity();
    return this.audioContext;
  }

  /**
   * Mark audio activity to prevent auto-suspend
   */
  markActivity() {
    this.lastActivity = Date.now();

    // Clear existing suspend timeout
    if (this.suspendTimeout) {
      clearTimeout(this.suspendTimeout);
    }

    // Set new suspend timeout
    this.setupAutoSuspend();
  }

  /**
   * Setup automatic suspension after inactivity
   */
  private setupAutoSuspend() {
    const SUSPEND_DELAY = 30000; // 30 seconds

    this.suspendTimeout = setTimeout(() => {
      if (this.audioContext && Date.now() - this.lastActivity >= SUSPEND_DELAY) {
        this.suspendAudioContext();
      }
    }, SUSPEND_DELAY);
  }

  /**
   * Keep audio context alive by playing silent audio periodically
   */
  private keepAliveInterval: NodeJS.Timeout | null = null;

  private startKeepAlive() {
    if (this.keepAliveInterval) return;

    this.keepAliveInterval = setInterval(() => {
      if (this.audioContext && this.audioContext.state === 'running') {
        // Play a very short silent audio to keep context alive
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.001);
      }
    }, 10000); // Every 10 seconds
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Handle visibility change to prevent audio suspension
   */
  private setupVisibilityHandling() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.audioContext) {
          // Resume audio context when tab becomes visible
          this.resumeAudioContext();
        }
      });
    }
  }

  /**
   * Suspend audio context to save resources
   */
  async suspendAudioContext() {
    if (this.audioContext && this.audioContext.state === 'running') {
      try {
        await this.audioContext.suspend();
        console.log('Audio context suspended for resource conservation');
      } catch (error) {
        console.warn('Failed to suspend audio context:', error);
      }
    }
  }

  /**
   * Resume audio context
   */
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.markActivity();
        console.log('Audio context resumed');
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  /**
   * Register cleanup callback
   */
  registerCleanup(callback: () => void) {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Clean up audio resources
   */
  cleanup() {
    // Call all cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.warn('Error in cleanup callback:', error);
      }
    });
    this.cleanupCallbacks = [];

    // Stop keep-alive
    this.stopKeepAlive();

    // Clear suspend timeout
    if (this.suspendTimeout) {
      clearTimeout(this.suspendTimeout);
      this.suspendTimeout = null;
    }

    // Close audio context
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      this.audioContext = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get audio context state information
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      state: this.audioContext?.state || 'closed',
      sampleRate: this.audioContext?.sampleRate || 0,
      lastActivity: this.lastActivity,
    };
  }
}

/**
 * Memory-efficient composition chunker for large compositions
 */
export class CompositionChunker {
  private static readonly CHUNK_SIZE = 1000; // Notes per chunk
  private static readonly MAX_CHUNKS_IN_MEMORY = 5;

  /**
   * Split composition into manageable chunks
   */
  static chunkComposition(composition: CompositionData): Array<{
    id: string;
    tracks: TrackData[];
    startTime: number;
    endTime: number;
  }> {
    const chunks: Array<{
      id: string;
      tracks: TrackData[];
      startTime: number;
      endTime: number;
    }> = [];

    // Find the total duration
    const totalDuration = Math.max(...composition.layers.map((track) => track.duration));
    const chunkDuration = totalDuration / Math.ceil(totalDuration / 10000); // ~10 second chunks

    let currentTime = 0;
    let chunkIndex = 0;

    while (currentTime < totalDuration) {
      const endTime = Math.min(currentTime + chunkDuration, totalDuration);

      const chunkTracks = composition.layers
        .map((track) => ({
          ...track,
          id: `${track.id}_chunk_${chunkIndex}`,
          notes: track.notes
            .filter((note) => note.startTime >= currentTime && note.startTime < endTime)
            .map((note) => ({
              ...note,
              startTime: note.startTime - currentTime, // Normalize to chunk start
            })),
        }))
        .filter((track) => track.notes.length > 0);

      if (chunkTracks.length > 0) {
        chunks.push({
          id: `chunk_${chunkIndex}`,
          tracks: chunkTracks,
          startTime: currentTime,
          endTime,
        });
      }

      currentTime = endTime;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Load chunks on demand
   */
  static async loadChunk(
    chunkId: string,
    chunks: Array<any>,
    loadedChunks: Map<string, any>
  ): Promise<any> {
    if (loadedChunks.has(chunkId)) {
      return loadedChunks.get(chunkId);
    }

    const chunk = chunks.find((c) => c.id === chunkId);
    if (!chunk) {
      throw new Error(`Chunk ${chunkId} not found`);
    }

    // Manage memory by removing old chunks
    if (loadedChunks.size >= this.MAX_CHUNKS_IN_MEMORY) {
      const oldestChunk = loadedChunks.keys().next().value;
      loadedChunks.delete(oldestChunk);
    }

    loadedChunks.set(chunkId, chunk);
    return chunk;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  /**
   * Start timing an operation
   */
  static startTiming(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  /**
   * Record a performance metric
   */
  static recordMetric(operation: string, value: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const values = this.metrics.get(operation)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(operation: string) {
    const values = this.metrics.get(operation) || [];
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  /**
   * Get all performance metrics
   */
  static getAllStats() {
    const stats: Record<string, any> = {};
    for (const [operation] of this.metrics) {
      stats[operation] = this.getStats(operation);
    }
    return stats;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics() {
    this.metrics.clear();
  }
}

// Global instances
export const lazyLoader = new LazyCompositionLoader();
export const audioManager = AudioContextManager.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioManager.cleanup();
    lazyLoader.clearCache();
  });
}
