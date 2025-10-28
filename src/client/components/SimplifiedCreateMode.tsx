// Simplified Create Mode for RiffRivals - Single Instrument Recording Only
// Users record one instrument track to create replication challenges

import React, { useState, useCallback } from 'react';
import type { TrackData, InstrumentType } from '../../shared/types/music.js';
import { InstrumentSelector } from './instruments/InstrumentSelector.js';

interface SimplifiedCreateModeProps {
  onTrackCreate: (track: TrackData, title: string) => void;
  onCancel?: () => void;
}

export const SimplifiedCreateMode: React.FC<SimplifiedCreateModeProps> = ({
  onTrackCreate,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>('drums');
  const [recordedTrack, setRecordedTrack] = useState<TrackData | null>(null);
  const [title, setTitle] = useState('');
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [currentTrackNotes, setCurrentTrackNotes] = useState<
    Array<{
      note: string;
      velocity: number;
      timestamp: number;
    }>
  >([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  // Handle note play during recording
  const handleNotePlay = useCallback(
    (instrument: InstrumentType, note: string, velocity: number) => {
      // Update current instrument if it changed
      if (instrument !== currentInstrument) {
        setCurrentInstrument(instrument);
      }

      // Add to active notes for visual feedback
      setActiveNotes((prev) => new Set([...prev, note]));

      // Remove from active notes after a short delay
      setTimeout(() => {
        setActiveNotes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(note);
          return newSet;
        });
      }, 200);

      // Record the note if recording is active
      if (isRecording) {
        const currentTime = Date.now();
        const relativeTime = (currentTime - recordingStartTime) / 1000; // Convert to seconds

        setCurrentTrackNotes((prev) => [
          ...prev,
          {
            note,
            velocity,
            timestamp: relativeTime,
          },
        ]);
      }
    },
    [isRecording, recordingStartTime, currentInstrument]
  );

  // Start recording
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingStartTime(Date.now());
    setCurrentTrackNotes([]);
    setRecordedTrack(null);
  }, []);

  // Stop recording and create track
  const stopRecording = useCallback(() => {
    if (currentTrackNotes.length === 0) {
      alert('No notes recorded. Please play some notes while recording.');
      setIsRecording(false);
      return;
    }

    // Create a new track from recorded notes
    const duration = Math.max(...currentTrackNotes.map((n) => n.timestamp)) + 1; // Add 1 second buffer

    const newTrack: TrackData = {
      id: `track_${Date.now()}`,
      instrument: currentInstrument,
      notes: currentTrackNotes.map((n) => ({
        note: n.note,
        velocity: n.velocity,
        startTime: n.timestamp,
        duration: 0, // Instant button press (no long notes)
      })),
      tempo: 120, // Default tempo
      duration,
      userId: 'current_user', // Will be set by server
      timestamp: Date.now(),
    };

    setRecordedTrack(newTrack);
    setIsRecording(false);
    setCurrentTrackNotes([]);
  }, [currentTrackNotes, currentInstrument]);

  // Clear recording
  const clearRecording = useCallback(() => {
    setCurrentTrackNotes([]);
    setRecordedTrack(null);
    setIsRecording(false);
  }, []);

  // Save and publish
  const handleSave = useCallback(() => {
    if (!recordedTrack) {
      alert('Please record a track first!');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title for your challenge!');
      return;
    }

    onTrackCreate(recordedTrack, title);
  }, [recordedTrack, title, onTrackCreate]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '32px',
          border: '4px solid #0f3460',
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)',
        }}
      >
        <h2
          style={{
            color: '#00d4ff',
            fontSize: '28px',
            marginBottom: '24px',
            textAlign: 'center',
            fontFamily: "'Press Start 2P', monospace",
            textShadow: '0 0 10px #00d4ff',
          }}
        >
          🎸 CREATE REPLICATION CHALLENGE
        </h2>

        <p
          style={{
            color: '#fff',
            textAlign: 'center',
            marginBottom: '32px',
            fontSize: '12px',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          RECORD A SHORT LOOP - OTHERS WILL TRY TO REPLICATE IT!
        </p>

        {/* Title Input */}
        {recordedTrack && (
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                color: '#00d4ff',
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Challenge Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a catchy title..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #0f3460',
                background: '#0a0a0a',
                color: '#fff',
                fontSize: '16px',
              }}
            />
          </div>
        )}

        {/* Recording Status */}
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: isRecording ? '#2a4a2a' : '#1a1a2e',
            border: `3px solid ${isRecording ? '#00ff00' : '#0f3460'}`,
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>
            {isRecording
              ? '🔴 RECORDING...'
              : recordedTrack
                ? '✅ TRACK RECORDED'
                : '⏸️ READY TO RECORD'}
          </div>
          <div style={{ color: '#00d4ff', fontSize: '12px' }}>
            {isRecording
              ? `Notes: ${currentTrackNotes.length}`
              : recordedTrack
                ? `${recordedTrack.notes.length} notes | ${recordedTrack.duration.toFixed(1)}s duration`
                : 'Press START RECORDING to begin'}
          </div>
        </div>

        {/* Instrument Selector */}
        <div style={{ marginBottom: '24px' }}>
          <InstrumentSelector
            onNotePlay={handleNotePlay}
            isRecording={isRecording}
            activeNotes={activeNotes}
            initialInstrument={currentInstrument}
          />
        </div>

        {/* Recording Controls */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isRecording && !recordedTrack && (
            <button
              onClick={startRecording}
              style={{
                padding: '16px 32px',
                borderRadius: '8px',
                border: '4px solid #000',
                background: 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #006600',
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              ▶️ START RECORDING
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={stopRecording}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '4px solid #000',
                  background: 'linear-gradient(180deg, #ff0064 0%, #cc0050 100%)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #660032',
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                ⏹️ STOP & SAVE
              </button>

              <button
                onClick={clearRecording}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '4px solid #000',
                  background: '#666',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #333',
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                🗑️ CLEAR
              </button>
            </>
          )}

          {recordedTrack && !isRecording && (
            <>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '4px solid #000',
                  background: title.trim()
                    ? 'linear-gradient(180deg, #4ecdc4 0%, #3ba89e 100%)'
                    : '#666',
                  color: title.trim() ? '#000' : '#999',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: title.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: title.trim() ? '0 4px 0 #2a7a72' : '0 4px 0 #333',
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                📤 POST CHALLENGE
              </button>

              <button
                onClick={clearRecording}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '4px solid #000',
                  background: '#ff6600',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #cc5200',
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                🔄 RECORD AGAIN
              </button>

              {onCancel && (
                <button
                  onClick={onCancel}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '8px',
                    border: '4px solid #000',
                    background: '#666',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 0 #333',
                    fontFamily: "'Press Start 2P', monospace",
                  }}
                >
                  ❌ CANCEL
                </button>
              )}
            </>
          )}
        </div>

        {/* Instructions */}
        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            background: '#0a0a0a',
            border: '2px solid #0f3460',
            borderRadius: '8px',
          }}
        >
          <h3
            style={{
              color: '#00d4ff',
              fontSize: '14px',
              marginBottom: '12px',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            📖 HOW IT WORKS:
          </h3>
          <ul style={{ color: '#fff', fontSize: '11px', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Choose your instrument (Drums, Piano, or Synth)</li>
            <li>Press START RECORDING and play a short loop (10-20 seconds)</li>
            <li>Press STOP & SAVE when done</li>
            <li>Add a catchy title for your challenge</li>
            <li>Press POST CHALLENGE to publish</li>
            <li>Others will try to replicate your rhythm and timing!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
