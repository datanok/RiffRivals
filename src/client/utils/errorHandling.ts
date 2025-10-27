// Comprehensive error handling utilities for Dhwani

export type ErrorType =
  | 'audio_init_failed'
  | 'audio_playback_failed'
  | 'network_error'
  | 'reddit_api_error'
  | 'data_corruption'
  | 'browser_unsupported'
  | 'permission_denied'
  | 'storage_full'
  | 'composition_too_large'
  | 'invalid_data'
  | 'timeout'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DhwaniError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  recoverable: boolean;
  retryable: boolean;
  suggestions: string[];
}

/**
 * Error classification and handling utilities
 */
export class ErrorHandler {
  private static errorLog: DhwaniError[] = [];
  private static maxLogSize = 50;

  /**
   * Create a standardized error object
   */
  static createError(
    type: ErrorType,
    message: string,
    details?: any,
    severity: ErrorSeverity = 'medium'
  ): DhwaniError {
    const error: DhwaniError = {
      type,
      severity,
      message,
      details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      recoverable: this.isRecoverable(type),
      retryable: this.isRetryable(type),
      suggestions: this.getSuggestions(type),
    };

    this.logError(error);
    return error;
  }

  /**
   * Handle audio-related errors
   */
  static handleAudioError(originalError: any): DhwaniError {
    let type: ErrorType = 'audio_playback_failed';
    let message = 'Audio playback failed';
    let severity: ErrorSeverity = 'medium';

    if (originalError.name === 'NotAllowedError') {
      type = 'permission_denied';
      message = 'Audio permission denied. Please allow audio access and try again.';
      severity = 'high';
    } else if (originalError.name === 'NotSupportedError') {
      type = 'browser_unsupported';
      message = 'Your browser does not support the required audio features.';
      severity = 'critical';
    } else if (originalError.message?.includes('context')) {
      type = 'audio_init_failed';
      message = 'Failed to initialize audio system. Please refresh the page.';
      severity = 'high';
    }

    return this.createError(type, message, originalError, severity);
  }

  /**
   * Handle network-related errors
   */
  static handleNetworkError(originalError: any, endpoint?: string): DhwaniError {
    let type: ErrorType = 'network_error';
    let message = 'Network connection failed';
    let severity: ErrorSeverity = 'medium';

    if (originalError.name === 'TimeoutError') {
      type = 'timeout';
      message = 'Request timed out. Please check your connection and try again.';
    } else if (originalError.status === 413) {
      type = 'composition_too_large';
      message = 'Your composition is too large to upload. Try reducing the number of notes.';
      severity = 'high';
    } else if (originalError.status >= 500) {
      type = 'reddit_api_error';
      message = 'Reddit server error. Please try again in a moment.';
      severity = 'high';
    } else if (originalError.status === 401 || originalError.status === 403) {
      type = 'permission_denied';
      message = 'You do not have permission to perform this action.';
      severity = 'high';
    }

    return this.createError(type, message, { ...originalError, endpoint }, severity);
  }

  /**
   * Handle data-related errors
   */
  static handleDataError(originalError: any, context?: string): DhwaniError {
    let type: ErrorType = 'invalid_data';
    let message = 'Invalid data format';
    let severity: ErrorSeverity = 'medium';

    if (originalError.message?.includes('JSON')) {
      type = 'data_corruption';
      message = 'Data appears to be corrupted. Please try refreshing the page.';
      severity = 'high';
    } else if (originalError.message?.includes('storage')) {
      type = 'storage_full';
      message = 'Local storage is full. Please clear some browser data and try again.';
      severity = 'high';
    }

    return this.createError(type, message, { ...originalError, context }, severity);
  }

  /**
   * Check if an error type is recoverable
   */
  private static isRecoverable(type: ErrorType): boolean {
    const recoverableTypes: ErrorType[] = [
      'network_error',
      'timeout',
      'audio_playback_failed',
      'reddit_api_error',
    ];
    return recoverableTypes.includes(type);
  }

  /**
   * Check if an error type is retryable
   */
  private static isRetryable(type: ErrorType): boolean {
    const retryableTypes: ErrorType[] = [
      'network_error',
      'timeout',
      'reddit_api_error',
      'audio_init_failed',
    ];
    return retryableTypes.includes(type);
  }

  /**
   * Get user-friendly suggestions for error types
   */
  private static getSuggestions(type: ErrorType): string[] {
    const suggestions: Record<ErrorType, string[]> = {
      audio_init_failed: [
        'Refresh the page and try again',
        'Check if your browser supports Web Audio API',
        'Try using a different browser (Chrome, Firefox, Safari)',
      ],
      audio_playback_failed: [
        'Check your device volume',
        'Try refreshing the page',
        'Ensure no other apps are using audio',
      ],
      network_error: [
        'Check your internet connection',
        'Try again in a few moments',
        'Refresh the page if the problem persists',
      ],
      reddit_api_error: [
        'Reddit servers may be experiencing issues',
        'Try again in a few minutes',
        'Check Reddit status page for updates',
      ],
      data_corruption: [
        'Refresh the page to reload data',
        'Clear browser cache and cookies',
        'Try opening in an incognito/private window',
      ],
      browser_unsupported: [
        'Update your browser to the latest version',
        'Try using Chrome, Firefox, or Safari',
        'Enable JavaScript if disabled',
      ],
      permission_denied: [
        'Allow audio permissions in your browser',
        "Check if you're logged into Reddit",
        'Refresh the page and try again',
      ],
      storage_full: [
        'Clear browser data and cache',
        'Close other browser tabs',
        'Free up disk space on your device',
      ],
      composition_too_large: [
        'Reduce the number of notes in your composition',
        'Split into multiple shorter compositions',
        'Remove some tracks or instruments',
      ],
      invalid_data: [
        'Refresh the page to reload data',
        'Try creating a new composition',
        'Contact support if the issue persists',
      ],
      timeout: [
        'Check your internet connection speed',
        'Try again with a smaller composition',
        'Refresh the page and retry',
      ],
      unknown: [
        'Refresh the page and try again',
        'Clear browser cache and cookies',
        'Contact support if the issue persists',
      ],
    };

    return suggestions[type] || suggestions.unknown;
  }

  /**
   * Log error to internal storage
   */
  private static logError(error: DhwaniError) {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console based on severity
    if (error.severity === 'critical' || error.severity === 'high') {
      console.error('Dhwani Error:', error);
    } else {
      console.warn('Dhwani Warning:', error);
    }
  }

  /**
   * Get recent errors
   */
  static getRecentErrors(count = 10): DhwaniError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  static clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  static getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: this.errorLog.filter((e) => Date.now() - e.timestamp < 300000).length, // Last 5 minutes
    };

    this.errorLog.forEach((error) => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }
}

/**
 * Browser compatibility checker
 */
export class BrowserCompatibility {
  /**
   * Check if the browser supports required features
   */
  static checkCompatibility(): {
    isSupported: boolean;
    missingFeatures: string[];
    warnings: string[];
  } {
    const missingFeatures: string[] = [];
    const warnings: string[] = [];

    // Check Web Audio API
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      missingFeatures.push('Web Audio API');
    }

    // Check Fetch API
    if (!window.fetch) {
      missingFeatures.push('Fetch API');
    }

    // Check Promise support
    if (!window.Promise) {
      missingFeatures.push('Promise support');
    }

    // Check localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch {
      warnings.push('Local storage may not be available');
    }

    // Check for mobile Safari audio limitations
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      warnings.push('iOS devices may have audio playback limitations');
    }

    // Check for old browsers
    const userAgent = navigator.userAgent;
    if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      missingFeatures.push('Modern JavaScript features (Internet Explorer not supported)');
    }

    return {
      isSupported: missingFeatures.length === 0,
      missingFeatures,
      warnings,
    };
  }

  /**
   * Get browser information
   */
  static getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
      name: browserName,
      version: browserVersion,
      userAgent,
      platform: navigator.platform,
      language: navigator.language,
    };
  }
}

/**
 * Graceful degradation utilities
 */
export class GracefulDegradation {
  /**
   * Provide fallback for audio features
   */
  static getAudioFallback(): {
    canPlayAudio: boolean;
    fallbackMessage: string;
    suggestions: string[];
  } {
    const compatibility = BrowserCompatibility.checkCompatibility();

    if (!compatibility.isSupported) {
      return {
        canPlayAudio: false,
        fallbackMessage: 'Audio features are not available in your browser.',
        suggestions: [
          'Update your browser to the latest version',
          'Try using Chrome, Firefox, or Safari',
          'You can still view compositions but cannot play or record audio',
        ],
      };
    }

    return {
      canPlayAudio: true,
      fallbackMessage: '',
      suggestions: [],
    };
  }

  /**
   * Provide fallback for network features
   */
  static getNetworkFallback(): {
    canSync: boolean;
    fallbackMessage: string;
    suggestions: string[];
  } {
    if (!navigator.onLine) {
      return {
        canSync: false,
        fallbackMessage: 'You are currently offline.',
        suggestions: [
          'Check your internet connection',
          'You can still create music locally',
          'Your work will sync when you reconnect',
        ],
      };
    }

    return {
      canSync: true,
      fallbackMessage: '',
      suggestions: [],
    };
  }
}
