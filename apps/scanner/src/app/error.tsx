'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/error-reporter';

/**
 * Error boundary for the scanner app (Next.js best practice).
 * Must be a Client Component.
 * Provides retry functionality for the PWA context.
 */
export default function ScannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, error?.digest);
  }, [error]);

  return (
    <div className="bg-cream flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="bg-danger/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <svg
            className="text-danger h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="font-heading text-charcoal text-lg font-bold">Terjadi Kesalahan</h2>
        <p className="text-charcoal/60 mt-2 text-sm">
          Scanner mengalami masalah. Silakan coba lagi.
        </p>
        <button
          onClick={reset}
          className="bg-sage hover:bg-sage/90 mt-6 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
