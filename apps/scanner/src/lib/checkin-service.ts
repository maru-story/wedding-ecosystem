/**
 * Check-in service for QR code verification.
 * Handles online verification via API and offline verification via local cache.
 * Returns color-coded verification results (GREEN, RED, YELLOW).
 */

import { getCachedGuestByQR, updateCachedGuestCheckIn } from './indexed-db';
import { enqueueCheckIn } from './offline-queue';

export type VerificationStatus = 'valid' | 'invalid' | 'duplicate';

export interface VerificationResult {
  status: VerificationStatus;
  guestName?: string;
  guestGroup?: string;
  errorMessage?: string;
  previousCheckInTime?: string;
  scanCount?: number;
}

interface CheckInApiResponse {
  status: 'green' | 'yellow' | 'red';
  guest_name?: string | null;
  guest_group?: string | null;
  message?: string | null;
  checked_in_at?: string | null;
  scan_count?: number | null;
}

/**
 * Verify a scanned QR code payload.
 * When online: sends to API for verification.
 * When offline: verifies against local IndexedDB cache.
 */
export async function verifyQRCode(
  qrPayload: string,
  options: {
    isOnline: boolean;
    apiBaseUrl: string;
    authToken: string;
    eventId: string;
  }
): Promise<VerificationResult> {
  if (options.isOnline) {
    return verifyOnline(qrPayload, options);
  }
  return verifyOffline(qrPayload, options.eventId);
}

/**
 * Online verification: send QR payload to API.
 */
async function verifyOnline(
  qrPayload: string,
  options: {
    apiBaseUrl: string;
    authToken: string;
    eventId: string;
  }
): Promise<VerificationResult> {
  try {
    const response = await fetch(`${options.apiBaseUrl}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.authToken}`,
      },
      body: JSON.stringify({
        qr_payload: qrPayload,
        event_id: options.eventId,
      }),
    });

    const data: CheckInApiResponse = await response.json();

    if (response.ok && data.status === 'green') {
      return {
        status: 'valid',
        guestName: data.guest_name || undefined,
        guestGroup: data.guest_group || undefined,
        scanCount: data.scan_count || undefined,
      };
    }

    if (data.status === 'yellow') {
      return {
        status: 'duplicate',
        guestName: data.guest_name || undefined,
        guestGroup: data.guest_group || undefined,
        previousCheckInTime: data.checked_in_at || undefined,
      };
    }

    // red or other error — invalid QR
    return {
      status: 'invalid',
      errorMessage: data.message || 'QR code tidak valid',
    };
  } catch {
    // Network error — fall back to offline verification
    return verifyOffline(qrPayload, options.eventId);
  }
}

/**
 * Offline verification: check against local IndexedDB cache.
 * Also queues the check-in for later sync.
 */
async function verifyOffline(qrPayload: string, eventId: string): Promise<VerificationResult> {
  try {
    const cachedGuest = await getCachedGuestByQR(qrPayload);

    if (!cachedGuest) {
      return {
        status: 'invalid',
        errorMessage: 'QR tidak ditemukan di cache lokal',
      };
    }

    // Check if guest belongs to the current event
    if (cachedGuest.eventId !== eventId) {
      return {
        status: 'invalid',
        errorMessage: 'QR milik event lain',
      };
    }

    // Check for duplicate - bypass and queue subsequent scan
    if (cachedGuest.checkedIn) {
      const checkedInAt = new Date().toISOString();
      await enqueueCheckIn({
        guestId: cachedGuest.id,
        qrPayload,
        method: 'qr_scan',
        eventId,
        guestName: cachedGuest.name,
      });

      return {
        status: 'valid',
        guestName: cachedGuest.name,
        guestGroup: cachedGuest.group,
        scanCount: 2,
      };
    }

    // Valid — queue the check-in locally
    const checkedInAt = new Date().toISOString();
    await enqueueCheckIn({
      guestId: cachedGuest.id,
      qrPayload,
      method: 'qr_scan',
      eventId,
      guestName: cachedGuest.name,
    });

    // Update local cache to reflect check-in
    await updateCachedGuestCheckIn(cachedGuest.id, checkedInAt);

    return {
      status: 'valid',
      guestName: cachedGuest.name,
      guestGroup: cachedGuest.group,
    };
  } catch {
    return {
      status: 'invalid',
      errorMessage: 'Gagal memverifikasi — coba lagi',
    };
  }
}
