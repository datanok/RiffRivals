import React, { useState } from 'react';
import type { CompositionData, ChallengeType } from '../../shared/types/music.js';

interface ChallengeSelectorProps {
  challenges: CompositionData[];
  onChallengeSelect: (challenge: CompositionData, challengeType: ChallengeType) => void;
  onBack: () => void;
  preSelectedChallenge?: CompositionData | null;
}

interface ChallengeFilter {
  instrument: string;
  difficulty: string;
}

export const ChallengeSelector: React.FC<ChallengeSelectorProps> = ({
  challenges,
  onChallengeSelect,
  onBack,
  preSelectedChallenge,
}) => {
  const [filter, setFilter] = useState<ChallengeFilter>({
    instrument: 'all',
    difficulty: 'all',
  });
  const [selectedChallenge, setSelectedChallenge] = useState<CompositionData | null>(
    preSelectedChallenge || null
  );

  // Auto-start challenge if pre-selected
  React.useEffect(() => {
    console.log(
      '🔵 [ChallengeSelector] useEffect triggered, preSelectedChallenge:',
      preSelectedChallenge
    );
    console.log('🔵 [ChallengeSelector] preSelectedChallenge details:', {
      hasChallenge: !!preSelectedChallenge,
      hasChallengeSettings: !!preSelectedChallenge?.metadata?.challengeSettings,
      challengeType: preSelectedChallenge?.metadata?.challengeSettings?.challengeType,
    });

    if (preSelectedChallenge && preSelectedChallenge.metadata.challengeSettings) {
      console.log(
        '🔵 [ChallengeSelector] Auto-starting pre-selected challenge:',
        preSelectedChallenge.metadata.title
      );
      const challengeType =
        preSelectedChallenge.metadata.challengeSettings.challengeType || 'falling_tiles';
      console.log('🔵 [ChallengeSelector] Calling onChallengeSelect with:', { challengeType });
      onChallengeSelect(preSelectedChallenge, challengeType);
    } else {
      console.log(
        '🔵 [ChallengeSelector] NOT auto-starting - missing preSelectedChallenge or challengeSettings'
      );
    }
  }, [preSelectedChallenge, onChallengeSelect]);

  // Filter challenges based on current filter
  const filteredChallenges = challenges.filter((challenge) => {
    if (!challenge.metadata.challengeSettings) return false;

    const settings = challenge.metadata.challengeSettings;

    // Filter by instrument
    if (filter.instrument !== 'all') {
      const hasInstrument = challenge.layers.some(
        (layer) => layer.instrument === filter.instrument
      );
      if (!hasInstrument) return false;
    }

    // Filter by difficulty
    if (filter.difficulty !== 'all') {
      const difficulty = settings.calculatedDifficulty;
      switch (filter.difficulty) {
        case 'easy':
          if (difficulty >= 25) return false;
          break;
        case 'medium':
          if (difficulty < 25 || difficulty >= 50) return false;
          break;
        case 'hard':
          if (difficulty < 50 || difficulty >= 75) return false;
          break;
        case 'expert':
          if (difficulty < 75) return false;
          break;
      }
    }

    return true;
  });

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty >= 75) return '#ff6b6b';
    if (difficulty >= 50) return '#ffa500';
    if (difficulty >= 25) return '#ffd700';
    return '#45ff45';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty >= 75) return 'EXPERT';
    if (difficulty >= 50) return 'HARD';
    if (difficulty >= 25) return 'MEDIUM';
    return 'EASY';
  };

  const getInstrumentIcon = (instrument: string) => {
    switch (instrument) {
      case 'drums':
        return '🥁';
      case 'piano':
        return '🎹';
      case 'bass':
        return '🎸';
      case 'synth':
        return '🎺';
      default:
        return '🎵';
    }
  };

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
        <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '10px' }}>
          {preSelectedChallenge ? '🎯 CHALLENGE READY' : '🏆 CHALLENGES'}
        </h2>
        {preSelectedChallenge && (
          <p style={{ color: '#4ecdc4', fontSize: '10px', marginTop: '5px' }}>
            Starting challenge: {preSelectedChallenge.metadata.title || 'Untitled'}
          </p>
        )}
      </div>

      {/* Simple Filters */}
      <div
        style={{
          background: '#000',
          border: '2px solid #444',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
        }}
      >
        <select
          value={filter.instrument}
          onChange={(e) => setFilter((prev) => ({ ...prev, instrument: e.target.value }))}
          style={{
            padding: '6px',
            background: '#333',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          <option value="all">ALL</option>
          <option value="drums">🥁</option>
          <option value="piano">🎹</option>
          <option value="bass">🎸</option>
          <option value="synth">🎺</option>
        </select>

        <select
          value={filter.difficulty}
          onChange={(e) => setFilter((prev) => ({ ...prev, difficulty: e.target.value }))}
          style={{
            padding: '6px',
            background: '#333',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          <option value="all">ALL</option>
          <option value="easy">🟢</option>
          <option value="medium">🟡</option>
          <option value="hard">🟠</option>
          <option value="expert">🔴</option>
        </select>
      </div>

      {/* Challenge List */}
      <div
        style={{
          background: '#000',
          border: '2px solid #444',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '15px',
        }}
      >
        {filteredChallenges.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', fontSize: '10px', padding: '20px' }}>
            NO CHALLENGES FOUND
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredChallenges.map((challenge) => {
              const settings = challenge.metadata.challengeSettings!;
              const instruments = [...new Set(challenge.layers.map((layer) => layer.instrument))];

              return (
                <div
                  key={challenge.id}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    console.log('🟡 Challenge card clicked:', challenge.metadata.title);
                    // Navigate directly to challenge page when clicking on a challenge card
                    onChallengeSelect(challenge, 'falling_tiles');
                  }}
                  style={{
                    padding: '12px',
                    background: selectedChallenge?.id === challenge.id ? '#2a2a2a' : '#1a1a1a',
                    border:
                      selectedChallenge?.id === challenge.id
                        ? '2px solid #4ecdc4'
                        : '2px solid #333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {/* Challenge Info */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        marginBottom: '3px',
                      }}
                    >
                      {challenge.metadata.title || `Challenge ${challenge.id.slice(-4)}`}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '8px' }}>
                      {instruments.map((inst) => getInstrumentIcon(inst)).join(' ')}{' '}
                      {getDifficultyLabel(settings.calculatedDifficulty)}
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div
                    style={{
                      color: getDifficultyColor(settings.calculatedDifficulty),
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      background: '#333',
                      borderRadius: '4px',
                    }}
                  >
                    {settings.calculatedDifficulty.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            background: '#ff6b6b',
            color: 'white',
            border: '2px solid #000',
            borderRadius: '6px',
            fontSize: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          🏠 BACK
        </button>

        {selectedChallenge && (
          <button
            onClick={() => onChallengeSelect(selectedChallenge, 'falling_tiles')}
            style={{
              padding: '10px 20px',
              background: '#4ecdc4',
              color: 'white',
              border: '2px solid #000',
              borderRadius: '6px',
              fontSize: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            🎵 START CHALLENGE
          </button>
        )}
      </div>
    </div>
  );
};
