import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { TrackData, ChallengeScore } from '../../shared/types/music.js';
import { PlaybackEngine } from './PlaybackEngine.js';
import { AudioRecorder } from './AudioRecorder.js';
// InstrumentSelector not needed for challenge mode
import { DrumKit } from './instruments/DrumKit.js';
import { Piano } from './instruments/Piano.js';
import { Bass } from './instruments/Bass.js';
import {
  calculateChallengeScore,
  getScoreColor,
  getScoreBackgroundColor,
  type ScoreBreakdown,
  DEFAULT_SCORING_CONFIG,
} from '../utils/challengeScoring.js';
import { ChallengeVisualCues } from './ChallengeVisualCues.js';
import { ChallengeComparison } from './ChallengeComparison.js';
import { ChallengeLeaderboard } from './ChallengeLeaderboard.js';
import { PatternMatchingMode } from './PatternMatchingMode.js';

type ChallengeProps = {
  originalTrack: TrackData;
  onScoreSubmit: (score: ChallengeScore) => void;
  onCancel: () => void;
};

type ChallengeState =
  | 'instructions'
  | 'listening'
  | 'ready'
  | 'recording'
  | 'visual_practice'
  | 'pattern_matching'
  | 'completed'
  | 'submitting';

// ScoreBreakdown type is now imported from challengeScoring.ts

export const ChallengeMode: React.FC<ChallengeProps> = ({
  originalTrack,
  onScoreSubmit,
  onCancel,
}) => {
  const [challengeState, setChallengeState] = useState<ChallengeState>('instructions');
  const [userRecording, setUserRecording] = useState<TrackData | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [showVisualCues, setShowVisualCues] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (playbackTimeIntervalRef.current) {
        clearInterval(playbackTimeIntervalRef.current);
      }
    };
  }, []);

  // Track playback time for visual cues
  useEffect(() => {
    if (isPlayingOriginal && challengeState === 'listening') {
      setCurrentPlaybackTime(0);
      playbackTimeIntervalRef.current = setInterval(() => {
        setCurrentPlaybackTime((prev) => prev + 0.1);
      }, 100);
    } else {
      if (playbackTimeIntervalRef.current) {
        clearInterval(playbackTimeIntervalRef.current);
        playbackTimeIntervalRef.current = null;
      }
      if (!isPlayingOriginal) {
        setCurrentPlaybackTime(0);
      }
    }

    return () => {
      if (playbackTimeIntervalRef.current) {
        clearInterval(playbackTimeIntervalRef.current);
      }
    };
  }, [isPlayingOriginal, challengeState]);

  const handlePlaybackStateChange = useCallback(
    (isPlaying: boolean) => {
      setIsPlayingOriginal(isPlaying);

      // If playback finished during listening phase, move to ready state
      if (!isPlaying && challengeState === 'listening') {
        setChallengeState('ready');
      }
    },
    [challengeState]
  );

  const handleListenToOriginal = useCallback(() => {
    setChallengeState('listening');
    setError(null);
  }, []);

  const handleStartChallenge = useCallback(() => {
    setChallengeState('ready');
    setError(null);

    // Start countdown
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setChallengeState('recording');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleRecordingComplete = useCallback(
    (recordedTrack: TrackData) => {
      setUserRecording(recordedTrack);
      setChallengeState('completed');

      // Calculate comprehensive score using the new scoring system
      const score = calculateChallengeScore(originalTrack, recordedTrack, DEFAULT_SCORING_CONFIG);
      setScoreBreakdown(score);
    },
    [originalTrack]
  );

  // Use the comprehensive scoring system from challengeScoring.ts

  const handleSubmitScore = useCallback(async () => {
    if (!scoreBreakdown || !userRecording) {
      setError('No score to submit');
      return;
    }

    setChallengeState('submitting');
    setError(null);

    try {
      const challengeScore: ChallengeScore = {
        userId: userRecording.userId,
        accuracy: scoreBreakdown.overallScore,
        timing: scoreBreakdown.timingAccuracy,
        completedAt: Date.now(),
        originalTrackId: originalTrack.id,
      };

      // Submit to server for Reddit comment and leaderboard
      const response = await fetch('/api/submit-challenge-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: originalTrack.id, // Assuming the track ID corresponds to the post ID
          score: challengeScore,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Also call the parent callback
        onScoreSubmit(challengeScore);

        // Show success message
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to submit score');
      }
    } catch (err) {
      console.error('Error submitting score:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit score');
      setChallengeState('completed');
    }
  }, [scoreBreakdown, userRecording, originalTrack.id, onScoreSubmit]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Score color and grade functions are now imported from challengeScoring.ts

  const renderInstrumentInterface = () => {
    const isRecording = challengeState === 'recording';

    switch (originalTrack.instrument) {
      case 'drums':
        return (
          <DrumKit
            onNotePlay={() => {}} // Handled by AudioRecorder
            isRecording={isRecording}
            activeNotes={new Set()}
          />
        );
      case 'piano':
        return (
          <Piano
            onNotePlay={() => {}} // Handled by AudioRecorder
            isRecording={isRecording}
            activeNotes={new Set()}
            octave={4}
          />
        );
      case 'bass':
        return (
          <Bass
            onNotePlay={() => {}} // Handled by AudioRecorder
            isRecording={isRecording}
            selectedFret={0}
            activeNotes={new Set()}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">🏆 Challenge Mode</h2>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            🏆 Leaderboard
          </button>
        </div>
        <p className="text-gray-600">
          Try to replicate the original riff as accurately as possible. You'll be scored on note
          accuracy and timing precision.
        </p>
      </div>

      {/* Original Track Info */}
      <div className="p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Challenge Track</h3>
        <div className="flex items-center gap-4">
          <span className="text-2xl">
            {originalTrack.instrument === 'drums'
              ? '🥁'
              : originalTrack.instrument === 'piano'
                ? '🎹'
                : '🎸'}
          </span>
          <div>
            <div className="font-medium capitalize">{originalTrack.instrument}</div>
            <div className="text-sm text-gray-600">
              {originalTrack.notes.length} notes • {formatDuration(originalTrack.duration)} •{' '}
              {originalTrack.tempo} BPM
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Phase */}
      {challengeState === 'instructions' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">How to Play</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>Listen to the original track to learn the pattern</li>
              <li>When ready, start the challenge to begin recording</li>
              <li>Play the same notes with the same timing as the original</li>
              <li>Your accuracy will be scored based on note precision and timing</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleListenToOriginal}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                🎧 Listen to Original
              </button>
              <button
                onClick={() => setChallengeState('visual_practice')}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
              >
                👁️ Visual Practice
              </button>
              <button
                onClick={() => setChallengeState('pattern_matching')}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                🎯 Pattern Match
              </button>
            </div>
            <button
              onClick={handleStartChallenge}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Start Full Challenge
            </button>
          </div>
        </div>
      )}

      {/* Listening Phase */}
      {challengeState === 'listening' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 font-medium">
                  Listen carefully to the original track
                </span>
              </div>
              <button
                onClick={() => setShowVisualCues(!showVisualCues)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showVisualCues ? 'Hide' : 'Show'} Visual Cues
              </button>
            </div>
          </div>

          <PlaybackEngine
            tracks={[originalTrack]}
            onPlaybackStateChange={handlePlaybackStateChange}
            visualFeedback={true}
            autoPlay={true}
          />

          {/* Visual Cues */}
          {showVisualCues && (
            <ChallengeVisualCues
              originalTrack={originalTrack}
              isPlaying={isPlayingOriginal}
              currentTime={currentPlaybackTime}
              showUpcoming={true}
              upcomingTimeWindow={2.0}
            />
          )}

          <button
            onClick={handleStartChallenge}
            disabled={isPlayingOriginal}
            className={`
              w-full px-6 py-3 rounded-lg font-medium transition-colors
              ${
                isPlayingOriginal
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }
            `}
          >
            Ready to Start Challenge
          </button>
        </div>
      )}

      {/* Visual Practice Phase */}
      {challengeState === 'visual_practice' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Visual Practice Mode</h3>
            <p className="text-purple-700 mb-4">
              Practice the pattern without recording. Click the notes as they appear to get instant
              feedback on your timing and accuracy.
            </p>

            {/* Enhanced Visual Cues */}
            <div className="mb-4">
              <ChallengeVisualCues
                originalTrack={originalTrack}
                isPlaying={false}
                currentTime={0}
                showUpcoming={true}
                upcomingTimeWindow={5.0}
                practiceMode={true}
              />
            </div>

            {/* Interactive Note Pattern */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {originalTrack.notes.slice(0, 8).map((note, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Play the note sound for practice
                    if (audioEngine && audioInitialized) {
                      audioEngine.playNote(originalTrack.instrument, note.note, note.velocity);
                    }
                  }}
                  className="p-3 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded text-sm font-medium transition-colors"
                >
                  {note.note}
                  <div className="text-xs text-purple-600 mt-1">
                    {(note.timestamp / 1000).toFixed(1)}s
                  </div>
                </button>
              ))}
            </div>

            <div className="text-sm text-purple-600 mb-4">
              💡 Tip: Click each note button to hear how it should sound. The timing is shown below
              each note.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setChallengeState('instructions')}
              className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleStartChallenge}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Ready for Challenge
            </button>
          </div>
        </div>
      )}

      {/* Pattern Matching Mode */}
      {challengeState === 'pattern_matching' && (
        <PatternMatchingMode
          originalTrack={originalTrack}
          onComplete={(accuracy) => {
            // Create a simple score based on pattern matching accuracy
            const challengeScore: ChallengeScore = {
              userId: 'current_user',
              accuracy: accuracy,
              timing: 0, // No timing component in pattern matching
              completedAt: Date.now(),
              originalTrackId: originalTrack.id,
            };
            onScoreSubmit(challengeScore);
          }}
          onCancel={() => setChallengeState('instructions')}
        />
      )}

      {/* Ready/Countdown Phase */}
      {challengeState === 'ready' && (
        <div className="space-y-4">
          {countdown !== null ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-6xl font-bold text-blue-600 mb-4">{countdown}</div>
              <div className="text-lg text-gray-600">Get ready to play...</div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⚡</span>
                <span className="text-yellow-700 font-medium">Challenge starting...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recording Phase */}
      {challengeState === 'recording' && (
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-700 font-medium">Recording your attempt...</span>
            </div>
          </div>

          {/* Instrument Interface */}
          <div className="p-4 bg-gray-50 rounded-lg border">{renderInstrumentInterface()}</div>

          {/* Audio Recorder */}
          <AudioRecorder
            instrument={originalTrack.instrument}
            onRecordingComplete={handleRecordingComplete}
            disabled={false}
          />
        </div>
      )}

      {/* Completed Phase */}
      {challengeState === 'completed' && scoreBreakdown && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Challenge Complete!</h3>

            {/* Overall Score */}
            <div className="text-center mb-6">
              <div
                className={`text-6xl font-bold mb-2 ${getScoreColor(scoreBreakdown.overallScore)}`}
              >
                {scoreBreakdown.grade}
              </div>
              <div
                className={`text-2xl font-semibold ${getScoreColor(scoreBreakdown.overallScore)}`}
              >
                {scoreBreakdown.overallScore}%
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-blue-600">
                  {scoreBreakdown.noteAccuracy}%
                </div>
                <div className="text-sm text-gray-600">Note Accuracy</div>
                <div className="text-xs text-gray-500">
                  {scoreBreakdown.correctNotes}/{scoreBreakdown.totalNotes} correct
                </div>
              </div>

              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-purple-600">
                  {scoreBreakdown.timingAccuracy}%
                </div>
                <div className="text-sm text-gray-600">Timing Precision</div>
                <div className="text-xs text-gray-500">
                  Avg:{' '}
                  {scoreBreakdown.timingErrors.length > 0
                    ? Math.round(
                        (scoreBreakdown.timingErrors.reduce((sum, err) => sum + err, 0) /
                          scoreBreakdown.timingErrors.length) *
                          1000
                      )
                    : 0}
                  ms
                </div>
              </div>

              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-orange-600">
                  {scoreBreakdown.velocityAccuracy}%
                </div>
                <div className="text-sm text-gray-600">Dynamics</div>
                <div className="text-xs text-gray-500">Note intensity</div>
              </div>

              <div className="text-center p-3 bg-white rounded border">
                <div className={`text-2xl font-bold ${getScoreColor(scoreBreakdown.overallScore)}`}>
                  {scoreBreakdown.overallScore}%
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
                <div className="text-xs text-gray-500">Grade: {scoreBreakdown.grade}</div>
              </div>
            </div>

            {/* Performance Feedback */}
            {scoreBreakdown.feedback.length > 0 && (
              <div
                className={`p-4 rounded-lg border mb-4 ${getScoreBackgroundColor(scoreBreakdown.overallScore)}`}
              >
                <h4 className="font-semibold text-gray-800 mb-2">Performance Feedback</h4>
                <ul className="space-y-1">
                  {scoreBreakdown.feedback.map((feedback, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {feedback}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-white rounded border">
                <h5 className="font-medium text-gray-700 mb-2">Note Statistics</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Correct Notes:</span>
                    <span className="text-green-600">{scoreBreakdown.correctNotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missed Notes:</span>
                    <span className="text-red-600">{scoreBreakdown.missedNotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Notes:</span>
                    <span className="text-orange-600">{scoreBreakdown.extraNotes}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white rounded border">
                <h5 className="font-medium text-gray-700 mb-2">Timing Analysis</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Timing Errors:</span>
                    <span>{scoreBreakdown.timingErrors.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Timing:</span>
                    <span className="text-green-600">
                      {scoreBreakdown.timingErrors.length > 0
                        ? `${Math.round(Math.min(...scoreBreakdown.timingErrors) * 1000)}ms`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Worst Timing:</span>
                    <span className="text-red-600">
                      {scoreBreakdown.timingErrors.length > 0
                        ? `${Math.round(Math.max(...scoreBreakdown.timingErrors) * 1000)}ms`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Comparison */}
          {userRecording && scoreBreakdown && (
            <ChallengeComparison
              originalTrack={originalTrack}
              userRecording={userRecording}
              scoreBreakdown={scoreBreakdown}
            />
          )}
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
          disabled={challengeState === 'submitting' || challengeState === 'recording'}
          className={`
            flex-1 px-6 py-3 rounded-lg font-medium transition-colors
            ${
              challengeState === 'submitting' || challengeState === 'recording'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }
          `}
        >
          {challengeState === 'recording' ? 'Recording...' : 'Cancel'}
        </button>

        {challengeState === 'completed' && (
          <button
            onClick={handleSubmitScore}
            disabled={challengeState === 'submitting'}
            className={`
              flex-1 px-6 py-3 rounded-lg font-medium transition-colors
              ${
                challengeState === 'submitting'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }
            `}
          >
            {challengeState === 'submitting' ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </div>
            ) : (
              'Submit Score'
            )}
          </button>
        )}
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <ChallengeLeaderboard
              postId={originalTrack.id}
              currentUserScore={
                scoreBreakdown && userRecording
                  ? {
                      userId: userRecording.userId,
                      accuracy: scoreBreakdown.overallScore,
                      timing: scoreBreakdown.timingAccuracy,
                      completedAt: Date.now(),
                      originalTrackId: originalTrack.id,
                    }
                  : undefined
              }
              onClose={() => setShowLeaderboard(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
