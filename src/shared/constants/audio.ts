// Audio configuration constants for Dhwani

import type { AudioEngineConfig } from '../types/audio.js';

// Default audio engine configuration
export const DEFAULT_AUDIO_CONFIG: AudioEngineConfig = {
  sampleRate: 44100,
  bufferSize: 512,
  maxVoices: 64,
  masterVolume: 0.9,
  instruments: {
    drums: {
      kick: '/assets/drums/kick.wav',
      snare: '/assets/drums/snare.wav',
      hihat: '/assets/drums/hihat.wav',
      openhat: '/assets/drums/openhat.wav',
      crash: '/assets/drums/crash.wav',
      ride: '/assets/drums/ride.wav',
      tom1: '/assets/drums/tom1.wav',
      tom2: '/assets/drums/tom2.wav',
    },
    piano: {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.6,
        release: 1.5,
      },
      filter: {
        frequency: 2500,
        type: 'lowpass',
      },
    },
    bass: {
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.8,
        release: 1.0,
      },
      filter: {
        frequency: 300,
        type: 'lowpass',
      },
    },
  },
};

// Musical constants
export const MUSICAL_CONSTANTS = {
  DEFAULT_TEMPO: 120,
  MIN_TEMPO: 60,
  MAX_TEMPO: 200,
  DEFAULT_VELOCITY: 0.7,
  MIN_VELOCITY: 0.1,
  MAX_VELOCITY: 1.0,
  RECORDING_QUANTIZE: 0.125, // 1/8 note quantization
  MAX_RECORDING_DURATION: 60, // seconds
  PIANO_OCTAVE_RANGE: [2, 6],
  BASS_FRET_RANGE: [0, 12],
} as const;

// Note mappings
export const PIANO_NOTES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const BASS_TUNING = {
  E: 'E1',
  A: 'A1',
  D: 'D2',
  G: 'G2',
} as const;

// Timing constants
export const TIMING_CONSTANTS = {
  PLAYBACK_LOOKAHEAD: 25, // milliseconds
  SCHEDULE_AHEAD_TIME: 0.1, // seconds
  NOTE_HIGHLIGHT_DURATION: 100, // milliseconds
  CHALLENGE_TIMING_TOLERANCE: 0.1, // seconds
} as const;

// Game-specific constants
export const GAME_CONSTANTS = {
  ACHIEVEMENT_TYPES: {
    FIRST_NOTE: 'first_note',
    COMBO_5: 'combo_5',
    COMBO_10: 'combo_10',
    NOTES_50: 'notes_50',
    NOTES_100: 'notes_100',
  },
  SCORE_VALUES: {
    NOTE_HIT: 100,
    PERFECT_HIT: 150,
    COMBO_BONUS: 50,
    STREAK_BONUS: 100,
  },
  VISUAL_EFFECTS: {
    PARTICLE_COUNT: 3,
    EFFECT_DURATION: 2000,
    COMBO_EFFECT_DURATION: 3000,
  },
  COMBO_THRESHOLD: 5,
  STREAK_THRESHOLD: 10,
  PERFECT_HIT_WINDOW: 0.1, // seconds
  SCORE_MULTIPLIER_BASE: 100,
  COMBO_MULTIPLIER_MAX: 5,
} as const;
