import React, { useState, useEffect, useCallback } from 'react';
import type { CompositionData, TrackData } from '../../shared/types/music.js';
import type { GetCompositionResponse } from '../../shared/types/api.js';
import { generateCompositionPreview } from '../../shared/utils/previewGenerator.js';
import { PlaybackEngine } from './PlaybackEngine.js';
import { CompositionPreview } from './CompositionPreview.js';
import { AudioInitButton } from './AudioInitButton.js';

type RiffPostProps = {
  postId: string;
  onJamRequest: (composition: CompositionData) => void;
  onChallengeRequest: (
    composition: CompositionData,
    challengeType: 'replication' | 'falling_notes'
  ) => void;
  onCreateFirst?: () => void;
};

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export const RiffPost: React.FC<RiffPostProps> = ({
  postId,
  onJamRequest,
  onChallengeRequest,
  onCreateFirst,
}) => {
  const [composition, setComposition] = useState<CompositionData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Load composition data
  const loadComposition = useCallback(async () => {
    if (!postId) return;

    setLoadingState('loading');
    setError(null);

    try {
      const response = await fetch(`/api/get-composition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      });

      const data: GetCompositionResponse = await response.json();

      if (data.success && data.composition) {
        setComposition(data.composition);
        setLoadingState('loaded');
      } else {
        setError(data.message || 'Failed to load composition');
        setLoadingState('error');
      }
    } catch (err) {
      console.error('Error loading composition:', err);
      setError('Network error while loading composition');
      setLoadingState('error');
    }
  }, [postId]);

  // Load composition on mount
  useEffect(() => {
    void loadComposition();
  }, [loadComposition]);

  const handleJamRequest = useCallback(() => {
    if (composition) {
      onJamRequest(composition);
    }
  }, [composition, onJamRequest]);

  const handleChallengeRequest = useCallback(
    (challengeType: 'replication' | 'falling_notes') => {
      console.log('RiffPost: handleChallengeRequest called with:', composition, challengeType);
      if (composition) {
        console.log(
          'RiffPost: Calling onChallengeRequest with composition and type:',
          challengeType
        );
        onChallengeRequest(composition, challengeType);
      } else {
        console.log('RiffPost: No composition available for challenge request');
      }
    },
    [composition, onChallengeRequest]
  );

  const handlePlaybackStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInstrumentIcon = (instrument: string): string => {
    switch (instrument) {
      case 'drums':
        return '🥁';
      case 'piano':
        return '🎹';
      case 'bass':
        return '🎸';
      default:
        return '🎵';
    }
  };

  if (loadingState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading riff...</p>
      </div>
    );
  }

  if (loadingState === 'error') {
    // Check if this is a "Composition not found" error - this means it's a fresh post
    const isCompositionNotFound =
      error?.includes('Composition not found') || error?.includes('not found');

    if (isCompositionNotFound && onCreateFirst) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
          <div className="text-6xl mb-6">🎵</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Music Here Yet!</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            This post doesn't have any musical content yet. Be the first to create a riff and start
            a jam session!
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCreateFirst}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">🎼</span>
              Create First Riff
            </button>
            <button
              onClick={loadComposition}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 text-center mb-4">{error}</p>
        <button
          onClick={loadComposition}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!composition) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border">
        <p className="text-gray-600">No composition data available</p>
      </div>
    );
  }

  const totalDuration = Math.max(...composition.layers.map((track) => track.duration));
  const totalNotes = composition.layers.reduce((sum, track) => sum + track.notes.length, 0);

  // Generate composition preview
  const preview = generateCompositionPreview(composition);

  return (
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        borderRadius: '8px',
        border: '2px solid #0f3460',
        fontFamily: 'monospace',
        position: 'relative',
      }}
    >
      {/* Audio Initialization Button */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999 }}>
        <AudioInitButton
          onAudioInitialized={() => {
            setAudioInitialized(true);
          }}
          position="top-right"
        />
      </div>
      {/* Enhanced Composition Preview */}
      <CompositionPreview preview={preview} compact={false} showWaveform={true} />

      {/* Composition Visualization */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800">Tracks</h3>
        <div className="grid gap-3">
          {composition.layers.map((track, index) => (
            <div
              key={track.id}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getInstrumentIcon(track.instrument)}</span>
                <div className="flex flex-col">
                  <span className="font-medium capitalize text-gray-900">{track.instrument}</span>
                  <span className="text-xs text-gray-500">Track {index + 1}</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{track.notes.length} notes</span>
                  <span>{formatDuration(track.duration)}</span>
                  <span>Tempo: {track.tempo} BPM</span>
                </div>

                {/* Visual representation of notes */}
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                    style={{ width: `${Math.min(100, (track.notes.length / 50) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-400">
                {new Date(track.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Playback Engine */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">Playback</h3>
        <PlaybackEngine
          tracks={composition.layers}
          onPlaybackStateChange={handlePlaybackStateChange}
          visualFeedback={true}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          onClick={handleJamRequest}
          disabled={isPlaying}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
            ${
              isPlaying
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }
          `}
        >
          <span className="text-xl">🎤</span>
          Jam on this
        </button>

        <div className="flex-1 flex gap-2">
          <button
            onClick={() => handleChallengeRequest('replication')}
            disabled={isPlaying}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors text-sm
              ${
                isPlaying
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }
            `}
          >
            <span className="text-lg">🎯</span>
            Replicate
          </button>

          <button
            onClick={() => handleChallengeRequest('falling_notes')}
            disabled={isPlaying}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors text-sm
              ${
                isPlaying
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              }
            `}
          >
            <span className="text-lg">🎵</span>
            Falling Notes
          </button>
        </div>
      </div>

      {/* Metadata */}
      {composition.metadata.collaborators.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Collaborators</h4>
          <div className="flex flex-wrap gap-2">
            {composition.metadata.collaborators.map((collaborator, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                u/{collaborator}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
