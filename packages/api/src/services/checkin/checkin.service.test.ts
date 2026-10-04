import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomBytes } from 'crypto';
import {
  CheckInService,
  CheckInRepository,
  RedisClient,
  CheckInBroadcaster,
  GuestInfo,
  CheckInRecord,
  GuestSearchResult,
  CHECKIN_CONSTANTS,
  isServiceError,
} from './checkin.service';
import {
  CheckInMethod,
  ErrorCode,
  GuestGroup,
  GuestType,
  VerificationStatus,
} from '@wedding/shared';

// --- Test Helpers ---

const qrCodeRegistry = new Map<string, { guest_id: string; is_active: boolean }>();

function createMockRepository(): CheckInRepository {
  return {
    findGuestById: vi.fn(),
    findGuestByIdAndEvent: vi.fn(),
    findQRCodeByPayload: vi.fn().mockImplementation(async (payload: string) => {
      return qrCodeRegistry.get(payload) ?? null;
    }),
    findCheckInByGuestId: vi.fn(),
    createCheckIn: vi.fn().mockImplementation(async (data) => ({
      id: data.id,
      guest_id: data.guest_id,
      scanner_device_id: data.scanner_device_id,
      method: data.method,
      scan_count: 1,
      checked_in_at: data.checked_in_at,
    })),
    incrementScanCount: vi.fn().mockImplementation(async (id) => ({
      id,
      guest_id: 'guest-001',
      scanner_device_id: null,
      method: CheckInMethod.QR_SCAN,
      scan_count: 2,
      checked_in_at: new Date(),
    })),
    searchGuestsByName: vi.fn(),
    createGoShowGuest: vi.fn(),
    findEventById: vi.fn(),
  };
}

function createMockRedis(): RedisClient {
  return {
    set: vi.fn(),
    get: vi.fn(),
  };
}

function createMockBroadcaster(): CheckInBroadcaster {
  return {
    broadcast: vi.fn(),
  };
}

function createMockGuest(overrides: Partial<GuestInfo> = {}): GuestInfo {
  return {
    id: 'guest-001',
    event_id: 'event-001',
    name: 'John Doe',
    group: GuestGroup.FRIEND,
    plus_one_count: 0,
    ...overrides,
  };
}

function createMockCheckIn(overrides: Partial<CheckInRecord> = {}): CheckInRecord {
  return {
    id: 'checkin-001',
    guest_id: 'guest-001',
    scanner_device_id: null,
    method: CheckInMethod.QR_SCAN,
    scan_count: 1,
    checked_in_at: new Date(),
    ...overrides,
  };
}

/**
 * Create a valid Short QR Token for tests and register it in the mock repository
 */
function createValidQRPayload(
  guestId: string,
  _eventId?: string
): string {
  const token = `w_${randomBytes(8).toString('hex')}`;
  qrCodeRegistry.set(token, { guest_id: guestId, is_active: true });
  return token;
}

// --- Tests ---

describe('CheckInService', () => {
  let service: CheckInService;
  let repository: CheckInRepository;
  let redis: RedisClient;
  let broadcaster: CheckInBroadcaster;

  beforeEach(() => {
    qrCodeRegistry.clear();
    repository = createMockRepository();
    redis = createMockRedis();
    broadcaster = createMockBroadcaster();
    vi.mocked(repository.findEventById).mockResolvedValue({
      id: 'event-001',
      tenant_id: 'tenant-001',
    });
    vi.mocked(repository.findGuestById).mockImplementation(async (id: string) => {
      return createMockGuest({ id });
    });
    service = new CheckInService({
      repository,
      redis,
      broadcaster,
    });
  });

  describe('constructor', () => {
    it('should create service with valid configuration', () => {
      expect(
        () =>
          new CheckInService({
            repository,
            redis,
            broadcaster,
          })
      ).not.toThrow();
    });
  });

  describe('verifyQRScan', () => {
    describe('GREEN - valid QR, first check-in (Req 7.2)', () => {
      it('should return GREEN with guest name and group on first check-in', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);
        vi.mocked(redis.set).mockResolvedValue('OK'); // SET NX succeeds
        vi.mocked(repository.createCheckIn).mockResolvedValue(createMockCheckIn());

        const result = await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        expect(result.status).toBe(VerificationStatus.GREEN);
        expect(result.guest_name).toBe('John Doe');
        expect(result.guest_group).toBe(GuestGroup.FRIEND);
        expect(result.message).toBe('Check-in berhasil');
        expect(result.checked_in_at).toBeInstanceOf(Date);
      });

      it('should create a check-in record in the database and broadcast via websocket', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);
        vi.mocked(redis.set).mockResolvedValue('OK');
        vi.mocked(repository.createCheckIn).mockResolvedValue(
          createMockCheckIn({ scanner_device_id: 'scanner-001' })
        );

        await service.verifyQRScan('tenant-001', qrPayload, 'event-001', 'scanner-001');

        expect(repository.createCheckIn).toHaveBeenCalledWith(
          expect.objectContaining({
            guest_id: 'guest-001',
            scanner_device_id: 'scanner-001',
            method: CheckInMethod.QR_SCAN,
          })
        );
        expect(broadcaster.broadcast).toHaveBeenCalledWith(
          'event-001',
          expect.objectContaining({
            event_type: 'guest_checked_in',
            guest_id: 'guest-001',
            method: CheckInMethod.QR_SCAN,
          })
        );
      });

      it('should use Redis SET NX for atomic duplicate detection', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);
        vi.mocked(redis.set).mockResolvedValue('OK');
        vi.mocked(repository.createCheckIn).mockResolvedValue(createMockCheckIn());

        await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        expect(redis.set).toHaveBeenCalledWith(
          'checkin:guest-001',
          expect.any(String),
          'EX',
          CHECKIN_CONSTANTS.CHECKIN_KEY_TTL_SECONDS,
          'NX'
        );
      });
    });

    describe('RED - invalid/not found/wrong event (Req 7.3)', () => {
      it('should return RED when QR payload not found in database', async () => {
        const result = await service.verifyQRScan('tenant-001', 'invalid-payload', 'event-001');

        expect(result.status).toBe(VerificationStatus.RED);
        expect(result.guest_name).toBeNull();
        expect(result.guest_group).toBeNull();
        expect(result.message).toBe('QR code tidak valid');
        expect(result.checked_in_at).toBeNull();
      });

      it('should return RED when QR code is inactive', async () => {
        const inactiveToken = 'w_inactive_token_01';
        qrCodeRegistry.set(inactiveToken, { guest_id: 'guest-001', is_active: false });

        const result = await service.verifyQRScan('tenant-001', inactiveToken, 'event-001');

        expect(result.status).toBe(VerificationStatus.RED);
        expect(result.message).toBe('QR code tidak valid');
      });

      it('should return RED when QR belongs to a different event (Req 7.3)', async () => {
        // Create QR for event-002 but scan at event-001
        const qrPayload = createValidQRPayload('guest-wrong-event', 'event-002');
        vi.mocked(repository.findGuestById).mockImplementation(async (id: string) => {
          if (id === 'guest-wrong-event') {
            return createMockGuest({ id: 'guest-wrong-event', event_id: 'event-002' });
          }
          return createMockGuest({ id });
        });

        const result = await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        expect(result.status).toBe(VerificationStatus.RED);
        expect(result.message).toBe('QR code bukan untuk event ini');
        expect(result.guest_name).toBeNull();
      });

      it('should return RED when guest not found in database', async () => {
        const qrPayload = createValidQRPayload('nonexistent-guest', 'event-001');

        vi.mocked(repository.findGuestById).mockResolvedValue(null);

        const result = await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        expect(result.status).toBe(VerificationStatus.RED);
        expect(result.message).toBe('Tamu tidak ditemukan');
        expect(result.guest_name).toBeNull();
      });
    });

    describe('Bypass duplicate - already checked-in (Req 7.4 / Option C)', () => {
      it('should return GREEN with guest name and incremented scan count', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();
        const existingCheckIn: CheckInRecord = {
          id: 'checkin-001',
          guest_id: 'guest-001',
          scanner_device_id: null,
          method: CheckInMethod.QR_SCAN,
          scan_count: 1,
          checked_in_at: new Date('2024-06-15T10:30:00.000Z'),
        };

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);
        vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(existingCheckIn);
        vi.mocked(repository.incrementScanCount).mockResolvedValue({
          ...existingCheckIn,
          scan_count: 2,
          checked_in_at: new Date(),
        });

        const result = await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        expect(result.status).toBe(VerificationStatus.GREEN);
        expect(result.guest_name).toBe('John Doe');
        expect(result.guest_group).toBe(GuestGroup.FRIEND);
        expect(result.message).toBe('Check-in berhasil (Scan ke-2)');
        expect(result.scan_count).toBe(2);
      });

      it('should call incrementScanCount and NOT createCheckIn (idempotency, Req 7.8)', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();
        const existingCheckIn: CheckInRecord = {
          id: 'checkin-001',
          guest_id: 'guest-001',
          scanner_device_id: null,
          method: CheckInMethod.QR_SCAN,
          scan_count: 1,
          checked_in_at: new Date('2024-06-15T10:30:00.000Z'),
        };

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);
        vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(existingCheckIn);
        vi.mocked(repository.incrementScanCount).mockResolvedValue({
          ...existingCheckIn,
          scan_count: 2,
          checked_in_at: new Date(),
        });

        await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        // Should call incrementScanCount, NOT createCheckIn
        expect(repository.createCheckIn).not.toHaveBeenCalled();
        expect(repository.incrementScanCount).toHaveBeenCalledWith('checkin-001');
      });

      it('should handle concurrent scans - second device increments count (Req 7.5)', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);

        // First scan succeeds as new check-in
        vi.mocked(repository.findCheckInByGuestId).mockResolvedValueOnce(null);
        vi.mocked(redis.set).mockResolvedValueOnce('OK');

        const result1 = await service.verifyQRScan(
          'tenant-001',
          qrPayload,
          'event-001',
          'scanner-001'
        );
        expect(result1.status).toBe(VerificationStatus.GREEN);
        expect(result1.scan_count).toBe(1);

        // Second scan finds existing and increments
        const existingCheckIn: CheckInRecord = {
          id: 'checkin-001',
          guest_id: 'guest-001',
          scanner_device_id: 'scanner-001',
          method: CheckInMethod.QR_SCAN,
          scan_count: 1,
          checked_in_at: new Date(),
        };
        vi.mocked(repository.findCheckInByGuestId).mockResolvedValueOnce(existingCheckIn);
        vi.mocked(repository.incrementScanCount).mockResolvedValueOnce({
          ...existingCheckIn,
          scan_count: 2,
          checked_in_at: new Date(),
        });

        const result2 = await service.verifyQRScan(
          'tenant-001',
          qrPayload,
          'event-001',
          'scanner-002'
        );
        expect(result2.status).toBe(VerificationStatus.GREEN);
        expect(result2.scan_count).toBe(2);
        expect(result2.message).toBe('Check-in berhasil (Scan ke-2)');
      });
    });

    describe('idempotency (Req 7.8)', () => {
      it('should only create one check-in record and increment scan count on subsequent attempts', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);

        // First attempt: no existing check-in, creates check-in
        vi.mocked(repository.findCheckInByGuestId).mockResolvedValueOnce(null);
        await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        // Second attempt: existing check-in found, increments check-in
        const checkInRec: CheckInRecord = {
          id: 'checkin-001',
          guest_id: 'guest-001',
          scanner_device_id: null,
          method: CheckInMethod.QR_SCAN,
          scan_count: 1,
          checked_in_at: new Date(),
        };
        vi.mocked(repository.findCheckInByGuestId).mockResolvedValueOnce(checkInRec);
        await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        // Third attempt: existing check-in found, increments check-in
        vi.mocked(repository.findCheckInByGuestId).mockResolvedValueOnce({
          ...checkInRec,
          scan_count: 2,
        });
        await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        // Only one createCheckIn call should have been made
        expect(repository.createCheckIn).toHaveBeenCalledTimes(1);
        expect(repository.incrementScanCount).toHaveBeenCalledTimes(2);
      });
    });

    describe('scanner device tracking', () => {
      it('should pass scanner_device_id to check-in record', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);
        vi.mocked(redis.set).mockResolvedValue('OK');
        vi.mocked(repository.createCheckIn).mockResolvedValue(
          createMockCheckIn({ scanner_device_id: 'device-abc' })
        );

        await service.verifyQRScan('tenant-001', qrPayload, 'event-001', 'device-abc');

        expect(repository.createCheckIn).toHaveBeenCalledWith(
          expect.objectContaining({
            scanner_device_id: 'device-abc',
          })
        );
      });

      it('should handle null scanner_device_id', async () => {
        const qrPayload = createValidQRPayload('guest-001', 'event-001');
        const mockGuest = createMockGuest();

        vi.mocked(repository.findGuestById).mockResolvedValue(mockGuest);
        vi.mocked(redis.set).mockResolvedValue('OK');
        vi.mocked(repository.createCheckIn).mockResolvedValue(createMockCheckIn());

        await service.verifyQRScan('tenant-001', qrPayload, 'event-001');

        expect(repository.createCheckIn).toHaveBeenCalledWith(
          expect.objectContaining({
            scanner_device_id: null,
          })
        );
      });
    });
  });

  describe('searchGuests (Req 8.1)', () => {
    it('should return search results for valid query (min 3 chars)', async () => {
      const mockResults: GuestSearchResult[] = [
        {
          id: 'guest-001',
          name: 'John Doe',
          group: GuestGroup.FRIEND,
          type: GuestType.INVITED,
          is_checked_in: false,
          checked_in_at: null,
        },
        {
          id: 'guest-002',
          name: 'Johnny Walker',
          group: GuestGroup.FAMILY,
          type: GuestType.INVITED,
          is_checked_in: false,
          checked_in_at: null,
        },
      ];

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.searchGuestsByName).mockResolvedValue(mockResults);

      const result = await service.searchGuests('tenant-001', 'event-001', 'Joh');

      expect(isServiceError(result)).toBe(false);
      if (!isServiceError(result)) {
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('John Doe');
        expect(result[1].name).toBe('Johnny Walker');
      }
    });

    it('should reject query with less than 3 characters', async () => {
      const result = await service.searchGuests('tenant-001', 'event-001', 'Jo');

      expect(isServiceError(result)).toBe(true);
      if (isServiceError(result)) {
        expect(result.code).toBe(ErrorCode.VALIDATION_FAILED);
        expect(result.message).toContain('3');
      }
    });

    it('should return error if event not found', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue(null);

      const result = await service.searchGuests('tenant-001', 'nonexistent-event', 'John');

      expect(isServiceError(result)).toBe(true);
      if (isServiceError(result)) {
        expect(result.code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should pass max 10 results limit to repository', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.searchGuestsByName).mockResolvedValue([]);

      await service.searchGuests('tenant-001', 'event-001', 'John');

      expect(repository.searchGuestsByName).toHaveBeenCalledWith(
        'event-001',
        'John',
        CHECKIN_CONSTANTS.MAX_SEARCH_RESULTS
      );
    });

    it('should include check-in status in results (Req 8.4)', async () => {
      const mockResults: GuestSearchResult[] = [
        {
          id: 'guest-001',
          name: 'John Doe',
          group: GuestGroup.FRIEND,
          type: GuestType.INVITED,
          is_checked_in: false,
          checked_in_at: null,
        },
        {
          id: 'guest-002',
          name: 'Jane Doe',
          group: GuestGroup.FAMILY,
          type: GuestType.INVITED,
          is_checked_in: true,
          checked_in_at: new Date('2024-06-15T09:30:00Z'),
        },
      ];

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.searchGuestsByName).mockResolvedValue(mockResults);

      const result = await service.searchGuests('tenant-001', 'event-001', 'Doe');

      expect(isServiceError(result)).toBe(false);
      if (!isServiceError(result)) {
        expect(result[0].is_checked_in).toBe(false);
        expect(result[0].checked_in_at).toBeNull();
        expect(result[1].is_checked_in).toBe(true);
        expect(result[1].checked_in_at).toEqual(new Date('2024-06-15T09:30:00Z'));
      }
    });

    it('should return empty array when no guests match', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.searchGuestsByName).mockResolvedValue([]);

      const result = await service.searchGuests('tenant-001', 'event-001', 'XYZ');

      expect(isServiceError(result)).toBe(false);
      if (!isServiceError(result)) {
        expect(result).toHaveLength(0);
      }
    });
  });

  describe('manualCheckIn (Req 8.2)', () => {
    it('should check-in a guest with method="manual"', async () => {
      const mockGuest = createMockGuest();
      const mockCheckIn = createMockCheckIn({
        method: CheckInMethod.MANUAL,
        checked_in_at: new Date('2024-06-15T10:00:00Z'),
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.findGuestByIdAndEvent).mockResolvedValue(mockGuest);
      vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(null);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      const result = await service.manualCheckIn('tenant-001', 'guest-001', 'event-001');

      expect(isServiceError(result)).toBe(false);
      if (!isServiceError(result)) {
        expect(result.guest.id).toBe('guest-001');
        expect(result.check_in.method).toBe(CheckInMethod.MANUAL);
      }
    });

    it('should bypass and increment check-in if guest already checked-in (Req 8.4)', async () => {
      const mockGuest = createMockGuest();
      const existingCheckIn = createMockCheckIn({
        method: CheckInMethod.QR_SCAN,
        scan_count: 1,
        checked_in_at: new Date('2024-06-15T09:00:00Z'),
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.findGuestByIdAndEvent).mockResolvedValue(mockGuest);
      vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(existingCheckIn);
      vi.mocked(repository.incrementScanCount).mockResolvedValue({
        ...existingCheckIn,
        scan_count: 2,
        checked_in_at: new Date(),
      });

      const result = await service.manualCheckIn('tenant-001', 'guest-001', 'event-001');

      expect(isServiceError(result)).toBe(false);
      if (!isServiceError(result)) {
        expect(result.guest.id).toBe('guest-001');
        expect(result.check_in.scan_count).toBe(2);
      }
    });

    it('should return error if guest not found', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.findGuestByIdAndEvent).mockResolvedValue(null);

      const result = await service.manualCheckIn('tenant-001', 'nonexistent', 'event-001');

      expect(isServiceError(result)).toBe(true);
      if (isServiceError(result)) {
        expect(result.code).toBe(ErrorCode.GUEST_NOT_FOUND);
      }
    });

    it('should return error if event not found', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue(null);

      const result = await service.manualCheckIn('tenant-001', 'guest-001', 'nonexistent-event');

      expect(isServiceError(result)).toBe(true);
      if (isServiceError(result)) {
        expect(result.code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should broadcast guest_checked_in event via WebSocket (Req 8.8)', async () => {
      const mockGuest = createMockGuest();
      const mockCheckIn = createMockCheckIn({
        method: CheckInMethod.MANUAL,
        checked_in_at: new Date('2024-06-15T10:00:00Z'),
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.findGuestByIdAndEvent).mockResolvedValue(mockGuest);
      vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(null);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      await service.manualCheckIn('tenant-001', 'guest-001', 'event-001');

      expect(broadcaster.broadcast).toHaveBeenCalledWith('event-001', {
        event_type: 'guest_checked_in',
        event_id: 'event-001',
        guest_id: 'guest-001',
        guest_name: 'John Doe',
        guest_group: GuestGroup.FRIEND,
        guest_type: GuestType.INVITED,
        method: CheckInMethod.MANUAL,
        scan_count: mockCheckIn.scan_count,
        checked_in_at: mockCheckIn.checked_in_at,
      });
    });

    it('should broadcast guest_checked_in with incremented count when already checked-in', async () => {
      const mockGuest = createMockGuest();
      const existingCheckIn = createMockCheckIn({
        method: CheckInMethod.QR_SCAN,
        scan_count: 1,
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.findGuestByIdAndEvent).mockResolvedValue(mockGuest);
      vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(existingCheckIn);
      vi.mocked(repository.incrementScanCount).mockResolvedValue({
        ...existingCheckIn,
        scan_count: 2,
        checked_in_at: new Date(),
      });

      await service.manualCheckIn('tenant-001', 'guest-001', 'event-001');

      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        'event-001',
        expect.objectContaining({
          event_type: 'guest_checked_in',
          scan_count: 2,
        })
      );
    });

    it('should pass scanner_device_id when provided', async () => {
      const mockGuest = createMockGuest();
      const mockCheckIn = createMockCheckIn({
        scanner_device_id: 'scanner-001',
        method: CheckInMethod.MANUAL,
        checked_in_at: new Date('2024-06-15T10:00:00Z'),
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.findGuestByIdAndEvent).mockResolvedValue(mockGuest);
      vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(null);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      await service.manualCheckIn('tenant-001', 'guest-001', 'event-001', 'scanner-001');

      expect(repository.createCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          scanner_device_id: 'scanner-001',
          method: CheckInMethod.MANUAL,
        })
      );
    });
  });

  describe('registerGoShow (Req 8.5, 8.6)', () => {
    it('should create go-show guest with type="go_show" and immediate check-in', async () => {
      const mockGuest: GuestInfo = {
        id: 'guest-new',
        event_id: 'event-001',
        name: 'Walk-in Guest',
        group: GuestGroup.FRIEND,
      };
      const mockCheckIn = createMockCheckIn({
        guest_id: 'guest-new',
        method: CheckInMethod.GO_SHOW,
        checked_in_at: new Date('2024-06-15T10:00:00Z'),
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.createGoShowGuest).mockResolvedValue(mockGuest);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      const result = await service.registerGoShow('tenant-001', 'Walk-in Guest', 'event-001');

      expect(isServiceError(result)).toBe(false);
      if (!isServiceError(result)) {
        expect(result.guest.name).toBe('Walk-in Guest');
        expect(result.check_in.method).toBe(CheckInMethod.GO_SHOW);
      }
    });

    it('should create guest with type="go_show" (Req 8.5)', async () => {
      const mockGuest: GuestInfo = {
        id: 'guest-new',
        event_id: 'event-001',
        name: 'New Guest',
        group: GuestGroup.FRIEND,
      };
      const mockCheckIn = createMockCheckIn({
        guest_id: 'guest-new',
        method: CheckInMethod.GO_SHOW,
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.createGoShowGuest).mockResolvedValue(mockGuest);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      await service.registerGoShow('tenant-001', 'New Guest', 'event-001');

      expect(repository.createGoShowGuest).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'event-001',
          tenant_id: 'tenant-001',
          name: 'New Guest',
          type: GuestType.GO_SHOW,
        })
      );
    });

    it('should create check-in with method="go_show" (Req 8.6)', async () => {
      const mockGuest: GuestInfo = {
        id: 'guest-new',
        event_id: 'event-001',
        name: 'New Guest',
        group: GuestGroup.FRIEND,
      };
      const mockCheckIn = createMockCheckIn({
        guest_id: 'guest-new',
        method: CheckInMethod.GO_SHOW,
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.createGoShowGuest).mockResolvedValue(mockGuest);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      await service.registerGoShow('tenant-001', 'New Guest', 'event-001');

      expect(repository.createCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          method: CheckInMethod.GO_SHOW,
          scanner_device_id: null,
        })
      );
      // Verify the guest_id passed to createCheckIn matches what was passed to createGoShowGuest
      const createGoShowCall = vi.mocked(repository.createGoShowGuest).mock.calls[0][0];
      const createCheckInCall = vi.mocked(repository.createCheckIn).mock.calls[0][0];
      expect(createCheckInCall.guest_id).toBe(createGoShowCall.id);
    });

    it('should broadcast go_show_added event via WebSocket (Req 8.8)', async () => {
      const mockGuest: GuestInfo = {
        id: 'guest-new',
        event_id: 'event-001',
        name: 'Walk-in Guest',
        group: GuestGroup.FRIEND,
      };
      const mockCheckIn = createMockCheckIn({
        guest_id: 'guest-new',
        method: CheckInMethod.GO_SHOW,
        checked_in_at: new Date('2024-06-15T10:00:00Z'),
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.createGoShowGuest).mockResolvedValue(mockGuest);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      await service.registerGoShow('tenant-001', 'Walk-in Guest', 'event-001');

      expect(broadcaster.broadcast).toHaveBeenCalledWith('event-001', {
        event_type: 'go_show_added',
        event_id: 'event-001',
        guest_id: 'guest-new',
        guest_name: 'Walk-in Guest',
        guest_group: GuestGroup.FRIEND,
        guest_type: GuestType.GO_SHOW,
        method: CheckInMethod.GO_SHOW,
        scan_count: mockCheckIn.scan_count,
        checked_in_at: mockCheckIn.checked_in_at,
      });
    });

    it('should return error if name is empty', async () => {
      const result = await service.registerGoShow('tenant-001', '', 'event-001');

      expect(isServiceError(result)).toBe(true);
      if (isServiceError(result)) {
        expect(result.code).toBe(ErrorCode.VALIDATION_FAILED);
        expect(result.message).toContain('Nama');
      }
    });

    it('should return error if name is only whitespace', async () => {
      const result = await service.registerGoShow('tenant-001', '   ', 'event-001');

      expect(isServiceError(result)).toBe(true);
      if (isServiceError(result)) {
        expect(result.code).toBe(ErrorCode.VALIDATION_FAILED);
      }
    });

    it('should return error if event not found', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue(null);

      const result = await service.registerGoShow(
        'tenant-001',
        'Walk-in Guest',
        'nonexistent-event'
      );

      expect(isServiceError(result)).toBe(true);
      if (isServiceError(result)) {
        expect(result.code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should trim whitespace from guest name', async () => {
      const mockGuest: GuestInfo = {
        id: 'guest-new',
        event_id: 'event-001',
        name: 'Walk-in Guest',
        group: GuestGroup.FRIEND,
      };
      const mockCheckIn = createMockCheckIn({
        guest_id: 'guest-new',
        method: CheckInMethod.GO_SHOW,
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.createGoShowGuest).mockResolvedValue(mockGuest);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      await service.registerGoShow('tenant-001', '  Walk-in Guest  ', 'event-001');

      expect(repository.createGoShowGuest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Walk-in Guest',
        })
      );
    });

    it('should pass scanner_device_id when provided', async () => {
      const mockGuest: GuestInfo = {
        id: 'guest-new',
        event_id: 'event-001',
        name: 'New Guest',
        group: GuestGroup.FRIEND,
      };
      const mockCheckIn = createMockCheckIn({
        guest_id: 'guest-new',
        scanner_device_id: 'scanner-001',
        method: CheckInMethod.GO_SHOW,
      });

      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.createGoShowGuest).mockResolvedValue(mockGuest);
      vi.mocked(repository.createCheckIn).mockResolvedValue(mockCheckIn);

      await service.registerGoShow('tenant-001', 'New Guest', 'event-001', 'scanner-001');

      expect(repository.createCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          scanner_device_id: 'scanner-001',
          method: CheckInMethod.GO_SHOW,
        })
      );
    });
  });

  describe('syncOfflineRecords', () => {
    it('should process regular check-in records and return synced status', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.findGuestByIdAndEvent).mockResolvedValue(createMockGuest({ id: 'guest-001' }));
      vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(null);
      vi.mocked(repository.createCheckIn).mockResolvedValue(createMockCheckIn({ id: 'checkin-001', guest_id: 'guest-001' }));

      const result = await service.syncOfflineRecords('tenant-001', [
        {
          guest_id: 'guest-001',
          event_id: 'event-001',
          method: 'qr_scan',
          checked_in_at: '2026-10-04T10:00:00.000Z',
        },
      ]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.results[0].status).toBe('synced');
    });

    it('should process go_show records properly by creating guest and check-in', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      vi.mocked(repository.createGoShowGuest).mockResolvedValue(
        createMockGuest({ id: 'guest-goshow-1', name: 'Budi Offline' })
      );
      vi.mocked(repository.createCheckIn).mockResolvedValue(
        createMockCheckIn({ id: 'checkin-goshow-1', guest_id: 'guest-goshow-1', method: CheckInMethod.GO_SHOW })
      );

      const result = await service.syncOfflineRecords('tenant-001', [
        {
          guest_id: 'temp-go-show-123',
          guest_name: 'Budi Offline',
          event_id: 'event-001',
          method: 'go_show',
          checked_in_at: '2026-10-04T10:05:00.000Z',
        },
      ]);

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
      expect(result.errors).toBe(0);
      expect(repository.createGoShowGuest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Budi Offline',
          event_id: 'event-001',
        })
      );
    });

    it('should handle duplicates and errors in batch gracefully', async () => {
      vi.mocked(repository.findEventById).mockResolvedValue({
        id: 'event-001',
        tenant_id: 'tenant-001',
      });
      // First guest: exists and already checked in
      vi.mocked(repository.findGuestByIdAndEvent).mockImplementation(async (id) => {
        if (id === 'guest-dup') return createMockGuest({ id: 'guest-dup' });
        return null; // second guest not found
      });
      vi.mocked(repository.findCheckInByGuestId).mockResolvedValue(createMockCheckIn({ id: 'existing-checkin', scan_count: 1 }));
      vi.mocked(repository.incrementScanCount).mockResolvedValue(createMockCheckIn({ id: 'existing-checkin', scan_count: 2 }));

      const result = await service.syncOfflineRecords('tenant-001', [
        {
          guest_id: 'guest-dup',
          event_id: 'event-001',
          method: 'qr_scan',
          checked_in_at: '2026-10-04T10:00:00.000Z',
        },
        {
          guest_id: 'guest-unknown',
          event_id: 'event-001',
          method: 'qr_scan',
          checked_in_at: '2026-10-04T10:00:00.000Z',
        },
      ]);

      expect(result.total).toBe(2);
      expect(result.duplicates).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe('isServiceError type guard', () => {
    it('should return true for error objects', () => {
      expect(isServiceError({ code: ErrorCode.GUEST_NOT_FOUND, message: 'Not found' })).toBe(true);
    });

    it('should return false for search results (array)', () => {
      const results: GuestSearchResult[] = [
        {
          id: 'guest-001',
          name: 'John',
          group: GuestGroup.FRIEND,
          type: GuestType.INVITED,
          is_checked_in: false,
          checked_in_at: null,
        },
      ];
      expect(isServiceError(results)).toBe(false);
    });

    it('should return false for manual check-in result', () => {
      expect(
        isServiceError({
          guest: createMockGuest(),
          check_in: createMockCheckIn({
            method: CheckInMethod.MANUAL,
          }),
        })
      ).toBe(false);
    });

    it('should return false for go-show result', () => {
      expect(
        isServiceError({
          guest: createMockGuest(),
          check_in: createMockCheckIn({
            method: CheckInMethod.GO_SHOW,
          }),
        })
      ).toBe(false);
    });
  });
});
