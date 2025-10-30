// Chart Editor Component for Chart Creator Mode
// Visual beatmap editor for creating falling tiles levels

import React, { useState, useCallback, useEffect, useRef } from 'react';
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

// Generate a demo chart with accurate timing
const generateDemoChart = (instrument: InstrumentType, bpm: number): ChartNote[] => {
  const beatDuration = 60 / bpm;
  const notes: ChartNote[] = [];

  if (instrument === 'drums') {
    // Keep your existing drum groove — it’s fine
    for (let bar = 0; bar < 8; bar++) {
      notes.push({
        id: `kick_${bar}_1`,
        time: (bar * 4 + 0) * beatDuration,
        lane: 'kick',
        velocity: 0.9,
      });
      notes.push({
        id: `kick_${bar}_3`,
        time: (bar * 4 + 2) * beatDuration,
        lane: 'kick',
        velocity: 0.85,
      });
      notes.push({
        id: `snare_${bar}_2`,
        time: (bar * 4 + 1) * beatDuration,
        lane: 'snare',
        velocity: 0.9,
      });
      notes.push({
        id: `snare_${bar}_4`,
        time: (bar * 4 + 3) * beatDuration,
        lane: 'snare',
        velocity: 0.9,
      });
      for (let beat = 0; beat < 4; beat++) {
        notes.push({
          id: `hihat_${bar}_${beat}`,
          time: (bar * 4 + beat) * beatDuration,
          lane: 'hihat',
          velocity: 0.7,
        });
      }
    }
  } else {
    // "Twinkle Twinkle Little Star" melody pattern
    const melody = [
      'C4',
      'C4',
      'G4',
      'G4',
      'A4',
      'A4',
      'G4',
      'F4',
      'F4',
      'E4',
      'E4',
      'D4',
      'D4',
      'C4',
      'G4',
      'G4',
      'F4',
      'F4',
      'E4',
      'E4',
      'D4',
      'G4',
      'G4',
      'F4',
      'F4',
      'E4',
      'E4',
      'D4',
      'C4',
      'C4',
      'G4',
      'G4',
      'A4',
      'A4',
      'G4',
    ];

    melody.forEach((note, i) => {
      notes.push({
        id: `song_${note}_${i}`,
        time: i * beatDuration,
        lane: note,
        velocity: 0.85,
      });
    });
  }

  return notes;
};

export const ChartEditor: React.FC<ChartEditorProps> = ({
  initialChart,
  instrument,
  onSave,
  onCancel,
  audioEngine,
}) => {
  // Mode: 'edit' for editing, 'test' for playing/testing, 'completed' for showing results
  const [mode, setMode] = useState<'edit' | 'test' | 'completed'>('edit');
  const [testResult, setTestResult] = useState<{
    score: { accuracy: number; timing: number };
    cleared: boolean;
  } | null>(null);

  // Track current challenge score for timeout scenarios
  const currentChallengeScoreRef = useRef<{ accuracy: number; timing: number } | null>(null);

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

      // Check for overlapping notes in the same lane
      const OVERLAP_THRESHOLD = 0.1; // 100ms threshold
      const hasOverlap = chartData.notes.some(
        (note) => note.lane === lane && Math.abs(note.time - adjustedTime) < OVERLAP_THRESHOLD
      );

      if (hasOverlap) {
        alert(`Cannot place note: Another note already exists in lane "${lane}" at this time!`);
        return;
      }

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
    [snapEnabled, chartData.bpm, chartData.notes]
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

  // Load demo chart
  const loadDemo = useCallback(() => {
    const demoNotes = generateDemoChart(chartData.instrument, chartData.bpm);
    const difficulty = calculateDifficulty({ ...chartData, notes: demoNotes });
    setChartData((prev) => ({
      ...prev,
      title: prev.title || 'Demo Chart',
      notes: demoNotes,
      cleared: false,
      difficulty,
    }));
  }, [chartData]);

  // Update BPM
  const updateBPM = useCallback((newBPM: number) => {
    setChartData((prev) => ({ ...prev, bpm: Math.max(60, Math.min(240, newBPM)) }));
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
    // Reset score when starting new test
    currentChallengeScoreRef.current = null;
    setMode('test');
  }, [chartData.notes.length]);

  // Handle test completion
  const handleTestComplete = useCallback((score: { accuracy: number; timing: number }) => {
    // Check if cleared - only check accuracy, timing is not used
    const MIN_ACCURACY = 70;
    const cleared = score.accuracy >= MIN_ACCURACY;

    setChartData((prev) => ({ ...prev, cleared }));
    setTestResult({ score, cleared });
    setMode('completed');
  }, []);

  // Force end test mode with timeout
  const forceEndTest = useCallback(() => {
    console.log('ChartEditor: Force ending test mode due to timeout');
    console.log('ChartEditor: Current challenge score:', currentChallengeScoreRef.current);

    // Use the actual score if available, otherwise fallback
    const scoreToUse = currentChallengeScoreRef.current || { accuracy: 60, timing: 65 };
    console.log('ChartEditor: Using score:', scoreToUse);
    handleTestComplete(scoreToUse);
  }, [handleTestComplete]);

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
            {chartData.lanes.map((lane) => {
              const isSelected = selectedLane === lane;
              return (
                <button
                  key={lane}
                  onClick={() => setSelectedLane(lane)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `3px solid ${isSelected ? '#00ff00' : '#0f3460'}`,
                    background: isSelected
                      ? 'linear-gradient(135deg, #2a4a2a 0%, #1a3a1a 100%)'
                      : '#16213e',
                    color: isSelected ? '#00ff00' : '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    boxShadow: isSelected
                      ? '0 0 15px rgba(0, 255, 0, 0.4), inset 0 0 10px rgba(0, 255, 0, 0.1)'
                      : 'none',
                    textShadow: isSelected ? '0 0 5px #00ff00' : 'none',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '16px',
                        height: '16px',
                        background: '#00ff00',
                        borderRadius: '50%',
                        animation: 'pulse 1.5s infinite',
                        boxShadow: '0 0 8px #00ff00',
                      }}
                    />
                  )}
                  {lane}
                  {isSelected && ' ✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline grid */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <div style={{ color: '#fff', marginBottom: '8px' }}>
            Click on timeline to add notes (Selected lane: {selectedLane || 'None'})
            <br />
            <span style={{ color: '#00d4ff', fontSize: '12px' }}>
              💡 Use the time scale above to place notes precisely!
            </span>
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
                height: `${chartData.lanes.length * 60 + 30}px`, // Extra space for scale
              }}
            >
              {/* Time scale/ruler */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '30px',
                  background: '#0a0a0a',
                  borderBottom: '2px solid #0f3460',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {Array.from({ length: Math.ceil(chartData.duration) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${(i / chartData.duration) * 100}%`,
                      transform: 'translateX(-50%)',
                      color: '#00d4ff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textShadow: '1px 1px 0 #000',
                    }}
                  >
                    {i}s
                  </div>
                ))}
                {/* Sub-second markers */}
                {Array.from({ length: Math.ceil(chartData.duration) * 4 }).map((_, i) => {
                  const time = i * 0.25;
                  if (time > chartData.duration) return null;
                  return (
                    <div
                      key={`sub-${i}`}
                      style={{
                        position: 'absolute',
                        left: `${(time / chartData.duration) * 100}%`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '1px',
                        height: i % 4 === 0 ? '15px' : '8px',
                        background: i % 4 === 0 ? '#00d4ff' : '#0f3460',
                      }}
                    />
                  );
                })}
              </div>

              {/* Grid lines */}
              {Array.from({ length: Math.ceil(chartData.duration) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${(i / chartData.duration) * 100}%`,
                    top: '30px', // Start below the scale
                    bottom: 0,
                    width: '1px',
                    background: i % 4 === 0 ? '#0f3460' : '#1a1a2e',
                  }}
                />
              ))}

              {/* Lanes */}
              {chartData.lanes.map((lane, laneIndex) => {
                const isActiveTrack = selectedLane === lane;
                return (
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
                      top: `${30 + laneIndex * 60}px`, // Start below the scale
                      left: 0,
                      right: 0,
                      height: '60px',
                      background: isActiveTrack
                        ? 'linear-gradient(90deg, #2a4a2a 0%, #1a3a1a 100%)'
                        : laneIndex % 2 === 0
                          ? '#1a1a2e'
                          : '#16213e',
                      border: isActiveTrack ? '3px solid #00ff00' : '1px solid #0f3460',
                      cursor: 'crosshair',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '8px',
                      color: isActiveTrack ? '#00ff00' : '#fff',
                      fontWeight: 'bold',
                      boxShadow: isActiveTrack
                        ? '0 0 15px rgba(0, 255, 0, 0.3), inset 0 0 10px rgba(0, 255, 0, 0.1)'
                        : 'none',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isActiveTrack && (
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            background: '#00ff00',
                            borderRadius: '50%',
                            animation: 'pulse 1.5s infinite',
                            boxShadow: '0 0 8px #00ff00',
                          }}
                        />
                      )}
                      <span
                        style={{
                          textShadow: isActiveTrack ? '0 0 5px #00ff00' : 'none',
                          fontSize: isActiveTrack ? '16px' : '14px',
                        }}
                      >
                        {lane}
                        {isActiveTrack && ' ← ACTIVE'}
                      </span>
                    </div>

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
                );
              })}
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
            onClick={() => {
              setChartData((prev) => ({ ...prev, cleared: false }));
              alert('Level cleared status reset! You can now test and clear the level again.');
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '3px solid #000',
              background: '#ffff00',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            🔄 RESET CLEAR STATUS
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

  // Set up timeout for test mode
  useEffect(() => {
    if (mode === 'test') {
      const timeout = setTimeout(
        () => {
          console.log('ChartEditor: Test timeout reached, forcing completion');
          forceEndTest();
        },
        (chartData.duration + 5) * 1000
      ); // Duration + 5 seconds buffer

      return () => clearTimeout(timeout);
    }
  }, [mode, chartData.duration, forceEndTest]);

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

        <div style={{ textAlign: 'center', marginBottom: '16px', color: '#fff' }}>
          <h3>Testing Chart: {chartData.title || 'Untitled'}</h3>
          <p>
            Duration: {chartData.duration}s | Notes: {chartData.notes.length}
          </p>
        </div>

        <FallingNotesChallenge
          instrument={chartData.instrument}
          onNoteHit={() => {}}
          onScoreUpdate={(score, accuracy) => {
            // Track score during play - store latest for timeout scenarios
            // This gives us a fallback if timeout happens before onChallengeComplete
            if (score !== undefined && accuracy !== undefined) {
              currentChallengeScoreRef.current = {
                accuracy: accuracy,
                timing: 0, // Timing not available from onScoreUpdate, will be 0
              };
            }
          }}
          difficulty="medium"
          isActive={true}
          onComplete={() => {
            // This will be called when the challenge naturally ends
            console.log('ChartEditor: Challenge completed, waiting for onChallengeComplete');
            // Don't call handleTestComplete here - let onChallengeComplete handle it
            // This prevents using the hardcoded fallback score
          }}
          songNotes={songNotes}
          audioEngine={audioEngine || null}
          challengeMode="challenge"
          onChallengeComplete={(score) => {
            console.log('ChartEditor: Challenge completed with score:', score);
            const finalScore = {
              accuracy: score.accuracyScore,
              timing: score.timingScore,
            };
            // Store score for potential timeout use
            currentChallengeScoreRef.current = finalScore;
            // Call handleTestComplete with the actual score
            handleTestComplete(finalScore);
          }}
        />
      </div>
    );
  };

  // Render completion screen
  const renderCompletionScreen = () => {
    if (!testResult) return null;

    const { score, cleared } = testResult;
    const MIN_ACCURACY = 70;

    return (
      <div
        style={{ padding: '40px', background: '#1a1a1a', borderRadius: '8px', textAlign: 'center' }}
      >
        <h2
          style={{ color: cleared ? '#00ff00' : '#ff6600', marginBottom: '20px', fontSize: '28px' }}
        >
          {cleared ? '🎉 CHART CLEARED!' : '❌ CHART NOT CLEARED'}
        </h2>

        <div style={{ marginBottom: '30px' }}>
          <div style={{ color: '#fff', fontSize: '18px', marginBottom: '10px' }}>
            Your Performance:
          </div>
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}
          >
            <div style={{ color: '#00d4ff', fontSize: '24px', fontWeight: 'bold' }}>
              Accuracy: {score.accuracy.toFixed(1)}%
            </div>
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>Required: {MIN_ACCURACY}% accuracy</div>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {cleared ? (
            <>
              <button
                onClick={() => {
                  handleSave();
                  setMode('edit');
                  setTestResult(null);
                }}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '3px solid #000',
                  background: 'linear-gradient(180deg, #00ff00 0%, #00cc00 100%)',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✅ SUBMIT & PUBLISH
              </button>
              <button
                onClick={() => {
                  setMode('edit');
                  setTestResult(null);
                }}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '3px solid #000',
                  background: '#4ecdc4',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                📝 BACK TO EDITOR
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setMode('test');
                  setTestResult(null);
                }}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '3px solid #000',
                  background: 'linear-gradient(180deg, #ff6600 0%, #ff4400 100%)',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                🔄 RETRY TEST
              </button>
              <button
                onClick={() => {
                  setMode('edit');
                  setTestResult(null);
                }}
                style={{
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: '3px solid #000',
                  background: '#666',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                📝 BACK TO EDITOR
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
      <h2 style={{ color: '#00d4ff', marginBottom: '20px', textAlign: 'center', fontSize: '24px' }}>
        🎼 CHART CREATOR MODE
      </h2>

      {mode === 'edit'
        ? renderTimelineEditor()
        : mode === 'test'
          ? renderTestMode()
          : renderCompletionScreen()}
    </div>
  );
};
