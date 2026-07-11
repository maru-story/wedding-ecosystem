const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ErrorReportPayload {
  message?: string;
  stack?: string;
  digest?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

/**
 * Capture and send client-side errors from the Scanner PWA to the backend API.
 * Leverages navigator.sendBeacon for highly reliable delivery during crashes or page unloads.
 */
export function reportError(error: any, digest?: string) {
  try {
    const payload: ErrorReportPayload = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      digest: digest || (error && typeof error === 'object' ? error.digest : undefined),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
    };

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(`${API_BASE_URL}/scanner/logs`, blob);
      if (!sent) {
        // Fallback if sendBeacon queue is full
        sendViaFetch(payload);
      }
    } else {
      sendViaFetch(payload);
    }
  } catch (err) {
    console.error('Failed to report error:', err);
  }
}

function sendViaFetch(payload: ErrorReportPayload) {
  fetch(`${API_BASE_URL}/scanner/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error('Failed to send error log to BE via fetch:', err);
  });
}
