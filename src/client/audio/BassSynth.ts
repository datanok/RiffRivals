// Bass guitar synthesis implementation using Tone.js MonoSynth

import * as Tone from 'tone';
import type { SynthConfig } from '../../shared/types/audio.js';
import type { BassString } from '../../shared/types/music.js';
import { BASS_TUNING, MUSICAL_CONSTANTS } from '../../shared/constants/audio.js';

export class BassSynth {
  private monoSynth: Tone.MonoSynth;
  private filter: Tone.Filter;
  private compressor: Tone.Compressor;
  private masterGain: Tone.Gain;
  private currentFret: number = 0;

  constructor(config: SynthConfig, masterGain: Tone.Gain) {
    this.masterGain = masterGain;

    // Create monophonic synthesizer for bass guitar
    this.monoSynth = new Tone.MonoSynth({
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
      },
      filter: {
        Q: 2,
        frequency: 300,
        type: 'lowpass',
        rolloff: -24,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2,
        baseFrequency: 200,
        octaves: 2,
      },
    });

    // Add additional low-pass filter for sub-bass emphasis
    this.filter = new Tone.Filter(config.filter?.frequency ?? 400, 'lowpass');

    // Add compressor for consistent bass response
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 8,
      attack: 0.003,
      release: 0.1,
    });

    // Set up audio chain: MonoSynth -> Filter -> Compressor -> Master
    this.monoSynth.connect(this.filter);
    this.filter.connect(this.compressor);
    this.compressor.connect(this.masterGain);
  }

  playNote(note: string, velocity: number = 0.7, duration: string = '4n'): void {
    // Ensure velocity is in valid range
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    // Parse note to get full note name with octave
    const fullNote = this.parseNote(note);

    // Trigger the note
    this.monoSynth.triggerAttackRelease(fullNote, duration, undefined, clampedVelocity);
  }

  playString(bassString: BassString, fret: number = 0, velocity: number = 0.7): void {
    // Clamp fret to valid range
    const clampedFret = Math.max(0, Math.min(MUSICAL_CONSTANTS.BASS_FRET_RANGE[1], fret));

    // Get the note for this string and fret combination
    const note = this.getStringNote(bassString, clampedFret);
    this.playNote(note, velocity);
  }

  private parseNote(note: string): string {
    // If note already has octave (e.g., "E2"), return as is
    if (/[A-G]#?\d/.test(note)) {
      return note;
    }

    // Handle bass string names
    if (note in BASS_TUNING) {
      return BASS_TUNING[note as BassString];
    }

    // If note is just the note name, assume bass register (octave 1-2)
    const bassOctave = this.getBassOctave(note);
    return `${note}${bassOctave}`;
  }

  private getBassOctave(noteName: string): number {
    // Map note names to appropriate bass octaves
    const noteOctaves: Record<string, number> = {
      'E': 1, // Low E string
      'F': 1,
      'F#': 1,
      'G': 1,
      'G#': 1,
      'A': 1, // A string
      'A#': 1,
      'B': 1,
      'C': 2,
      'C#': 2,
      'D': 2, // D string
      'D#': 2,
    };

    return noteOctaves[noteName] ?? 2;
  }

  private getStringNote(bassString: BassString, fret: number): string {
    // Get the open string note
    const openNote = BASS_TUNING[bassString];

    // Calculate the note at the given fret
    const noteIndex = this.getNoteIndex(openNote);
    const frettedNoteIndex = (noteIndex + fret) % 12;
    const octaveOffset = Math.floor((noteIndex + fret) / 12);

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const frettedNote = notes[frettedNoteIndex];

    // Extract octave from open string and add offset
    const openOctave = parseInt(openNote.slice(-1));
    const frettedOctave = openOctave + octaveOffset;

    return `${frettedNote}${frettedOctave}`;
  }

  private getNoteIndex(note: string): number {
    const noteName = note.slice(0, -1); // Remove octave
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes.indexOf(noteName);
  }

  setFret(fret: number): void {
    this.currentFret = Math.max(0, Math.min(MUSICAL_CONSTANTS.BASS_FRET_RANGE[1], fret));
  }

  getFret(): number {
    return this.currentFret;
  }

  // Play note on current fret
  playStringAtCurrentFret(bassString: BassString, velocity: number = 0.7): void {
    this.playString(bassString, this.currentFret, velocity);
  }

  // Set filter frequency for tone shaping
  setFilterFrequency(frequency: number): void {
    const clampedFreq = Math.max(50, Math.min(2000, frequency));
    this.filter.frequency.value = clampedFreq;
  }

  // Set sub-bass emphasis
  setSubBassEmphasis(amount: number): void {
    // Adjust the filter frequency based on emphasis amount (0-1)
    const clampedAmount = Math.max(0, Math.min(1, amount));
    const baseFreq = 400;
    const minFreq = 150;

    // Lower frequency = more sub-bass
    const targetFreq = baseFreq - (baseFreq - minFreq) * clampedAmount;
    this.setFilterFrequency(targetFreq);
  }

  // Set overall volume
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.monoSynth.volume.value = Tone.gainToDb(clampedVolume);
  }

  // Release current note
  release(): void {
    this.monoSynth.triggerRelease();
  }

  dispose(): void {
    this.monoSynth.dispose();
    this.filter.dispose();
    this.compressor.dispose();
  }
}
