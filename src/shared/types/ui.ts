// UI component interfaces and props for Dhwani instruments

import type { InstrumentType, DrumType, BassString, TrackData } from './music.js';

export type UIMode =
  | 'home'
  | 'create'
  | 'chart_creator'
  | 'remix'
  | 'challenge_select'
  | 'challenge_results'
  | 'falling_notes'
  | 'replication_challenge';

export type DrumKitProps = {
  onNotePlay: (drum: DrumType, velocity: number) => void;
  isRecording: boolean;
  activeNotes: Set<DrumType>;
  disabled?: boolean;
};

export type PianoProps = {
  onNotePlay: (note: string, velocity: number) => void;
  isRecording: boolean;
  activeNotes: Set<string>;
  octave: number;
  disabled?: boolean;
};

export type BassProps = {
  onNotePlay: (string: BassString, fret: number) => void;
  isRecording: boolean;
  selectedFret: number;
  activeNotes: Set<string>;
  disabled?: boolean;
};

export type InstrumentSelectorProps = {
  selectedInstrument: InstrumentType;
  onInstrumentChange: (instrument: InstrumentType) => void;
  disabled?: boolean;
};

export type AudioRecorderProps = {
  instrument: InstrumentType;
  onRecordingComplete: (trackData: TrackData) => void;
  referenceTrack?: TrackData[];
  disabled?: boolean;
};

export type PlaybackEngineProps = {
  tracks: TrackData[];
  onPlaybackStateChange: (isPlaying: boolean) => void;
  visualFeedback: boolean;
  autoPlay?: boolean;
};

export type RiffPostProps = {
  postData: {
    postId: string;
    title: string;
    author: string;
    createdAt: number;
  };
  trackData: TrackData[];
  onJamRequest: () => void;
  onChallengeRequest: () => void;
};

export type JamReplyProps = {
  parentTrackData: TrackData[];
  onReplySubmit: (newTrackData: TrackData) => void;
  onCancel: () => void;
};

export type ChallengeProps = {
  originalTrack: TrackData;
  onScoreSubmit: (score: import('./music.js').ChallengeScore) => void;
  onCancel: () => void;
};
