import React, { useState, useCallback, useMemo } from 'react';
import type { CompositionData, TrackData } from '../../shared/index.js';

type CompositionManagerProps = {
  composition: CompositionData;
  onCompositionChange: (composition: CompositionData) => void;
  onTrackAdd: (track: TrackData) => void;
  onTrackRemove: (trackId: string) => void;
  readOnly?: boolean;
};

export const CompositionManager: React.FC<CompositionManagerProps> = ({
  composition,
  onCompositionChange,
  onTrackAdd,
  onTrackRemove,
  readOnly = false,
}) => {
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [showMetadata, setShowMetadata] = useState(false);

  // Memoized composition statistics
  const stats = useMemo(() => {
    const totalDuration = Math.max(...composition.layers.map((track) => track.duration), 0);
    const totalNotes = composition.layers.reduce((sum, track) => sum + track.notes.length, 0);
    const instruments = new Set(composition.layers.map((track) => track.instrument));
    const collaborators = composition.metadata.collaborators;

    return {
      totalDuration,
      totalNotes,
      instruments: Array.from(instruments),
      collaboratorCount: collaborators.length,
      trackCount: composition.layers.length,
    };
  }, [composition]);

  const updateMetadata = useCallback(
    (updates: Partial<CompositionData['metadata']>) => {
      const updatedComposition: CompositionData = {
        ...composition,
        metadata: {
          ...composition.metadata,
          ...updates,
        },
      };
      onCompositionChange(updatedComposition);
    },
    [composition, onCompositionChange]
  );

  const reorderTracks = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (readOnly) return;

      const newLayers = [...composition.layers];
      const [movedTrack] = newLayers.splice(fromIndex, 1);
      if (movedTrack) {
        newLayers.splice(toIndex, 0, movedTrack);
      }

      const updatedComposition: CompositionData = {
        ...composition,
        layers: newLayers,
      };
      onCompositionChange(updatedComposition);
    },
    [composition, onCompositionChange, readOnly]
  );

  const duplicateTrack = useCallback(
    (trackId: string) => {
      if (readOnly) return;

      const originalTrack = composition.layers.find((track) => track.id === trackId);
      if (!originalTrack) return;

      const duplicatedTrack: TrackData = {
        ...originalTrack,
        id: `${originalTrack.id}_copy_${Date.now()}`,
        timestamp: Date.now(),
      };

      onTrackAdd(duplicatedTrack);
    },
    [composition.layers, onTrackAdd, readOnly]
  );

  const selectTrack = useCallback((trackId: string, multiSelect: boolean = false) => {
    setSelectedTracks((prev) => {
      const newSet = new Set(prev);

      if (multiSelect) {
        if (newSet.has(trackId)) {
          newSet.delete(trackId);
        } else {
          newSet.add(trackId);
        }
      } else {
        newSet.clear();
        newSet.add(trackId);
      }

      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTracks(new Set());
  }, []);

  const removeSelectedTracks = useCallback(() => {
    if (readOnly) return;

    selectedTracks.forEach((trackId) => {
      onTrackRemove(trackId);
    });
    clearSelection();
  }, [selectedTracks, onTrackRemove, clearSelection, readOnly]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Composition Header */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            {composition.metadata.title || 'Untitled Composition'}
          </h3>
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showMetadata ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Duration:</span>
            <div className="font-medium">{formatDuration(stats.totalDuration)}</div>
          </div>
          <div>
            <span className="text-gray-500">Tracks:</span>
            <div className="font-medium">{stats.trackCount}</div>
          </div>
          <div>
            <span className="text-gray-500">Notes:</span>
            <div className="font-medium">{stats.totalNotes}</div>
          </div>
          <div>
            <span className="text-gray-500">Instruments:</span>
            <div className="font-medium">{stats.instruments.join(', ')}</div>
          </div>
        </div>

        {/* Detailed Metadata */}
        {showMetadata && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Title</label>
              {readOnly ? (
                <div className="text-sm">{composition.metadata.title || 'Untitled'}</div>
              ) : (
                <input
                  type="text"
                  value={composition.metadata.title || ''}
                  onChange={(e) => updateMetadata({ title: e.target.value })}
                  placeholder="Enter composition title"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              )}
            </div>

            <div>
              <span className="text-sm text-gray-500">Created:</span>
              <div className="text-sm">{formatDate(composition.metadata.createdAt)}</div>
            </div>

            <div>
              <span className="text-sm text-gray-500">Collaborators:</span>
              <div className="text-sm">
                {composition.metadata.collaborators.length > 0
                  ? composition.metadata.collaborators.join(', ')
                  : 'None'}
              </div>
            </div>

            {composition.metadata.parentPostId && (
              <div>
                <span className="text-sm text-gray-500">Parent Post:</span>
                <div className="text-sm font-mono">{composition.metadata.parentPostId}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Track Management */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Tracks ({composition.layers.length})</h4>

            {!readOnly && selectedTracks.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{selectedTracks.size} selected</span>
                <button
                  onClick={removeSelectedTracks}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Remove
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Track List */}
        <div className="divide-y">
          {composition.layers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tracks in this composition</div>
          ) : (
            composition.layers.map((track, index) => {
              const isSelected = selectedTracks.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`
                    p-4 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}
                  `}
                  onClick={(e) => selectTrack(track.id, e.ctrlKey || e.metaKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 font-mono w-8">#{index + 1}</span>
                        <div>
                          <div className="font-medium capitalize">{track.instrument}</div>
                          <div className="text-sm text-gray-500">
                            {track.notes.length} notes • {formatDuration(track.duration)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">{track.id.slice(-8)}</span>

                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTrack(track.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Duplicate track"
                          >
                            📋
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTrackRemove(track.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remove track"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Composition Actions */}
      {!readOnly && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              const serialized = JSON.stringify(composition, null, 2);
              navigator.clipboard.writeText(serialized);
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Copy JSON
          </button>
        </div>
      )}
    </div>
  );
};
