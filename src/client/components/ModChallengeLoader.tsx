import React, { useState, useCallback } from 'react';
import type { InstrumentType } from '../../shared/types/music.js';
import {
  ALL_PREDEFINED_CHALLENGES,
  getChallengesByFilter,
  challengeToComposition,
  type ChallengeDifficulty,
  type ChallengeLength,
} from '../utils/predefinedChallenges.js';

interface ModChallengeLoaderProps {
  onChallengeLoad: (composition: any, challengeType: 'falling_tiles' | 'replication') => void;
  onClose: () => void;
}

export const ModChallengeLoader: React.FC<ModChallengeLoaderProps> = ({
  onChallengeLoad,
  onClose,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty | 'all'>('all');
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'falling_tiles' | 'replication' | 'all'>('all');
  const [selectedLength, setSelectedLength] = useState<ChallengeLength | 'all'>('all');

  const filteredChallenges = getChallengesByFilter(
    selectedDifficulty === 'all' ? undefined : selectedDifficulty,
    selectedInstrument === 'all' ? undefined : selectedInstrument,
    selectedType === 'all' ? undefined : selectedType,
    selectedLength === 'all' ? undefined : selectedLength
  );

  const handleChallengeSelect = useCallback(
    (challengeId: string) => {
      const challenge = ALL_PREDEFINED_CHALLENGES.find((c) => c.id === challengeId);
      if (challenge) {
        const composition = challengeToComposition(challenge);
        onChallengeLoad(composition, challenge.challengeType);
        onClose();
      }
    },
    [onChallengeLoad, onClose]
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          border: '3px solid #4ecdc4',
          borderRadius: '0',
          padding: '30px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          fontFamily: "'Press Start 2P', monospace",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{ color: '#4ecdc4', fontSize: '18px', textAlign: 'center', marginBottom: '20px' }}
        >
          🔧 MOD CHALLENGE LOADER
        </h2>

        <div style={{ marginBottom: '20px' }}>
          {filteredChallenges.map((challenge) => (
            <div
              key={challenge.id}
              onClick={() => handleChallengeSelect(challenge.id)}
              style={{
                backgroundColor: '#2a2a3e',
                border: '2px solid #555',
                padding: '15px',
                marginBottom: '10px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '10px',
              }}
            >
              <div>{challenge.title}</div>
              <div style={{ color: '#aaa', fontSize: '8px' }}>{challenge.description}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#666',
            color: '#fff',
            border: '2px solid #888',
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
