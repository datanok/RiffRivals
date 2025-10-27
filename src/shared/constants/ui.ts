// UI configuration constants for Dhwani

// Color scheme for instruments and UI elements
export const UI_COLORS = {
  instruments: {
    drums: '#FF6B6B',
    piano: '#4ECDC4',
    bass: '#45B7D1',
  },
  states: {
    active: '#2ECC71',
    recording: '#E74C3C',
    playing: '#F39C12',
    disabled: '#95A5A6',
  },
  feedback: {
    success: '#27AE60',
    warning: '#F1C40F',
    error: '#E74C3C',
    info: '#3498DB',
  },
} as const;

// Layout constants for instrument UIs
export const LAYOUT_CONSTANTS = {
  drumKit: {
    gridColumns: 4,
    gridRows: 2,
    buttonSize: 80, // pixels
    buttonSpacing: 8, // pixels
  },
  piano: {
    whiteKeyWidth: 40, // pixels
    whiteKeyHeight: 120, // pixels
    blackKeyWidth: 24, // pixels
    blackKeyHeight: 80, // pixels
    keysPerOctave: 12,
  },
  bass: {
    stringSpacing: 60, // pixels
    fretWidth: 40, // pixels
    fretHeight: 50, // pixels
    maxFrets: 12,
  },
  controls: {
    buttonHeight: 48, // pixels
    iconSize: 24, // pixels
    spacing: 16, // pixels
  },
} as const;

// Animation and interaction constants
export const ANIMATION_CONSTANTS = {
  buttonPress: {
    duration: 150, // milliseconds
    scale: 0.95,
  },
  noteHighlight: {
    duration: 200, // milliseconds
    opacity: 0.8,
  },
  instrumentSwitch: {
    duration: 300, // milliseconds
  },
  recordingPulse: {
    duration: 1000, // milliseconds
  },
} as const;

// Responsive breakpoints
export const BREAKPOINTS = {
  mobile: 768, // pixels
  tablet: 1024, // pixels
  desktop: 1200, // pixels
} as const;

// Text and messaging constants
export const UI_TEXT = {
  buttons: {
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    record: 'Record',
    jamOnThis: 'Jam on this',
    challengeMode: 'Challenge Mode',
    submit: 'Submit',
    cancel: 'Cancel',
  },
  instruments: {
    drums: 'Drum Kit',
    piano: 'Piano',
    bass: 'Bass Guitar',
  },
  states: {
    recording: 'Recording...',
    playing: 'Playing...',
    loading: 'Loading...',
    ready: 'Ready',
  },
  errors: {
    audioInit: 'Failed to initialize audio. Please check your browser settings.',
    recordingFailed: 'Recording failed. Please try again.',
    playbackFailed: 'Playback failed. Please try again.',
    networkError: 'Network error. Please check your connection.',
  },
} as const;
