import React from 'react';
import type { ChallengeScore, ChallengeType } from '../../shared/types/music.js';

interface ChallengeResultsProps {
  score: ChallengeScore;
  onRetry: () => void;
  onShare: () => void;
  onBackToMenu: () => void;
  personalBest?: ChallengeScore;
  leaderboardPosition?: number;
}

export const ChallengeResults: React.FC<ChallengeResultsProps> = ({
  score,
  onRetry,
  onShare,
  onBackToMenu,
  personalBest,
  leaderboardPosition,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#45ff45';
    if (score >= 75) return '#ffd700';
    if (score >= 60) return '#ffa500';
    return '#ff6b6b';
  };

  const getPerformanceText = (score: number) => {
    if (score >= 95) return 'LEGENDARY!';
    if (score >= 90) return 'EXCELLENT!';
    if (score >= 80) return 'GREAT!';
    if (score >= 70) return 'GOOD!';
    if (score >= 60) return 'OK';
    return 'NEEDS WORK';
  };

  const getChallengeTypeIcon = (type: ChallengeType) => {
    switch (type) {
      case 'falling_notes':
        return '🎵';
      case 'replication':
        return '🎤';
      case 'both':
        return '🎼';
      default:
        return '🎵';
    }
  };

  const totalHits = score.perfectHits + score.greatHits + score.goodHits + score.missedNotes;
  const hitRate =
    totalHits > 0 ? ((score.perfectHits + score.greatHits + score.goodHits) / totalHits) * 100 : 0;

  return (
    <div
      style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '16px',
        border: '4px solid #000',
        fontFamily: "'Press Start 2P', monospace",
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '20px', marginBottom: '10px' }}>
          {getChallengeTypeIcon(score.challengeType)} CHALLENGE COMPLETE!
        </div>
        <div
          style={{
            fontSize: '16px',
            color: getScoreColor(score.combinedScore),
            textShadow: '2px 2px 0px #000',
          }}
        >
          {getPerformanceText(score.combinedScore)}
        </div>
      </div>

      {/* Main Score Display */}
      <div
        style={{
          background: '#000',
          border: '4px solid #444',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ color: '#888', fontSize: '10px', marginBottom: '10px' }}>FINAL SCORE</div>
        <div
          style={{
            fontSize: '48px',
            color: getScoreColor(score.combinedScore),
            textShadow: '3px 3px 0px #000',
            marginBottom: '10px',
          }}
        >
          {score.combinedScore}
        </div>
        <div style={{ color: '#aaa', fontSize: '8px' }}>
          {score.challengeType.toUpperCase().replace('_', ' ')} CHALLENGE
        </div>
      </div>

      {/* Detailed Scores */}
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
          }}
        >
          <div style={{ color: '#4ecdc4', fontSize: '8px', marginBottom: '5px' }}>TIMING SCORE</div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
            {score.timingScore}
          </div>
        </div>

        <div
          style={{
            background: '#000',
            border: '4px solid #444',
            borderRadius: '8px',
            padding: '15px',
          }}
        >
          <div style={{ color: '#feca57', fontSize: '8px', marginBottom: '5px' }}>
            ACCURACY SCORE
          </div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
            {score.accuracyScore}
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
        <div style={{ color: '#888', fontSize: '10px', marginBottom: '10px' }}>HIT BREAKDOWN</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#45ff45', fontSize: '16px', fontWeight: 'bold' }}>
              {score.perfectHits}
            </div>
            <div style={{ color: '#888', fontSize: '6px' }}>PERFECT</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffd700', fontSize: '16px', fontWeight: 'bold' }}>
              {score.greatHits}
            </div>
            <div style={{ color: '#888', fontSize: '6px' }}>GREAT</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffa500', fontSize: '16px', fontWeight: 'bold' }}>
              {score.goodHits}
            </div>
            <div style={{ color: '#888', fontSize: '6px' }}>GOOD</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff6b6b', fontSize: '16px', fontWeight: 'bold' }}>
              {score.missedNotes}
            </div>
            <div style={{ color: '#888', fontSize: '6px' }}>MISS</div>
          </div>
        </div>
        <div style={{ color: '#aaa', fontSize: '8px', marginTop: '10px' }}>
          Hit Rate: {hitRate.toFixed(1)}% ({score.perfectHits + score.greatHits + score.goodHits}/
          {totalHits})
        </div>
      </div>

      {/* Personal Best Comparison */}
      {personalBest && (
        <div
          style={{
            background: '#000',
            border: '4px solid #444',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
          }}
        >
          <div style={{ color: '#888', fontSize: '10px', marginBottom: '10px' }}>
            PERSONAL BEST COMPARISON
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ color: '#aaa', fontSize: '8px' }}>PREVIOUS BEST</div>
              <div style={{ color: 'white', fontSize: '14px' }}>{personalBest.combinedScore}</div>
            </div>
            <div style={{ fontSize: '20px' }}>
              {score.combinedScore > personalBest.combinedScore ? '🏆' : '📈'}
            </div>
            <div>
              <div style={{ color: '#aaa', fontSize: '8px' }}>THIS ATTEMPT</div>
              <div style={{ color: 'white', fontSize: '14px' }}>{score.combinedScore}</div>
            </div>
          </div>
          {score.combinedScore > personalBest.combinedScore && (
            <div style={{ color: '#45ff45', fontSize: '8px', marginTop: '5px' }}>
              NEW PERSONAL BEST! 🎉
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Position */}
      {leaderboardPosition && (
        <div
          style={{
            background: '#000',
            border: '4px solid #444',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
          }}
        >
          <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>
            LEADERBOARD POSITION
          </div>
          <div style={{ color: '#feca57', fontSize: '24px', fontWeight: 'bold' }}>
            #{leaderboardPosition}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        <button
          onClick={onRetry}
          style={{
            padding: '12px 16px',
            background: '#4ecdc4',
            color: '#000',
            border: '4px solid #000',
            borderRadius: '8px',
            fontSize: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.3)',
          }}
        >
          🔄 RETRY
        </button>

        <button
          onClick={onShare}
          style={{
            padding: '12px 16px',
            background: '#feca57',
            color: '#000',
            border: '4px solid #000',
            borderRadius: '8px',
            fontSize: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.3)',
          }}
        >
          📤 SHARE
        </button>

        <button
          onClick={onBackToMenu}
          style={{
            padding: '12px 16px',
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
          🏠 MENU
        </button>
      </div>

      {/* Completion Time */}
      <div style={{ color: '#888', fontSize: '6px', marginTop: '15px' }}>
        Completed at {new Date(score.completedAt).toLocaleTimeString()}
      </div>
    </div>
  );
};
