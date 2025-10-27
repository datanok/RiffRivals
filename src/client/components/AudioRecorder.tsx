import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AudioRecorderProps, NoteEvent } from '../../shared/index.js';
import { DhwaniAudioEngine } from '../audio/DhwaniAudioEngine.js';

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  instrument,
  onRecordingComplete,
  referenceTrack = [],
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlayingReference, setIsPlayingReference] = useState(false);

  const audioEngineRef = useRef<DhwaniAudioEngine | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordedNotesRef = useRef<NoteEvent[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const referencePlaybackRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio engine
  useEffect(() => {
    const initializeEngine = async () => {
      if (!audioEngineRef.current) {
        audioEngineRef.current = new DhwaniAudioEngine();
        await audioEngineRef.current.initialize();
        audioEngineRef.current.setCurrentInstrument(instrument);
      }
    };

    initializeEngine().catch(console.error);

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (referencePlaybackRef.current) {
        clearTimeout(referencePlaybackRef.current);
      }
    };
  }, []);

  // Update instrument when prop changes
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setCurrentInstrument(instrument);
    }
  }, [instrument]);

  const startRecording = useCallback(async () => {
    if (!audioEngineRef.current || isRecording || disabled) return;

    try {
      // Reset recording state
      recordedNotesRef.current = [];
      recordingStartTimeRef.current = performance.now();
      setRecordingDuration(0);

      // Start audio engine recording
      audioEngineRef.current.startRecording();
      setIsRecording(true);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - recordingStartTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 100);

      // If there's a reference track, play it alongside recording
      if (referenceTrack.length > 0) {
        setIsPlayingReference(true);
        playReferenceTrack();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  }, [isRecording, disabled, referenceTrack]);

  const stopRecording = useCallback(() => {
    if (!audioEngineRef.current || !isRecording) return;

    try {
      // Stop audio engine recording and get track data
      const trackData = audioEngineRef.current.stopRecording();

      // Clean up recording state
      setIsRecording(false);
      setIsPlayingReference(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      if (referencePlaybackRef.current) {
        clearTimeout(referencePlaybackRef.current);
        referencePlaybackRef.current = null;
      }

      // Call completion callback with recorded data
      onRecordingComplete(trackData);

      // Reset duration
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  }, [isRecording, onRecordingComplete]);

  const playReferenceTrack = useCallback(() => {
    if (!audioEngineRef.current || referenceTrack.length === 0) return;

    // Play each reference track
    referenceTrack.forEach((track) => {
      audioEngineRef.current?.playTrack(track).catch(console.error);
    });

    // Calculate total duration of reference tracks
    const maxDuration = Math.max(...referenceTrack.map((track) => track.duration));

    // Stop reference playback after the longest track finishes
    referencePlaybackRef.current = setTimeout(() => {
      setIsPlayingReference(false);
    }, maxDuration * 1000);
  }, [referenceTrack]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">
          Instrument: <span className="font-medium capitalize">{instrument}</span>
        </div>
        {referenceTrack.length > 0 && (
          <div className="text-sm text-gray-600">Reference tracks: {referenceTrack.length}</div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={disabled}
            className={`
              px-6 py-3 rounded-full font-medium transition-colors
              ${
                disabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
              }
            `}
          >
            ● Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-gray-600 text-white rounded-full font-medium hover:bg-gray-700 active:bg-gray-800 transition-colors"
          >
            ■ Stop Recording
          </button>
        )}
      </div>

      {isRecording && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-mono font-medium">
              {formatDuration(recordingDuration)}
            </span>
          </div>

          {isPlayingReference && (
            <div className="text-sm text-blue-600 flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Playing reference track
            </div>
          )}
        </div>
      )}

      {!isRecording && recordingDuration === 0 && referenceTrack.length > 0 && (
        <div className="text-sm text-gray-500 text-center max-w-md">
          Click "Start Recording" to record your part while the reference track plays
        </div>
      )}
    </div>
  );
};
