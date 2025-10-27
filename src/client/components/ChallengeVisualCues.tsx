// Visual playback cues component for challenge mode
// Provides visual guidance during challenge attempts

import React, { useState, useEffect } from 'react';
import type { TrackData, NoteEvent, InstrumentType } from '../../shared/types/music.js';

type ChallengeVisualCuesProps = {
  originalTrack: TrackData;
  isPlaying: boolean;
  currentTime: number;
  showUpcoming?: boolean;
  upcomingTimeWindow?: number; // seconds to show upcoming notes
  onNoteHighlight?: (note: NoteEvent, isActive: boolean) => void;
};

type VisualNote = {
  note: NoteEvent;
  isActive: boolean;
  isUpcoming: boolean;
  timeUntilActive: number;
};

export const ChallengeVisualCues: React.FC<ChallengeVisualCuesProps> = ({
  originalTrack,
  isPlaying,
  currentTime,
  showUpcoming = true,
  upcomingTimeWindow = 2.0,
  onNoteHighlight,
}) => {
  const [visualNotes, setVisualNotes] = useState<VisualNote[]>([]);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  // Update visual notes based on current playback time
  useEffect(() => {
    if (!isPlaying) {
      setVisualNotes([]);
      setActiveNotes(new Set());
      return;
    }

    const currentVisualNotes: VisualNote[] = [];
    const currentActiveNotes = new Set<string>();

    originalTrack.notes.forEach((note) => {
      const timeUntilActive = note.startTime - currentTime;
      const isActive =
        currentTime >= note.startTime && currentTime <= note.startTime + note.duration;
      const isUpcoming = timeUntilActive > 0 && timeUntilActive <= upcomingTimeWindow;

      if (isActive || (showUpcoming && isUpcoming)) {
        currentVisualNotes.push({
          note,
          isActive,
          isUpcoming,
          timeUntilActive,
        });

        if (isActive) {
          currentActiveNotes.add(note.note);
        }
      }

      // Notify parent component about note highlighting
      if (onNoteHighlight) {
        onNoteHighlight(note, isActive);
      }
    });

    setVisualNotes(currentVisualNotes);
    setActiveNotes(currentActiveNotes);
  }, [
    currentTime,
    isPlaying,
    originalTrack.notes,
    showUpcoming,
    upcomingTimeWindow,
    onNoteHighlight,
  ]);

  const getInstrumentIcon = (instrument: InstrumentType): string => {
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

  const getNoteDisplayName = (note: string, instrument: InstrumentType): string => {
    if (instrument === 'drums') {
      const drumNames: Record<string, string> = {
        'kick': 'Kick',
        'snare': 'Snare',
        'hihat': 'Hi-Hat',
        'openhat': 'Open Hat',
        'crash': 'Crash',
        'ride': 'Ride',
        'tom1': 'Tom 1',
        'tom2': 'Tom 2',
      };
      return drumNames[note] || note;
    }
    return note;
  };

  const getVelocityIntensity = (velocity: number): string => {
    if (velocity >= 0.8) return 'Very Strong';
    if (velocity >= 0.6) return 'Strong';
    if (velocity >= 0.4) return 'Medium';
    if (velocity >= 0.2) return 'Soft';
    return 'Very Soft';
  };

  const getVelocityColor = (velocity: number): string => {
    if (velocity >= 0.8) return 'bg-red-500';
    if (velocity >= 0.6) return 'bg-orange-500';
    if (velocity >= 0.4) return 'bg-yellow-500';
    if (velocity >= 0.2) return 'bg-green-500';
    return 'bg-blue-500';
  };

  if (!isPlaying || visualNotes.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border text-center">
        <div className="text-gray-500">
          {isPlaying
            ? 'No notes to display at current time'
            : 'Visual cues will appear during playback'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <span>{getInstrumentIcon(originalTrack.instrument)}</span>
        <span>Visual Cues</span>
        <div className="ml-auto text-sm text-gray-600">
          Time: {Math.round(currentTime * 10) / 10}s
        </div>
      </div>

      {/* Active Notes */}
      {visualNotes.filter((vn) => vn.isActive).length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            Play Now!
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visualNotes
              .filter((vn) => vn.isActive)
              .map((visualNote, index) => (
                <div
                  key={`active-${index}`}
                  className="p-3 bg-white rounded border border-green-300 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-800">
                      {getNoteDisplayName(visualNote.note.note, originalTrack.instrument)}
                    </span>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${getVelocityColor(visualNote.note.velocity)}`}
                      ></div>
                      <span className="text-xs text-gray-600">
                        {getVelocityIntensity(visualNote.note.velocity)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Duration: {Math.round(visualNote.note.duration * 100) / 100}s
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Upcoming Notes */}
      {showUpcoming && visualNotes.filter((vn) => vn.isUpcoming).length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            Get Ready...
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visualNotes
              .filter((vn) => vn.isUpcoming)
              .sort((a, b) => a.timeUntilActive - b.timeUntilActive)
              .map((visualNote, index) => (
                <div
                  key={`upcoming-${index}`}
                  className="p-3 bg-white rounded border border-blue-300 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">
                      {getNoteDisplayName(visualNote.note.note, originalTrack.instrument)}
                    </span>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${getVelocityColor(visualNote.note.velocity)}`}
                      ></div>
                      <span className="text-xs text-gray-600">
                        {getVelocityIntensity(visualNote.note.velocity)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    In: {Math.round(visualNote.timeUntilActive * 10) / 10}s
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                        style={{
                          width: `${Math.max(0, 100 - (visualNote.timeUntilActive / upcomingTimeWindow) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="p-3 bg-gray-50 rounded border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Track Progress</span>
          <span className="text-sm text-gray-600">
            {Math.round(currentTime * 10) / 10}s / {Math.round(originalTrack.duration * 10) / 10}s
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-100"
            style={{
              width: `${Math.min(100, (currentTime / originalTrack.duration) * 100)}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 bg-gray-50 rounded border">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Intensity Legend</h5>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Very Soft</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Soft</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Strong</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Very Strong</span>
          </div>
        </div>
      </div>
    </div>
  );
};
