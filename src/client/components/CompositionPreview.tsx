import React from 'react';
import type { CompositionPreview } from '../../shared/utils/previewGenerator.js';

type CompositionPreviewProps = {
  preview: CompositionPreview;
  compact?: boolean;
  showWaveform?: boolean;
};

export function CompositionPreview({
  preview,
  compact = false,
  showWaveform = true,
}: CompositionPreviewProps) {
  if (compact) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm text-gray-800 truncate">{preview.title}</h3>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
            {preview.metadata.complexity}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>⏱️ {preview.metadata.duration}</span>
          <span>🎵 {preview.metadata.noteCount} notes</span>
          <span>👥 {preview.metadata.collaborators.length}</span>
        </div>

        <div className="flex gap-1 mt-2">
          {preview.metadata.instruments.map((instrument, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor:
                  preview.visualPreview.instrumentColors[instrument.toLowerCase()] + '20',
                color: preview.visualPreview.instrumentColors[instrument.toLowerCase()],
                border: `1px solid ${preview.visualPreview.instrumentColors[instrument.toLowerCase()]}40`,
              }}
            >
              {instrument}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{preview.title}</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{preview.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
            {preview.metadata.complexity}
          </span>
          <span className="text-sm text-gray-500">{preview.metadata.duration}</span>
        </div>
      </div>

      {/* Waveform Visualization */}
      {showWaveform && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Audio Preview</h3>
          <div className="relative h-16 bg-gray-50 rounded-lg p-2 overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 400 48" className="absolute inset-0">
              {/* Waveform bars */}
              {preview.visualPreview.waveformData.map((amplitude, index) => {
                const x = (index / preview.visualPreview.waveformData.length) * 400;
                const height = amplitude * 40;
                const y = (48 - height) / 2;

                return (
                  <rect
                    key={index}
                    x={x}
                    y={y}
                    width={3}
                    height={height}
                    fill="#3B82F6"
                    opacity={0.7}
                    rx={1}
                  />
                );
              })}

              {/* Timeline markers */}
              {preview.visualPreview.timelineMarkers.map((marker, index) => {
                const x =
                  (marker.time /
                    Math.max(...preview.visualPreview.timelineMarkers.map((m) => m.time))) *
                  400;
                const color = preview.visualPreview.instrumentColors[marker.instrument];

                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={24}
                    r={3 + marker.intensity * 2}
                    fill={color}
                    opacity={0.8}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{preview.metadata.noteCount}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Notes</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {preview.metadata.instruments.length}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Instruments</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {preview.metadata.collaborators.length}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Musicians</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{preview.metadata.duration}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Duration</div>
        </div>
      </div>

      {/* Instruments */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Instruments</h3>
        <div className="flex flex-wrap gap-2">
          {preview.metadata.instruments.map((instrument, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor:
                  preview.visualPreview.instrumentColors[instrument.toLowerCase()] + '20',
                color: preview.visualPreview.instrumentColors[instrument.toLowerCase()],
                border: `1px solid ${preview.visualPreview.instrumentColors[instrument.toLowerCase()]}40`,
              }}
            >
              {getInstrumentEmoji(instrument.toLowerCase())} {instrument}
            </span>
          ))}
        </div>
      </div>

      {/* Collaborators */}
      {preview.metadata.collaborators.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Musicians ({preview.metadata.collaborators.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {preview.metadata.collaborators.map((collaborator, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                👤 u/{collaborator}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getInstrumentEmoji(instrument: string): string {
  const emojis: Record<string, string> = {
    drums: '🥁',
    piano: '🎹',
    bass: '🎸',
  };
  return emojis[instrument] || '🎵';
}

export default CompositionPreview;
