import React, { useEffect, useState } from 'react';
import { BrowserCompatibility, GracefulDegradation } from '../utils/errorHandling.js';

type BrowserCompatibilityCheckProps = {
  children: React.ReactNode;
  onCompatibilityChecked?: (isSupported: boolean) => void;
};

export function BrowserCompatibilityCheck({
  children,
  onCompatibilityChecked,
}: BrowserCompatibilityCheckProps) {
  const [compatibility, setCompatibility] = useState<{
    isSupported: boolean;
    missingFeatures: string[];
    warnings: string[];
  } | null>(null);
  const [showWarnings, setShowWarnings] = useState(true);

  useEffect(() => {
    const result = BrowserCompatibility.checkCompatibility();
    setCompatibility(result);
    onCompatibilityChecked?.(result.isSupported);
  }, [onCompatibilityChecked]);

  if (!compatibility) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking browser compatibility...</p>
        </div>
      </div>
    );
  }

  // Critical compatibility issues - block the app
  if (!compatibility.isSupported) {
    const browserInfo = BrowserCompatibility.getBrowserInfo();

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Browser Not Supported</h1>
            <p className="text-gray-600">
              Your browser is missing features required for Dhwani to work properly.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Missing Features:</h3>
            <ul className="space-y-2">
              {compatibility.missingFeatures.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-red-600">
                  <span className="mr-2">✗</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Recommended Browsers:</h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://www.google.com/chrome/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="mr-2">🌐</span>
                <span className="text-sm font-medium">Chrome</span>
              </a>
              <a
                href="https://www.mozilla.org/firefox/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="mr-2">🦊</span>
                <span className="text-sm font-medium">Firefox</span>
              </a>
              <a
                href="https://www.apple.com/safari/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="mr-2">🧭</span>
                <span className="text-sm font-medium">Safari</span>
              </a>
              <a
                href="https://www.microsoft.com/edge"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="mr-2">🔷</span>
                <span className="text-sm font-medium">Edge</span>
              </a>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Current Browser:</strong> {browserInfo.name} {browserInfo.version}
            <br />
            <strong>Platform:</strong> {browserInfo.platform}
          </div>
        </div>
      </div>
    );
  }

  // Show warnings but allow the app to continue
  const audioFallback = GracefulDegradation.getAudioFallback();
  const networkFallback = GracefulDegradation.getNetworkFallback();

  return (
    <>
      {/* Compatibility warnings */}
      {showWarnings &&
        (compatibility.warnings.length > 0 ||
          !audioFallback.canPlayAudio ||
          !networkFallback.canSync) && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-yellow-500 text-lg">⚠️</span>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Compatibility Notice</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    {compatibility.warnings.map((warning, index) => (
                      <p key={index} className="mb-1">
                        • {warning}
                      </p>
                    ))}
                    {!audioFallback.canPlayAudio && (
                      <p className="mb-1">• {audioFallback.fallbackMessage}</p>
                    )}
                    {!networkFallback.canSync && (
                      <p className="mb-1">• {networkFallback.fallbackMessage}</p>
                    )}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setShowWarnings(false)}
                      className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Main app content */}
      {children}
    </>
  );
}

export default BrowserCompatibilityCheck;
