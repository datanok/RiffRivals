import React, { useState, useCallback, useEffect } from 'react';
import type { TrackData, CompositionData, InstrumentType } from '../../shared/types/music.js';
import type { CreateJamReplyResponse } from '../../shared/types/api.js';
import { PlaybackEngine } from './PlaybackEngine.js';
import { AudioRecorder } from './AudioRecorder.js';
import { InstrumentSelector } from './instruments/InstrumentSelector.js';
import { DrumKit } from './instruments/DrumKit.js';
import { Piano } from './instruments/Piano.js';
import { Bass } from './instruments/Bass.js';

type JamReplyProps = {
  parentComposition: CompositionData;
  parentPostId: string;
  onReplySubmit: (success: boolean, message?: string) => void;
  onCancel: () => void;
};

type RecordingState = 'idle' | 'recording' | 'recorded' | 'submitting';

export const JamReply: React.FC<JamReplyProps> = ({
  parentComposition,
  parentPostId,
  onReplySubmit,
  onCancel,
}) => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('piano');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [newTrackData, setNewTrackData] = useState<TrackData | null>(null);
  const [isPlayingParent, setIsPlayingParent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset error when recording state changes
  useEffect(() => {
    setError(null);
  }, [recordingState]);

  const handleInstrumentChange = useCallback(
    (instrument: InstrumentType) => {
      if (recordingState === 'idle') {
        setSelectedInstrument(instrument);
      }
    },
    [recordingState]
  );

  const handleRecordingComplete = useCallback((trackData: TrackData) => {
    setNewTrackData(trackData);
    setRecordingState('recorded');
  }, []);

  const handlePlaybackStateChange = useCallback((isPlaying: boolean) => {
    setIsPlayingParent(isPlaying);
  }, []);

  const handleStartRecording = useCallback(() => {
    setRecordingState('recording');
    setError(null);
  }, []);

  const handleStopRecording = useCallback(() => {
    setRecordingState('idle');
    setNewTrackData(null);
  }, []);

  const handleSubmitReply = useCallback(async () => {
    if (!newTrackData) {
      setError('No recording to submit');
      return;
    }

    setRecordingState('submitting');
    setError(null);

    try {
      // Create combined composition with parent tracks + new track
      const combinedComposition: CompositionData = {
        layers: [...parentComposition.layers, newTrackData],
        metadata: {
          ...parentComposition.metadata,
          collaborators: [...parentComposition.metadata.collaborators, newTrackData.userId].filter(
            (user, index, arr) => arr.indexOf(user) === index
          ), // Remove duplicates
          parentPostId: parentComposition.metadata.parentPostId || parentPostId,
        },
      };

      const response = await fetch('/api/create-jam-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentPostId,
          newTrackData,
          combinedComposition,
        }),
      });

      const data: CreateJamReplyResponse = await response.json();

      if (data.success) {
        onReplySubmit(true, 'Jam reply posted successfully!');
      } else {
        setError(data.message || 'Failed to post jam reply');
        setRecordingState('recorded');
        onReplySubmit(false, data.message);
      }
    } catch (err) {
      console.error('Error submitting jam reply:', err);
      setError('Network error while submitting reply');
      setRecordingState('recorded');
      onReplySubmit(false, 'Network error occurred');
    }
  }, [newTrackData, parentComposition, parentPostId, onReplySubmit]);

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

  const renderInstrumentInterface = () => {
    const isRecording = recordingState === 'recording';
    const isDisabled = recordingState === 'submitting' || isPlayingParent;

    switch (selectedInstrument) {
      case 'drums':
        return (
          <DrumKit
            onNotePlay={() => {}} // Handled by AudioRecorder
            isRecording={isRecording}
            activeNotes={new Set()}
            disabled={isDisabled}
          />
        );
      case 'piano':
        return (
          <Piano
            onNotePlay={() => {}} // Handled by AudioRecorder
            isRecording={isRecording}
            activeNotes={new Set()}
            octave={4}
            disabled={isDisabled}
          />
        );
      case 'bass':
        return (
          <Bass
            onNotePlay={() => {}} // Handled by AudioRecorder
            isRecording={isRecording}
            selectedFret={0}
            activeNotes={new Set()}
            disabled={isDisabled}
          />
        );
      default:
        return null;
    }
  };

  const previewTracks = newTrackData
    ? [...parentComposition.layers, newTrackData]
    : parentComposition.layers;

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Jam on "{parentComposition.metadata.title || 'Untitled Riff'}"
        </h2>
        <p className="text-gray-600">
          Add your own musical layer to this composition. Your recording will be layered with the
          original tracks.
        </p>
      </div>

      {/* Parent Composition Preview */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800">Original Tracks</h3>
        <div className="grid gap-2">
          {parentComposition.layers.map((track, index) => (
            <div key={track.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
              <span className="text-lg">{getInstrumentIcon(track.instrument)}</span>
              <div className="flex-1">
                <span className="font-medium capitalize text-gray-900">{track.instrument}</span>
                <span className="text-sm text-gray-500 ml-2">
                  {track.notes.length} notes • {formatDuration(track.duration)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Parent Playback */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">Listen to Original</h3>
        <PlaybackEngine
          tracks={parentComposition.layers}
          onPlaybackStateChange={handlePlaybackStateChange}
          visualFeedback={true}
        />
      </div>

      {/* Instrument Selection */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800">Choose Your Instrument</h3>
        <InstrumentSelector
          selectedInstrument={selectedInstrument}
          onInstrumentChange={handleInstrumentChange}
          disabled={recordingState !== 'idle'}
        />
      </div>

      {/* Recording Interface */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Record Your Part</h3>

        {/* Instrument Interface */}
        <div className="p-4 bg-gray-50 rounded-lg border">{renderInstrumentInterface()}</div>

        {/* Audio Recorder */}
        <AudioRecorder
          instrument={selectedInstrument}
          onRecordingComplete={handleRecordingComplete}
          referenceTrack={parentComposition.layers}
          disabled={isPlayingParent}
        />

        {/* Recording Status */}
        {recordingState === 'recording' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-700 font-medium">Recording in progress...</span>
          </div>
        )}

        {recordingState === 'recorded' && newTrackData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">Recording complete!</span>
            </div>
            <div className="text-sm text-green-600">
              Recorded {newTrackData.notes.length} notes • {formatDuration(newTrackData.duration)}
            </div>
          </div>
        )}
      </div>

      {/* Preview Combined Composition */}
      {newTrackData && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">Preview Combined Composition</h3>
          <PlaybackEngine
            tracks={previewTracks}
            onPlaybackStateChange={() => {}}
            visualFeedback={true}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          onClick={onCancel}
          disabled={recordingState === 'submitting'}
          className={`
            flex-1 px-6 py-3 rounded-lg font-medium transition-colors
            ${
              recordingState === 'submitting'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }
          `}
        >
          Cancel
        </button>

        {recordingState === 'recorded' && (
          <button
            onClick={handleStopRecording}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Record Again
          </button>
        )}

        <button
          onClick={handleSubmitReply}
          disabled={!newTrackData || recordingState === 'submitting'}
          className={`
            flex-1 px-6 py-3 rounded-lg font-medium transition-colors
            ${
              !newTrackData || recordingState === 'submitting'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }
          `}
        >
          {recordingState === 'submitting' ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Posting...
            </div>
          ) : (
            'Post Jam Reply'
          )}
        </button>
      </div>
    </div>
  );
};
