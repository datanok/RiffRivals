import React, { useState, useCallback, useEffect } from 'react';
import type { TrackData } from '../../shared/types/music.js';
import { PlaybackEngine } from './PlaybackEngine.js';

type PatternMatchingModeProps = {
  originalTrack: TrackData;
  onComplete: (accuracy: number) => void;
  onCancel: () => void;
};

type PatternState = 'learning' | 'practicing' | 'completed';

type UserNote = {
  note: string;
  timestamp: number;
  correct: boolean;
};

export const PatternMatchingMode: React.FC<PatternMatchingModeProps> = ({
  originalTrack,
  onComplete,
  onCancel,
}) => {
  const [patternState, setPatternState] = useState<PatternState>('learning');
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [showHint, setShowHint] = useState(true);
  const [accuracy, setAccuracy] = useState(0);

  const currentNote = originalTrack.notes[currentNoteIndex];
  const isComplete = currentNoteIndex >= originalTrack.notes.length;

  // Calculate accuracy in real-time
  useEffect(() => {
    if (userNotes.length > 0) {
      const correctNotes = userNotes.filter((note) => note.correct).length;
      const newAccuracy = (correctNotes / userNotes.length) * 100;
      setAccuracy(newAccuracy);
    }
  }, [userNotes]);

  // Handle completion
  useEffect(() => {
    if (isComplete && patternState === 'practicing') {
      setPatternState('completed');
      onComplete(accuracy);
    }
  }, [isComplete, patternState, accuracy, onComplete]);

  const handleNoteInput = useCallback(
    (inputNote: string) => {
      if (!currentNote || isComplete) return;

      const isCorrect = inputNote === currentNote.note;
      const newUserNote: UserNote = {
        note: inputNote,
        timestamp: Date.now(),
        correct: isCorrect,
      };

      setUserNotes((prev) => [...prev, newUserNote]);

      if (isCorrect) {
        setCurrentNoteIndex((prev) => prev + 1);
        setShowHint(true);
      } else {
        setShowHint(false);
        setTimeout(() => setShowHint(true), 1000);
      }
    },
    [currentNote, isComplete]
  );

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (patternState !== 'practicing') return;

      const key = event.key.toLowerCase();
      let noteInput = '';

      // Map keys to notes based on instrument
      switch (originalTrack.instrument) {
        case 'drums':
          const drumKeyMap: Record<string, string> = {
            'a': 'kick',
            's': 'snare',
            'd': 'hihat',
            'f': 'crash',
          };
          noteInput = drumKeyMap[key] || '';
          break;
        case 'piano':
          const pianoKeyMap: Record<string, string> = {
            'a': 'C4',
            's': 'D4',
            'd': 'E4',
            'f': 'F4',
          };
          noteInput = pianoKeyMap[key] || '';
          break;
        case 'bass':
          const bassKeyMap: Record<string, string> = {
            'a': 'E2',
            's': 'A2',
            'd': 'D3',
            'f': 'G3',
          };
          noteInput = bassKeyMap[key] || '';
          break;
      }

      if (noteInput) {
        handleNoteInput(noteInput);
      }
    },
    [patternState, originalTrack.instrument, handleNoteInput]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const getNoteDisplayName = (note: string): string => {
    if (originalTrack.instrument === 'drums') {
      const drumNames: Record<string, string> = {
        'kick': 'Kick',
        'snare': 'Snare',
        'hihat': 'Hi-Hat',
        'crash': 'Crash',
      };
      return drumNames[note] || note;
    }
    return note;
  };

  const getKeyForNote = (note: string): string => {
    switch (originalTrack.instrument) {
      case 'drums':
        const drumKeys: Record<string, string> = {
          'kick': 'A',
          'snare': 'S',
          'hihat': 'D',
          'crash': 'F',
        };
        return drumKeys[note] || '?';
      case 'piano':
        const pianoKeys: Record<string, string> = {
          'C4': 'A',
          'D4': 'S',
          'E4': 'D',
          'F4': 'F',
        };
        return pianoKeys[note] || '?';
      case 'bass':
        const bassKeys: Record<string, string> = {
          'E2': 'A',
          'A2': 'S',
          'D3': 'D',
          'G3': 'F',
        };
        return bassKeys[note] || '?';
      default:
        return '?';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🎯 Pattern Matching</h2>
        <div className="text-sm text-gray-600">
          {currentNoteIndex} / {originalTrack.notes.length} notes
        </div>
      </div>

      {patternState === 'learning' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Learn the Pattern</h3>
            <p className="text-blue-700 mb-4">
              Listen to the original track and study the note sequence. No timing pressure!
            </p>

            <div className="mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Note Sequence:</h4>
              <div className="flex flex-wrap gap-2">
                {originalTrack.notes.slice(0, 8).map((note, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-white border border-blue-300 rounded text-sm"
                  >
                    <div className="font-medium">{getNoteDisplayName(note.note)}</div>
                    <div className="text-xs text-gray-600">Key: {getKeyForNote(note.note)}</div>
                  </div>
                ))}
              </div>
            </div>

            <PlaybackEngine tracks={[originalTrack]} visualFeedback={true} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setPatternState('practicing')}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Start Practice
            </button>
          </div>
        </div>
      )}

      {patternState === 'practicing' && !isComplete && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(accuracy)}% accuracy</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentNoteIndex / originalTrack.notes.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {currentNote && (
              <div className="p-6 bg-white border-2 border-green-300 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-800 mb-2">
                  {getNoteDisplayName(currentNote.note)}
                </div>
                <div className="text-lg text-gray-600 mb-4">
                  Press key:{' '}
                  <span className="font-bold text-green-600">
                    {getKeyForNote(currentNote.note)}
                  </span>
                </div>

                {!showHint && (
                  <div className="text-sm text-red-600 font-medium">❌ Wrong note! Try again.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {patternState === 'completed' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Pattern Complete!</h3>
            <div className="text-4xl font-bold text-blue-600 mb-2">{Math.round(accuracy)}%</div>
            <div className="text-blue-700 mb-4">Great job! You completed the pattern.</div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPatternState('learning');
                  setCurrentNoteIndex(0);
                  setUserNotes([]);
                  setAccuracy(0);
                }}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
