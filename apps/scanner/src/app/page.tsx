/**
 * Scanner main page.
 * Combines QR scanner camera with verification result display.
 * Handles scan lifecycle: scan → verify → display result → return to scan.
 * UI labels in Bahasa Indonesia.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePWA } from '@/components/pwa-provider';
import { useAuth } from '@/components/auth-provider';
import { QRScanner } from '@/components/qr-scanner';
import { VerificationResultDisplay } from '@/components/verification-result';
import { verifyQRCode, type VerificationResult } from '@/lib/checkin-service';

// Module-level cache/promise registry for active device count fetches to prevent duplicate concurrent network requests
const activeDeviceFetches = new Map<string, Promise<number | null>>();

export default function ScannerPage() {
  const { isOnline, apiBaseUrl, authToken, eventId, resetEvent } = usePWA();
  const { user, logout } = useAuth();
  const [isScanning, setIsScanning] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeScannersCount, setActiveScannersCount] = useState<number>(1);

  const fetchActiveScanners = useCallback(async () => {
    if (!eventId || !authToken || !isOnline) return;

    let fetchPromise = activeDeviceFetches.get(eventId);
    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          const response = await fetch(`${apiBaseUrl}/scanner/devices/${eventId}`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });
          if (response.ok) {
            const result = await response.json();
            return result.data?.length || 1;
          }
        } catch (err) {
          console.error('Gagal mengambil data scanner aktif:', err);
        } finally {
          activeDeviceFetches.delete(eventId);
        }
        return null;
      })();
      activeDeviceFetches.set(eventId, fetchPromise);
    }

    try {
      const count = await fetchPromise;
      if (count !== null) {
        setActiveScannersCount(count);
      }
    } catch {
      // ignore
    }
  }, [apiBaseUrl, authToken, eventId, isOnline]);

  useEffect(() => {
    fetchActiveScanners();
    // Poll every 30 seconds to keep it fresh
    const interval = setInterval(fetchActiveScanners, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveScanners]);

  // Prevent duplicate scans of the same QR within a short window
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const handleScan = useCallback(
    async (decodedText: string) => {
      // Debounce: ignore same QR scanned within 3 seconds
      const now = Date.now();
      if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 3000) {
        return;
      }

      // Ignore if already verifying
      if (isVerifying) return;

      lastScannedRef.current = decodedText;
      lastScanTimeRef.current = now;

      // Pause scanning and start verification
      setIsScanning(false);
      setIsVerifying(true);

      try {
        const result = await verifyQRCode(decodedText, {
          isOnline,
          apiBaseUrl,
          authToken,
          eventId,
        });

        setVerificationResult(result);
      } catch {
        setVerificationResult({
          status: 'invalid',
          errorMessage: 'Terjadi kesalahan saat verifikasi',
        });
      } finally {
        setIsVerifying(false);
      }
    },
    [isOnline, apiBaseUrl, authToken, eventId, isVerifying]
  );

  const handleDismissResult = useCallback(() => {
    setVerificationResult(null);
    setIsScanning(true);
    // Reset last scanned to allow re-scanning same QR after dismiss
    lastScannedRef.current = '';
  }, []);

  return (
    <main className="bg-cream flex min-h-screen flex-col items-center px-4 py-6">
      {/* Header */}
      <header className="mb-6 w-full max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-charcoal text-lg font-bold">Wedding Scanner</h1>
            <div className="mt-0.5 flex flex-col gap-0.5">
              <p className="text-charcoal/60 text-xs">{user?.name || 'Scanner Operator'}</p>
              <p className="text-sage flex items-center gap-1 text-[10px] font-semibold">
                <span className="bg-sage h-1.5 w-1.5 animate-pulse rounded-full" />
                {activeScannersCount}/2 Scanner Aktif
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetEvent}
              className="border-border/60 bg-card text-charcoal/80 hover:bg-blush/40 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
              title="Ganti Event"
            >
              <svg
                className="text-charcoal/70 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </button>
            <button
              onClick={logout}
              className="border-border/60 bg-card text-charcoal/80 hover:bg-blush/40 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
              title="Keluar"
            >
              <svg
                className="text-charcoal/70 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* QR Scanner */}
      <div className="w-full max-w-sm">
        <QRScanner onScan={handleScan} isScanning={isScanning} />
      </div>

      {/* Verifying indicator */}
      {isVerifying && (
        <div className="text-charcoal/80 mt-6 flex items-center gap-2">
          <div className="border-sage/40 border-t-sage h-4 w-4 animate-spin rounded-full border-2" />
          <span className="text-sm">Memverifikasi...</span>
        </div>
      )}

      {/* Status info */}
      <div className="border-border/60 bg-card mt-6 w-full max-w-sm rounded-xl border p-3 text-center shadow-sm">
        <p className="text-charcoal/60 text-xs">
          Mode:{' '}
          <span className={isOnline ? 'text-success font-medium' : 'text-warning font-medium'}>
            {isOnline ? 'Online' : 'Offline — Verifikasi Lokal'}
          </span>
        </p>
      </div>

      {/* Manual check-in link */}
      <Link
        href="/manual"
        className="border-border/60 bg-card text-charcoal hover:bg-blush/40 focus:ring-sage/20 mt-4 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:outline-none"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Check-in Manual
      </Link>

      {/* Verification result overlay */}
      {verificationResult && (
        <VerificationResultDisplay result={verificationResult} onDismiss={handleDismissResult} />
      )}
    </main>
  );
}
