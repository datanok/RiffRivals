// Drum kit synthesis implementation using Tone.js

import * as Tone from 'tone';
import type { DrumType } from '../../shared/types/music.js';

export class DrumKitSynth {
  private drumSynths: Map<DrumType, Tone.Synth | Tone.NoiseSynth | Tone.MembraneSynth>;
  private masterGain: Tone.Gain;

  constructor(masterGain: Tone.Gain) {
    this.masterGain = masterGain;
    this.drumSynths = new Map();
    this.initializeDrumSynths();
  }

  private initializeDrumSynths(): void {
    // Kick drum - use MembraneSynth for realistic kick sound
    const kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
        attackCurve: 'exponential',
      },
    }).connect(this.masterGain);
    this.drumSynths.set('kick', kickSynth);

    // Snare drum - use NoiseSynth with filtering
    const snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.2,
      },
    });

    // Add high-pass filter for snare character
    const snareFilter = new Tone.Filter(1000, 'highpass');
    snareSynth.connect(snareFilter);
    snareFilter.connect(this.masterGain);
    this.drumSynths.set('snare', snareSynth);

    // Hi-hat (closed) - use NoiseSynth with tight envelope
    const hihatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05,
      },
    });

    // High-pass filter for metallic hi-hat sound
    const hihatFilter = new Tone.Filter(8000, 'highpass');
    hihatSynth.connect(hihatFilter);
    hihatFilter.connect(this.masterGain);
    this.drumSynths.set('hihat', hihatSynth);

    // Open hi-hat - similar to closed but longer decay
    const openhatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0,
        release: 0.3,
      },
    });

    const openhatFilter = new Tone.Filter(6000, 'highpass');
    openhatSynth.connect(openhatFilter);
    openhatFilter.connect(this.masterGain);
    this.drumSynths.set('openhat', openhatSynth);

    // Crash cymbal - use NoiseSynth with long decay
    const crashSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 1.0,
        sustain: 0.1,
        release: 2.0,
      },
    });

    const crashFilter = new Tone.Filter(4000, 'highpass');
    crashSynth.connect(crashFilter);
    crashFilter.connect(this.masterGain);
    this.drumSynths.set('crash', crashSynth);

    // Ride cymbal - metallic sound with sustain
    const rideSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.5,
        sustain: 0.2,
        release: 1.0,
      },
    });

    const rideFilter = new Tone.Filter(3000, 'highpass');
    rideSynth.connect(rideFilter);
    rideFilter.connect(this.masterGain);
    this.drumSynths.set('ride', rideSynth);

    // Tom 1 (high tom) - use MembraneSynth
    const tom1Synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0.1,
        release: 0.8,
      },
    }).connect(this.masterGain);
    this.drumSynths.set('tom1', tom1Synth);

    // Tom 2 (low tom) - use MembraneSynth with lower pitch
    const tom2Synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.1,
        release: 1.0,
      },
    }).connect(this.masterGain);
    this.drumSynths.set('tom2', tom2Synth);
  }

  playDrum(drumType: DrumType, velocity: number = 0.7): void {
    console.log(`DrumKitSynth: Playing ${drumType} with velocity ${velocity}`);
    const synth = this.drumSynths.get(drumType);
    if (!synth) {
      console.warn(`Drum synth not found for type: ${drumType}`);
      return;
    }

    // Clamp velocity to valid range
    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));

    try {
      // Different trigger methods based on synth type
      if (synth instanceof Tone.MembraneSynth) {
        // For kick and toms, use specific pitches
        const pitch = this.getDrumPitch(drumType);
        console.log(`Playing MembraneSynth ${drumType} at pitch ${pitch}`);
        synth.triggerAttackRelease(pitch, '8n', undefined, clampedVelocity);
      } else if (synth instanceof Tone.NoiseSynth) {
        // For noise-based drums (snare, hi-hats, cymbals)
        console.log(`Playing NoiseSynth ${drumType}`);
        synth.triggerAttackRelease('8n', undefined, clampedVelocity);
      } else if (synth instanceof Tone.Synth) {
        // Fallback for regular synths
        const pitch = this.getDrumPitch(drumType);
        console.log(`Playing Synth ${drumType} at pitch ${pitch}`);
        synth.triggerAttackRelease(pitch, '8n', undefined, clampedVelocity);
      }
    } catch (error) {
      console.error(`Error playing drum ${drumType}:`, error);
    }
  }

  private getDrumPitch(drumType: DrumType): string {
    // Define pitches for tonal drums
    const pitches: Record<DrumType, string> = {
      kick: 'C1',
      snare: 'D2', // Not used for NoiseSynth but kept for consistency
      hihat: 'F#4', // Not used for NoiseSynth
      openhat: 'F#4', // Not used for NoiseSynth
      crash: 'C5', // Not used for NoiseSynth
      ride: 'D5', // Not used for NoiseSynth
      tom1: 'F2',
      tom2: 'C2',
    };

    return pitches[drumType];
  }

  setDrumVolume(drumType: DrumType, volume: number): void {
    const synth = this.drumSynths.get(drumType);
    if (synth && 'volume' in synth) {
      synth.volume.value = Tone.gainToDb(Math.max(0, Math.min(1, volume)));
    }
  }

  dispose(): void {
    this.drumSynths.forEach((synth) => {
      synth.dispose();
    });
    this.drumSynths.clear();
  }
}
