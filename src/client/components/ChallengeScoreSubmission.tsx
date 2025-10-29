import React, { useState } from 'react';
import type { ChallengeScore } from '../../shared/types/music.js';

interface ChallengeScoreSubmissionProps {
  score: ChallengeScore;
  onSubmit: (scoreData: ChallengeScoreSubmissionData) => void;
  onSkip: () => void;
  challengeTitle: string;
}

export interface ChallengeScoreSubmissionData {
  score: ChallengeScore;
  shareOptions: {
    shareFullScore: boolean;
    shareAccuracy: boolean;
    shareTiming: boolean;
    shareCompletion: boolean;
    sharePersonalBest: boolean;
    makePublicComment: boolean;
  };
  customMessage?: string;
}

export const ChallengeScoreSubmission: React.FC<ChallengeScoreSubmissionProps> = ({
  score,
  onSubmit,
  onSkip,
  challengeTitle,
}) => {
  const [shareOptions, setShareOptions] = useState({
    shareFullScore: true,
    shareAccuracy: true,
    shareTiming: false,
    shareCompletion: true,
    sharePersonalBest: false,
    makePublicComment: true,
  });
  const [customMessage, setCustomMessage] = useState('');

  const getScoreGrade = (accuracy: number): string => {
    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A+';
    if (accuracy >= 85) return 'A';
    if (accuracy >= 80) return 'A-';
    if (accuracy >= 75) return 'B+';
    if (accuracy >= 70) return 'B';
    if (accuracy >= 65) return 'B-';
    if (accuracy >= 60) return 'C+';
    if (accuracy >= 55) return 'C';
    return 'D';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'S':
        return '#FFD700';
      case 'A+':
      case 'A':
      case 'A-':
        return '#00FF00';
      case 'B+':
      case 'B':
      case 'B-':
        return '#FFFF00';
      case 'C+':
      case 'C':
        return '#FFA500';
      default:
        return '#FF6B6B';
    }
  };

  const grade = getScoreGrade(score.accuracy);

  const handleSubmit = () => {
    const trimmedMessage = customMessage.trim();
    onSubmit({
      score,
      shareOptions,
      ...(trimmedMessage && { customMessage: trimmedMessage }),
    });
  };

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
        color: 'white',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#4ecdc4' }}>
          🏆 CHALLENGE COMPLETE!
        </h2>
        <p style={{ fontSize: '10px', color: '#aaa', marginBottom: '15px' }}>{challengeTitle}</p>
      </div>

      {/* Score Display */}
      <div
        style={{
          background: '#000',
          border: '2px solid #444',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '24px',
            color: getGradeColor(grade),
            marginBottom: '10px',
            textShadow: `0 0 10px ${getGradeColor(grade)}`,
          }}
        >
          GRADE: {grade}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '8px' }}>
          Overall Score: {score.accuracy.toFixed(1)}%
        </div>
        <div
          style={{
            fontSize: '8px',
            color: '#aaa',
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          <span>Accuracy: {score.accuracy.toFixed(1)}%</span>
          <span>Timing: {score.timing.toFixed(1)}%</span>
        </div>
        <div
          style={{
            fontSize: '8px',
            color: '#aaa',
            marginTop: '5px',
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          <span>Perfect: {score.perfectHits}</span>
          <span>Great: {score.greatHits}</span>
          <span>Good: {score.goodHits}</span>
          <span>Miss: {score.missedNotes}</span>
        </div>
      </div>

      {/* Share Options */}
      <div
        style={{
          background: '#000',
          border: '2px solid #444',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
        }}
      >
        <h3 style={{ fontSize: '12px', marginBottom: '15px', color: '#4ecdc4' }}>
          📊 WHAT TO SHARE?
        </h3>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '8px' }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shareOptions.shareFullScore}
              onChange={(e) =>
                setShareOptions((prev) => ({ ...prev, shareFullScore: e.target.checked }))
              }
              style={{ transform: 'scale(1.2)' }}
            />
            <span>Full Score Details</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shareOptions.shareAccuracy}
              onChange={(e) =>
                setShareOptions((prev) => ({ ...prev, shareAccuracy: e.target.checked }))
              }
              style={{ transform: 'scale(1.2)' }}
            />
            <span>Accuracy %</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shareOptions.shareTiming}
              onChange={(e) =>
                setShareOptions((prev) => ({ ...prev, shareTiming: e.target.checked }))
              }
              style={{ transform: 'scale(1.2)' }}
            />
            <span>Timing Score</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shareOptions.shareCompletion}
              onChange={(e) =>
                setShareOptions((prev) => ({ ...prev, shareCompletion: e.target.checked }))
              }
              style={{ transform: 'scale(1.2)' }}
            />
            <span>Completion Status</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shareOptions.sharePersonalBest}
              onChange={(e) =>
                setShareOptions((prev) => ({ ...prev, sharePersonalBest: e.target.checked }))
              }
              style={{ transform: 'scale(1.2)' }}
            />
            <span>Personal Best</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shareOptions.makePublicComment}
              onChange={(e) =>
                setShareOptions((prev) => ({ ...prev, makePublicComment: e.target.checked }))
              }
              style={{ transform: 'scale(1.2)' }}
            />
            <span>Public Comment</span>
          </label>
        </div>

        {/* Custom Message */}
        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'block', fontSize: '8px', marginBottom: '5px', color: '#aaa' }}>
            Custom Message (Optional):
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a comment about your performance..."
            style={{
              width: '100%',
              height: '60px',
              padding: '8px',
              background: '#333',
              border: '1px solid #666',
              borderRadius: '4px',
              color: 'white',
              fontSize: '8px',
              fontFamily: "'Press Start 2P', monospace",
              resize: 'vertical',
            }}
            maxLength={200}
          />
          <div style={{ fontSize: '6px', color: '#666', textAlign: 'right', marginTop: '2px' }}>
            {customMessage.length}/200
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={onSkip}
          style={{
            padding: '12px 20px',
            background: '#666',
            color: 'white',
            border: '2px solid #000',
            borderRadius: '6px',
            fontSize: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          🚫 SKIP SHARING
        </button>

        <button
          onClick={handleSubmit}
          disabled={!Object.values(shareOptions).some(Boolean)}
          style={{
            padding: '12px 20px',
            background: Object.values(shareOptions).some(Boolean) ? '#4ecdc4' : '#333',
            color: 'white',
            border: '2px solid #000',
            borderRadius: '6px',
            fontSize: '8px',
            fontWeight: 'bold',
            cursor: Object.values(shareOptions).some(Boolean) ? 'pointer' : 'not-allowed',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          📤 SHARE SCORE
        </button>
      </div>

      {/* Privacy Note */}
      <div
        style={{
          marginTop: '15px',
          padding: '10px',
          background: '#1a1a1a',
          border: '1px solid #444',
          borderRadius: '4px',
          fontSize: '6px',
          color: '#888',
          textAlign: 'center',
        }}
      >
        🔒 Your score data is always stored privately. Only selected information will be shared
        publicly. You can change these preferences anytime in your profile.
      </div>
    </div>
  );
};
