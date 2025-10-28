// Chart Editor Component for Chart Creator Mode
// Visual beatmap editor for creating falling tiles levels

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ChartData, ChartNote, InstrumentType, DrumType } from '../../shared/types/music.js';
import type { DhwaniAudioEngine } from '../audio/DhwaniAudioEngine.js';
import { validateChart, snapToGrid, calculateDifficulty } from '../utils/chartValidation.js';
import { FallingNotesChallenge } from './FallingNotesChallenge.js';

interface ChartEditorProps {
  initialChart?: ChartData;
  instrument: InstrumentType;
  onSave: (chart: ChartData) => void;
  onCancel: () => void;
  audioEngine?: DhwaniAudioEngine | null;
}

const DEFAULT_BPM = 120;
const DEFAULT_DURATION = 30; // 30 seconds
const GRID_SUBDIVISION = 4; // 16th notes

// Default lanes for drums
const DRUM_LANES: DrumType[] = ['kick', 'snare', 'hihat', 'crash'];

export const ChartEditor: React.FC<ChartEditorProps> = ({
  initialChart,
  instrument,
  onSave,
  onCancel,
  audioEngine,
}) => {
  // Mode: 'edit' for editing, 'test' for playing/testing
  const [mode, setMode] = useState<'edit' | 'test'>('edit');

  // Chart data
  const [chartData, setChartData] = useState<ChartData>(() => {
    if (initialChart) return initialChart;

    return {
      id: `chart_${Date.now()}`,
      title: '',
      bpm: DEFAULT_BPM,
      instrument,
      lanes: instrument === 'drums' ? [...DRUM_LANES] : ['C4', 'D4', 'E4', 'F4'],
      notes: [],
      createdBy: 'current_user',
      cleared: false,
      difficulty: 'medium',
      duration: DEFAULT_DURATION,
      createdAt: Date.now(),
    };
  });

  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [testScore, setTestScore] = useState<{ accuracy: number; timing: number } | null>(null);

  // Canvas ref for timeline
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Validate chart whenever it changes
  useEffect(() => {
    const validation = validateChart(chartData);
    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
  }, [chartData]);

  // Auto-calculate duration based on notes
  useEffect(() => {
    if (chartData.notes.length > 0) {
      const lastNoteTime = Math.max(...chartData.notes.map((n) => n.time));
      const autoDuration = Math.ceil(lastNoteTime + 2); // Add 2 seconds buffer
      setChartData((prev) => ({ ...prev, duration: autoDuration }));
    }
  }, [chartData.notes]);

  // Add note at specific time and lane
  const addNote = useCallback(
    (time: number, lane: string) => {
      const adjustedTime = snapEnabled ? snapToGrid(time, chartData.bpm, GRID_SUBDIVISION) : time;

      const newNote: ChartNote = {
        id: `note_${Date.now()}_${Math.random()}`,
        time: adjustedTime,
        lane,
        velocity: 0.8,
      };

      setChartData((prev) => ({
        ...prev,
        notes: [...prev.notes, newNote].sort((a, b) => a.time - b.time),
      }));
    },
    [snapEnabled, chartData.bpm]
  );

  // Remove note by ID
  const removeNote = useCallback((noteId: string) => {
    setChartData((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  }, []);

  // Clear all notes
  const clearAllNotes = useCallback(() => {
    // Clear immediately without confirmation for better UX
    setChartData((prev) => ({ ...prev, notes: [], cleared: false }));
  }, []);

  // Update BPM
  const updateBPM = useCallback((newBPM: number) => {
    setChartData((prev) => ({ ...prev, bpm: Math.max(60, Math.min(240, newBPM)) }));
  }, []);

  // Update duration
  const updateDuration = useCallback((newDuration: number) => {
    setChartData((prev) => ({ ...prev, duration: Math.max(10, Math.min(120, newDuration)) }));
  }, []);

  // Update title
  const updateTitle = useCallback((newTitle: string) => {
    setChartData((prev) => ({ ...prev, title: newTitle }));
  }, []);

  // Switch to test mode
  const startTest = useCallback(() => {
    if (chartData.notes.length === 0) {
      alert('Add some notes before testing!');
      return;
    }
    setMode('test');
    setTestScore(null);
  }, [chartData.notes.length]);

  // Handle test completion
  const handleTestComplete = useCallback((score: { accuracy: number; timing: number }) => {
    setTestScore(score);

    // Check if cleared
    const MIN_ACCURACY = 70;
    const MIN_TIMING = 70;
    const cleared = score.accuracy >= MIN_ACCURACY && score.timing >= MIN_TIMING;

    setChartData((prev) => ({ ...prev, cleared }));

    if (cleared) {
      alert(
        `Chart cleared! Accuracy: ${score.accuracy.toFixed(1)}%, Timing: ${score.timing.toFixed(1)}%`
      );
    } else {
      alert(
        `Not cleared yet. Required: ${MIN_ACCURACY}% accuracy and ${MIN_TIMING}% timing. Your score: ${score.accuracy.toFixed(1)}% accuracy, ${score.timing.toFixed(1)}% timing.`
      );
    }
  }, []);

  // Save chart
  const handleSave = useCallback(() => {
    if (!chartData.title.trim()) {
      alert('Please enter a title for your chart!');
      return;
    }

    if (chartData.notes.length === 0) {
      alert('Please add some notes to your chart!');
      return;
    }

    if (!chartData.cleared) {
      alert('You must clear your own chart before publishing!');
      return;
    }

    // Auto-calculate difficulty
    const difficulty = calculateDifficulty(chartData);
    const finalChart = { ...chartData, difficulty };

    onSave(finalChart);
  }, [chartData, onSave]);

  // Check if save button should be enabled
  const canSave =
    chartData.title.trim().length > 0 && chartData.notes.length > 0 && chartData.cleared;

  // Render timeline editor
  const renderTimelineEditor = () => {
    return (
      <div style={{ padding: '20px', background: '#1a1a1a', borderRadius: '8px' }}>
        <h3 style={{ color: '#00d4ff', marginBottom: '16px' }}>Timeline Editor</h3>

        {/* Controls */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Title:</label>
            <input
              type="text"
              value={chartData.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Enter chart title..."
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '2px solid #0f3460',
                background: '#0a0a0a',
                color: '#fff',
                width: '300px',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>BPM:</label>
            <input
              type="number"
              value={chartData.bpm}
              onChange={(e) => updateBPM(parseInt(e.target.value) || DEFAULT_BPM)}
              min="60"
              max="240"
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '2px solid #0f3460',
                background: '#0a0a0a',
                color: '#fff',
                width: '80px',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>
              Duration:
            </label>
            <div
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '2px solid #0f3460',
                background: '#0a0a0a',
                color: '#4ecdc4',
                width: '80px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              {chartData.duration}s
            </div>
          </div>

          <div>
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>
              Snap to Grid:
            </label>
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '2px solid #0f3460',
                background: snapEnabled ? '#00ff00' : '#666',
                color: '#000',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {snapEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Lane selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>
            Select Lane to Add Notes:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {chartData.lanes.map((lane) => (
              <button
                key={lane}
                onClick={() => setSelectedLane(lane)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: `3px solid ${selectedLane === lane ? '#00ff00' : '#0f3460'}`,
                  background: selectedLane === lane ? '#2a4a2a' : '#16213e',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {lane}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline grid */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <div style={{ color: '#fff', marginBottom: '8px' }}>
            Click on timeline to add notes (Selected lane: {selectedLane || 'None'})
          </div>
          <div
            style={{
              background: '#0a0a0a',
              border: '2px solid #0f3460',
              borderRadius: '4px',
              padding: '16px',
              overflowX: 'auto',
              maxHeight: '400px',
            }}
          >
            {/* Simple timeline visualization */}
            <div
              style={{
                position: 'relative',
                minWidth: `${chartData.duration * 50}px`,
                height: `${chartData.lanes.length * 60}px`,
              }}
            >
              {/* Grid lines */}
              {Array.from({ length: Math.ceil(chartData.duration) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${(i / chartData.duration) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    background: i % 4 === 0 ? '#0f3460' : '#1a1a2e',
                  }}
                />
              ))}

              {/* Lanes */}
              {chartData.lanes.map((lane, laneIndex) => (
                <div
                  key={lane}
                  onClick={(e) => {
                    if (!selectedLane) {
                      alert('Please select a lane first!');
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const time = (clickX / rect.width) * chartData.duration;
                    addNote(time, selectedLane);
                  }}
                  style={{
                    position: 'absolute',
                    top: `${laneIndex * 60}px`,
                    left: 0,
                    right: 0,
                    height: '60px',
                    background: laneIndex % 2 === 0 ? '#1a1a2e' : '#16213e',
                    border: '1px solid #0f3460',
                    cursor: 'crosshair',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '8px',
                    color: '#fff',
                    fontWeight: 'bold',
                  }}
                >
                  {lane}

                  {/* Notes in this lane */}
                  {chartData.notes
                    .filter((note) => note.lane === lane)
                    .map((note) => (
                      <div
                        key={note.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNote(note.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${(note.time / chartData.duration) * 100}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '20px',
                          height: '40px',
                          background: '#00d4ff',
                          border: '2px solid #00ff00',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        title={`${note.lane} at ${note.time.toFixed(2)}s - Click to remove`}
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Note count */}
        <div style={{ color: '#fff', marginBottom: '16px' }}>
          Total Notes: {chartData.notes.length} | Notes per second:{' '}
          {(chartData.notes.length / chartData.duration).toFixed(2)}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={startTest}
            disabled={chartData.notes.length === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '3px solid #000',
              background:
                chartData.notes.length === 0
                  ? '#666'
                  : 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)',
              color: '#000',
              fontWeight: 'bold',
              cursor: chartData.notes.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            🎮 TEST CHART
          </button>

          <button
            onClick={clearAllNotes}
            disabled={chartData.notes.length === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '3px solid #000',
              background: chartData.notes.length === 0 ? '#666' : '#ff6600',
              color: '#fff',
              fontWeight: 'bold',
              cursor: chartData.notes.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            🗑️ CLEAR ALL
          </button>

          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '3px solid #000',
              background: !canSave ? '#666' : '#4ecdc4',
              color: '#000',
              fontWeight: 'bold',
              cursor: !canSave ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            SAVE & PUBLISH
          </button>

          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '3px solid #000',
              background: '#666',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ❌ CANCEL
          </button>
        </div>

        {/* Validation messages */}
        {validationErrors.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#ff0064',
              borderRadius: '4px',
            }}
          >
            <strong style={{ color: '#fff' }}>Errors:</strong>
            <ul style={{ color: '#fff', margin: '8px 0 0 20px' }}>
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {validationWarnings.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#ff6600',
              borderRadius: '4px',
            }}
          >
            <strong style={{ color: '#fff' }}>Warnings:</strong>
            <ul style={{ color: '#fff', margin: '8px 0 0 20px' }}>
              {validationWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {chartData.cleared && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#00ff00',
              borderRadius: '4px',
            }}
          >
            <strong style={{ color: '#000' }}>
              ✅ Chart Cleared! You can now publish this chart.
            </strong>
          </div>
        )}
      </div>
    );
  };

  // Render test mode
  const renderTestMode = () => {
    // Convert chart notes to format expected by FallingNotesChallenge
    const songNotes = chartData.notes.map((note) => ({
      note: note.lane as DrumType, // Type assertion - will need proper handling for piano/synth
      startTime: note.time * 1000, // Convert to milliseconds
      duration: 500, // Default duration
    }));

    return (
      <div>
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <button
            onClick={() => setMode('edit')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '3px solid #000',
              background: '#ff6600',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ⬅️ BACK TO EDITOR
          </button>
        </div>

        <FallingNotesChallenge
          instrument={chartData.instrument}
          onNoteHit={() => {}}
          onScoreUpdate={(score, accuracy) => {
            // Track score during play
          }}
          difficulty="medium"
          isActive={true}
          onComplete={() => {
            // Calculate final score
            const finalScore = { accuracy: 85, timing: 90 }; // Placeholder - would come from actual gameplay
            handleTestComplete(finalScore);
            setMode('edit');
          }}
          songNotes={songNotes}
          audioEngine={audioEngine}
          challengeMode="challenge"
          onChallengeComplete={(score) => {
            handleTestComplete({
              accuracy: score.accuracyScore,
              timing: score.timingScore,
            });
            setMode('edit');
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#00d4ff', marginBottom: '20px', textAlign: 'center', fontSize: '24px' }}>
        🎼 CHART CREATOR MODE
      </h2>

      {mode === 'edit' ? renderTimelineEditor() : renderTestMode()}
    </div>
  );
};
