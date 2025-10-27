// Synth synthesis implementation using Tone.js PolySynth with multiple waveforms

import * as Tone from 'tone';
import type { SynthConfig, WaveformType } from '../../shared/types/audio.js';
import type { WaveformType as MusicWaveformType } from '../../shared/types/music.js';

export class SynthSynth {
  private polySynth: Tone.PolySynth;
  private filter: Tone.Filter;
  private compressor: Tone.Compressor;
  private reverb: Tone.Reverb;
  private masterGain: Tone.Gain;
  private currentWaveform: MusicWaveformType = 'square';

  constructor(config: SynthConfig, masterGain: Tone.Gain) {
    this.masterGain = masterGain;
    // Create polyphonic synthesizer for synth
    this.polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: this.currentWaveform,
      },
      envelope: {
        attack: config.envelope.attack,
        decay: config.envelope.decay,
        sustain: config.envelope.sustain,
        release: config.envelope.release,
      },
    });

    // Create effects chain
    this.filter = new Tone.Filter({
      frequency: config.filter?.frequency || 2000,
      type: config.filter?.type || 'lowpass',
    });

    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 4,
      attack: 0.1,
      release: 0.3,
    });

    this.reverb = new Tone.Reverb({
      decay: 1.5,
      wet: 0.3,
    });

    this.setupAudioChain(config);
  }

  private setupAudioChain(config: SynthConfig): void {
    let currentNode: Tone.ToneAudioNode = this.polySynth;

    // Add filter if configured
    if (config.filter) {
      currentNode.connect(this.filter);
      currentNode = this.filter;
    }

    // Add compressor
    currentNode.connect(this.compressor);
    currentNode = this.compressor;

    // Add reverb
    currentNode.connect(this.reverb);
    currentNode = this.reverb;

    // Connect to master gain instead of Tone.Destination
    currentNode.connect(this.masterGain);
  }

  playNote(note: string, velocity: number): void {
    try {
      const clampedVelocity = Math.max(0, Math.min(1, velocity));
      const duration = '8n'; // Eighth note duration

      console.log(`SynthSynth: Playing note ${note} with velocity ${velocity}`);

      // Parse note to ensure proper format
      const fullNote = this.parseNote(note);
      console.log(`SynthSynth: Parsed note ${note} to ${fullNote}`);

      // Trigger the note
      this.polySynth.triggerAttackRelease(fullNote, duration, undefined, clampedVelocity);
      console.log(`SynthSynth: Successfully triggered ${fullNote}`);
    } catch (error) {
      console.error(`SynthSynth: Error playing note ${fullNote}:`, error);
    }
  }

  playChord(notes: string[], velocity: number): void {
    try {
      const clampedVelocity = Math.max(0, Math.min(1, velocity));
      const duration = '4n'; // Quarter note duration
      const fullNotes = notes.map((note) => this.parseNote(note));

      console.log(`SynthSynth: Playing chord ${notes.join(', ')} with velocity ${velocity}`);

      // Trigger the chord
      this.polySynth.triggerAttackRelease(fullNotes, duration, undefined, clampedVelocity);
      console.log(`SynthSynth: Successfully triggered chord`);
    } catch (error) {
      console.error(`SynthSynth: Error playing chord:`, error);
    }
  }

  setWaveform(waveform: MusicWaveformType): void {
    this.currentWaveform = waveform;

    // Update all voices in the polySynth
    this.polySynth.set({
      oscillator: {
        type: waveform,
      },
    });

    console.log(`SynthSynth: Waveform changed to ${waveform}`);
  }

  getWaveform(): MusicWaveformType {
    return this.currentWaveform;
  }

  setFilterFrequency(frequency: number): void {
    this.filter.frequency.value = Math.max(20, Math.min(20000, frequency));
  }

  getFilterFrequency(): number {
    return this.filter.frequency.value;
  }

  setFilterType(type: 'lowpass' | 'highpass' | 'bandpass'): void {
    this.filter.type = type;
  }

  setReverbWet(wet: number): void {
    this.reverb.wet.value = Math.max(0, Math.min(1, wet));
  }

  getReverbWet(): number {
    return this.reverb.wet.value;
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.polySynth.volume.value = Tone.gainToDb(clampedVolume);
  }

  getVolume(): number {
    return Tone.dbToGain(this.polySynth.volume.value);
  }

  releaseAll(): void {
    this.polySynth.releaseAll();
  }

  dispose(): void {
    this.polySynth.dispose();
    this.filter.dispose();
    this.compressor.dispose();
    this.reverb.dispose();
  }

  private parseNote(note: string): string {
    // Ensure note is in proper format (e.g., "C4", "C#4", "Bb4")
    const noteRegex = /^([A-G])([#b]?)(\d+)$/;
    const match = note.match(noteRegex);

    if (match) {
      const [, letter, accidental, octave] = match;
      return `${letter}${accidental}${octave}`;
    }

    // If note doesn't match expected format, assume it's already correct
    return note;
  }
}
