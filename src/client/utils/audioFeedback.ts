import * as Tone from 'tone';

/**
 * Utility functions for audio feedback throughout the app
 */

// Singleton synth for button clicks to avoid creating new instances repeatedly
let clickSynth: Tone.Synth | null = null;
let successSynth: Tone.Synth | null = null;
let errorSynth: Tone.Synth | null = null;

const initializeSynths = () => {
  if (!clickSynth) {
    clickSynth = new Tone.Synth({
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05,
      },
      volume: -10,
    }).toDestination();
  }

  if (!successSynth) {
    successSynth = new Tone.Synth({
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.3,
      },
      volume: -12,
    }).toDestination();
  }

  if (!errorSynth) {
    errorSynth = new Tone.Synth({
      oscillator: {
        type: 'sawtooth',
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0,
        release: 0.1,
      },
      volume: -15,
    }).toDestination();
  }
};

/**
 * Play a click sound for button presses
 */
export const playButtonClick = () => {
  try {
    if (Tone.getContext().state !== 'running') {
      console.log('Audio context not running, skipping button click sound');
      return;
    }

    initializeSynths();

    if (clickSynth) {
      clickSynth.triggerAttackRelease('C6', '32n');
    }
  } catch (error) {
    console.log('Could not play button click sound:', error);
  }
};

/**
 * Play a success sound (e.g., for completed actions, successful hits)
 */
export const playSuccessSound = () => {
  try {
    if (Tone.getContext().state !== 'running') {
      console.log('Audio context not running, skipping success sound');
      return;
    }

    initializeSynths();

    if (successSynth) {
      const now = Tone.now();
      successSynth.triggerAttackRelease('C5', '16n', now);
      successSynth.triggerAttackRelease('E5', '16n', now + 0.08);
      successSynth.triggerAttackRelease('G5', '16n', now + 0.16);
    }
  } catch (error) {
    console.log('Could not play success sound:', error);
  }
};

/**
 * Play an error sound (e.g., for failed actions, misses)
 */
export const playErrorSound = () => {
  try {
    if (Tone.getContext().state !== 'running') {
      console.log('Audio context not running, skipping error sound');
      return;
    }

    initializeSynths();

    if (errorSynth) {
      errorSynth.triggerAttackRelease('E2', '8n');
    }
  } catch (error) {
    console.log('Could not play error sound:', error);
  }
};

/**
 * Play a test sound to verify audio is working
 */
export const playTestSound = async () => {
  try {
    // Ensure audio context is running
    if (Tone.getContext().state === 'suspended') {
      await Tone.start();
      await Tone.getContext().resume();
    }

    const testSynth = new Tone.Synth({
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.5,
      },
    }).toDestination();

    const now = Tone.now();
    testSynth.triggerAttackRelease('C5', '16n', now);
    testSynth.triggerAttackRelease('E5', '16n', now + 0.1);
    testSynth.triggerAttackRelease('G5', '16n', now + 0.2);

    // Clean up after playing
    setTimeout(() => {
      testSynth.dispose();
    }, 1000);

    return true;
  } catch (error) {
    console.error('Could not play test sound:', error);
    return false;
  }
};

/**
 * Clean up audio feedback resources
 */
export const disposeAudioFeedback = () => {
  clickSynth?.dispose();
  successSynth?.dispose();
  errorSynth?.dispose();
  clickSynth = null;
  successSynth = null;
  errorSynth = null;
};
