// Core audio engine implementation using Tone.js

import * as Tone from 'tone';
import type {
  IAudioEngine,
  AudioEngineState,
  AudioEngineConfig,
} from '../../shared/types/audio.js';
import type {
  InstrumentType,
  TrackData,
  CompositionData,
  NoteEvent,
  DrumType,
} from '../../shared/types/music.js';
import { DEFAULT_AUDIO_CONFIG } from '../../shared/constants/audio.js';
import { DrumKitSynth } from './DrumKitSynth.js';
import { PianoSynth } from './PianoSynth.js';
import { BassSynth } from './BassSynth.js';
import { SynthSynth } from './SynthSynth.js';
// Removed performance optimizations for debugging

export class DhwaniAudioEngine implements IAudioEngine {
  private state: AudioEngineState = 'idle';
  private config: AudioEngineConfig;
  private isInitialized = false;

  // Tone.js instruments
  private drumKit: DrumKitSynth | null = null;
  private pianoSynth: PianoSynth | null = null;
  private bassSynth: BassSynth | null = null;
  private synthSynth: SynthSynth | null = null;
  private masterGain: Tone.Gain;

  // Recording state
  private recordingStartTime = 0;
  private recordedNotes: NoteEvent[] = [];
  private currentInstrument: InstrumentType = 'piano';

  constructor(config?: Partial<AudioEngineConfig>) {
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
    this.masterGain = new Tone.Gain(this.config.masterVolume);
    console.log('DhwaniAudioEngine: Constructor - Master gain created');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Audio engine already initialized');
      return;
    }

    try {
      console.log('Setting audio engine state to loading...');
      this.state = 'loading';

      // Start Tone.js
      console.log('Starting Tone.js...');
      await Tone.start();
      console.log('Tone.js started, context state:', Tone.getContext().state);

      // Connect master gain to destination
      console.log('Connecting master gain to destination...');
      this.masterGain.toDestination();
      console.log('Master gain connected successfully');

      // Initialize instruments
      console.log('Initializing instruments...');
      await this.initializeDrums();
      console.log('Drums initialized');

      await this.initializePiano();
      console.log('Piano initialized');

      await this.initializeBass();
      console.log('Bass initialized');

      await this.initializeSynth();
      console.log('Synth initialized');

      this.isInitialized = true;
      this.state = 'idle';
      console.log('Audio engine initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      this.state = 'idle';
      throw error;
    }
  }

  private async initializeDrums(): Promise<void> {
    this.drumKit = new DrumKitSynth(this.masterGain);
  }

  private async initializePiano(): Promise<void> {
    this.pianoSynth = new PianoSynth(this.config.instruments.piano, this.masterGain);
    await this.pianoSynth.initialize();
  }

  private async initializeBass(): Promise<void> {
    this.bassSynth = new BassSynth(this.config.instruments.bass, this.masterGain);
  }

  private async initializeSynth(): Promise<void> {
    this.synthSynth = new SynthSynth(this.config.instruments.piano, this.masterGain);
    await this.synthSynth.initialize();
  }

  playNote(instrument: InstrumentType, note: string, velocity: number = 0.7): void {
    if (!this.isInitialized) {
      console.warn('Audio engine not initialized');
      return;
    }

    console.log(`Playing ${instrument} note: ${note} with velocity: ${velocity}`);
    const adjustedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    try {
      switch (instrument) {
        case 'drums':
          this.playDrumNote(note as DrumType, adjustedVelocity);
          break;
        case 'piano':
          this.playPianoNote(note, adjustedVelocity);
          break;
        case 'bass':
          this.playBassNote(note, adjustedVelocity);
          break;
        case 'synth':
          this.playSynthNote(note, adjustedVelocity);
          break;
      }

      // Record note if recording
      if (this.state === 'recording') {
        this.recordNote(note, adjustedVelocity);
      }
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }

  private playDrumNote(drumType: DrumType, velocity: number): void {
    if (!this.drumKit) return;
    this.drumKit.playDrum(drumType, velocity);
  }

  private playPianoNote(note: string, velocity: number): void {
    if (!this.pianoSynth) return;
    this.pianoSynth.playNote(note, velocity);
  }

  private playBassNote(note: string, velocity: number): void {
    if (!this.bassSynth) return;
    this.bassSynth.playNote(note, velocity);
  }

  private playSynthNote(note: string, velocity: number): void {
    if (!this.synthSynth) return;
    this.synthSynth.playNote(note, velocity);
  }

  async playTrack(trackData: TrackData): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.state = 'playing';

    // Schedule all notes in the track
    const now = Tone.now();

    trackData.notes.forEach((noteEvent) => {
      const scheduleTime = now + noteEvent.startTime;

      // Schedule the note to play at the correct time
      Tone.Transport.schedule(() => {
        this.playNote(trackData.instrument, noteEvent.note, noteEvent.velocity);
      }, scheduleTime);
    });

    // Set state back to idle after track duration
    setTimeout(() => {
      this.state = 'idle';
    }, trackData.duration * 1000);
  }

  async playComposition(composition: CompositionData): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.state = 'playing';

    try {
      // Play all tracks simultaneously
      const playPromises = composition.layers.map((track) => this.playTrack(track));
      await Promise.all(playPromises);
    } finally {
      this.state = 'idle';
    }
  }

  startRecording(): void {
    if (!this.isInitialized) {
      console.warn('Audio engine not initialized');
      return;
    }

    this.state = 'recording';
    this.recordingStartTime = Tone.now();
    this.recordedNotes = [];
  }

  stopRecording(): TrackData {
    if (this.state !== 'recording') {
      throw new Error('Not currently recording');
    }

    this.state = 'idle';
    const duration = Tone.now() - this.recordingStartTime;

    const trackData: TrackData = {
      id: `track_${Date.now()}`,
      instrument: this.currentInstrument,
      notes: [...this.recordedNotes],
      tempo: 120, // Default tempo
      duration,
      userId: 'current_user', // This would come from Reddit context
      timestamp: Date.now(),
    };

    this.recordedNotes = [];
    return trackData;
  }

  private recordNote(note: string, velocity: number): void {
    const currentTime = Tone.now() - this.recordingStartTime;

    const noteEvent: NoteEvent = {
      note,
      velocity,
      startTime: currentTime,
      duration: 0.25, // Default note duration
    };

    this.recordedNotes.push(noteEvent);
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = clampedVolume;
    this.config.masterVolume = clampedVolume;
  }

  getState(): AudioEngineState {
    return this.state;
  }

  setCurrentInstrument(instrument: InstrumentType): void {
    this.currentInstrument = instrument;
  }

  setPianoOctave(octave: number): void {
    if (this.pianoSynth) {
      this.pianoSynth.setOctave(octave);
    }
  }

  getPianoOctave(): number {
    return this.pianoSynth?.getOctave() ?? 4;
  }

  setBassFret(fret: number): void {
    if (this.bassSynth) {
      this.bassSynth.setFret(fret);
    }
  }

  getBassFret(): number {
    return this.bassSynth?.getFret() ?? 0;
  }

  playBassString(
    bassString: import('../../shared/types/music.js').BassString,
    fret?: number,
    velocity?: number
  ): void {
    if (this.bassSynth) {
      if (fret !== undefined) {
        this.bassSynth.playString(bassString, fret, velocity);
      } else {
        this.bassSynth.playStringAtCurrentFret(bassString, velocity);
      }
    }
  }

  dispose(): void {
    try {
      // Clean up all Tone.js resources
      this.drumKit?.dispose();
      this.pianoSynth?.dispose();
      this.bassSynth?.dispose();
      this.synthSynth?.dispose();
      this.masterGain?.dispose();

      // Clear any scheduled events
      Tone.Transport.cancel();

      this.isInitialized = false;
      this.state = 'idle';
    } catch (error) {
      console.error('Error disposing audio engine:', error);
    }
  }

  /**
   * Get basic engine state
   */
  getEngineState() {
    return {
      isInitialized: this.isInitialized,
      state: this.state,
    };
  }
}
