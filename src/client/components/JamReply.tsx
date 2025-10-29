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
        ...parentComposition,
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
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '12px',
        border: '3px solid #0f3460',
        boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)',
      }}
    >
      {/* Compact Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h2
          style={{
            color: '#00d4ff',
            fontSize: '24px',
            marginBottom: '8px',
            fontFamily: "'Press Start 2P', monospace",
            textShadow: '0 0 10px #00d4ff',
          }}
        >
          🎵 ADD YOUR LAYER
        </h2>
        <p
          style={{
            color: '#aaa',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          Collaborate on: {parentComposition.metadata.title || 'Untitled'}
        </p>
      </div>

      {/* Existing Layers - Compact */}
      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #0f3460',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              color: '#00d4ff',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          >
            EXISTING LAYERS ({parentComposition.layers.length})
          </span>
          <PlaybackEngine
            tracks={parentComposition.layers}
            onPlaybackStateChange={handlePlaybackStateChange}
            visualFeedback={false}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {parentComposition.layers.map((track) => (
            <div
              key={track.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(78, 205, 196, 0.2)',
                border: '1px solid #4ecdc4',
                borderRadius: '16px',
                color: '#4ecdc4',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              <span>{getInstrumentIcon(track.instrument)}</span>
              <span>{track.instrument.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instrument Selection - Inline */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            color: '#00d4ff',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
            fontFamily: 'monospace',
          }}
        >
          YOUR INSTRUMENT:
        </div>
        <InstrumentSelector
          selectedInstrument={selectedInstrument}
          onInstrumentChange={handleInstrumentChange}
          disabled={recordingState !== 'idle'}
        />
      </div>

      {/* Recording Interface - Compact */}
      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #0f3460',
        }}
      >
        {/* Instrument Interface */}
        <div style={{ marginBottom: '16px' }}>{renderInstrumentInterface()}</div>

        {/* Audio Recorder */}
        <AudioRecorder
          instrument={selectedInstrument}
          onRecordingComplete={handleRecordingComplete}
          referenceTrack={parentComposition.layers}
          disabled={isPlayingParent}
        />

        {/* Recording Status - Minimal */}
        {recordingState === 'recording' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              background: 'rgba(255, 0, 0, 0.2)',
              border: '2px solid #ff0064',
              borderRadius: '4px',
              marginTop: '12px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                background: '#ff0064',
                borderRadius: '50%',
                animation: 'pulse 1s infinite',
              }}
            ></div>
            <span style={{ color: '#ff0064', fontWeight: 'bold', fontFamily: 'monospace' }}>
              ⏺ RECORDING...
            </span>
          </div>
        )}

        {recordingState === 'recorded' && newTrackData && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              background: 'rgba(0, 255, 0, 0.2)',
              border: '2px solid #00ff00',
              borderRadius: '4px',
              marginTop: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#00ff00', fontSize: '18px' }}>✓</span>
              <span style={{ color: '#00ff00', fontWeight: 'bold', fontFamily: 'monospace' }}>
                {newTrackData.notes.length} NOTES • {formatDuration(newTrackData.duration)}
              </span>
            </div>
            <PlaybackEngine
              tracks={previewTracks}
              onPlaybackStateChange={() => {}}
              visualFeedback={false}
            />
          </div>
        )}
      </div>

      {/* Error Display - Minimal */}
      {error && (
        <div
          style={{
            padding: '12px',
            background: 'rgba(255, 0, 0, 0.2)',
            border: '2px solid #ff0064',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#ff0064', fontSize: '18px' }}>⚠️</span>
            <span style={{ color: '#ff0064', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Actions - Clean */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={onCancel}
          disabled={recordingState === 'submitting'}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: '3px solid #666',
            background: recordingState === 'submitting' ? '#333' : '#444',
            color: recordingState === 'submitting' ? '#666' : '#fff',
            fontWeight: 'bold',
            cursor: recordingState === 'submitting' ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          ← BACK
        </button>

        {recordingState === 'recorded' && (
          <button
            onClick={handleStopRecording}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '3px solid #000',
              background: 'linear-gradient(45deg, #ff6600, #ff8800)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'monospace',
              boxShadow: '0 4px 0 #000, 0 0 20px rgba(255, 102, 0, 0.5)',
            }}
          >
            🔄 RECORD AGAIN
          </button>
        )}

        <button
          onClick={handleSubmitReply}
          disabled={!newTrackData || recordingState === 'submitting'}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '12px 24px',
            borderRadius: '8px',
            border: '3px solid #000',
            background:
              !newTrackData || recordingState === 'submitting'
                ? '#666'
                : 'linear-gradient(45deg, #4ecdc4, #44a08d)',
            color: !newTrackData || recordingState === 'submitting' ? '#333' : '#fff',
            fontWeight: 'bold',
            cursor: !newTrackData || recordingState === 'submitting' ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontFamily: 'monospace',
            boxShadow:
              !newTrackData || recordingState === 'submitting'
                ? 'none'
                : '0 4px 0 #000, 0 0 20px rgba(78, 205, 196, 0.5)',
          }}
        >
          {recordingState === 'submitting' ? '⏳ POSTING...' : '🚀 ADD TO COLLABORATION'}
        </button>
      </div>
    </div>
  );
};
