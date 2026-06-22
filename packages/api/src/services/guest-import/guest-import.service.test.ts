import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseCSV,
  validateRow,
  bulkImportGuests,
  CSVRow,
  IMPORT_CONSTANTS,
} from './guest-import.service';
import { GuestService, GuestRepository, GuestRecord, QRCodeRecord } from '../guest/guest.service';
import { GuestGroup, GuestType, DeliveryStatus, ErrorCode } from '@wedding/shared';

// --- Test Helpers ---

const TEST_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

function createMockRepository(): GuestRepository {
  return {
    createGuest: vi.fn(),
    createQRCode: vi.fn(),
    findGuestById: vi.fn(),
    findGuestBySlug: vi.fn(),
    findGuestsByEvent: vi.fn(),
    updateGuest: vi.fn(),
    deleteGuest: vi.fn(),
    deleteGuests: vi.fn(),
    deactivateQRCode: vi.fn(),
    deactivateQRCodes: vi.fn(),
    findQRCodeByGuestId: vi.fn(),
    checkSlugExists: vi.fn(),
    checkQRPayloadExists: vi.fn(),
    findEventById: vi.fn(),
    countGuestsByEvent: vi.fn(async () => 0),
    findGuestNamesByEvent: vi.fn(),
    searchGuestsByName: vi.fn(),
  };
}

function createMockGuestRecord(name: string): GuestRecord {
  return {
    id: `guest-${name.toLowerCase().replace(/\s/g, '-')}`,
    event_id: 'event-001',
    tenant_id: 'tenant-001',
    name,
    slug: name.toLowerCase().replace(/\s/g, '-'),
    phone: null,
    group: GuestGroup.FRIEND,
    type: GuestType.INVITED,
    plus_one_count: 0,
    invitation_url: `/wedding?to=${name.toLowerCase().replace(/\s/g, '-')}`,
    delivery_status: DeliveryStatus.NOT_SENT,
    created_at: new Date('2024-01-01'),
  };
}

function createMockQRCode(guestId: string): QRCodeRecord {
  return {
    id: `qr-${guestId}`,
    guest_id: guestId,
    qr_payload: 'abc123:encrypted_data',
    is_active: true,
    generated_at: new Date('2024-01-01'),
  };
}

function setupMockService(): { service: GuestService; repository: GuestRepository } {
  const repository = createMockRepository();
  const service = new GuestService({
    repository,
    encryptionKey: TEST_ENCRYPTION_KEY,
  });

  // Default mock implementations
  vi.mocked(repository.findEventById).mockResolvedValue({
    id: 'event-001',
    slug: 'wedding-event',
  });
  vi.mocked(repository.checkSlugExists).mockResolvedValue(false);
  vi.mocked(repository.checkQRPayloadExists).mockResolvedValue(false);
  vi.mocked(repository.createGuest).mockImplementation(async (data) => ({
    ...data,
    created_at: new Date(),
  }));
  vi.mocked(repository.createQRCode).mockImplementation(async (data) => ({
    ...data,
    generated_at: new Date(),
  }));

  return { service, repository };
}

// --- Tests ---

describe('Guest CSV Import Service', () => {
  describe('parseCSV', () => {
    it('should parse basic CSV with headers and data rows', () => {
      const csv = 'nama,grup,phone\nJohn Doe,friend,+6281234567890\nJane Smith,family,';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['nama', 'grup', 'phone']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        nama: 'John Doe',
        grup: 'friend',
        phone: '+6281234567890',
      });
      expect(result.rows[1]).toEqual({
        nama: 'Jane Smith',
        grup: 'family',
      });
    });

    it('should parse semicolon delimited CSV with headers and data rows', () => {
      const csv = 'nama;grup;phone\nJohn Doe;friend;+6281234567890\nJane Smith;family;';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['nama', 'grup', 'phone']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        nama: 'John Doe',
        grup: 'friend',
        phone: '+6281234567890',
      });
      expect(result.rows[1]).toEqual({
        nama: 'Jane Smith',
        grup: 'family',
      });
    });

    it('should ignore sep= configuration lines in CSV', () => {
      const csv = 'sep=,\nnama,grup\nJohn Doe,friend\nJane Smith,family';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['nama', 'grup']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].nama).toBe('John Doe');
      expect(result.rows[1].nama).toBe('Jane Smith');
    });

    it('should handle quoted fields with commas', () => {
      const csv = 'nama,grup\n"Doe, John",friend\nJane,family';
      const result = parseCSV(csv);

      expect(result.rows[0].nama).toBe('Doe, John');
    });

    it('should handle escaped quotes within quoted fields', () => {
      const csv = 'nama,grup\n"John ""JD"" Doe",friend';
      const result = parseCSV(csv);

      expect(result.rows[0].nama).toBe('John "JD" Doe');
    });

    it('should normalize headers to lowercase', () => {
      const csv = 'Nama,GRUP,Phone\nJohn,friend,123';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['nama', 'grup', 'phone']);
      expect(result.rows[0].nama).toBe('John');
    });

    it('should skip empty lines', () => {
      const csv = 'nama,grup\nJohn,friend\n\nJane,family\n';
      const result = parseCSV(csv);

      expect(result.rows).toHaveLength(2);
    });

    it('should handle Windows-style line endings (CRLF)', () => {
      const csv = 'nama,grup\r\nJohn,friend\r\nJane,family';
      const result = parseCSV(csv);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].nama).toBe('John');
      expect(result.rows[1].nama).toBe('Jane');
    });

    it('should return empty rows for empty CSV', () => {
      const result = parseCSV('');
      expect(result.rows).toHaveLength(0);
      expect(result.headers).toHaveLength(0);
    });

    it('should handle CSV with only headers', () => {
      const csv = 'nama,grup,phone';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['nama', 'grup', 'phone']);
      expect(result.rows).toHaveLength(0);
    });

    it('should handle all optional columns', () => {
      const csv = 'nama,grup,phone,plus_one_count\nJohn,friend,+62812,2';
      const result = parseCSV(csv);

      expect(result.rows[0]).toEqual({
        nama: 'John',
        grup: 'friend',
        phone: '+62812',
        plus_one_count: '2',
      });
    });
  });

  describe('validateRow', () => {
    it('should validate a valid row', () => {
      const row: CSVRow = { nama: 'John Doe', grup: 'friend' };
      const result = validateRow(row, new Set());

      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.name).toBe('John Doe');
        // 'friend' is not an Indonesian synonym, passes through as-is
        expect(result.group).toBe('friend');
        expect(result.plus_one_count).toBe(0);
      }
    });

    it('should reject empty name', () => {
      const row: CSVRow = { nama: '', grup: 'friend' };
      const result = validateRow(row, new Set());

      expect(result).toBe('Nama tidak boleh kosong');
    });

    it('should reject missing name', () => {
      const row: CSVRow = { grup: 'friend' };
      const result = validateRow(row, new Set());

      expect(result).toBe('Nama tidak boleh kosong');
    });

    it('should reject empty group', () => {
      const row: CSVRow = { nama: 'John', grup: '' };
      const result = validateRow(row, new Set());

      expect(result).toBe('Grup tidak boleh kosong');
    });

    it('should accept custom group names (any non-empty string is valid)', () => {
      const row: CSVRow = { nama: 'John', grup: 'custom_group_xyz' };
      const result = validateRow(row, new Set());

      // Custom groups are now allowed — no rejection
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.group).toBe('custom_group_xyz');
      }
    });

    it('should map Indonesian group synonyms to display names', () => {
      const rowKeluarga: CSVRow = { nama: 'Budi', grup: 'Keluarga' };
      const rowTeman: CSVRow = { nama: 'Siti', grup: 'teman' };
      const rowRekan: CSVRow = { nama: 'Andi', grup: 'rekan kerja' };

      const resKeluarga = validateRow(rowKeluarga, new Set());
      const resTeman = validateRow(rowTeman, new Set());
      const resRekan = validateRow(rowRekan, new Set());

      expect(typeof resKeluarga).not.toBe('string');
      expect(typeof resTeman).not.toBe('string');
      expect(typeof resRekan).not.toBe('string');

      // Normalized to Indonesian display names
      if (typeof resKeluarga !== 'string') expect(resKeluarga.group).toBe(GuestGroup.FAMILY); // 'Keluarga'
      if (typeof resTeman !== 'string') expect(resTeman.group).toBe(GuestGroup.FRIEND); // 'Teman'
      if (typeof resRekan !== 'string') expect(resRekan.group).toBe(GuestGroup.COLLEAGUE); // 'Rekan Kerja'
    });

    it('should accept all default preset group values', () => {
      // Indonesian display names are the canonical presets
      const groups = [GuestGroup.FAMILY, GuestGroup.FRIEND, GuestGroup.COLLEAGUE, GuestGroup.VIP];
      for (const group of groups) {
        const row: CSVRow = { nama: `Tamu ${group}`, grup: group };
        const result = validateRow(row, new Set());
        expect(typeof result).not.toBe('string');
        if (typeof result !== 'string') {
          expect(result.group).toBe(group);
        }
      }
    });

    it('should normalize case-insensitive Indonesian synonyms', () => {
      // 'TEMAN' (uppercase) is a synonym for 'Teman'
      const row: CSVRow = { nama: 'John', grup: 'TEMAN' };
      const result = validateRow(row, new Set());

      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.group).toBe(GuestGroup.FRIEND); // 'Teman'
      }
    });

    it('should detect duplicate names within event (case-insensitive)', () => {
      const existingNames = new Set(['john doe']);
      const row: CSVRow = { nama: 'John Doe', grup: 'friend' };
      const result = validateRow(row, existingNames);

      expect(typeof result).toBe('string');
      expect(result as string).toContain('Duplikat nama');
    });

    it('should validate plus_one_count as integer >= 0', () => {
      const row: CSVRow = { nama: 'John', grup: 'friend', plus_one_count: '-1' };
      const result = validateRow(row, new Set());

      expect(typeof result).toBe('string');
      expect(result as string).toContain('plus_one_count tidak valid');
    });

    it('should reject plus_one_count > 10', () => {
      const row: CSVRow = { nama: 'John', grup: 'friend', plus_one_count: '11' };
      const result = validateRow(row, new Set());

      expect(typeof result).toBe('string');
      expect(result as string).toContain('melebihi batas maksimal 10');
    });

    it('should reject non-numeric plus_one_count', () => {
      const row: CSVRow = { nama: 'John', grup: 'friend', plus_one_count: 'abc' };
      const result = validateRow(row, new Set());

      expect(typeof result).toBe('string');
      expect(result as string).toContain('plus_one_count tidak valid');
    });

    it('should accept valid plus_one_count', () => {
      const row: CSVRow = { nama: 'John', grup: 'friend', plus_one_count: '3' };
      const result = validateRow(row, new Set());

      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.plus_one_count).toBe(3);
      }
    });

    it('should handle optional fields gracefully', () => {
      const row: CSVRow = { nama: 'John', grup: 'vip', phone: '+6281234567890' };
      const result = validateRow(row, new Set());

      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.phone).toBe('+6281234567890');
      }
    });

    it('should support both "telepon" and "phone" headers for phone numbers', () => {
      const rowTelepon: CSVRow = { nama: 'John', grup: 'vip', telepon: '+6281234567890' };
      const resultTelepon = validateRow(rowTelepon, new Set());
      expect(typeof resultTelepon).not.toBe('string');
      if (typeof resultTelepon !== 'string') {
        expect(resultTelepon.phone).toBe('+6281234567890');
      }

      const rowPhone: CSVRow = { nama: 'John', grup: 'vip', phone: '+6281234567890' };
      const resultPhone = validateRow(rowPhone, new Set());
      expect(typeof resultPhone).not.toBe('string');
      if (typeof resultPhone !== 'string') {
        expect(resultPhone.phone).toBe('+6281234567890');
      }
    });

    it('should support both "jumlah_tamu" and "plus_one_count" headers for plus one count', () => {
      const rowJumlahTamu: CSVRow = { nama: 'John', grup: 'vip', jumlah_tamu: '3' };
      const resultJumlahTamu = validateRow(rowJumlahTamu, new Set());
      expect(typeof resultJumlahTamu).not.toBe('string');
      if (typeof resultJumlahTamu !== 'string') {
        expect(resultJumlahTamu.plus_one_count).toBe(3);
      }

      const rowPlusOneCount: CSVRow = { nama: 'John', grup: 'vip', plus_one_count: '3' };
      const resultPlusOneCount = validateRow(rowPlusOneCount, new Set());
      expect(typeof resultPlusOneCount).not.toBe('string');
      if (typeof resultPlusOneCount !== 'string') {
        expect(resultPlusOneCount.plus_one_count).toBe(3);
      }
    });

    it('should trim whitespace from name and group', () => {
      const row: CSVRow = { nama: '  John Doe  ', grup: '  teman  ' };
      const result = validateRow(row, new Set());

      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.name).toBe('John Doe');
        // 'teman' (trimmed) is a synonym → normalizes to 'Teman'
        expect(result.group).toBe(GuestGroup.FRIEND); // 'Teman'
      }
    });
  });

  describe('bulkImportGuests', () => {
    let service: GuestService;
    let repository: GuestRepository;

    beforeEach(() => {
      const setup = setupMockService();
      service = setup.service;
      repository = setup.repository;
    });

    it('should import valid CSV rows and return success count', async () => {
      const csv = 'nama,grup\nJohn Doe,friend\nJane Smith,family';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(2);
      expect(report.failedRows).toHaveLength(0);
    });

    it('should report missing required columns', async () => {
      const csv = 'name,group\nJohn,friend'; // Wrong column names

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(0);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].row).toBe(0);
      expect(report.failedRows[0].reason).toContain('Kolom wajib tidak ditemukan');
    });

    it('should reject CSV exceeding max rows (2000)', async () => {
      // Create CSV with 2001 rows
      let csv = 'nama,grup\n';
      for (let i = 0; i < 2001; i++) {
        csv += `Guest ${i},friend\n`;
      }

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(0);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].reason).toContain('melebihi batas maksimal');
    });

    it('should skip invalid rows without stopping import (Req 3.4)', async () => {
      // 'custom_group' is now valid — only empty name causes a failure
      const csv = 'nama,grup\nJohn Doe,friend\n,friend\nJane Smith,custom_group\nBob,vip';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      // John Doe, Jane Smith, and Bob all succeed; only empty-name row fails
      expect(report.successCount).toBe(3);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].row).toBe(3);
      expect(report.failedRows[0].reason).toContain('Nama tidak boleh kosong');
    });

    it('should detect duplicate names within the import batch', async () => {
      const csv = 'nama,grup\nJohn Doe,friend\nJohn Doe,family';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(1);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].row).toBe(3);
      expect(report.failedRows[0].reason).toContain('Duplikat nama');
    });

    it('should detect duplicate names against existing guests in event', async () => {
      const csv = 'nama,grup\nExisting Guest,friend\nNew Guest,family';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        ['Existing Guest'] // Already exists in event
      );

      expect(report.successCount).toBe(1);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].row).toBe(2);
      expect(report.failedRows[0].reason).toContain('Duplikat nama');
    });

    it('should generate QR code for each valid guest (Req 3.3)', async () => {
      const csv = 'nama,grup\nGuest One,friend\nGuest Two,vip';

      await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      // createQRCode should be called for each successful guest
      expect(repository.createQRCode).toHaveBeenCalledTimes(2);
    });

    it('should handle all optional columns in CSV', async () => {
      // 'teman' is an Indonesian synonym → normalizes to 'Teman' (GuestGroup.FRIEND)
      const csv = 'nama,grup,phone,plus_one_count\nJohn Doe,teman,+6281234567890,2';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(1);
      expect(repository.createGuest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          group: GuestGroup.FRIEND, // 'Teman'
          phone: expect.any(String),
          plus_one_count: 2,
        })
      );
    });

    it('should report row numbers correctly (1-indexed, header is row 1)', async () => {
      const csv = 'nama,grup\nValid,friend\n,friend\nAlso Valid,vip\n,family';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(2);
      expect(report.failedRows[0].row).toBe(3); // 3rd line in file (2nd data row)
      expect(report.failedRows[1].row).toBe(5); // 5th line in file (4th data row)
    });

    it('should handle service errors gracefully', async () => {
      // Make the event not found for the second call
      vi.mocked(repository.findEventById)
        .mockResolvedValueOnce({ id: 'event-001', slug: 'wedding' })
        .mockResolvedValueOnce(null);

      const csv = 'nama,grup\nGuest One,friend\nGuest Two,family';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      // First guest succeeds, second fails because event not found
      expect(report.successCount).toBe(1);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].reason).toContain('Event tidak ditemukan');
    });

    it('should handle empty CSV gracefully', async () => {
      const csv = '';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(0);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].reason).toContain('Kolom wajib tidak ditemukan');
    });

    it('should handle CSV with only headers (no data rows)', async () => {
      const csv = 'nama,grup';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(0);
      expect(report.failedRows).toHaveLength(0);
    });

    it('should accept exactly 2000 rows', async () => {
      let csv = 'nama,grup\n';
      for (let i = 0; i < 2000; i++) {
        csv += `Guest ${i},friend\n`;
      }

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      // Should not reject for row count
      expect(report.failedRows.some((r) => r.reason.includes('melebihi batas'))).toBe(false);
      expect(report.successCount).toBe(2000);
    });

    it('should handle duplicate detection case-insensitively', async () => {
      const csv = 'nama,grup\njohn doe,friend\nJOHN DOE,family';

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(1);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].reason).toContain('Duplikat nama');
    });

    it('should handle database / prisma errors gracefully without failing the entire batch', async () => {
      const csv = 'nama,grup\nJohn Doe,friend\nJane Smith,family\nBob,vip';

      // Mock createGuest to throw a database constraint error for Jane Smith
      vi.mocked(repository.createGuest).mockImplementation(async (data) => {
        if (data.name === 'Jane Smith') {
          const prismaError = new Error('Unique constraint failed on the fields: (event_id, slug)');
          (prismaError as any).code = 'P2002';
          throw prismaError;
        }
        return {
          ...data,
          created_at: new Date(),
        };
      });

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      // John Doe and Bob succeed; Jane Smith fails due to database error
      expect(report.successCount).toBe(2);
      expect(report.failedRows).toHaveLength(1);
      expect(report.failedRows[0].row).toBe(3); // Line 3 is Jane Smith
      expect(report.failedRows[0].reason).toContain('Nama tamu atau slug undangan sudah digunakan');
    });

    it('should prevent slug collisions for different names that generate identical base slugs in the same batch', async () => {
      const csv = 'nama,grup\nJohn Doe,friend\nJohn-Doe,family\nJohn  Doe,vip';

      // Mock checkSlugExists to check repository calls count or track checkSlugExists dynamically
      const checkedSlugs: string[] = [];
      vi.mocked(repository.checkSlugExists).mockImplementation(async (eventId, slug) => {
        checkedSlugs.push(slug);
        // Pretend none exist in the database yet
        return false;
      });

      const createdSlugs: string[] = [];
      vi.mocked(repository.createGuest).mockImplementation(async (data) => {
        createdSlugs.push(data.slug);
        return {
          ...data,
          created_at: new Date(),
        };
      });

      const report = await bulkImportGuests(
        { eventId: 'event-001', tenantId: 'tenant-001', csvText: csv },
        service,
        []
      );

      expect(report.successCount).toBe(3);
      expect(report.failedRows).toHaveLength(0);

      // Slugs generated should be unique
      expect(createdSlugs).toEqual(['john-doe', 'john-doe-2', 'john-doe-3']);
    });
  });
});
