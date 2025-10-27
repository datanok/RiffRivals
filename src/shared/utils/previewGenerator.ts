// Composition preview generation utilities

import type { CompositionData, TrackData, InstrumentType } from '../types/music.js';

export type CompositionPreview = {
  title: string;
  description: string;
  metadata: {
    duration: string;
    instruments: string[];
    collaborators: string[];
    noteCount: number;
    complexity: 'Simple' | 'Moderate' | 'Complex';
  };
  visualPreview: {
    waveformData: number[];
    instrumentColors: Record<string, string>;
    timelineMarkers: Array<{
      time: number;
      instrument: InstrumentType;
      intensity: number;
    }>;
  };
};

/**
 * Generate a comprehensive preview for a composition
 */
export function generateCompositionPreview(composition: CompositionData): CompositionPreview {
  const stats = calculateCompositionStats(composition);
  const title = generateEngagingTitle(composition, stats);
  const description = generateDescription(composition, stats);
  const visualPreview = generateVisualPreview(composition);

  return {
    title,
    description,
    metadata: {
      duration: formatDuration(stats.totalDuration),
      instruments: stats.instruments.map(formatInstrumentName),
      collaborators: composition.metadata.collaborators,
      noteCount: stats.totalNotes,
      complexity: determineComplexity(stats),
    },
    visualPreview,
  };
}

/**
 * Calculate detailed statistics about a composition
 */
function calculateCompositionStats(composition: CompositionData) {
  const totalDuration = Math.max(...composition.layers.map((track) => track.duration), 0);
  const totalNotes = composition.layers.reduce((sum, track) => sum + track.notes.length, 0);
  const instruments = Array.from(new Set(composition.layers.map((track) => track.instrument)));

  // Calculate note density (notes per second)
  const noteDensity = totalDuration > 0 ? totalNotes / (totalDuration / 1000) : 0;

  // Calculate instrument distribution
  const instrumentDistribution = composition.layers.reduce(
    (dist, track) => {
      dist[track.instrument] = (dist[track.instrument] || 0) + track.notes.length;
      return dist;
    },
    {} as Record<InstrumentType, number>
  );

  // Calculate tempo variations
  const tempos = composition.layers.map((track) => track.tempo);
  const avgTempo = tempos.reduce((sum, tempo) => sum + tempo, 0) / tempos.length;

  return {
    totalDuration,
    totalNotes,
    instruments,
    trackCount: composition.layers.length,
    collaboratorCount: composition.metadata.collaborators.length,
    noteDensity,
    instrumentDistribution,
    avgTempo,
  };
}

/**
 * Generate an engaging title for the composition
 */
function generateEngagingTitle(composition: CompositionData, stats: any): string {
  // Use custom title if available
  if (composition.metadata.title) {
    return `🎵 ${composition.metadata.title}`;
  }

  const { instruments, collaboratorCount, totalNotes } = stats;

  // Generate title based on composition characteristics
  if (collaboratorCount > 1) {
    const instrumentList = instruments.slice(0, 2).map(formatInstrumentName).join(' & ');
    return `🎵 ${instrumentList} Collaboration (${collaboratorCount} musicians)`;
  }

  if (instruments.length === 1) {
    const instrument = formatInstrumentName(instruments[0]);
    if (totalNotes > 100) {
      return `🎵 Epic ${instrument} Solo`;
    } else if (totalNotes > 50) {
      return `🎵 ${instrument} Groove`;
    } else {
      return `🎵 ${instrument} Riff`;
    }
  }

  if (instruments.length === 2) {
    const [first, second] = instruments.map(formatInstrumentName);
    return `🎵 ${first} & ${second} Duet`;
  }

  return `🎵 ${instruments.length}-Instrument Jam`;
}

/**
 * Generate a descriptive text for the composition
 */
function generateDescription(composition: CompositionData, stats: any): string {
  const { totalDuration, totalNotes, instruments, collaboratorCount, noteDensity, avgTempo } =
    stats;

  const durationText = formatDuration(totalDuration);
  const complexityText = determineComplexity(stats);
  const tempoText = getTempoDescription(avgTempo);

  let description = `A ${complexityText.toLowerCase()} ${tempoText} composition`;

  if (collaboratorCount > 1) {
    description += ` featuring ${collaboratorCount} musicians`;
  }

  description += ` with ${instruments.map(formatInstrumentName).join(', ')}`;
  description += `. ${totalNotes} notes across ${durationText}`;

  if (noteDensity > 5) {
    description += ' - packed with musical energy!';
  } else if (noteDensity > 2) {
    description += ' - a well-balanced musical journey.';
  } else {
    description += ' - a relaxed and spacious arrangement.';
  }

  return description;
}

/**
 * Generate visual preview data for the composition
 */
function generateVisualPreview(composition: CompositionData) {
  const maxDuration = Math.max(...composition.layers.map((track) => track.duration), 0);
  const sampleCount = 100; // Number of waveform samples
  const sampleDuration = maxDuration / sampleCount;

  // Generate waveform data by sampling note density over time
  const waveformData: number[] = [];
  const timelineMarkers: Array<{
    time: number;
    instrument: InstrumentType;
    intensity: number;
  }> = [];

  for (let i = 0; i < sampleCount; i++) {
    const startTime = i * sampleDuration;
    const endTime = (i + 1) * sampleDuration;

    let totalIntensity = 0;
    let maxInstrumentIntensity = 0;
    let dominantInstrument: InstrumentType = 'piano';

    composition.layers.forEach((track) => {
      const notesInRange = track.notes.filter(
        (note) => note.startTime >= startTime && note.startTime < endTime
      );

      const trackIntensity = notesInRange.reduce((sum, note) => sum + note.velocity, 0);
      totalIntensity += trackIntensity;

      if (trackIntensity > maxInstrumentIntensity) {
        maxInstrumentIntensity = trackIntensity;
        dominantInstrument = track.instrument;
      }
    });

    waveformData.push(Math.min(totalIntensity / 10, 1)); // Normalize to 0-1

    // Add timeline markers for significant moments
    if (totalIntensity > 5) {
      timelineMarkers.push({
        time: startTime,
        instrument: dominantInstrument,
        intensity: Math.min(totalIntensity / 20, 1),
      });
    }
  }

  // Generate instrument colors
  const instrumentColors: Record<string, string> = {
    drums: '#FF6B6B', // Red
    piano: '#4ECDC4', // Teal
    bass: '#45B7D1', // Blue
  };

  return {
    waveformData,
    instrumentColors,
    timelineMarkers,
  };
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Format instrument name for display
 */
function formatInstrumentName(instrument: InstrumentType): string {
  const names = {
    drums: 'Drums',
    piano: 'Piano',
    bass: 'Bass',
  };
  return names[instrument];
}

/**
 * Determine complexity level based on composition statistics
 */
function determineComplexity(stats: any): 'Simple' | 'Moderate' | 'Complex' {
  const { totalNotes, trackCount, noteDensity } = stats;

  if (trackCount >= 4 || totalNotes > 200 || noteDensity > 8) {
    return 'Complex';
  } else if (trackCount >= 2 || totalNotes > 50 || noteDensity > 3) {
    return 'Moderate';
  }
  return 'Simple';
}

/**
 * Get tempo description based on BPM
 */
function getTempoDescription(bpm: number): string {
  if (bpm < 60) return 'slow';
  if (bpm < 90) return 'relaxed';
  if (bpm < 120) return 'moderate';
  if (bpm < 140) return 'upbeat';
  return 'fast-paced';
}

/**
 * Generate a short preview text for Reddit post previews
 */
export function generateShortPreview(composition: CompositionData): string {
  const stats = calculateCompositionStats(composition);
  const instruments = stats.instruments.map(formatInstrumentName).join(' + ');
  const duration = formatDuration(stats.totalDuration);

  if (stats.collaboratorCount > 1) {
    return `🎵 ${instruments} • ${stats.collaboratorCount} musicians • ${duration}`;
  }

  return `🎵 ${instruments} • ${stats.totalNotes} notes • ${duration}`;
}

/**
 * Generate engaging post titles with variety
 */
export function generateVariedTitle(composition: CompositionData): string {
  const stats = calculateCompositionStats(composition);

  if (composition.metadata.title) {
    return `🎵 ${composition.metadata.title}`;
  }

  const titleTemplates = [
    () => `🎵 Fresh ${stats.instruments.map(formatInstrumentName).join(' & ')} Jam`,
    () => `🎵 ${determineComplexity(stats)} ${getTempoDescription(stats.avgTempo)} groove`,
    () => `🎵 ${stats.totalNotes}-note musical adventure`,
    () =>
      `🎵 ${formatDuration(stats.totalDuration)} of pure ${stats.instruments.map(formatInstrumentName).join(' + ')}`,
  ];

  if (stats.collaboratorCount > 1) {
    titleTemplates.push(
      () => `🎵 ${stats.collaboratorCount}-musician collaboration`,
      () => `🎵 Community jam session (${stats.instruments.length} instruments)`
    );
  }

  // Select a random template for variety
  const randomTemplate = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
  return randomTemplate();
}
