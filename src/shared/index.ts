// Main export file for shared Dhwani types and constants

// Music types
export type {
  InstrumentType,
  DrumType,
  BassString,
  NoteEvent,
  TrackData,
  CompositionData,
  DhwaniPost,
  ChallengeScore,
  ChallengeType,
  ChallengeDifficulty,
  ScoringWeights,
  ChallengeSettings,
} from './types/music.js';

// Audio engine types
export type {
  AudioEngineState,
  SynthConfig,
  DrumSampleConfig,
  AudioEngineConfig,
  IAudioEngine,
  IRecorder,
  IPlaybackEngine,
} from './types/audio.js';

// UI component types
export type {
  UIMode,
  DrumKitProps,
  PianoProps,
  BassProps,
  InstrumentSelectorProps,
  AudioRecorderProps,
  PlaybackEngineProps,
  RiffPostProps,
  JamReplyProps,
  ChallengeProps,
} from './types/ui.js';

// Audio constants
export {
  DEFAULT_AUDIO_CONFIG,
  MUSICAL_CONSTANTS,
  PIANO_NOTES,
  BASS_TUNING,
  TIMING_CONSTANTS,
} from './constants/audio.js';

// UI constants
export {
  UI_COLORS,
  LAYOUT_CONSTANTS,
  ANIMATION_CONSTANTS,
  BREAKPOINTS,
  UI_TEXT,
} from './constants/ui.js';

// API types
export type {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  CreateRiffRequest,
  CreateRiffResponse,
  CreateJamReplyRequest,
  CreateJamReplyResponse,
  GetCompositionRequest,
  GetCompositionResponse,
  GetThreadCompositionRequest,
  GetThreadCompositionResponse,
  SubmitChallengeScoreRequest,
  SubmitChallengeScoreResponse,
  GetLeaderboardRequest,
  GetLeaderboardResponse,
  GetChallengeScoresRequest,
  GetChallengeScoresResponse,
  CreateChallengeRequest,
  CreateChallengeResponse,
  ApiErrorResponse,
} from './types/api.js';

// Preview generation utilities
export type { CompositionPreview } from './utils/previewGenerator.js';
export {
  generateCompositionPreview,
  generateShortPreview,
  generateVariedTitle,
} from './utils/previewGenerator.js';
