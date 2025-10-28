// improved_predefined_songs_full.ts
// Full-length (45-60s) gameplay-optimized tracks for piano-tiles / Guitar Hero style play.
// - Multi-layer songs: piano + bass + drums + synth where appropriate.
// - Each layer defines a short rhythmic *phrase* (pattern + beats) which is tiled to reach target duration.
// - Helper `expandLayerToNotes` creates NoteEvent arrays with precise ms timing from beats + tempo.
// - Songs are light→medium density (≈2–4 notes/sec) and optimized for falling-note gameplay.

import type {
  InstrumentType,
  ChallengeType,
  ChallengeDifficulty,
  NoteEvent,
  TrackData,
  CompositionData,
} from '../../shared/types/music.js';

interface LayerDef {
  instrument: InstrumentType;
  pattern: string[]; // note tokens or drum tokens
  beats: number[]; // relative beat lengths (1 = quarter)
  waveform?: string; // for synth (optional)
  velocity?: number; // default velocity for generated notes
}

interface SongDef {
  id: string;
  name: string;
  description: string;
  difficulty: ChallengeDifficulty;
  tempo: number; // BPM
  duration: number; // ms (target 45-60s)
  layers: LayerDef[];
}

// Helper: convert beats -> ms per quarter and compute start times
const msPerQuarter = (bpm: number) => 60000 / bpm;

// Tile a short phrase (pattern+beats) to fill `durationMs`. Returns NoteEvent[]
const expandLayerToNotes = (layer: LayerDef, tempo: number, durationMs: number): NoteEvent[] => {
  const quarterMs = msPerQuarter(tempo);
  const notes: NoteEvent[] = [];

  // defensive length clamp
  const phraseLen = Math.max(1, Math.min(layer.pattern.length, layer.beats.length));

  let cursor = 0;
  let iteration = 0;
  while (cursor < durationMs - 1) {
    for (let i = 0; i < phraseLen && cursor < durationMs - 1; i++) {
      const note = layer.pattern[i % layer.pattern.length];
      if (!note) continue; // Skip if note is undefined
      const beat = layer.beats[i % layer.beats.length] ?? 1;
      const start = Math.round(cursor);
      const dur = Math.round(beat * quarterMs);

      notes.push({ note, velocity: layer.velocity ?? 0.85, startTime: start, duration: dur });

      cursor += beat * quarterMs;
    }
    iteration++;
    // safety: prevent infinite loops
    if (iteration > 1000) break;
  }

  // trim overshoot
  return notes.filter((n) => n.startTime < durationMs);
};

// small metadata stub — replace with your project's scoring logic
const calculateChallengeMetadata = (baseDifficulty: ChallengeDifficulty) => {
  const difficultyMap = { easy: 40, medium: 70, hard: 95 } as Record<ChallengeDifficulty, number>;
  return {
    calculatedDifficulty: difficultyMap[baseDifficulty] || 60,
    scoringWeights: { accuracy: 0.7, timing: 0.3 },
  };
};

// ---------- SONG LIBRARY (8 full playable tracks) ----------
export const PREDEFINED_SONGS: SongDef[] = [
  // 1) Rising Dawn — anime-style upbeat, piano lead + synth arps
  {
    id: 'rising_dawn',
    name: '🎹 Rising Dawn',
    description: 'Anime-style upbeat piano lead with shimmering synth arps and steady drums.',
    difficulty: 'medium',
    tempo: 110,
    duration: 48000, // 48s
    layers: [
      // piano lead (melodic, medium density)
      {
        instrument: 'piano',
        pattern: ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4'],
        beats: [0.5, 0.5, 1, 0.5, 0.5, 1, 1, 1],
        velocity: 0.85,
      },
      // bass groove (sparse)
      {
        instrument: 'bass',
        pattern: ['E2', 'E2', 'D2', 'C2'],
        beats: [1, 1, 2, 2],
        velocity: 0.95,
      },
      // drums (kick/snare+hihat) — short phrase uses tokens
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'kick', 'snare', 'kick', 'hihat', 'kick', 'snare'],
        beats: [1, 0.5, 1, 1, 1, 0.5, 1, 1],
        velocity: 0.9,
      },
      // synth arpeggio (fills space)
      {
        instrument: 'synth',
        pattern: ['C5', 'E5', 'G5', 'B4'],
        beats: [0.5, 0.5, 0.5, 0.5],
        waveform: 'sawtooth',
        velocity: 0.75,
      },
    ],
  },

  // 2) Neon Pulse — classic-pop hybrid, slightly denser synth
  {
    id: 'neon_pulse',
    name: '🎧 Neon Pulse',
    description: 'Retro-pop/synthpop with punchy bass and driving drums.',
    difficulty: 'medium',
    tempo: 118,
    duration: 54000, // 54s
    layers: [
      {
        instrument: 'synth',
        pattern: ['A4', 'C5', 'E5', 'C5', 'A4', 'G4'],
        beats: [0.5, 0.5, 1, 0.5, 0.5, 1],
        waveform: 'square',
        velocity: 0.8,
      },
      {
        instrument: 'bass',
        pattern: ['A1', 'A1', 'E2', 'G1'],
        beats: [1, 1, 1, 1],
        velocity: 0.95,
      },
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'kick', 'hihat', 'snare', 'hihat'],
        beats: [1, 0.5, 1, 0.5, 1, 0.5],
        velocity: 0.9,
      },
      {
        instrument: 'piano',
        pattern: ['C4', 'E4', 'G4', 'B4'],
        beats: [2, 0.5, 0.5, 1],
        velocity: 0.7,
      },
    ],
  },

  // 3) Skyline Drive — synthwave, steady arpeggio, light piano
  {
    id: 'skyline_drive',
    name: '🎹 Skyline Drive',
    description: 'Synthwave drive — hypnotic arps, simple piano stabs.',
    difficulty: 'medium',
    tempo: 100,
    duration: 45000, // 45s
    layers: [
      {
        instrument: 'synth',
        pattern: ['C4', 'E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4'],
        beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        waveform: 'sawtooth',
        velocity: 0.8,
      },
      {
        instrument: 'bass',
        pattern: ['C2', 'C2', 'G1', 'G1'],
        beats: [1, 1, 1, 1],
        velocity: 0.95,
      },
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'kick', 'snare'],
        beats: [1, 0.5, 1, 1],
        velocity: 0.9,
      },
      {
        instrument: 'piano',
        pattern: ['E4', 'D4', 'C4', 'D4'],
        beats: [1, 1, 1, 1],
        velocity: 0.7,
      },
    ],
  },

  // 4) Drum Rush — percussion-forward, a rhythm challenge
  {
    id: 'drum_rush',
    name: '🥁 Drum Rush',
    description:
      'A drums-first track to test your timing: varied hihat subdivisions and syncopation.',
    difficulty: 'medium',
    tempo: 130,
    duration: 47000,
    layers: [
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'hihat', 'kick', 'snare', 'hihat', 'kick', 'openhat'],
        beats: [0.5, 0.25, 0.25, 1, 1, 0.25, 0.5, 1],
        velocity: 0.95,
      },
      {
        instrument: 'bass',
        pattern: ['E2', 'E2', 'G2', 'A2'],
        beats: [1, 1, 1, 1],
        velocity: 0.95,
      },
      {
        instrument: 'synth',
        pattern: ['G4', 'A4', 'C5', 'B4'],
        beats: [0.5, 0.5, 1, 1],
        waveform: 'square',
        velocity: 0.8,
      },
    ],
  },

  // 5) Tokyo Nights — lo-fi / anime chill, lower density
  {
    id: 'tokyo_nights',
    name: '🎹 Tokyo Nights',
    description: 'Lo-fi anime-influenced chill track — relaxing but rhythmically interesting.',
    difficulty: 'easy',
    tempo: 88,
    duration: 60000, // 60s
    layers: [
      {
        instrument: 'piano',
        pattern: ['C4', 'E4', 'G4', 'E4'],
        beats: [1, 1, 1, 1],
        velocity: 0.7,
      },
      {
        instrument: 'bass',
        pattern: ['C2', 'C2', 'G1', 'G1'],
        beats: [2, 1, 1, 2],
        velocity: 0.9,
      },
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'snare', 'hihat'],
        beats: [1, 0.5, 1, 0.5],
        velocity: 0.8,
      },
      {
        instrument: 'synth',
        pattern: ['E5', 'D5', 'C5'],
        beats: [2, 1, 1],
        waveform: 'triangle',
        velocity: 0.65,
      },
    ],
  },

  // 6) Bassline Charge — funky, good for medium difficulty groove
  {
    id: 'bassline_charge',
    name: '🎸 Bassline Charge',
    description: 'Funky bass-forward groove with syncopated piano stabs and steady drums.',
    difficulty: 'medium',
    tempo: 116,
    duration: 50000,
    layers: [
      {
        instrument: 'bass',
        pattern: ['E2', 'G2', 'A2', 'B2', 'C3'],
        beats: [0.5, 0.5, 1, 0.5, 1],
        velocity: 0.95,
      },
      {
        instrument: 'piano',
        pattern: ['C4', 'C4', 'E4', 'G4'],
        beats: [1, 0.5, 0.5, 1],
        velocity: 0.8,
      },
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'kick', 'snare', 'hihat'],
        beats: [1, 0.5, 1, 1, 0.5],
        velocity: 0.9,
      },
      {
        instrument: 'synth',
        pattern: ['G4', 'B4', 'D5'],
        beats: [1, 1, 2],
        waveform: 'sawtooth',
        velocity: 0.75,
      },
    ],
  },

  // 7) Eternal Light — emotional anime ballad, sparser
  {
    id: 'eternal_light',
    name: '🎹 Eternal Light',
    description: 'Emotional anime ballad — piano melody with gentle synth pad and soft drums.',
    difficulty: 'easy',
    tempo: 76,
    duration: 54000,
    layers: [
      {
        instrument: 'piano',
        pattern: ['G4', 'F4', 'E4', 'D4', 'C4'],
        beats: [1, 1, 1, 1, 2],
        velocity: 0.75,
      },
      {
        instrument: 'synth',
        pattern: ['C5', 'B4', 'A4'],
        beats: [2, 2, 4],
        waveform: 'sine',
        velocity: 0.6,
      },
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'snare'],
        beats: [2, 0.5, 2],
        velocity: 0.7,
      },
      {
        instrument: 'bass',
        pattern: ['C2', 'G1'],
        beats: [2, 2],
        velocity: 0.85,
      },
    ],
  },

  // 8) Retro Drive — upbeat 8-bit inspired pop
  {
    id: 'retro_drive',
    name: '🎧 Retro Drive',
    description: '8-bit inspired pop with punchy synth leads and driving drums.',
    difficulty: 'medium',
    tempo: 125,
    duration: 48000,
    layers: [
      {
        instrument: 'synth',
        pattern: ['E4', 'G4', 'A4', 'C5', 'B4', 'A4'],
        beats: [0.5, 0.5, 0.5, 0.5, 0.5, 1],
        waveform: 'square',
        velocity: 0.85,
      },
      {
        instrument: 'piano',
        pattern: ['C4', 'E4', 'G4'],
        beats: [1, 1, 2],
        velocity: 0.75,
      },
      {
        instrument: 'drums',
        pattern: ['kick', 'hihat', 'kick', 'snare', 'hihat'],
        beats: [1, 0.5, 1, 1, 0.5],
        velocity: 0.95,
      },
      {
        instrument: 'bass',
        pattern: ['E2', 'E2', 'B1', 'C2'],
        beats: [1, 1, 1, 1],
        velocity: 0.95,
      },
    ],
  },
];

// Convert SongDef -> CompositionData (build tracks with NoteEvent arrays)
export const createDefaultChallenges = (): CompositionData[] => {
  return PREDEFINED_SONGS.map((song) => {
    const layersData: TrackData[] = song.layers.map((layer, li) => {
      const notes = expandLayerToNotes(layer, song.tempo, song.duration);

      const track: TrackData = {
        id: `${song.id}_track_${li}`,
        instrument: layer.instrument,
        notes,
        tempo: song.tempo,
        duration: Math.ceil(song.duration / 1000),
        userId: 'system',
        timestamp: Date.now(),
      };

      return track;
    });

    // Merge metadata for challenge settings using first layer to determine difficulty
    if (layersData.length === 0) {
      throw new Error(`Song ${song.id} has no layers`);
    }

    const primaryTrack = layersData[0]!; // Safe because we checked length above
    const challengeMetadata = calculateChallengeMetadata(song.difficulty);

    return {
      id: song.id,
      layers: layersData,
      metadata: {
        title: song.name,
        description: song.description,
        createdAt: Date.now(),
        collaborators: ['system'],
        tags: ['gameplay', song.difficulty, 'full-length'],
        challengeSettings: {
          challengeType: 'falling_notes' as ChallengeType,
          baseDifficulty: song.difficulty as ChallengeDifficulty,
          calculatedDifficulty: challengeMetadata.calculatedDifficulty,
          scoringWeights: challengeMetadata.scoringWeights,
          allowedAttempts: 3,
          timeLimit: Math.ceil(primaryTrack.duration),
          accuracyThreshold: 70,
          leaderboard: [],
        },
      },
    } as CompositionData;
  });
};

export const getSongById = (id: string) => PREDEFINED_SONGS.find((s) => s.id === id);
