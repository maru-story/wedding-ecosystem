/**
 * Unit tests for the check-in verification service.
 * Tests online/offline verification logic and result mapping.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyQRCode, type VerificationResult } from './checkin-service';

// Mock IndexedDB functions
vi.mock('./indexed-db', () => ({
  getCachedGuestByQR: vi.fn(),
  updateCachedGuestCheckIn: vi.fn(),
}));

// Mock offline queue
vi.mock('./offline-queue', () => ({
  enqueueCheckIn: vi.fn().mockResolvedValue({
    success: true,
    overflowWarning: false,
    queuedRecord: {},
  }),
}));

import { getCachedGuestByQR, updateCachedGuestCheckIn } from './indexed-db';
import { enqueueCheckIn } from './offline-queue';

const mockGetCachedGuestByQR = vi.mocked(getCachedGuestByQR);
const mockUpdateCachedGuestCheckIn = vi.mocked(updateCachedGuestCheckIn);
const mockEnqueueCheckIn = vi.mocked(enqueueCheckIn);

const BASE_OPTIONS = {
  apiBaseUrl: 'http://localhost:3100',
  authToken: 'test-token',
  eventId: 'event-123',
};

describe('verifyQRCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('online verification', () => {
    it('returns valid result with guest name and group on successful check-in', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'green',
          guest_name: 'Ahmad Fauzi',
          guest_group: 'family',
          message: null,
          checked_in_at: null,
        }),
      } as Response);

      const result = await verifyQRCode('encrypted-qr-payload', {
        ...BASE_OPTIONS,
        isOnline: true,
      });

      expect(result).toEqual<VerificationResult>({
        status: 'valid',
        guestName: 'Ahmad Fauzi',
        guestGroup: 'family',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3100/checkin/scan',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            qr_payload: 'encrypted-qr-payload',
            event_id: 'event-123',
          }),
        })
      );
    });

    it('returns duplicate result with previous check-in time on yellow status', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'yellow',
          guest_name: 'Siti Rahayu',
          guest_group: 'vip',
          message: 'Tamu sudah check-in',
          checked_in_at: '2025-01-15T10:30:00.000Z',
        }),
      } as Response);

      const result = await verifyQRCode('duplicate-qr', {
        ...BASE_OPTIONS,
        isOnline: true,
      });

      expect(result).toEqual<VerificationResult>({
        status: 'duplicate',
        guestName: 'Siti Rahayu',
        guestGroup: 'vip',
        previousCheckInTime: '2025-01-15T10:30:00.000Z',
      });
    });

    it('returns invalid result on red status', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'red',
          message: 'QR code tidak ditemukan',
        }),
      } as Response);

      const result = await verifyQRCode('unknown-qr', {
        ...BASE_OPTIONS,
        isOnline: true,
      });

      expect(result).toEqual<VerificationResult>({
        status: 'invalid',
        errorMessage: 'QR code tidak ditemukan',
      });
    });

    it('falls back to offline verification on network error', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      mockGetCachedGuestByQR.mockResolvedValueOnce({
        id: 'guest-1',
        name: 'Budi Santoso',
        qrPayload: 'fallback-qr',
        group: 'friend',
        checkedIn: false,
        eventId: 'event-123',
      });

      const result = await verifyQRCode('fallback-qr', {
        ...BASE_OPTIONS,
        isOnline: true,
      });

      expect(result.status).toBe('valid');
      expect(result.guestName).toBe('Budi Santoso');
      expect(result.guestGroup).toBe('friend');
    });
  });

  describe('offline verification', () => {
    it('returns valid result when guest found in cache and not checked in', async () => {
      mockGetCachedGuestByQR.mockResolvedValueOnce({
        id: 'guest-1',
        name: 'Dewi Lestari',
        qrPayload: 'offline-qr',
        group: 'colleague',
        checkedIn: false,
        eventId: 'event-123',
      });

      const result = await verifyQRCode('offline-qr', {
        ...BASE_OPTIONS,
        isOnline: false,
      });

      expect(result).toEqual<VerificationResult>({
        status: 'valid',
        guestName: 'Dewi Lestari',
        guestGroup: 'colleague',
      });

      // Should queue the check-in
      expect(mockEnqueueCheckIn).toHaveBeenCalledWith({
        guestId: 'guest-1',
        qrPayload: 'offline-qr',
        method: 'qr_scan',
        eventId: 'event-123',
        guestName: 'Dewi Lestari',
      });

      // Should update local cache
      expect(mockUpdateCachedGuestCheckIn).toHaveBeenCalledWith(
        'guest-1',
        expect.any(String)
      );
    });

    it('returns valid result and enqueues subsequent scan when guest already checked in locally', async () => {
      mockGetCachedGuestByQR.mockResolvedValueOnce({
        id: 'guest-2',
        name: 'Rina Wati',
        qrPayload: 'dup-qr',
        group: 'family',
        checkedIn: true,
        checkedInAt: '2025-01-15T09:00:00.000Z',
        eventId: 'event-123',
      });

      const result = await verifyQRCode('dup-qr', {
        ...BASE_OPTIONS,
        isOnline: false,
      });

      expect(result).toEqual<VerificationResult>({
        status: 'valid',
        guestName: 'Rina Wati',
        guestGroup: 'family',
        scanCount: 2,
      });

      // Should queue the duplicate check-in
      expect(mockEnqueueCheckIn).toHaveBeenCalled();
    });

    it('returns invalid result when QR not found in local cache', async () => {
      mockGetCachedGuestByQR.mockResolvedValueOnce(undefined);

      const result = await verifyQRCode('unknown-qr', {
        ...BASE_OPTIONS,
        isOnline: false,
      });

      expect(result).toEqual<VerificationResult>({
        status: 'invalid',
        errorMessage: 'QR tidak ditemukan di cache lokal',
      });
    });

    it('returns invalid result when QR belongs to different event', async () => {
      mockGetCachedGuestByQR.mockResolvedValueOnce({
        id: 'guest-3',
        name: 'Other Event Guest',
        qrPayload: 'wrong-event-qr',
        group: 'friend',
        checkedIn: false,
        eventId: 'different-event-456',
      });

      const result = await verifyQRCode('wrong-event-qr', {
        ...BASE_OPTIONS,
        isOnline: false,
      });

      expect(result).toEqual<VerificationResult>({
        status: 'invalid',
        errorMessage: 'QR milik event lain',
      });
    });
  });
});
