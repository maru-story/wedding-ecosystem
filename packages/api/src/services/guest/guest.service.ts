import { randomUUID, createCipheriv, randomBytes } from 'crypto';
import { ErrorCode } from '@wedding/shared';
import type { CreateGuestInput, UpdateGuestInput, PaginationInput } from '@wedding/shared';
import { GuestGroup, GuestType, DeliveryStatus } from '@wedding/shared';
import { PIIEncryption } from '../../middleware/encryption/encryption';

// --- Constants ---

const GUESTS_PER_PAGE = 50;
const AES_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
/** Minimum characters for guest name search */
const MIN_SEARCH_CHARS = 3;
/** Maximum search results returned */
const MAX_SEARCH_RESULTS = 10;

// --- Types ---

export interface GuestRecord {
  id: string;
  event_id: string;
  tenant_id: string;
  name: string;
  slug: string;
  phone: string | null;
  group: string;
  type: GuestType;
  plus_one_count: number;
  invitation_url: string | null;
  delivery_status: DeliveryStatus;
  created_at: Date;
}

export interface QRCodeRecord {
  id: string;
  guest_id: string;
  qr_payload: string;
  is_active: boolean;
  generated_at: Date;
}

export interface GuestWithQR extends GuestRecord {
  qr_code: QRCodeRecord | null;
}

export interface GuestListItem {
  id: string;
  name: string;
  slug: string;
  group: string;
  type: GuestType;
  plus_one_count: number;
  phone: string | null;
  invitation_url: string | null;
  delivery_status: DeliveryStatus;
  rsvp_status: string | null;
  check_in_status: boolean;
  qr_active: boolean;
}

export interface PaginatedGuestList {
  data: GuestListItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface GuestFilterOptions {
  group?: string;
  status?: 'belum_rsvp' | 'confirmed' | 'declined' | 'checked_in';
  q?: string;
}

export interface GuestServiceError {
  code: ErrorCode;
  message: string;
}

// --- Repository interface (dependency injection) ---

export interface GuestRepository {
  createGuest(data: {
    id: string;
    event_id: string;
    tenant_id: string;
    name: string;
    slug: string;
    phone: string | null;
    group: string;
    type: GuestType;
    plus_one_count: number;
    invitation_url: string | null;
    delivery_status: DeliveryStatus;
  }): Promise<GuestRecord>;

  findUniqueGroupsByEvent(eventId: string, tenantId: string): Promise<string[]>;

  createQRCode(data: {
    id: string;
    guest_id: string;
    qr_payload: string;
    is_active: boolean;
  }): Promise<QRCodeRecord>;

  findGuestById(guestId: string, tenantId: string): Promise<GuestRecord | null>;

  findGuestBySlug(eventId: string, slug: string): Promise<GuestRecord | null>;

  findGuestsByEvent(
    eventId: string,
    tenantId: string,
    pagination: PaginationInput,
    filters?: GuestFilterOptions
  ): Promise<PaginatedGuestList>;

  updateGuest(
    guestId: string,
    tenantId: string,
    data: Partial<{
      name: string;
      slug: string;
      phone: string | null;
      group: string;
      plus_one_count: number;
      invitation_url: string | null;
    }>
  ): Promise<GuestRecord | null>;

  deleteGuest(guestId: string, tenantId: string): Promise<boolean>;

  deleteGuests(guestIds: string[], tenantId: string): Promise<number>;

  deactivateQRCode(guestId: string): Promise<boolean>;

  deactivateQRCodes(guestIds: string[]): Promise<number>;

  findQRCodeByGuestId(guestId: string): Promise<QRCodeRecord | null>;

  checkSlugExists(eventId: string, slug: string): Promise<boolean>;

  checkQRPayloadExists(payload: string): Promise<boolean>;

  findEventById(
    eventId: string,
    tenantId: string
  ): Promise<{ id: string; slug: string; max_guests?: number } | null>;

  countGuestsByEvent(eventId: string, tenantId: string): Promise<number>;

  /**
   * Fetch all guest names for an event, used to pre-seed the duplicate-detection
   * set before a bulk import so existing names are excluded from the batch.
   */
  findGuestNamesByEvent(eventId: string, tenantId: string): Promise<string[]>;

  /**
   * Case-insensitive partial name search within a specific event.
   * Returns at most `limit` records.
   */
  searchGuestsByName(
    query: string,
    eventId: string,
    tenantId: string,
    limit: number
  ): Promise<GuestRecord[]>;

  /**
   * Reassign all guests in an event from one group to another.
   * Returns the number of guests updated.
   */
  reassignGroup(
    eventId: string,
    tenantId: string,
    fromGroup: string,
    toGroup: string
  ): Promise<number>;

  /**
   * Fetch all existing slugs for an event — used to seed the in-memory
   * slug deduplication set before a bulk import.
   */
  findSlugsByEvent(eventId: string, tenantId: string): Promise<string[]>;

  /**
   * Atomically insert many guests and their QR codes in a single transaction.
   * Returns the count of successfully inserted guests.
   */
  bulkCreateGuestsAndQRCodes(
    guests: Array<{
      id: string;
      event_id: string;
      tenant_id: string;
      name: string;
      slug: string;
      phone: string | null;
      group: string;
      type: GuestType;
      plus_one_count: number;
      invitation_url: string | null;
      delivery_status: DeliveryStatus;
    }>,
    qrCodes: Array<{
      id: string;
      guest_id: string;
      qr_payload: string;
      is_active: boolean;
    }>
  ): Promise<number>;
}

// --- Guest Service ---

export class GuestService {
  private readonly repository: GuestRepository;
  private readonly encryptionKey: Buffer;
  private readonly piiEncryption: PIIEncryption;

  constructor(config: { repository: GuestRepository; encryptionKey: string }) {
    this.repository = config.repository;
    this.piiEncryption = new PIIEncryption({ encryptionKey: config.encryptionKey });
    // AES-256 requires a 32-byte key
    this.encryptionKey = Buffer.from(config.encryptionKey, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters) for AES-256');
    }
  }

  // --- Create Guest ---

  /**
   * Add a new guest with auto QR code generation (Req 3.1)
   * - Generates unique slug for invitation URL
   * - Generates AES-256 encrypted QR payload (Req 3.6)
   * - QR payload is unique across the platform (Req 3.7)
   */
  async addGuest(
    eventId: string,
    tenantId: string,
    input: CreateGuestInput,
    existingBatchSlugs?: Set<string>
  ): Promise<GuestWithQR | GuestServiceError> {
    // Verify event exists and belongs to tenant
    const event = await this.repository.findEventById(eventId, tenantId);
    if (!event) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Event tidak ditemukan',
      };
    }

    // Verify guest capacity (max_guests) limit
    const currentCount = await this.repository.countGuestsByEvent(eventId, tenantId);
    if (currentCount >= (event.max_guests ?? 2000)) {
      return {
        code: ErrorCode.GUEST_LIMIT_EXCEEDED,
        message:
          'Kapasitas tamu untuk acara ini telah penuh. Silakan hubungi administrator untuk menambah kuota.',
      };
    }

    // Generate unique slug for the guest
    const slug = await this.generateUniqueSlug(eventId, input.name, undefined, existingBatchSlugs);

    // Create guest record
    const guestId = randomUUID();
    const invitationUrl = `/${event.slug}?to=${slug}`;

    const guest = await this.repository.createGuest({
      id: guestId,
      event_id: eventId,
      tenant_id: tenantId,
      name: input.name,
      slug,
      phone: this.piiEncryption.encrypt(input.phone || null),
      group: input.group,
      type: input.type ?? GuestType.INVITED,
      plus_one_count: input.plus_one_count ?? 0,
      invitation_url: invitationUrl,
      delivery_status: DeliveryStatus.NOT_SENT,
    });

    // Generate QR code with encrypted payload (Req 3.6, 3.7)
    const qrCode = await this.generateQRCode(guestId, eventId);

    return {
      ...guest,
      phone: this.piiEncryption.decrypt(guest.phone),
      qr_code: qrCode,
    };
  }

  // --- Read Guest ---

  /**
   * Get a single guest by ID (Req 3.5)
   */
  async getGuest(guestId: string, tenantId: string): Promise<GuestWithQR | GuestServiceError> {
    const guest = await this.repository.findGuestById(guestId, tenantId);
    if (!guest) {
      return {
        code: ErrorCode.GUEST_NOT_FOUND,
        message: 'Tamu tidak ditemukan',
      };
    }

    const qrCode = await this.repository.findQRCodeByGuestId(guestId);

    return {
      ...guest,
      phone: this.piiEncryption.decrypt(guest.phone),
      qr_code: qrCode,
    };
  }

  // --- Update Guest ---

  /**
   * Update guest data (Req 3.5)
   */
  async updateGuest(
    guestId: string,
    tenantId: string,
    input: UpdateGuestInput
  ): Promise<GuestRecord | GuestServiceError> {
    // Check guest exists
    const existing = await this.repository.findGuestById(guestId, tenantId);
    if (!existing) {
      return {
        code: ErrorCode.GUEST_NOT_FOUND,
        message: 'Tamu tidak ditemukan',
      };
    }

    // Build update data
    const updateData: Partial<{
      name: string;
      slug: string;
      phone: string | null;
      group: string;
      plus_one_count: number;
      invitation_url: string | null;
    }> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
      // Regenerate slug if name changes
      const newSlug = await this.generateUniqueSlug(existing.event_id, input.name, existing.slug);
      updateData.slug = newSlug;

      // Update invitation URL with new slug
      const event = await this.repository.findEventById(existing.event_id, tenantId);
      if (event) {
        updateData.invitation_url = `/${event.slug}?to=${newSlug}`;
      }
    }

    if (input.phone !== undefined) {
      updateData.phone = this.piiEncryption.encrypt(input.phone || null);
    }

    if (input.group !== undefined) {
      updateData.group = input.group;
    }

    if (input.plus_one_count !== undefined) {
      updateData.plus_one_count = input.plus_one_count;
    }

    const updated = await this.repository.updateGuest(guestId, tenantId, updateData);

    if (!updated) {
      return {
        code: ErrorCode.GUEST_NOT_FOUND,
        message: 'Tamu tidak ditemukan',
      };
    }

    return {
      ...updated,
      phone: this.piiEncryption.decrypt(updated.phone),
    };
  }

  // --- Delete Guest ---

  /**
   * Delete guest and deactivate their QR code (Req 3.8)
   */
  async deleteGuest(
    guestId: string,
    tenantId: string
  ): Promise<{ success: boolean } | GuestServiceError> {
    // Check guest exists
    const existing = await this.repository.findGuestById(guestId, tenantId);
    if (!existing) {
      return {
        code: ErrorCode.GUEST_NOT_FOUND,
        message: 'Tamu tidak ditemukan',
      };
    }

    // Deactivate QR code first (Req 3.8)
    await this.repository.deactivateQRCode(guestId);

    // Delete guest record
    const deleted = await this.repository.deleteGuest(guestId, tenantId);

    return { success: deleted };
  }

  /**
   * Delete multiple guests and deactivate their QR codes
   */
  async deleteGuests(
    guestIds: string[],
    tenantId: string
  ): Promise<{ success: boolean; deletedCount: number }> {
    if (guestIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Deactivate QR codes first
    await this.repository.deactivateQRCodes(guestIds);

    // Delete guest records
    const deletedCount = await this.repository.deleteGuests(guestIds, tenantId);

    return { success: true, deletedCount };
  }

  // --- List Guests ---

  /**
   * List guests with pagination and filtering (Req 3.9, 3.10)
   * - Max 50 per page
   * - Filter by group and status
   */
  async listGuests(
    eventId: string,
    tenantId: string,
    pagination: PaginationInput,
    filters?: GuestFilterOptions
  ): Promise<PaginatedGuestList | GuestServiceError> {
    // Verify event exists and belongs to tenant
    const event = await this.repository.findEventById(eventId, tenantId);
    if (!event) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Event tidak ditemukan',
      };
    }

    // Enforce max 100 per page (Req 3.9)
    const sanitizedPagination: PaginationInput = {
      page: pagination.page ?? 1,
      per_page: Math.min(pagination.per_page ?? GUESTS_PER_PAGE, 100),
    };

    const result = await this.repository.findGuestsByEvent(
      eventId,
      tenantId,
      sanitizedPagination,
      filters
    );
    if ('code' in result) return result;

    return {
      ...result,
      data: result.data.map((item) => ({
        ...item,
        phone: this.piiEncryption.decrypt(item.phone),
      })),
    };
  }

  // --- Search Guests ---

  /**
   * Search guests by name within an event (Req 8.1 — guest-management variant)
   * - Minimum 3 characters
   * - Maximum 10 results
   */
  async searchGuests(
    eventId: string,
    tenantId: string,
    query: string
  ): Promise<GuestRecord[] | GuestServiceError> {
    if (query.length < MIN_SEARCH_CHARS) {
      return {
        code: ErrorCode.VALIDATION_FAILED,
        message: `Kata kunci pencarian minimal ${MIN_SEARCH_CHARS} karakter`,
      };
    }

    const event = await this.repository.findEventById(eventId, tenantId);
    if (!event) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Event tidak ditemukan',
      };
    }

    const guests = await this.repository.searchGuestsByName(
      query,
      eventId,
      tenantId,
      MAX_SEARCH_RESULTS
    );
    return guests.map((g) => ({
      ...g,
      phone: this.piiEncryption.decrypt(g.phone),
    }));
  }

  // --- QR Code Generation ---

  /**
   * Generate encrypted QR code payload (Req 3.6, 3.7)
   * Payload contains guest_id + event_id encrypted with AES-256
   */
  async generateQRCode(guestId: string, eventId: string): Promise<QRCodeRecord> {
    const payload = await this.createEncryptedPayload(guestId, eventId);

    const qrCode = await this.repository.createQRCode({
      id: randomUUID(),
      guest_id: guestId,
      qr_payload: payload,
      is_active: true,
    });

    return qrCode;
  }

  /**
   * Create AES-256 encrypted payload (Req 3.6)
   * Format: iv:encrypted_data (hex encoded)
   * Plaintext: guest_id|event_id|timestamp|random_nonce
   */
  async createEncryptedPayload(guestId: string, eventId: string): Promise<string> {
    // Include timestamp and random nonce to ensure uniqueness (Req 3.7)
    const nonce = randomBytes(16).toString('hex');
    const plaintext = `${guestId}|${eventId}|${Date.now()}|${nonce}`;

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Format: iv:encrypted (both hex encoded)
    const payload = `${iv.toString('hex')}:${encrypted}`;

    // Verify uniqueness across platform (Req 3.7)
    const exists = await this.repository.checkQRPayloadExists(payload);
    if (exists) {
      // Extremely unlikely but handle by regenerating
      return this.createEncryptedPayload(guestId, eventId);
    }

    return payload;
  }

  async listUniqueGroups(eventId: string, tenantId: string): Promise<string[] | GuestServiceError> {
    try {
      const groups = await this.repository.findUniqueGroupsByEvent(eventId, tenantId);
      return groups;
    } catch (error) {
      return {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Gagal memuat daftar grup',
      };
    }
  }

  // --- Reassign Group ---

  /**
   * Move all guests from one group to another within an event.
   * Returns the count of updated guests, or an error if the source group doesn't exist.
   */
  async reassignGroup(
    eventId: string,
    tenantId: string,
    fromGroup: string,
    toGroup: string
  ): Promise<{ updatedCount: number } | GuestServiceError> {
    // Verify event exists and belongs to tenant
    const event = await this.repository.findEventById(eventId, tenantId);
    if (!event) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: 'Event tidak ditemukan',
      };
    }

    // Verify the source group actually has guests
    const groups = await this.repository.findUniqueGroupsByEvent(eventId, tenantId);
    if (!groups.includes(fromGroup)) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: `Grup "${fromGroup}" tidak ditemukan dalam event ini`,
      };
    }

    const updatedCount = await this.repository.reassignGroup(eventId, tenantId, fromGroup, toGroup);

    return { updatedCount };
  }

  // --- Bulk Add Guests ---

  /**
   * Prepare and insert a batch of guests atomically.
   *
   * Unlike calling `addGuest` N times (N×4 DB round-trips), this method:
   *   1. Verifies event + capacity once.
   *   2. Fetches all existing slugs once.
   *   3. Generates slugs entirely in-memory.
   *   4. Builds encrypted QR payloads in-memory (CPU only, no DB per row).
   *   5. Inserts all guests + QR codes in a single transaction (2 queries).
   *
   * Returns the number of rows actually inserted.
   */
  async bulkAddGuests(
    eventId: string,
    tenantId: string,
    rows: Array<{
      name: string;
      group: string;
      phone: string | undefined;
      plus_one_count: number;
    }>
  ): Promise<{ insertedCount: number } | GuestServiceError> {
    if (rows.length === 0) return { insertedCount: 0 };

    // 1. Single event + capacity check
    const event = await this.repository.findEventById(eventId, tenantId);
    if (!event) {
      return { code: ErrorCode.NOT_FOUND, message: 'Event tidak ditemukan' };
    }

    const currentCount = await this.repository.countGuestsByEvent(eventId, tenantId);
    const maxGuests = event.max_guests ?? 2000;
    const remaining = maxGuests - currentCount;
    if (remaining <= 0) {
      return {
        code: ErrorCode.GUEST_LIMIT_EXCEEDED,
        message: 'Kapasitas tamu untuk acara ini telah penuh.',
      };
    }

    // Clamp to remaining capacity
    const rowsToInsert = rows.slice(0, remaining);

    // 2. Fetch all existing slugs once
    const existingSlugs = await this.repository.findSlugsByEvent(eventId, tenantId);
    const slugSet = new Set<string>(existingSlugs);

    // 3. Generate all slugs in-memory
    const guestData: Array<{
      id: string;
      event_id: string;
      tenant_id: string;
      name: string;
      slug: string;
      phone: string | null;
      group: string;
      type: GuestType;
      plus_one_count: number;
      invitation_url: string | null;
      delivery_status: DeliveryStatus;
    }> = [];

    const qrData: Array<{
      id: string;
      guest_id: string;
      qr_payload: string;
      is_active: boolean;
    }> = [];

    for (const row of rowsToInsert) {
      const slug = this.generateSlugInMemory(row.name, slugSet);
      slugSet.add(slug); // prevent collision within same batch

      const guestId = randomUUID();
      const invitationUrl = `/${event.slug}?to=${slug}`;
      const encryptedPhone = this.piiEncryption.encrypt(row.phone || null);

      // Build QR payload in-memory (AES-256 — CPU only, no DB check per row)
      const qrPayload = this.createEncryptedPayloadSync(guestId, eventId);

      guestData.push({
        id: guestId,
        event_id: eventId,
        tenant_id: tenantId,
        name: row.name,
        slug,
        phone: encryptedPhone,
        group: row.group,
        type: GuestType.INVITED,
        plus_one_count: row.plus_one_count,
        invitation_url: invitationUrl,
        delivery_status: DeliveryStatus.NOT_SENT,
      });

      qrData.push({
        id: randomUUID(),
        guest_id: guestId,
        qr_payload: qrPayload,
        is_active: true,
      });
    }

    // 4. Single atomic transaction — 2 queries total
    const insertedCount = await this.repository.bulkCreateGuestsAndQRCodes(guestData, qrData);

    return { insertedCount };
  }

  /**
   * Generate a unique slug from a name using an in-memory slug set.
   * Adds numeric suffix until unique. Does NOT hit the database.
   */
  private generateSlugInMemory(name: string, existingSlugs: Set<string>): string {
    const baseSlug = this.nameToSlug(name);
    if (!existingSlugs.has(baseSlug)) return baseSlug;

    let suffix = 2;
    let candidate = `${baseSlug}-${suffix}`;
    while (existingSlugs.has(candidate)) {
      suffix++;
      candidate = `${baseSlug}-${suffix}`;
    }
    return candidate;
  }

  /**
   * Synchronous AES-256-CBC encryption for batch QR payload generation.
   * Randomness comes from IV + nonce — no DB uniqueness check needed because
   * the IV (16 bytes) + nonce (16 bytes) collision probability is negligible.
   */
  private createEncryptedPayloadSync(guestId: string, eventId: string): string {
    const nonce = randomBytes(16).toString('hex');
    const plaintext = `${guestId}|${eventId}|${Date.now()}|${nonce}`;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // --- Slug Generation ---

  /**
   * Generate a unique slug for the guest within the event
   * Format: kebab-case name with optional numeric suffix
   */
  async generateUniqueSlug(
    eventId: string,
    name: string,
    currentSlug?: string,
    existingBatchSlugs?: Set<string>
  ): Promise<string> {
    const baseSlug = this.nameToSlug(name);

    // If the slug hasn't changed, keep it
    if (currentSlug && currentSlug === baseSlug) {
      if (existingBatchSlugs) {
        existingBatchSlugs.add(currentSlug);
      }
      return currentSlug;
    }

    const isSlugTaken = async (slug: string) => {
      if (existingBatchSlugs && existingBatchSlugs.has(slug)) {
        return true;
      }
      return this.repository.checkSlugExists(eventId, slug);
    };

    // Check if base slug is available
    const exists = await isSlugTaken(baseSlug);
    if (!exists) {
      if (existingBatchSlugs) {
        existingBatchSlugs.add(baseSlug);
      }
      return baseSlug;
    }

    // If it's the same as current slug, it's fine (updating same guest)
    if (currentSlug === baseSlug) {
      if (existingBatchSlugs) {
        existingBatchSlugs.add(baseSlug);
      }
      return baseSlug;
    }

    // Add numeric suffix until unique
    let suffix = 2;
    let candidateSlug = `${baseSlug}-${suffix}`;
    while (await isSlugTaken(candidateSlug)) {
      suffix++;
      candidateSlug = `${baseSlug}-${suffix}`;
    }

    if (existingBatchSlugs) {
      existingBatchSlugs.add(candidateSlug);
    }
    return candidateSlug;
  }

  /**
   * Convert a name to a URL-friendly slug
   */
  nameToSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }
}

// --- Type guard ---

/**
 * Type guard to check if a result is a GuestServiceError
 */
export function isGuestError(
  result:
    | GuestWithQR
    | GuestRecord
    | PaginatedGuestList
    | { success: boolean }
    | { insertedCount: number }
    | GuestServiceError
    | string[]
): result is GuestServiceError {
  return (
    'code' in result &&
    'message' in result &&
    !('id' in result) &&
    !('data' in result) &&
    !('success' in result) &&
    !('insertedCount' in result)
  );
}

// --- Exported constants for testing ---

export const GUEST_CONSTANTS = {
  GUESTS_PER_PAGE,
  AES_ALGORITHM,
  IV_LENGTH,
  MIN_SEARCH_CHARS,
  MAX_SEARCH_RESULTS,
} as const;
