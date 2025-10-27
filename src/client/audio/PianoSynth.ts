// Piano synthesis implementation using Tone.js PolySynth

import * as Tone from 'tone';
import type { SynthConfig } from '../../shared/types/audio.js';
import { PIANO_NOTES, MUSICAL_CONSTANTS } from '../../shared/constants/audio.js';

export class PianoSynth {
  private polySynth: Tone.PolySynth;
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb;
  private masterGain: Tone.Gain;
  private currentOctave: number = 4;

  constructor(config: SynthConfig, masterGain: Tone.Gain) {
    this.masterGain = masterGain;

    // Create polyphonic synthesizer for piano
    this.polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: config.oscillator.type,
      },
      envelope: {
        attack: config.envelope.attack,
        decay: config.envelope.decay,
        sustain: config.envelope.sustain,
        release: config.envelope.release,
        attackCurve: 'exponential',
        decayCurve: 'exponential',
        releaseCurve: 'exponential',
      },
    });

    // Add reverb for more realistic piano sound
    this.reverb = new Tone.Reverb({
      decay: 2.0,
      wet: 0.2,
    });

    // Set up audio chain
    this.setupAudioChain(config);
  }

  private setupAudioChain(config: SynthConfig): void {
    let currentNode: Tone.ToneAudioNode = this.polySynth;

    // Add filter if configured
    if (config.filter) {
      this.filter = new Tone.Filter(config.filter.frequency, config.filter.type);
      currentNode.connect(this.filter);
      currentNode = this.filter;
    }

    // Connect reverb
    currentNode.connect(this.reverb);
    this.reverb.connect(this.masterGain);
  }

  playNote(note: string, velocity: number = 0.7, duration: string = '8n'): void {
    console.log(`PianoSynth: Playing note ${note} with velocity ${velocity}`);
    // Ensure velocity is in valid range
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    // Parse note to ensure it has octave information
    const fullNote = this.parseNote(note);
    console.log(`PianoSynth: Parsed note ${note} to ${fullNote}`);

    try {
      // Trigger the note with velocity-sensitive volume
      this.polySynth.triggerAttackRelease(fullNote, duration, undefined, clampedVelocity);
      console.log(`PianoSynth: Successfully triggered ${fullNote}`);
    } catch (error) {
      console.error(`PianoSynth: Error playing note ${fullNote}:`, error);
    }
  }

  playChord(notes: string[], velocity: number = 0.7, duration: string = '4n'): void {
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));
    const fullNotes = notes.map((note) => this.parseNote(note));

    this.polySynth.triggerAttackRelease(fullNotes, duration, undefined, clampedVelocity);
  }

  private parseNote(note: string): string {
    // If note already has octave (e.g., "C4"), return as is
    if (/[A-G]#?\d/.test(note)) {
      return note;
    }

    // If note is just the note name (e.g., "C"), add current octave
    if (PIANO_NOTES.includes(note as any)) {
      return `${note}${this.currentOctave}`;
    }

    // Handle special drum note names by mapping to piano notes
    const drumToNote: Record<string, string> = {
      kick: 'C2',
      snare: 'D3',
      hihat: 'F#5',
      openhat: 'F#5',
      crash: 'C6',
      ride: 'D6',
      tom1: 'F3',
      tom2: 'C3',
    };

    if (drumToNote[note]) {
      return drumToNote[note];
    }

    // Default fallback
    return `C${this.currentOctave}`;
  }

  setOctave(octave: number): void {
    // Clamp octave to valid piano range
    this.currentOctave = Math.max(
      MUSICAL_CONSTANTS.PIANO_OCTAVE_RANGE[0],
      Math.min(MUSICAL_CONSTANTS.PIANO_OCTAVE_RANGE[1], octave)
    );
  }

  getOctave(): number {
    return this.currentOctave;
  }

  // Get note name with current octave
  getNoteWithOctave(noteName: string): string {
    return this.parseNote(noteName);
  }

  // Get all notes for current octave
  getCurrentOctaveNotes(): string[] {
    return PIANO_NOTES.map((note) => `${note}${this.currentOctave}`);
  }

  // Set filter frequency (useful for expression)
  setFilterFrequency(frequency: number): void {
    if (this.filter) {
      this.filter.frequency.value = Math.max(20, Math.min(20000, frequency));
    }
  }

  // Set reverb amount
  setReverbWet(wetness: number): void {
    const clampedWetness = Math.max(0, Math.min(1, wetness));
    this.reverb.wet.value = clampedWetness;
  }

  // Set overall volume
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.polySynth.volume.value = Tone.gainToDb(clampedVolume);
  }

  // Release all currently playing notes
  releaseAll(): void {
    this.polySynth.releaseAll();
  }

  dispose(): void {
    this.polySynth.dispose();
    this.filter?.dispose();
    this.reverb.dispose();
  }
}
