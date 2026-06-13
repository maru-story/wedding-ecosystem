/**
 * Verification result display component.
 * Shows color-coded full-screen feedback after QR scan:
 * - GREEN: valid check-in with guest name and group
 * - RED: invalid/not found/wrong event with error message
 * - YELLOW: duplicate check-in with guest name and previous timestamp
 *
 * Auto-dismisses after 5 seconds or on tap.
 * UI labels in Bahasa Indonesia.
 */

'use client';

import { useEffect, useCallback } from 'react';
import type { VerificationResult } from '@/lib/checkin-service';

interface VerificationResultDisplayProps {
  result: VerificationResult;
  onDismiss: () => void;
}

const GROUP_LABELS: Record<string, string> = {
  family: 'Keluarga',
  friend: 'Teman',
  colleague: 'Rekan Kerja',
  vip: 'VIP',
};

function formatTimestamp(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });
  } catch {
    return isoString;
  }
}

export function VerificationResultDisplay({ result, onDismiss }: VerificationResultDisplayProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Dismiss on tap/click
  const handleTap = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Dismiss on key press (accessibility)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        onDismiss();
      }
    },
    [onDismiss]
  );

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center p-8 transition-colors duration-200 ${getBackgroundClass(result.status)}`}
      onClick={handleTap}
      onKeyDown={handleKeyDown}
      role="alert"
      aria-live="assertive"
      tabIndex={0}
    >
      {/* Status icon */}
      <div className="mb-6">{getStatusIcon(result.status)}</div>

      {/* Main content */}
      {result.status === 'valid' && (
        <ValidContent
          guestName={result.guestName}
          guestGroup={result.guestGroup}
          scanCount={result.scanCount}
        />
      )}

      {result.status === 'invalid' && <InvalidContent errorMessage={result.errorMessage} />}

      {result.status === 'duplicate' && (
        <DuplicateContent
          guestName={result.guestName}
          previousCheckInTime={result.previousCheckInTime}
        />
      )}

      {/* Dismiss hint */}
      <p className="mt-8 text-sm text-white/70">Ketuk layar atau tunggu 5 detik untuk kembali</p>
    </div>
  );
}

function ValidContent({
  guestName,
  guestGroup,
  scanCount,
}: {
  guestName?: string;
  guestGroup?: string;
  scanCount?: number;
}) {
  return (
    <div className="text-center text-white">
      <h2 className="text-lg font-medium tracking-wide uppercase">Check-in Berhasil</h2>
      <p className="font-heading mt-4 text-4xl font-bold">{guestName || 'Tamu'}</p>
      {scanCount && scanCount > 1 && (
        <p className="mt-3 inline-block animate-pulse rounded-full border border-white/20 bg-white/20 px-4 py-1 text-xl font-semibold shadow-sm">
          Scan ke-{scanCount}
        </p>
      )}
      {guestGroup && (
        <p className="mt-3 text-xl font-medium opacity-90">
          {GROUP_LABELS[guestGroup] || guestGroup}
        </p>
      )}
    </div>
  );
}

function InvalidContent({ errorMessage }: { errorMessage?: string }) {
  return (
    <div className="text-center text-white">
      <h2 className="text-lg font-medium tracking-wide uppercase">QR Tidak Valid</h2>
      <p className="mt-4 text-xl">{errorMessage || 'QR code tidak dapat diverifikasi'}</p>
    </div>
  );
}

function DuplicateContent({
  guestName,
  previousCheckInTime,
}: {
  guestName?: string;
  previousCheckInTime?: string;
}) {
  return (
    <div className="text-center text-white">
      <h2 className="text-lg font-medium tracking-wide uppercase">Sudah Check-in</h2>
      <p className="font-heading mt-4 text-3xl font-bold">{guestName || 'Tamu'}</p>
      <p className="mt-3 text-base opacity-90">
        Check-in sebelumnya: {formatTimestamp(previousCheckInTime)}
      </p>
    </div>
  );
}

function getBackgroundClass(status: string): string {
  switch (status) {
    case 'valid':
      return 'bg-success';
    case 'invalid':
      return 'bg-danger';
    case 'duplicate':
      return 'bg-warning';
    default:
      return 'bg-charcoal';
  }
}

function getStatusIcon(status: string) {
  const iconClass = 'h-20 w-20 text-white';

  switch (status) {
    case 'valid':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'invalid':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'duplicate':
      return (
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    default:
      return null;
  }
}
