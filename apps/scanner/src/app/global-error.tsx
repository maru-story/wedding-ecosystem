'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/error-reporter';

/**
 * Global error boundary - catches errors in the root layout.
 * Must include <html> and <body> tags since it replaces the root layout.
 * Critical for PWA: ensures the app can recover from fatal errors.
 */
export default function GlobalError({
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
    <html lang="id">
      <body className="font-body antialiased">
        <div className="bg-cream flex min-h-screen flex-col items-center justify-center px-4">
          <div className="text-center">
            <h1 className="font-heading text-charcoal text-lg font-bold">
              Terjadi Kesalahan Sistem
            </h1>
            <p className="text-charcoal/60 mt-2 text-sm">
              Aplikasi scanner mengalami masalah. Silakan muat ulang.
            </p>
            <button
              onClick={reset}
              className="bg-sage hover:bg-sage/90 mt-6 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
