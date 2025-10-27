import type { CompositionData, TrackData } from '../../shared/index.js';

/**
 * Serializes a composition to a JSON string with compression
 */
export function serializeComposition(composition: CompositionData): string {
  try {
    // Create a compressed version by removing redundant data
    const compressed = {
      ...composition,
      layers: composition.layers.map((track) => ({
        ...track,
        // Round timing values to reduce precision and file size
        notes: track.notes.map((note) => ({
          ...note,
          startTime: Math.round(note.startTime * 1000) / 1000,
          duration: Math.round(note.duration * 1000) / 1000,
          velocity: Math.round(note.velocity * 100) / 100,
        })),
        duration: Math.round(track.duration * 1000) / 1000,
      })),
    };

    return JSON.stringify(compressed);
  } catch (error) {
    console.error('Failed to serialize composition:', error);
    throw new Error('Failed to serialize composition');
  }
}

/**
 * Deserializes a composition from a JSON string
 */
export function deserializeComposition(jsonString: string): CompositionData {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate the structure
    if (!isValidComposition(parsed)) {
      throw new Error('Invalid composition format');
    }

    return parsed as CompositionData;
  } catch (error) {
    console.error('Failed to deserialize composition:', error);
    throw new Error('Failed to deserialize composition');
  }
}

/**
 * Validates that an object has the correct CompositionData structure
 */
function isValidComposition(obj: any): obj is CompositionData {
  if (!obj || typeof obj !== 'object') return false;

  // Check layers array
  if (!Array.isArray(obj.layers)) return false;

  // Validate each track
  for (const track of obj.layers) {
    if (!isValidTrack(track)) return false;
  }

  // Check metadata
  if (!obj.metadata || typeof obj.metadata !== 'object') return false;
  if (!Array.isArray(obj.metadata.collaborators)) return false;
  if (typeof obj.metadata.createdAt !== 'number') return false;

  return true;
}

/**
 * Validates that an object has the correct TrackData structure
 */
function isValidTrack(obj: any): obj is TrackData {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = ['id', 'instrument', 'notes', 'tempo', 'duration', 'userId', 'timestamp'];
  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }

  // Validate notes array
  if (!Array.isArray(obj.notes)) return false;
  for (const note of obj.notes) {
    if (!isValidNoteEvent(note)) return false;
  }

  // Validate instrument type
  const validInstruments = ['drums', 'piano', 'bass'];
  if (!validInstruments.includes(obj.instrument)) return false;

  return true;
}

/**
 * Validates that an object has the correct NoteEvent structure
 */
function isValidNoteEvent(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  const requiredFields = ['note', 'velocity', 'startTime', 'duration'];
  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }

  // Validate types
  if (typeof obj.note !== 'string') return false;
  if (typeof obj.velocity !== 'number') return false;
  if (typeof obj.startTime !== 'number') return false;
  if (typeof obj.duration !== 'number') return false;

  return true;
}

/**
 * Combines multiple tracks into a single composition
 */
export function combineTracksIntoComposition(
  tracks: TrackData[],
  metadata?: Partial<CompositionData['metadata']>
): CompositionData {
  const collaborators = Array.from(new Set(tracks.map((track) => track.userId)));

  return {
    layers: [...tracks],
    metadata: {
      ...(metadata?.title && { title: metadata.title }),
      collaborators,
      createdAt: metadata?.createdAt || Date.now(),
      ...(metadata?.parentPostId && { parentPostId: metadata.parentPostId }),
    },
  };
}

/**
 * Adds a new track to an existing composition
 */
export function addTrackToComposition(
  composition: CompositionData,
  newTrack: TrackData
): CompositionData {
  const updatedCollaborators = Array.from(
    new Set([...composition.metadata.collaborators, newTrack.userId])
  );

  return {
    ...composition,
    layers: [...composition.layers, newTrack],
    metadata: {
      ...composition.metadata,
      collaborators: updatedCollaborators,
    },
  };
}

/**
 * Removes a track from a composition by ID
 */
export function removeTrackFromComposition(
  composition: CompositionData,
  trackId: string
): CompositionData {
  const filteredLayers = composition.layers.filter((track) => track.id !== trackId);

  // Update collaborators list based on remaining tracks
  const remainingCollaborators = Array.from(new Set(filteredLayers.map((track) => track.userId)));

  return {
    ...composition,
    layers: filteredLayers,
    metadata: {
      ...composition.metadata,
      collaborators: remainingCollaborators,
    },
  };
}

/**
 * Creates an empty composition with default metadata
 */
export function createEmptyComposition(title?: string, parentPostId?: string): CompositionData {
  return {
    layers: [],
    metadata: {
      ...(title && { title }),
      collaborators: [],
      createdAt: Date.now(),
      ...(parentPostId && { parentPostId }),
    },
  };
}

/**
 * Calculates composition statistics
 */
export function getCompositionStats(composition: CompositionData) {
  const totalDuration = Math.max(...composition.layers.map((track) => track.duration), 0);
  const totalNotes = composition.layers.reduce((sum, track) => sum + track.notes.length, 0);
  const instruments = Array.from(new Set(composition.layers.map((track) => track.instrument)));

  return {
    totalDuration,
    totalNotes,
    instruments,
    trackCount: composition.layers.length,
    collaboratorCount: composition.metadata.collaborators.length,
    averageNotesPerTrack:
      composition.layers.length > 0 ? totalNotes / composition.layers.length : 0,
  };
}

/**
 * Validates composition size limits for storage
 */
export function validateCompositionSize(composition: CompositionData): {
  isValid: boolean;
  errors: string[];
  sizeInfo: {
    serializedSize: number;
    trackCount: number;
    noteCount: number;
  };
} {
  const errors: string[] = [];
  const serialized = serializeComposition(composition);
  const sizeInfo = {
    serializedSize: new Blob([serialized]).size,
    trackCount: composition.layers.length,
    noteCount: composition.layers.reduce((sum, track) => sum + track.notes.length, 0),
  };

  // Check size limits (4MB for Devvit)
  const MAX_SIZE = 4 * 1024 * 1024; // 4MB
  if (sizeInfo.serializedSize > MAX_SIZE) {
    errors.push(
      `Composition too large: ${(sizeInfo.serializedSize / 1024 / 1024).toFixed(2)}MB (max: 4MB)`
    );
  }

  // Check reasonable limits
  const MAX_TRACKS = 50;
  const MAX_NOTES = 10000;

  if (sizeInfo.trackCount > MAX_TRACKS) {
    errors.push(`Too many tracks: ${sizeInfo.trackCount} (max: ${MAX_TRACKS})`);
  }

  if (sizeInfo.noteCount > MAX_NOTES) {
    errors.push(`Too many notes: ${sizeInfo.noteCount} (max: ${MAX_NOTES})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sizeInfo,
  };
}
