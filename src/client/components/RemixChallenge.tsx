// Remix Challenge Component
// Allows users to create a remix/variation of an existing challenge

import React, { useState, useCallback, useEffect } from 'react';
import type { TrackData, InstrumentType, CompositionData } from '../../shared/types/music.js';
import { InstrumentSelector } from './instruments/InstrumentSelector.js';
import { DhwaniAudioEngine } from '../audio/DhwaniAudioEngine.js';

interface RemixChallengeProps {
  parentPostId: string;
  parentComposition: CompositionData;
  onRemixCreate: (track: TrackData, title: string, parentPostId: string) => void;
  onCancel: () => void;
}

export const RemixChallenge: React.FC<RemixChallengeProps> = ({
  parentPostId,
  parentComposition,
  onRemixCreate,
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
  const [audioEngine, setAudioEngine] = useState<DhwaniAudioEngine | null>(null);

  // Initialize audio engine
  useEffect(() => {
    const engine = new DhwaniAudioEngine();
    engine.initialize().then(() => {
      setAudioEngine(engine);
    });

    return () => {
      engine.dispose();
    };
  }, []);

  // Handle note play during recording
  const handleNotePlay = useCallback(
    (instrument: InstrumentType, note: string, velocity: number) => {
      // Update current instrument if it changed
      if (instrument !== currentInstrument) {
        setCurrentInstrument(instrument);
      }

      // Play audio
      if (audioEngine) {
        audioEngine.playNote(instrument, note, velocity);
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
    [isRecording, recordingStartTime, currentInstrument, audioEngine]
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

  // Save and publish remix
  const handleSave = useCallback(() => {
    if (!recordedTrack) {
      alert('Please record a track first!');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title for your remix!');
      return;
    }

    onRemixCreate(recordedTrack, title, parentPostId);
  }, [recordedTrack, title, parentPostId, onRemixCreate]);

  const parentTitle = parentComposition.metadata.title || 'Untitled Challenge';
  const parentAuthor = parentComposition.metadata.collaborators[0] || 'Unknown';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          borderRadius: '16px',
          padding: '32px',
          border: '4px solid #00d4ff',
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)',
        }}
      >
        <h2
          style={{
            color: '#00d4ff',
            fontSize: '28px',
            marginBottom: '16px',
            textAlign: 'center',
            fontFamily: "'Press Start 2P', monospace",
            textShadow: '0 0 10px #00d4ff',
          }}
        >
          🔄 REMIX CHALLENGE
        </h2>

        {/* Parent Challenge Info */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '2px solid rgba(0, 212, 255, 0.3)',
          }}
        >
          <p
            style={{
              color: '#fff',
              fontSize: '12px',
              marginBottom: '8px',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            REMIXING:
          </p>
          <p
            style={{
              color: '#00d4ff',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            "{parentTitle}"
          </p>
          <p
            style={{
              color: '#aaa',
              fontSize: '12px',
              marginTop: '4px',
            }}
          >
            by u/{parentAuthor}
          </p>
        </div>

        <p
          style={{
            color: '#fff',
            textAlign: 'center',
            marginBottom: '32px',
            fontSize: '12px',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          CREATE YOUR OWN VARIATION - ADD YOUR TWIST!
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
              Remix Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Remix of "${parentTitle}"`}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #00d4ff',
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
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          {isRecording ? (
            <div>
              <div
                style={{
                  fontSize: '24px',
                  marginBottom: '8px',
                  animation: 'pulse 1s infinite',
                }}
              >
                🔴 RECORDING...
              </div>
              <p style={{ color: '#fff', fontSize: '14px' }}>
                Notes recorded: {currentTrackNotes.length}
              </p>
            </div>
          ) : recordedTrack ? (
            <div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅ READY TO PUBLISH</div>
              <p style={{ color: '#fff', fontSize: '14px' }}>
                {recordedTrack.notes.length} notes | {recordedTrack.duration.toFixed(1)}s |{' '}
                {recordedTrack.instrument}
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏸️ READY</div>
              <p style={{ color: '#fff', fontSize: '14px' }}>Click "Start Recording" to begin</p>
            </div>
          )}
        </div>

        {/* Instrument Selector */}
        <div style={{ marginBottom: '24px' }}>
          <h3
            style={{
              color: '#00d4ff',
              fontSize: '16px',
              marginBottom: '16px',
              textAlign: 'center',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            CHOOSE YOUR INSTRUMENT
          </h3>
          <InstrumentSelector
            onNotePlay={handleNotePlay}
            isRecording={isRecording}
            activeNotes={activeNotes}
            initialInstrument={currentInstrument}
          />
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {!isRecording && !recordedTrack && (
            <button
              onClick={startRecording}
              style={{
                flex: 1,
                padding: '16px',
                background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                border: '3px solid #000',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #000',
              }}
            >
              ▶ START RECORDING
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              style={{
                flex: 1,
                padding: '16px',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #cc0000 100%)',
                border: '3px solid #000',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #000',
              }}
            >
              ⏹ STOP RECORDING
            </button>
          )}

          {recordedTrack && (
            <>
              <button
                onClick={clearRecording}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #666 0%, #444 100%)',
                  border: '3px solid #000',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #000',
                }}
              >
                🗑️ CLEAR
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 2,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                  border: '3px solid #000',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #000',
                }}
              >
                🚀 PUBLISH REMIX
              </button>
            </>
          )}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '2px solid #666',
            borderRadius: '8px',
            color: '#999',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ← BACK TO CHALLENGE
        </button>

        {/* Instructions */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            border: '2px solid rgba(0, 212, 255, 0.2)',
          }}
        >
          <h4
            style={{
              color: '#00d4ff',
              fontSize: '12px',
              marginBottom: '12px',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            HOW TO REMIX:
          </h4>
          <ul
            style={{
              color: '#fff',
              fontSize: '11px',
              lineHeight: '1.8',
              paddingLeft: '20px',
            }}
          >
            <li>Record your own variation of the original challenge</li>
            <li>Use the same or different instrument</li>
            <li>Add your own style and creativity</li>
            <li>Your remix will be linked to the original</li>
            <li>Others can try your remix as a new challenge!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
