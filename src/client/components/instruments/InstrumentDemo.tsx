import React, { useState, useCallback } from 'react';
import type { InstrumentType } from '../../../shared/types/music.js';
import { InstrumentSelector } from './InstrumentSelector.js';

/**
 * Demo component showing how to use the InstrumentSelector
 * This can be used as a reference for integrating instruments into the main app
 */
export const InstrumentDemo: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [recordedNotes, setRecordedNotes] = useState<
    Array<{
      instrument: InstrumentType;
      note: string;
      velocity: number;
      timestamp: number;
    }>
  >([]);

  const handleNotePlay = useCallback(
    (instrument: InstrumentType, note: string, velocity: number) => {
      console.log(`Playing ${instrument}: ${note} (velocity: ${velocity})`);

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
        setRecordedNotes((prev) => [
          ...prev,
          {
            instrument,
            note,
            velocity,
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [isRecording]
  );

  const toggleRecording = () => {
    if (isRecording) {
      console.log('Stopped recording. Recorded notes:', recordedNotes);
    } else {
      setRecordedNotes([]);
      console.log('Started recording...');
    }
    setIsRecording(!isRecording);
  };

  const clearRecording = () => {
    setRecordedNotes([]);
    console.log('Cleared recording');
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        color: 'white',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            marginBottom: '8px',
            color: '#fff',
          }}
        >
          Dhwani Instrument Demo
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#888',
            marginBottom: '20px',
          }}
        >
          Test the instrument interfaces and recording functionality
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={toggleRecording}
            style={{
              padding: '12px 24px',
              backgroundColor: isRecording ? '#ff4444' : '#44ff44',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
          </button>

          <button
            onClick={clearRecording}
            disabled={recordedNotes.length === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: recordedNotes.length === 0 ? '#555' : '#666',
              color: recordedNotes.length === 0 ? '#888' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: recordedNotes.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🗑 Clear ({recordedNotes.length})
          </button>
        </div>
      </div>

      <InstrumentSelector
        onNotePlay={handleNotePlay}
        isRecording={isRecording}
        activeNotes={activeNotes}
        initialInstrument="drums"
      />

      {recordedNotes.length > 0 && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            maxWidth: '800px',
            margin: '24px auto 0',
          }}
        >
          <h3 style={{ marginBottom: '12px', color: '#fff' }}>
            Recorded Notes ({recordedNotes.length})
          </h3>
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {recordedNotes.slice(-10).map((note, index) => (
              <div
                key={index}
                style={{
                  padding: '4px 0',
                  borderBottom: '1px solid #333',
                  color: '#ccc',
                }}
              >
                {note.instrument}: {note.note} (v:{note.velocity.toFixed(2)})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
