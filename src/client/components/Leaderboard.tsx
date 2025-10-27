import React, { useState } from 'react';
import type { ChallengeScore } from '../../shared/types/music.js';

interface LeaderboardProps {
  scores: ChallengeScore[];
  currentUserId?: string;
  onScoreClick?: (score: ChallengeScore) => void;
  timeFilter?: 'all-time' | 'weekly' | 'daily';
  onTimeFilterChange?: (filter: 'all-time' | 'weekly' | 'daily') => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  scores,
  currentUserId = 'current_user',
  onScoreClick,
  timeFilter = 'all-time',
  onTimeFilterChange,
}) => {
  const [selectedScore, setSelectedScore] = useState<ChallengeScore | null>(null);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#ffd700';
    if (rank === 2) return '#c0c0c0';
    if (rank === 3) return '#cd7f32';
    return '#fff';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#45ff45';
    if (score >= 75) return '#ffd700';
    if (score >= 60) return '#ffa500';
    return '#ff6b6b';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleScoreClick = (score: ChallengeScore) => {
    setSelectedScore(score);
    onScoreClick?.(score);
  };

  const sortedScores = [...scores].sort((a, b) => b.combinedScore - a.combinedScore);

  return (
    <div
      style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '16px',
        border: '4px solid #000',
        fontFamily: "'Press Start 2P', monospace",
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ color: 'white', fontSize: '16px', marginBottom: '10px' }}>🏆 LEADERBOARD</div>

        {/* Time Filter */}
        {onTimeFilterChange && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ color: '#888', fontSize: '8px', marginBottom: '8px' }}>TIME PERIOD</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {(['all-time', 'weekly', 'daily'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => onTimeFilterChange(filter)}
                  style={{
                    padding: '6px 12px',
                    background: timeFilter === filter ? '#4ecdc4' : '#333',
                    color: timeFilter === filter ? '#000' : '#fff',
                    border: '3px solid #000',
                    borderRadius: '6px',
                    fontSize: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {filter.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      <div
        style={{
          background: '#000',
          border: '4px solid #444',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
        }}
      >
        {sortedScores.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', fontSize: '10px' }}>NO SCORES YET</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedScores.map((score, index) => {
              const rank = index + 1;
              const isCurrentUser = score.userId === currentUserId;

              return (
                <div
                  key={`${score.userId}-${score.completedAt}`}
                  onClick={() => handleScoreClick(score)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 80px 60px',
                    gap: '10px',
                    padding: '10px',
                    background: isCurrentUser ? '#2a2a2a' : '#1a1a1a',
                    border: isCurrentUser ? '2px solid #4ecdc4' : '2px solid #333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isCurrentUser ? '#3a3a3a' : '#2a2a2a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCurrentUser ? '#2a2a2a' : '#1a1a1a';
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      color: getRankColor(rank),
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  >
                    {getRankIcon(rank)}
                  </div>

                  {/* User Info */}
                  <div>
                    <div style={{ color: 'white', fontSize: '8px', fontWeight: 'bold' }}>
                      {isCurrentUser ? 'YOU' : `USER_${score.userId.slice(-4)}`}
                    </div>
                    <div style={{ color: '#888', fontSize: '6px' }}>
                      {formatDate(score.completedAt)} {formatTime(score.completedAt)}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        color: getScoreColor(score.combinedScore),
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {score.combinedScore}
                    </div>
                    <div style={{ color: '#888', fontSize: '5px' }}>
                      {score.challengeType.replace('_', ' ')}
                    </div>
                  </div>

                  {/* Hit Stats */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#45ff45', fontSize: '8px', fontWeight: 'bold' }}>
                      {score.perfectHits}
                    </div>
                    <div style={{ color: '#888', fontSize: '5px' }}>PERFECT</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Score Details Modal */}
      {selectedScore && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedScore(null)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '4px solid #000',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '500px',
              width: '90%',
              fontFamily: "'Press Start 2P', monospace",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ color: 'white', fontSize: '14px', marginBottom: '10px' }}>
                SCORE DETAILS
              </div>
              <div style={{ color: '#888', fontSize: '8px' }}>
                {formatDate(selectedScore.completedAt)} at {formatTime(selectedScore.completedAt)}
              </div>
            </div>

            {/* Score Breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  background: '#000',
                  border: '4px solid #444',
                  borderRadius: '8px',
                  padding: '15px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#4ecdc4', fontSize: '8px', marginBottom: '5px' }}>
                  TIMING SCORE
                </div>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                  {selectedScore.timingScore}
                </div>
              </div>

              <div
                style={{
                  background: '#000',
                  border: '4px solid #444',
                  borderRadius: '8px',
                  padding: '15px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#feca57', fontSize: '8px', marginBottom: '5px' }}>
                  ACCURACY SCORE
                </div>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                  {selectedScore.accuracyScore}
                </div>
              </div>
            </div>

            {/* Hit Breakdown */}
            <div
              style={{
                background: '#000',
                border: '4px solid #444',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  color: '#888',
                  fontSize: '10px',
                  marginBottom: '10px',
                  textAlign: 'center',
                }}
              >
                HIT BREAKDOWN
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#45ff45', fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedScore.perfectHits}
                  </div>
                  <div style={{ color: '#888', fontSize: '6px' }}>PERFECT</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#ffd700', fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedScore.greatHits}
                  </div>
                  <div style={{ color: '#888', fontSize: '6px' }}>GREAT</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#ffa500', fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedScore.goodHits}
                  </div>
                  <div style={{ color: '#888', fontSize: '6px' }}>GOOD</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#ff6b6b', fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedScore.missedNotes}
                  </div>
                  <div style={{ color: '#888', fontSize: '6px' }}>MISS</div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setSelectedScore(null)}
                style={{
                  padding: '10px 20px',
                  background: '#ff6b6b',
                  color: '#000',
                  border: '4px solid #000',
                  borderRadius: '8px',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.3)',
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
