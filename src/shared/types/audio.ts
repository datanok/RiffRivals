// Audio engine interfaces and types for Tone.js integration

import type { InstrumentType, TrackData, CompositionData, NoteEvent } from './music.js';

export type AudioEngineState = 'idle' | 'playing' | 'recording' | 'loading';

export type SynthConfig = {
  oscillator: {
    type: 'sine' | 'square' | 'sawtooth' | 'triangle';
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter?: {
    frequency: number;
    type: 'lowpass' | 'highpass' | 'bandpass';
  };
};

export type DrumSampleConfig = {
  [key in import('./music.js').DrumType]: string;
};

export type AudioEngineConfig = {
  sampleRate: number;
  bufferSize: number;
  maxVoices: number;
  masterVolume: number;
  instruments: {
    drums: DrumSampleConfig;
    piano: SynthConfig;
    bass: SynthConfig;
  };
};

export interface IAudioEngine {
  initialize(): Promise<void>;
  playNote(instrument: InstrumentType, note: string, velocity: number): void;
  playTrack(trackData: TrackData): Promise<void>;
  playComposition(composition: CompositionData): Promise<void>;
  startRecording(): void;
  stopRecording(): TrackData;
  setVolume(volume: number): void;
  getState(): AudioEngineState;
  dispose(): void;
}

export interface IRecorder {
  start(): void;
  stop(): NoteEvent[];
  recordNote(note: string, velocity: number, timestamp: number): void;
  clear(): void;
  isRecording(): boolean;
}

export interface IPlaybackEngine {
  play(tracks: TrackData[]): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
}
