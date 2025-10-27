import React from 'react';
import type { DhwaniError } from '../utils/errorHandling.js';

type ErrorMessageProps = {
  error: DhwaniError | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  showDetails?: boolean;
};

export function ErrorMessage({
  error,
  onRetry,
  onDismiss,
  compact = false,
  showDetails = false,
}: ErrorMessageProps) {
  if (!error) return null;

  // Handle string errors
  if (typeof error === 'string') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-red-500 text-lg">⚠️</span>
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-red-800 ${compact ? 'text-sm' : 'text-base'}`}>{error}</p>
          </div>
          {onDismiss && (
            <button onClick={onDismiss} className="ml-3 text-red-400 hover:text-red-600">
              ✕
            </button>
          )}
        </div>
        {onRetry && (
          <div className="mt-3">
            <button
              onClick={onRetry}
              className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  // Handle DhwaniError objects
  const severityColors = {
    low: 'yellow',
    medium: 'orange',
    high: 'red',
    critical: 'red',
  };

  const color = severityColors[error.severity];
  const bgColor = `bg-${color}-50`;
  const borderColor = `border-${color}-200`;
  const textColor = `text-${color}-800`;
  const iconColor = `text-${color}-500`;
  const buttonBg = `bg-${color}-100`;
  const buttonText = `text-${color}-800`;
  const buttonHover = `hover:bg-${color}-200`;

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className={`${iconColor} text-lg`}>
            {error.severity === 'critical' ? '🚨' : '⚠️'}
          </span>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`${textColor} font-medium ${compact ? 'text-sm' : 'text-base'}`}>
              {getErrorTitle(error.type)}
            </h3>
            {onDismiss && (
              <button onClick={onDismiss} className={`ml-3 ${iconColor} hover:opacity-75`}>
                ✕
              </button>
            )}
          </div>
          <p className={`${textColor} mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{error.message}</p>

          {/* Suggestions */}
          {error.suggestions.length > 0 && (
            <div className="mt-3">
              <p className={`${textColor} font-medium text-xs mb-2`}>Try these solutions:</p>
              <ul className={`${textColor} text-xs space-y-1`}>
                {error.suggestions.slice(0, compact ? 2 : 3).map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error details (for debugging) */}
          {showDetails && error.details && (
            <details className="mt-3">
              <summary className={`${textColor} text-xs cursor-pointer hover:underline`}>
                Technical Details
              </summary>
              <pre
                className={`${textColor} text-xs mt-2 p-2 bg-white bg-opacity-50 rounded overflow-auto`}
              >
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {onRetry && error.retryable && (
              <button
                onClick={onRetry}
                className={`text-xs ${buttonBg} ${buttonText} px-3 py-1 rounded ${buttonHover} transition-colors font-medium`}
              >
                Try Again
              </button>
            )}
            {error.type === 'browser_unsupported' && (
              <a
                href="https://browsehappy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs ${buttonBg} ${buttonText} px-3 py-1 rounded ${buttonHover} transition-colors font-medium`}
              >
                Update Browser
              </a>
            )}
            {error.type === 'reddit_api_error' && (
              <a
                href="https://www.redditstatus.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs ${buttonBg} ${buttonText} px-3 py-1 rounded ${buttonHover} transition-colors font-medium`}
              >
                Check Reddit Status
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getErrorTitle(type: string): string {
  const titles: Record<string, string> = {
    audio_init_failed: 'Audio System Error',
    audio_playback_failed: 'Playback Failed',
    network_error: 'Connection Error',
    reddit_api_error: 'Reddit Service Error',
    data_corruption: 'Data Error',
    browser_unsupported: 'Browser Not Supported',
    permission_denied: 'Permission Required',
    storage_full: 'Storage Full',
    composition_too_large: 'Composition Too Large',
    invalid_data: 'Invalid Data',
    timeout: 'Request Timeout',
    unknown: 'Unexpected Error',
  };

  return titles[type] || 'Error';
}

export default ErrorMessage;
