// Utility functions for generating Reddit post content and metadata

import type { TrackData, CompositionData } from '../../shared/types/music.js';
import {
  generateCompositionPreview,
  generateShortPreview,
  generateVariedTitle,
} from '../../shared/utils/previewGenerator.js';

/**
 * Generate a preview text for a riff post
 */
export function generateRiffPreview(trackData: TrackData): string {
  const { instrument, duration, notes } = trackData;
  const noteCount = notes.length;
  const durationSeconds = Math.round(duration / 1000);

  return `🎵 New ${instrument} riff • ${noteCount} notes • ${durationSeconds}s duration`;
}

/**
 * Generate enhanced preview for a composition
 */
export function generateEnhancedPreview(composition: CompositionData): string {
  return generateShortPreview(composition);
}

/**
 * Generate a title for a riff post
 */
export function generateRiffTitle(trackData: TrackData, customTitle?: string): string {
  if (customTitle) {
    return `🎵 ${customTitle}`;
  }

  const { instrument } = trackData;
  const instrumentEmoji = {
    drums: '🥁',
    piano: '🎹',
    bass: '🎸',
  };

  return `${instrumentEmoji[instrument]} New ${instrument.charAt(0).toUpperCase() + instrument.slice(1)} Riff`;
}

/**
 * Generate enhanced title for a composition
 */
export function generateEnhancedTitle(composition: CompositionData): string {
  return generateVariedTitle(composition);
}

/**
 * Generate text for a jam reply comment
 */
export function generateJamReplyText(newTrackData: TrackData): string {
  const { instrument, notes, duration } = newTrackData;
  const noteCount = notes.length;
  const durationSeconds = Math.round(duration / 1000);

  const instrumentEmoji = {
    drums: '🥁',
    piano: '🎹',
    bass: '🎸',
  };

  return `${instrumentEmoji[instrument]} Added ${instrument} layer • ${noteCount} notes • ${durationSeconds}s\n\n*Click to play the full jam session!*`;
}

/**
 * Generate metadata for composition storage
 */
export function generateCompositionMetadata(
  trackData: TrackData,
  userId: string,
  parentPostId?: string
): CompositionData {
  return {
    id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    layers: [trackData],
    metadata: {
      collaborators: [userId],
      createdAt: Date.now(),
      ...(parentPostId && { parentPostId }),
    },
  };
}

/**
 * Combine parent composition with new track
 */
export function combineCompositions(
  parentComposition: CompositionData,
  newTrackData: TrackData,
  userId: string
): CompositionData {
  const existingCollaborators = parentComposition.metadata.collaborators;
  const collaborators = existingCollaborators.includes(userId)
    ? existingCollaborators
    : [...existingCollaborators, userId];

  return {
    layers: [...parentComposition.layers, newTrackData],
    metadata: {
      ...parentComposition.metadata,
      collaborators,
    },
  };
}

/**
 * Generate app URL for a specific track or composition
 */
export function generateAppUrl(trackId: string): string {
  // This will be the URL that opens the Dhwani app with the specific track
  return `https://reddit.com/dhwani/${trackId}`;
}
