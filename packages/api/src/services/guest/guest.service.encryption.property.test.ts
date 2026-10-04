import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { GuestService, GuestRepository } from './guest.service';

// --- Constants ---

const TEST_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes in hex for PII

// --- Arbitraries ---

/** Generates a UUID v4 for guest_id */
const arbGuestId = fc.uuid();

/** Generates a UUID v4 for event_id */
const arbEventId = fc.uuid();

// --- Test Helpers ---

/**
 * Creates a minimal mock repository sufficient for QR code generation.
 */
function createMockRepository(): GuestRepository {
  const qrPayloads = new Set<string>();
  const slugs = new Set<string>();

  return {
    createGuest: async (data) => ({
      id: data.id,
      event_id: data.event_id,
      tenant_id: data.tenant_id,
      name: data.name,
      slug: data.slug,
      phone: data.phone,
      group: data.group,
      type: data.type,
      plus_one_count: data.plus_one_count,
      invitation_url: data.invitation_url,
      delivery_status: data.delivery_status,
      created_at: new Date(),
    }),

    createQRCode: async (data) => {
      qrPayloads.add(data.qr_payload);
      return {
        id: data.id,
        guest_id: data.guest_id,
        qr_payload: data.qr_payload,
        is_active: data.is_active,
        generated_at: new Date(),
      };
    },

    findGuestById: async () => null,
    findGuestBySlug: async () => null,
    findGuestsByEvent: async () => ({
      data: [],
      pagination: { page: 1, per_page: 50, total: 0, total_pages: 0 },
    }),
    updateGuest: async () => null,
    deleteGuest: async () => true,
    deleteGuests: async () => 0,
    deactivateQRCode: async () => true,
    deactivateQRCodes: async () => 0,
    findQRCodeByGuestId: async () => null,

    checkSlugExists: async (_eventId: string, slug: string) => {
      if (slugs.has(`${_eventId}:${slug}`)) {
        return true;
      }
      slugs.add(`${_eventId}:${slug}`);
      return false;
    },

    checkQRPayloadExists: async (payload: string) => {
      return qrPayloads.has(payload);
    },

    findEventById: async (eventId: string) => ({
      id: eventId,
      slug: `event-${eventId.slice(0, 8)}`,
    }),
    countGuestsByEvent: async () => 0,
    findGuestNamesByEvent: async () => [],
    searchGuestsByName: async () => [],
    findUniqueGroupsByEvent: async () => [],
    reassignGroup: async () => 0,
    findGuestsForExport: async () => [],
    findSlugsByEvent: async () => [],
    bulkCreateGuestsAndQRCodes: async () => 0,
  };
}

function createGuestService(repository: GuestRepository): GuestService {
  return new GuestService({
    repository,
    encryptionKey: TEST_ENCRYPTION_KEY,
  });
}

// --- Property Tests ---

describe('Property 5: Short QR Token Opacity & Architecture', () => {
  /**
   * **Validates: Requirements 3.5, 13.1**
   *
   * For any generated QR code, the token SHALL be opaque such that raw guest_id
   * and event_id are NOT contained in the token.
   */
  it('token does NOT contain raw guest_id or event_id as plaintext', async () => {
    await fc.assert(
      fc.asyncProperty(arbGuestId, arbEventId, async (guestId, eventId) => {
        const repository = createMockRepository();
        const service = createGuestService(repository);

        const payload = await service.createEncryptedPayload(guestId, eventId);

        // The raw guest_id and event_id must NOT appear in the payload
        expect(payload).not.toContain(guestId);
        expect(payload).not.toContain(eventId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.6, 13.1**
   *
   * Token format is w_ prefix followed by 16 hex characters (18 characters total).
   */
  it('token uses short format (w_ prefix + 16 hex chars = 18 chars)', async () => {
    await fc.assert(
      fc.asyncProperty(arbGuestId, arbEventId, async (guestId, eventId) => {
        const repository = createMockRepository();
        const service = createGuestService(repository);

        const payload = await service.createEncryptedPayload(guestId, eventId);

        expect(payload).toMatch(/^w_[0-9a-f]{16}$/);
        expect(payload.length).toBe(18);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.6, 3.7**
   *
   * Tokens generated across multiple invocations are always unique (64-bit entropy).
   */
  it('tokens are uniquely generated for successive calls', async () => {
    await fc.assert(
      fc.asyncProperty(arbGuestId, arbEventId, fc.integer({ min: 2, max: 10 }), async (guestId, eventId, count) => {
        const repository = createMockRepository();
        const service = createGuestService(repository);

        const tokens: string[] = [];
        for (let i = 0; i < count; i++) {
          const payload = await service.createEncryptedPayload(guestId, eventId);
          tokens.push(payload);
        }

        const uniqueTokens = new Set(tokens);
        expect(uniqueTokens.size).toBe(tokens.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.7**
   *
   * Regenerates token if collision exists in repository.
   */
  it('regenerates token if collision detected in database', async () => {
    const repository = createMockRepository();
    const service = createGuestService(repository);

    let checkCount = 0;
    vi.spyOn(repository, 'checkQRPayloadExists').mockImplementation(async () => {
      checkCount++;
      return checkCount === 1; // collide on first try, succeed on second
    });

    const token = await service.createUniqueQRToken();
    expect(checkCount).toBe(2);
    expect(token).toMatch(/^w_[0-9a-f]{16}$/);
  });
});
