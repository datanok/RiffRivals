import React, { useState, useEffect, useRef } from 'react';

type GameScore = {
  combo: number;
  totalNotes: number;
  perfectHits: number;
  multiplier: number;
  streak: number;
  score: number;
};

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
};

type GameMechanicsProps = {
  isRecording: boolean;
  noteCount: number;
  onScoreUpdate?: (score: GameScore) => void;
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_note',
    name: 'First Beat',
    description: 'Play your first note',
    icon: '🎵',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'combo_5',
    name: 'Combo Master',
    description: 'Hit 5 notes in a row',
    icon: '🔥',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'combo_10',
    name: 'Streak Legend',
    description: 'Hit 10 notes in a row',
    icon: '⚡',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: 'notes_50',
    name: 'Beat Machine',
    description: 'Play 50 notes total',
    icon: '🥁',
    unlocked: false,
    progress: 0,
    maxProgress: 50,
  },
  {
    id: 'notes_100',
    name: 'Music Master',
    description: 'Play 100 notes total',
    icon: '🎼',
    unlocked: false,
    progress: 0,
    maxProgress: 100,
  },
];

export const GameMechanics: React.FC<GameMechanicsProps> = ({
  isRecording,
  noteCount,
  onScoreUpdate,
}) => {
  const [gameScore, setGameScore] = useState<GameScore>({
    combo: 0,
    totalNotes: 0,
    perfectHits: 0,
    multiplier: 1,
    streak: 0,
    score: 0,
  });

  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; color: string }>
  >([]);

  const lastNoteTimeRef = useRef<number>(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update score when note count changes
  useEffect(() => {
    if (noteCount > gameScore.totalNotes) {
      const newNotes = noteCount - gameScore.totalNotes;
      const now = Date.now();

      // Check for combo (notes within 2 seconds)
      const isCombo = now - lastNoteTimeRef.current < 2000;

      setGameScore((prev) => {
        const newScore = {
          ...prev,
          totalNotes: noteCount,
          perfectHits: prev.perfectHits + newNotes,
          streak: isCombo ? prev.streak + newNotes : newNotes,
          combo: isCombo ? prev.combo + newNotes : newNotes,
          multiplier: Math.min(Math.floor(prev.streak / 5) + 1, 5),
          score:
            prev.score +
            newNotes * 100 * (isCombo ? Math.min(Math.floor(prev.streak / 5) + 1, 5) : 1),
        };

        onScoreUpdate?.(newScore);
        return newScore;
      });

      lastNoteTimeRef.current = now;

      // Add particles for visual effect
      addParticles(newNotes);

      // Check achievements
      checkAchievements(noteCount);

      // Clear combo timeout
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }

      // Set combo timeout
      comboTimeoutRef.current = setTimeout(() => {
        setGameScore((prev) => ({
          ...prev,
          combo: 0,
          streak: 0,
          multiplier: 1,
        }));
      }, 2000);
    }
  }, [noteCount, gameScore.totalNotes, onScoreUpdate]);

  const addParticles = (count: number) => {
    const newParticles = Array.from({ length: count * 3 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ff9ff3'][Math.floor(Math.random() * 5)],
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Remove particles after animation
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 2000);
  };

  const checkAchievements = (totalNotes: number) => {
    setAchievements((prev) => {
      const updated = prev.map((achievement) => {
        if (achievement.unlocked) return achievement;

        let progress = 0;
        let unlocked = false;

        switch (achievement.id) {
          case 'first_note':
            progress = Math.min(totalNotes, 1);
            unlocked = totalNotes >= 1;
            break;
          case 'combo_5':
            progress = Math.min(gameScore.combo, 5);
            unlocked = gameScore.combo >= 5;
            break;
          case 'combo_10':
            progress = Math.min(gameScore.combo, 10);
            unlocked = gameScore.combo >= 10;
            break;
          case 'notes_50':
            progress = Math.min(totalNotes, 50);
            unlocked = totalNotes >= 50;
            break;
          case 'notes_100':
            progress = Math.min(totalNotes, 100);
            unlocked = totalNotes >= 100;
            break;
        }

        if (unlocked && !achievement.unlocked) {
          setShowAchievement({ ...achievement, progress, unlocked });
          setTimeout(() => setShowAchievement(null), 3000);
        }

        return { ...achievement, progress, unlocked };
      });

      return updated;
    });
  };

  const getScoreColor = () => {
    if (gameScore.multiplier >= 4) return '#ff6b6b';
    if (gameScore.multiplier >= 3) return '#feca57';
    if (gameScore.multiplier >= 2) return '#4ecdc4';
    return '#45b7d1';
  };

  return (
    <>
      {/* Score Display */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.7))',
          padding: '16px',
          borderRadius: '0px',
          border: '4px solid #333',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: "'Press Start 2P', monospace",
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          boxShadow: '6px 6px 0px #333, 0 8px 25px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '18px', color: getScoreColor(), textShadow: '2px 2px 0px #333' }}>
            {gameScore.score.toLocaleString()}
          </div>
          <div style={{ fontSize: '8px', opacity: 0.8 }}>SCORE</div>
        </div>

        <div style={{ display: 'flex', gap: '12px', fontSize: '8px' }}>
          <div>
            <div style={{ color: '#ff6b6b' }}>🔥 {gameScore.combo}</div>
            <div style={{ opacity: 0.7 }}>COMBO</div>
          </div>
          <div>
            <div style={{ color: '#4ecdc4' }}>⚡ {gameScore.streak}</div>
            <div style={{ opacity: 0.7 }}>STREAK</div>
          </div>
          <div>
            <div style={{ color: '#feca57' }}>×{gameScore.multiplier}</div>
            <div style={{ opacity: 0.7 }}>MULTI</div>
          </div>
        </div>
      </div>

      {/* Achievement Notification */}
      {showAchievement && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #ff6b6b, #ff5252)',
            padding: '20px',
            borderRadius: '0px',
            border: '4px solid #333',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: "'Press Start 2P', monospace",
            textAlign: 'center',
            zIndex: 1001,
            boxShadow: '8px 8px 0px #333, 0 10px 30px rgba(255, 107, 107, 0.5)',
            animation: 'bounceIn 0.5s ease-out',
            textShadow: '2px 2px 0px #333',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{showAchievement.icon}</div>
          <div>ACHIEVEMENT UNLOCKED!</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>{showAchievement.name}</div>
          <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '4px' }}>
            {showAchievement.description}
          </div>
        </div>
      )}

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: 'fixed',
            left: particle.x,
            top: particle.y,
            width: '8px',
            height: '8px',
            backgroundColor: particle.color,
            borderRadius: '0px',
            pointerEvents: 'none',
            zIndex: 999,
            animation: 'particleFloat 2s ease-out forwards',
            border: '1px solid #333',
          }}
        />
      ))}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes bounceIn {
            0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.05); }
            70% { transform: translate(-50%, -50%) scale(0.9); }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
          
          @keyframes particleFloat {
            0% { 
              transform: translateY(0) scale(1); 
              opacity: 1; 
            }
            100% { 
              transform: translateY(-100px) scale(0); 
              opacity: 0; 
            }
          }
        `}
      </style>
    </>
  );
};
