import React, { useState, useEffect } from 'react';

interface ChallengeAnalyticsProps {
  postId: string;
  challengeTitle: string;
}

interface AnalyticsData {
  totalAttempts: number;
  totalCompletions: number;
  completionRate: number;
  averageAccuracy: number;
  averageTiming: number;
  highestScore: number;
  scoreDistribution: Record<string, number>;
  lastUpdated: number;
}

export const ChallengeAnalytics: React.FC<ChallengeAnalyticsProps> = ({
  postId,
  challengeTitle,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/challenge-analytics/${postId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          setError('Failed to load analytics');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchAnalytics();
    }
  }, [postId]);

  if (loading) {
    return (
      <div
        style={{
          padding: '20px',
          background: '#1a1a2e',
          borderRadius: '8px',
          border: '2px solid #444',
          textAlign: 'center',
          color: 'white',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '8px',
        }}
      >
        📊 Loading analytics...
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div
        style={{
          padding: '20px',
          background: '#1a1a2e',
          borderRadius: '8px',
          border: '2px solid #ff6b6b',
          textAlign: 'center',
          color: '#ff6b6b',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '8px',
        }}
      >
        ❌ {error || 'No analytics available'}
      </div>
    );
  }

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'S':
        return '#FFD700';
      case 'A':
        return '#00FF00';
      case 'B':
        return '#FFFF00';
      case 'C':
        return '#FFA500';
      case 'D':
        return '#FF6B6B';
      default:
        return '#888';
    }
  };

  const totalScores = Object.values(analytics.scoreDistribution).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div
      style={{
        padding: '15px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '8px',
        border: '2px solid #4ecdc4',
        color: 'white',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '8px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '10px', color: '#4ecdc4', marginBottom: '5px' }}>
          📊 CHALLENGE STATS
        </h3>
        <p style={{ fontSize: '6px', color: '#aaa' }}>{challengeTitle}</p>
      </div>

      {/* Main Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '10px',
          marginBottom: '15px',
        }}
      >
        <div
          style={{
            background: '#000',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #444',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#4ecdc4', fontSize: '12px', marginBottom: '3px' }}>
            {analytics.totalAttempts}
          </div>
          <div style={{ color: '#aaa', fontSize: '6px' }}>ATTEMPTS</div>
        </div>

        <div
          style={{
            background: '#000',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #444',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#00ff00', fontSize: '12px', marginBottom: '3px' }}>
            {analytics.completionRate.toFixed(1)}%
          </div>
          <div style={{ color: '#aaa', fontSize: '6px' }}>COMPLETION</div>
        </div>

        <div
          style={{
            background: '#000',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #444',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#ffd700', fontSize: '12px', marginBottom: '3px' }}>
            {analytics.averageAccuracy.toFixed(1)}%
          </div>
          <div style={{ color: '#aaa', fontSize: '6px' }}>AVG ACCURACY</div>
        </div>

        <div
          style={{
            background: '#000',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #444',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '3px' }}>
            {analytics.highestScore.toFixed(1)}%
          </div>
          <div style={{ color: '#aaa', fontSize: '6px' }}>BEST SCORE</div>
        </div>
      </div>

      {/* Score Distribution */}
      {totalScores > 0 && (
        <div
          style={{
            background: '#000',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #444',
            marginBottom: '10px',
          }}
        >
          <div
            style={{ fontSize: '8px', color: '#4ecdc4', marginBottom: '8px', textAlign: 'center' }}
          >
            GRADE DISTRIBUTION
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'end',
              height: '40px',
            }}
          >
            {Object.entries(analytics.scoreDistribution).map(([grade, count]) => {
              const percentage = (count / totalScores) * 100;
              const height = Math.max(percentage * 0.3, 2); // Min height of 2px

              return (
                <div
                  key={grade}
                  style={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '6px', color: '#aaa', marginBottom: '2px' }}>{count}</div>
                  <div
                    style={{
                      width: '12px',
                      height: `${height}px`,
                      background: getGradeColor(grade),
                      marginBottom: '2px',
                      borderRadius: '1px',
                    }}
                  />
                  <div style={{ fontSize: '6px', color: getGradeColor(grade), fontWeight: 'bold' }}>
                    {grade}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div style={{ textAlign: 'center', fontSize: '6px', color: '#666' }}>
        Last updated: {new Date(analytics.lastUpdated).toLocaleDateString()}
      </div>
    </div>
  );
};
