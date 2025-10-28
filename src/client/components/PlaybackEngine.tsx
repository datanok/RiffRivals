import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { PlaybackEngineProps, TrackData } from '../../shared/index.js';
import { DhwaniAudioEngine } from '../audio/DhwaniAudioEngine.js';
import { AudioInitButton } from './AudioInitButton.js';

type PlaybackState = 'idle' | 'playing' | 'paused' | 'loading';

export const PlaybackEngine: React.FC<PlaybackEngineProps> = ({
  tracks,
  onPlaybackStateChange,
  visualFeedback,
  autoPlay = false,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set());
  const [soloedTracks, setSoloedTracks] = useState<Set<string>>(new Set());
  const [audioInitialized, setAudioInitialized] = useState(false);

  const audioEngineRef = useRef<DhwaniAudioEngine | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const pausedAtTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledNotesRef = useRef<NodeJS.Timeout[]>([]);
  const isPlayingRef = useRef(false);

  // Initialize audio engine
  useEffect(() => {
    const initializeEngine = async () => {
      if (!audioEngineRef.current) {
        audioEngineRef.current = new DhwaniAudioEngine();
        // Don't initialize immediately - wait for user interaction
        console.log('PlaybackEngine: Audio engine created, waiting for initialization');
      }
    };

    initializeEngine().catch(console.error);

    return () => {
      cleanup();
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
    };
  }, []);

  // Calculate total duration when tracks change
  useEffect(() => {
    if (tracks.length > 0) {
      const maxDuration = Math.max(...tracks.map((track) => track.duration));
      setDuration(maxDuration);
    } else {
      setDuration(0);
    }
  }, [tracks]);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && tracks.length > 0 && playbackState === 'idle') {
      play();
    }
  }, [autoPlay, tracks, playbackState]);

  // Notify parent of playback state changes
  useEffect(() => {
    onPlaybackStateChange(playbackState === 'playing');
  }, [playbackState, onPlaybackStateChange]);

  const cleanup = useCallback(() => {
    // Clear all scheduled timeouts
    scheduledNotesRef.current.forEach((timeout) => clearTimeout(timeout));
    scheduledNotesRef.current = [];

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setActiveNotes(new Set());
    isPlayingRef.current = false;
  }, []);

  const getAudibleTracks = useCallback((): TrackData[] => {
    if (soloedTracks.size > 0) {
      // If any tracks are soloed, only play those
      return tracks.filter((track) => soloedTracks.has(track.id));
    } else {
      // Otherwise, play all non-muted tracks
      return tracks.filter((track) => !mutedTracks.has(track.id));
    }
  }, [tracks, mutedTracks, soloedTracks]);

  const scheduleNoteEvents = useCallback(
    (startTime: number) => {
      const audibleTracks = getAudibleTracks();

      audibleTracks.forEach((track) => {
        track.notes.forEach((noteEvent) => {
          const scheduleTime = (startTime + noteEvent.startTime) * 1000;

          const timeout = setTimeout(() => {
            if (!isPlayingRef.current) return;

            // Play the note
            if (audioEngineRef.current) {
              audioEngineRef.current.playNote(track.instrument, noteEvent.note, noteEvent.velocity);
            }

            // Visual feedback
            if (visualFeedback) {
              const noteKey = `${track.instrument}-${noteEvent.note}`;
              setActiveNotes((prev) => new Set(prev).add(noteKey));

              // Remove visual feedback after note duration
              setTimeout(() => {
                setActiveNotes((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(noteKey);
                  return newSet;
                });
              }, noteEvent.duration * 1000);
            }
          }, scheduleTime);

          scheduledNotesRef.current.push(timeout);
        });
      });
    },
    [getAudibleTracks, visualFeedback]
  );

  const play = useCallback(async () => {
    if (!audioEngineRef.current || tracks.length === 0) return;

    // Ensure audio is initialized before playing
    if (audioEngineRef.current.getState() === 'idle') {
      console.log('PlaybackEngine: Initializing audio engine before playback');
      try {
        await audioEngineRef.current.initialize();
        setAudioInitialized(true);
      } catch (error) {
        console.error('PlaybackEngine: Failed to initialize audio:', error);
        return;
      }
    }

    try {
      setPlaybackState('loading');

      // Calculate start time (resume from paused position or start from beginning)
      const startTime = pausedAtTimeRef.current;
      playbackStartTimeRef.current = performance.now() / 1000 - startTime;
      isPlayingRef.current = true;

      // Schedule all note events
      scheduleNoteEvents(startTime);

      setPlaybackState('playing');

      // Start progress tracking
      progressIntervalRef.current = setInterval(() => {
        if (!isPlayingRef.current) return;

        const elapsed = performance.now() / 1000 - playbackStartTimeRef.current;
        setCurrentTime(Math.min(elapsed, duration));

        // Auto-stop when reaching the end
        if (elapsed >= duration) {
          stop();
        }
      }, 50);
    } catch (error) {
      console.error('Failed to start playback:', error);
      setPlaybackState('idle');
    }
  }, [tracks, duration, scheduleNoteEvents]);

  const pause = useCallback(() => {
    if (playbackState !== 'playing') return;

    isPlayingRef.current = false;
    pausedAtTimeRef.current = currentTime;
    cleanup();
    setPlaybackState('paused');
  }, [playbackState, currentTime, cleanup]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    pausedAtTimeRef.current = 0;
    setCurrentTime(0);
    cleanup();
    setPlaybackState('idle');
  }, [cleanup]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, duration));

      if (playbackState === 'playing') {
        // If playing, restart from new position
        cleanup();
        pausedAtTimeRef.current = clampedTime;
        setCurrentTime(clampedTime);
        play();
      } else {
        // If paused or stopped, just update position
        pausedAtTimeRef.current = clampedTime;
        setCurrentTime(clampedTime);
      }
    },
    [duration, playbackState, cleanup, play]
  );

  const toggleMute = useCallback((trackId: string) => {
    setMutedTracks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    setSoloedTracks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        borderRadius: '8px',
        border: '2px solid #0f3460',
        fontFamily: 'monospace',
        position: 'relative',
      }}
    >
      {/* Audio Initialization Button */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999 }}>
        <AudioInitButton
          onAudioInitialized={() => {
            setAudioInitialized(true);
          }}
          position="top-right"
        />
      </div>
      {/* Main Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {playbackState === 'playing' ? (
            <button
              onClick={pause}
              className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
              title="Pause"
            >
              ⏸
            </button>
          ) : (
            <button
              onClick={play}
              disabled={tracks.length === 0 || playbackState === 'loading'}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-colors
                ${
                  tracks.length === 0 || playbackState === 'loading'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }
              `}
              title="Play"
            >
              ▶
            </button>
          )}

          <button
            onClick={stop}
            disabled={playbackState === 'idle'}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-colors
              ${
                playbackState === 'idle'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }
            `}
            title="Stop"
          >
            ⏹
          </button>
        </div>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-mono min-w-[40px]">{formatTime(currentTime)}</span>

          <div className="flex-1 relative">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="text-sm font-mono min-w-[40px]">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Track Controls */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Tracks</h4>
          {tracks.map((track) => {
            const isMuted = mutedTracks.has(track.id);
            const isSoloed = soloedTracks.has(track.id);
            const isAudible = soloedTracks.size > 0 ? isSoloed : !isMuted;

            return (
              <div key={track.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMute(track.id)}
                    className={`
                      w-8 h-8 rounded text-xs font-medium transition-colors
                      ${
                        isMuted
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }
                    `}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    M
                  </button>

                  <button
                    onClick={() => toggleSolo(track.id)}
                    className={`
                      w-8 h-8 rounded text-xs font-medium transition-colors
                      ${
                        isSoloed
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }
                    `}
                    title={isSoloed ? 'Unsolo' : 'Solo'}
                  >
                    S
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                      text-sm font-medium capitalize
                      ${isAudible ? 'text-gray-900' : 'text-gray-400'}
                    `}
                    >
                      {track.instrument}
                    </span>
                    <span className="text-xs text-gray-500">
                      {track.notes.length} notes • {formatTime(track.duration)}
                    </span>
                  </div>
                </div>

                {visualFeedback && (
                  <div className="flex items-center gap-1">
                    {Array.from(activeNotes).some((note) => note.startsWith(track.instrument)) && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tracks.length === 0 && (
        <div className="text-center text-gray-500 py-8">No tracks to play</div>
      )}
    </div>
  );
};
