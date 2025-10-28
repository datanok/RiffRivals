import React, { useState, useEffect, useCallback } from 'react';

type SplashScreenProps = {
  onStart: () => Promise<void>;
  username?: string | null;
  hasExistingPost?: boolean;
};

type SplashPhase = 'intro' | 'features' | 'ready';

const SPLASH_MESSAGES = [
  '🎮 Welcome to the ultimate music battle arena!',
  '🎵 Create epic beats and challenge other players',
  '🏆 Compete in falling notes challenges',
  '🎸 Master drums, piano, bass, and synth',
  '🔥 Ready to drop some sick beats?',
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: '🎹',
    title: 'CREATE MODE',
    description: 'Build your own musical masterpieces',
    color: '#4ecdc4',
  },
  {
    icon: '🏆',
    title: 'CHALLENGE MODE',
    description: 'Test your skills in rhythm battles',
    color: '#ff6b6b',
  },
  {
    icon: '🎮',
    title: 'FALLING NOTES',
    description: 'Guitar Hero style gameplay',
    color: '#feca57',
  },
  {
    icon: '🎸',
    title: 'MULTI-INSTRUMENT',
    description: 'Drums, Piano, Bass & Synth',
    color: '#5f27cd',
  },
];

export const DynamicSplashScreen: React.FC<SplashScreenProps> = ({
  onStart,
  username,
  hasExistingPost,
}) => {
  const [phase, setPhase] = useState<SplashPhase>('intro');
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  // Cycle through intro messages
  useEffect(() => {
    if (phase === 'intro') {
      const interval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % SPLASH_MESSAGES.length);
      }, 2000);

      // Auto-advance to features after showing all messages
      const timeout = setTimeout(() => {
        setPhase('features');
        setShowFeatures(true);
      }, SPLASH_MESSAGES.length * 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [phase]);

  // Animate features appearance
  useEffect(() => {
    if (showFeatures) {
      const interval = setInterval(() => {
        setAnimationStep((prev) => {
          if (prev < FEATURE_HIGHLIGHTS.length) {
            return prev + 1;
          }
          setPhase('ready');
          return prev;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [showFeatures]);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    try {
      await onStart();
    } catch (error) {
      console.error('Failed to start app:', error);
      setIsLoading(false);
    }
  }, [onStart]);

  const skipToReady = useCallback(() => {
    setPhase('ready');
    setShowFeatures(true);
    setAnimationStep(FEATURE_HIGHLIGHTS.length);
  }, []);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden"
      style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            {['🎵', '🎶', '♪', '♫', '🎸', '🥁', '🎹'][Math.floor(Math.random() * 7)]}
          </div>
        ))}
      </div>

      <div className="text-center p-8 relative z-10 max-w-4xl">
        {/* Main Title */}
        <h1
          className="text-6xl md:text-8xl font-bold text-white mb-4 drop-shadow-lg"
          style={{
            textShadow: '4px 4px 0px #ff6b6b, 8px 8px 0px #4ecdc4',
            animation: phase === 'intro' ? 'pulse 2s infinite' : 'none',
          }}
        >
          🎮 RiffRivals
        </h1>

        <p className="text-xl md:text-2xl text-purple-200 mb-8" style={{ fontSize: '12px' }}>
          ARCADE MUSIC BATTLE ARENA
        </p>

        {/* Welcome Message for Returning Users */}
        {username && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg border-4 border-yellow-400">
            <p className="text-white font-bold" style={{ fontSize: '10px' }}>
              🎉 WELCOME BACK, {username.toUpperCase()}! 🎉
            </p>
            {hasExistingPost && (
              <p className="text-yellow-200 mt-2" style={{ fontSize: '8px' }}>
                Your arena awaits - continue your musical journey!
              </p>
            )}
          </div>
        )}

        {/* Phase-based Content */}
        {phase === 'intro' && (
          <div className="mb-8">
            <div
              className="text-lg md:text-xl text-cyan-300 mb-6 h-16 flex items-center justify-center"
              style={{ fontSize: '10px' }}
            >
              <span className="animate-bounce">{SPLASH_MESSAGES[currentMessage]}</span>
            </div>

            <button
              onClick={skipToReady}
              className="text-sm text-purple-300 hover:text-white transition-colors underline"
              style={{ fontSize: '8px' }}
            >
              Skip Intro →
            </button>
          </div>
        )}

        {phase === 'features' && (
          <div className="mb-8">
            <h2 className="text-2xl text-cyan-300 mb-6" style={{ fontSize: '14px' }}>
              🌟 GAME FEATURES 🌟
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {FEATURE_HIGHLIGHTS.map((feature, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-4 transition-all duration-500 ${
                    index < animationStep
                      ? 'opacity-100 transform translate-y-0'
                      : 'opacity-0 transform translate-y-4'
                  }`}
                  style={{
                    backgroundColor: `${feature.color}20`,
                    borderColor: feature.color,
                  }}
                >
                  <div className="text-3xl mb-2">{feature.icon}</div>
                  <h3 className="text-white font-bold mb-2" style={{ fontSize: '10px' }}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-300" style={{ fontSize: '8px' }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'ready' && (
          <div className="mb-8">
            <div
              className="text-2xl text-green-400 mb-6 animate-pulse"
              style={{ fontSize: '14px' }}
            >
              🚀 READY TO ROCK? 🚀
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <div className="text-2xl mb-2">🎵</div>
                <div style={{ fontSize: '8px' }}>CREATE BEATS</div>
              </div>
              <div className="p-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-lg">
                <div className="text-2xl mb-2">⚡</div>
                <div style={{ fontSize: '8px' }}>CHALLENGE OTHERS</div>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg">
                <div className="text-2xl mb-2">🏆</div>
                <div style={{ fontSize: '8px' }}>CLIMB LEADERBOARDS</div>
              </div>
            </div>
          </div>
        )}

        {/* Start Button */}
        {(phase === 'ready' || phase === 'features') && (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className={`px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-xl text-lg ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '16px',
              border: '4px solid #333',
              boxShadow: '8px 8px 0px #333',
              borderRadius: '0px',
              animation: phase === 'ready' ? 'pulse 2s infinite' : 'none',
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                LOADING...
              </div>
            ) : (
              '🚀 START GAME'
            )}
          </button>
        )}

        {phase === 'ready' && (
          <p className="text-purple-300 mt-4 text-sm animate-bounce" style={{ fontSize: '8px' }}>
            Click to initialize audio and enter the arena!
          </p>
        )}

        {/* Quick Start Options */}
        {phase === 'ready' && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs hover:scale-105 transition-transform"
              style={{ fontSize: '8px' }}
            >
              🎹 CREATE MODE
            </button>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg text-xs hover:scale-105 transition-transform"
              style={{ fontSize: '8px' }}
            >
              🏆 CHALLENGES
            </button>
            {hasExistingPost && (
              <button
                onClick={handleStart}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg text-xs hover:scale-105 transition-transform"
                style={{ fontSize: '8px' }}
              >
                🕹️ MY ARENA
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
          40%, 43% { transform: translateY(-10px); }
          70% { transform: translateY(-5px); }
          90% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
};
