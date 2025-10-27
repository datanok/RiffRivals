// Challenge leaderboard component for displaying top scores
// Shows rankings and allows users to compare their performance

import React, { useState, useEffect, useCallback } from 'react';
import type { GetLeaderboardResponse, GetChallengeScoresResponse } from '../../shared/types/api.js';
import type { ChallengeScore } from '../../shared/types/music.js';
import { getScoreColor } from '../utils/challengeScoring.js';

type ChallengeLeaderboardProps = {
  postId: string;
  currentUserScore?: ChallengeScore | undefined;
  onClose?: () => void;
};

type LeaderboardEntry = {
  userId: string;
  score: number;
  rank: number;
  completedAt: number;
};

export const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({
  postId,
  currentUserScore,
  onClose,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allScores, setAllScores] = useState<ChallengeScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'top' | 'all'>('top');

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [leaderboardResponse, scoresResponse] = await Promise.all([
        fetch('/api/get-leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, limit: 10 }),
        }),
        fetch('/api/get-challenge-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        }),
      ]);

      const leaderboardData: GetLeaderboardResponse = await leaderboardResponse.json();
      const scoresData: GetChallengeScoresResponse = await scoresResponse.json();

      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard);
      } else {
        setError(leaderboardData.message || 'Failed to load leaderboard');
      }

      if (scoresData.success) {
        setAllScores(scoresData.scores);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getScoreGrade = (score: number): string => {
    if (score >= 95) return 'S';
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    return 'D';
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getCurrentUserRank = (): number | null => {
    if (!currentUserScore) return null;
    const userEntry = leaderboard.find((entry) => entry.userId === currentUserScore.userId);
    return userEntry?.rank || null;
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg border shadow-sm">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">⚠️ {error}</div>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-gray-900">🏆 Challenge Leaderboard</h3>
          {currentUserScore && (
            <div className="text-sm text-gray-600">
              Your rank: {getCurrentUserRank() || 'Not ranked'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('top')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'top'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Top 10
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Scores
            </button>
          </div>

          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded border">
          <div className="text-2xl font-bold text-blue-600">{allScores.length}</div>
          <div className="text-sm text-gray-600">Total Attempts</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded border">
          <div className="text-2xl font-bold text-green-600">
            {leaderboard.length > 0 ? Math.round(leaderboard[0]?.score || 0) : 0}%
          </div>
          <div className="text-sm text-gray-600">Best Score</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded border">
          <div className="text-2xl font-bold text-purple-600">
            {allScores.length > 0
              ? Math.round(
                  allScores.reduce((sum, score) => sum + score.accuracy, 0) / allScores.length
                )
              : 0}
            %
          </div>
          <div className="text-sm text-gray-600">Average Score</div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {viewMode === 'top' ? (
          leaderboard.length > 0 ? (
            leaderboard.map((entry) => (
              <div
                key={`${entry.userId}-${entry.rank}`}
                className={`p-4 rounded-lg border transition-colors ${
                  currentUserScore?.userId === entry.userId
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold">{getRankIcon(entry.rank)}</div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {entry.userId}
                        {currentUserScore?.userId === entry.userId && (
                          <span className="ml-2 text-sm text-blue-600">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Completed: {formatDate(entry.completedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(entry.score)}`}>
                      {Math.round(entry.score)}%
                    </div>
                    <div className={`text-sm font-medium ${getScoreColor(entry.score)}`}>
                      Grade: {getScoreGrade(entry.score)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No scores yet. Be the first to complete the challenge!
            </div>
          )
        ) : allScores.length > 0 ? (
          allScores
            .sort((a, b) => b.accuracy - a.accuracy)
            .map((score, index) => (
              <div
                key={`${score.userId}-${score.completedAt}`}
                className={`p-4 rounded-lg border transition-colors ${
                  currentUserScore?.userId === score.userId
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold text-gray-600">#{index + 1}</div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {score.userId}
                        {currentUserScore?.userId === score.userId && (
                          <span className="ml-2 text-sm text-blue-600">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(score.completedAt)} • Timing: {Math.round(score.timing)}%
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xl font-bold ${getScoreColor(score.accuracy)}`}>
                      {Math.round(score.accuracy)}%
                    </div>
                    <div className={`text-sm font-medium ${getScoreColor(score.accuracy)}`}>
                      {getScoreGrade(score.accuracy)}
                    </div>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="text-center py-8 text-gray-500">No challenge attempts yet.</div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          🔄 Refresh Leaderboard
        </button>
      </div>
    </div>
  );
};
