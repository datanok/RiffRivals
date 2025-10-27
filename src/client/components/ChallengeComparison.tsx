// Challenge comparison component for side-by-side analysis
// Shows original vs user recording with detailed comparison

import React, { useState } from 'react';
import type { TrackData, NoteEvent } from '../../shared/types/music.js';
import { PlaybackEngine } from './PlaybackEngine.js';
import { getScoreColor } from '../utils/challengeScoring.js';

type ChallengeComparisonProps = {
  originalTrack: TrackData;
  userRecording: TrackData;
  scoreBreakdown: {
    noteAccuracy: number;
    timingAccuracy: number;
    velocityAccuracy: number;
    overallScore: number;
    correctNotes: number;
    missedNotes: number;
    extraNotes: number;
    timingErrors: number[];
    velocityErrors: number[];
  };
};

type ComparisonMode = 'side-by-side' | 'overlay' | 'notes-only';

export const ChallengeComparison: React.FC<ChallengeComparisonProps> = ({
  originalTrack,
  userRecording,
  scoreBreakdown,
}) => {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number): string => {
    return `${Math.round(seconds * 1000)}ms`;
  };

  const getNoteComparison = () => {
    const comparison: Array<{
      original?: NoteEvent;
      recorded?: NoteEvent;
      status: 'correct' | 'missed' | 'extra' | 'timing-off' | 'velocity-off';
      timingDiff?: number;
      velocityDiff?: number;
    }> = [];

    // Create maps for easier lookup
    const originalNoteMap = new Map<string, NoteEvent[]>();
    originalTrack.notes.forEach((note) => {
      if (!originalNoteMap.has(note.note)) {
        originalNoteMap.set(note.note, []);
      }
      originalNoteMap.get(note.note)!.push(note);
    });

    const recordedNoteMap = new Map<string, NoteEvent[]>();
    userRecording.notes.forEach((note) => {
      if (!recordedNoteMap.has(note.note)) {
        recordedNoteMap.set(note.note, []);
      }
      recordedNoteMap.get(note.note)!.push(note);
    });

    const matchedRecordedIndices = new Set<number>();
    const timingTolerance = 0.1; // 100ms tolerance

    // Process original notes
    originalTrack.notes.forEach((originalNote) => {
      const recordedNotesForPitch = recordedNoteMap.get(originalNote.note) || [];
      let bestMatch: { note: NoteEvent; index: number; timeDiff: number } | null = null;

      // Find closest unmatched recorded note
      recordedNotesForPitch.forEach((recordedNote) => {
        const globalIndex = userRecording.notes.findIndex(
          (n, i) => n === recordedNote && !matchedRecordedIndices.has(i)
        );

        if (globalIndex === -1) return;

        const timeDiff = Math.abs(originalNote.startTime - recordedNote.startTime);
        if (!bestMatch || timeDiff < bestMatch.timeDiff) {
          bestMatch = { note: recordedNote, index: globalIndex, timeDiff };
        }
      });

      if (bestMatch && bestMatch.timeDiff <= timingTolerance) {
        matchedRecordedIndices.add(bestMatch.index);
        const velocityDiff = Math.abs(originalNote.velocity - bestMatch.note.velocity);

        let status: 'correct' | 'timing-off' | 'velocity-off' = 'correct';
        if (bestMatch.timeDiff > timingTolerance * 0.5) {
          status = 'timing-off';
        } else if (velocityDiff > 0.2) {
          status = 'velocity-off';
        }

        comparison.push({
          original: originalNote,
          recorded: bestMatch.note,
          status,
          timingDiff: bestMatch.timeDiff,
          velocityDiff,
        });
      } else {
        comparison.push({
          original: originalNote,
          status: 'missed',
        });
      }
    });

    // Process unmatched recorded notes (extra notes)
    userRecording.notes.forEach((recordedNote, index) => {
      if (!matchedRecordedIndices.has(index)) {
        comparison.push({
          recorded: recordedNote,
          status: 'extra',
        });
      }
    });

    return comparison.sort((a, b) => {
      const aTime = a.original?.startTime || a.recorded?.startTime || 0;
      const bTime = b.original?.startTime || b.recorded?.startTime || 0;
      return aTime - bTime;
    });
  };

  const noteComparison = getNoteComparison();

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'correct':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'missed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'extra':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'timing-off':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'velocity-off':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'correct':
        return '✅';
      case 'missed':
        return '❌';
      case 'extra':
        return '➕';
      case 'timing-off':
        return '⏰';
      case 'velocity-off':
        return '🔊';
      default:
        return '❓';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'correct':
        return 'Correct';
      case 'missed':
        return 'Missed';
      case 'extra':
        return 'Extra Note';
      case 'timing-off':
        return 'Timing Off';
      case 'velocity-off':
        return 'Velocity Off';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-900">Recording Comparison</h3>

        {/* Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setComparisonMode('side-by-side')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              comparisonMode === 'side-by-side'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setComparisonMode('overlay')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              comparisonMode === 'overlay'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Overlay
          </button>
          <button
            onClick={() => setComparisonMode('notes-only')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              comparisonMode === 'notes-only'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Notes Only
          </button>
        </div>
      </div>

      {/* Playback Comparison */}
      {comparisonMode !== 'notes-only' && (
        <div className="space-y-4">
          {comparisonMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-800">Original Track</h4>
                  <span className="text-sm text-gray-600">
                    ({originalTrack.notes.length} notes, {formatDuration(originalTrack.duration)})
                  </span>
                </div>
                <PlaybackEngine
                  tracks={[originalTrack]}
                  onPlaybackStateChange={() => {}}
                  visualFeedback={true}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-800">Your Recording</h4>
                  <span className="text-sm text-gray-600">
                    ({userRecording.notes.length} notes, {formatDuration(userRecording.duration)})
                  </span>
                </div>
                <PlaybackEngine
                  tracks={[userRecording]}
                  onPlaybackStateChange={() => {}}
                  visualFeedback={true}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-800">Overlay Comparison</h4>
                <span className="text-sm text-gray-600">(Both tracks playing together)</span>
              </div>
              <PlaybackEngine
                tracks={[originalTrack, userRecording]}
                onPlaybackStateChange={() => {}}
                visualFeedback={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Note-by-Note Analysis */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800">Note Analysis</h4>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-2xl font-bold text-green-600">{scoreBreakdown.correctNotes}</div>
            <div className="text-sm text-green-700">Correct</div>
          </div>
          <div className="text-center p-3 bg-red-50 border border-red-200 rounded">
            <div className="text-2xl font-bold text-red-600">{scoreBreakdown.missedNotes}</div>
            <div className="text-sm text-red-700">Missed</div>
          </div>
          <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded">
            <div className="text-2xl font-bold text-orange-600">{scoreBreakdown.extraNotes}</div>
            <div className="text-sm text-orange-700">Extra</div>
          </div>
          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
            <div className={`text-2xl font-bold ${getScoreColor(scoreBreakdown.overallScore)}`}>
              {scoreBreakdown.overallScore}%
            </div>
            <div className="text-sm text-blue-700">Score</div>
          </div>
        </div>

        {/* Detailed Note List */}
        {showDetails && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {noteComparison.map((comparison, index) => (
              <div
                key={index}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedNoteIndex === index ? 'ring-2 ring-blue-500' : ''
                } ${getStatusColor(comparison.status)}`}
                onClick={() => setSelectedNoteIndex(selectedNoteIndex === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getStatusIcon(comparison.status)}</span>
                    <div>
                      <div className="font-medium">
                        {comparison.original?.note || comparison.recorded?.note}
                      </div>
                      <div className="text-sm opacity-75">{getStatusLabel(comparison.status)}</div>
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    {comparison.original && (
                      <div>Original: {formatTime(comparison.original.startTime)}</div>
                    )}
                    {comparison.recorded && (
                      <div>Recorded: {formatTime(comparison.recorded.startTime)}</div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedNoteIndex === index && (
                  <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {comparison.original && (
                        <div>
                          <h6 className="font-medium mb-1">Original Note</h6>
                          <div>Time: {formatTime(comparison.original.startTime)}</div>
                          <div>Duration: {formatTime(comparison.original.duration)}</div>
                          <div>Velocity: {Math.round(comparison.original.velocity * 100)}%</div>
                        </div>
                      )}

                      {comparison.recorded && (
                        <div>
                          <h6 className="font-medium mb-1">Your Note</h6>
                          <div>Time: {formatTime(comparison.recorded.startTime)}</div>
                          <div>Duration: {formatTime(comparison.recorded.duration)}</div>
                          <div>Velocity: {Math.round(comparison.recorded.velocity * 100)}%</div>
                        </div>
                      )}
                    </div>

                    {comparison.timingDiff !== undefined && (
                      <div className="mt-2 text-sm">
                        <strong>Timing Difference:</strong> {formatTime(comparison.timingDiff)}
                      </div>
                    )}

                    {comparison.velocityDiff !== undefined && (
                      <div className="mt-1 text-sm">
                        <strong>Velocity Difference:</strong>{' '}
                        {Math.round(comparison.velocityDiff * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
