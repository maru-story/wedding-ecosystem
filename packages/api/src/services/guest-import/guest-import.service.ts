import { GuestGroup, GuestType, MAX_CSV_ROWS, normalizePhoneNumber, isValidPhoneNumber } from '@wedding/shared';
import { GuestService, isGuestError } from '../guest/guest.service';

// --- Constants ---

const REQUIRED_COLUMNS = ['nama', 'grup'] as const;
const OPTIONAL_COLUMNS = ['phone', 'telepon', 'plus_one_count', 'jumlah_tamu'] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;

const VALID_GROUPS: string[] = Object.values(GuestGroup);

// --- Types ---

export interface CSVRow {
  nama?: string;
  grup?: string;
  phone?: string;
  telepon?: string;
  plus_one_count?: string;
  jumlah_tamu?: string;
  [key: string]: string | undefined;
}

export interface FailedRow {
  row: number;
  reason: string;
}

export interface ImportReport {
  successCount: number;
  failedRows: FailedRow[];
}

export interface ParsedCSVResult {
  rows: CSVRow[];
  headers: string[];
}

// --- CSV Parser ---

/**
 * Parse raw CSV text into structured rows.
 * Handles quoted fields, commas within quotes, and newlines within quotes.
 */
export function parseCSV(csvText: string): ParsedCSVResult {
  let lines = splitCSVLines(csvText);

  if (lines.length === 0) {
    return { rows: [], headers: [] };
  }

  // Skip "sep=" configuration line if present (used for Excel compatibility)
  if (lines[0].trim().toLowerCase().startsWith('sep=')) {
    lines = lines.slice(1);
  }

  if (lines.length === 0) {
    return { rows: [], headers: [] };
  }

  // Detect delimiter from the first line (prefer comma unless semicolon is dominant)
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  // Parse header row
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());

  // Parse data rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue; // Skip empty lines

    const values = parseCSVLine(line, delimiter);
    const row: CSVRow = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j]?.trim() ?? '';
      if (value !== '') {
        row[header] = value;
      }
    }

    rows.push(row);
  }

  return { rows, headers };
}

/**
 * Split CSV text into lines, respecting quoted fields that may contain newlines.
 */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++; // Skip \n in \r\n
      }
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim() !== '') {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV line into field values, handling quoted fields.
 */
function parseCSVLine(line: string, delimiter = ','): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

// --- Row Validation ---

export interface ValidatedRow {
  name: string;
  group: GuestGroup;
  phone: string | undefined;
  plus_one_count: number;
}

/**
 * Validate a single CSV row.
 * Returns either a validated row or an error reason string.
 */
export function validateRow(row: CSVRow, existingNames: Set<string>): ValidatedRow | string {
  // Check required field: nama
  const nama = row.nama?.trim();
  if (!nama || nama === '') {
    return 'Nama tidak boleh kosong';
  }

  // Check required field: grup
  let grup = row.grup?.trim().toLowerCase();
  if (!grup || grup === '') {
    return 'Grup tidak boleh kosong';
  }

  // Normalize Indonesian group synonyms to standard enums
  if (grup === 'keluarga') {
    grup = 'family';
  } else if (['teman', 'kawan', 'sahabat'].includes(grup)) {
    grup = 'friend';
  } else if (['rekan', 'kerja', 'kantor', 'rekan kerja'].includes(grup)) {
    grup = 'colleague';
  }

  // Validate group enum
  if (!VALID_GROUPS.includes(grup)) {
    return `Grup tidak valid: "${row.grup?.trim()}". Harus salah satu dari: ${VALID_GROUPS.join(', ')}`;
  }

  // Check duplicate name within this import batch + event
  const normalizedName = nama.toLowerCase();
  if (existingNames.has(normalizedName)) {
    return `Duplikat nama dalam event: "${nama}"`;
  }

  // Validate plus_one_count if provided
  let plusOneCount = 0;
  const plusOneRaw = row.jumlah_tamu !== undefined ? row.jumlah_tamu : row.plus_one_count;
  const plusOneKey = row.jumlah_tamu !== undefined ? 'jumlah_tamu' : 'plus_one_count';
  if (plusOneRaw !== undefined && plusOneRaw.trim() !== '') {
    const parsed = parseInt(plusOneRaw.trim(), 10);
    if (isNaN(parsed) || parsed < 0) {
      return `${plusOneKey} tidak valid: "${plusOneRaw}". Harus bilangan bulat >= 0`;
    }
    if (parsed > 10) {
      return `${plusOneKey} melebihi batas maksimal 10`;
    }
    plusOneCount = parsed;
  }

  let phone = row.telepon?.trim() || row.phone?.trim() || undefined;
  if (phone && phone !== '') {
    phone = normalizePhoneNumber(phone);
    if (!isValidPhoneNumber(phone)) {
      return `Format nomor telepon tidak valid: "${row.telepon?.trim() || row.phone?.trim()}". Harus berupa nomor seluler Indonesia yang valid (contoh: 08xxxxxxxxxx atau +628xxxxxxxxxx).`;
    }
  } else {
    phone = undefined;
  }

  return {
    name: nama,
    group: grup as GuestGroup,
    phone,
    plus_one_count: plusOneCount,
  };
}

// --- Bulk Import Service ---

export interface BulkImportOptions {
  eventId: string;
  tenantId: string;
  csvText: string;
}

/**
 * Import guests from CSV text.
 * - Validates CSV structure and each row
 * - Generates QR code for each valid guest
 * - Returns import report with success count and failed rows
 *
 * Requirements: 3.2, 3.3, 3.4
 */
export async function bulkImportGuests(
  options: BulkImportOptions,
  guestService: GuestService,
  existingGuestNames: string[]
): Promise<ImportReport> {
  const { eventId, tenantId, csvText } = options;

  const report: ImportReport = {
    successCount: 0,
    failedRows: [],
  };

  // Parse CSV
  const { rows, headers } = parseCSV(csvText);

  // Validate CSV has required columns
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    report.failedRows.push({
      row: 0,
      reason: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}. Header yang ditemukan: ${headers.join(', ')}`,
    });
    return report;
  }

  // Validate max rows (Req 3.2)
  if (rows.length > MAX_CSV_ROWS) {
    report.failedRows.push({
      row: 0,
      reason: `File CSV melebihi batas maksimal ${MAX_CSV_ROWS} baris. Ditemukan: ${rows.length} baris`,
    });
    return report;
  }

  // Build set of existing names for duplicate detection within event
  const existingNamesSet = new Set(existingGuestNames.map((n) => n.toLowerCase()));

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +2 because row 1 is header, data starts at row 2
    const row = rows[i];

    // Validate row
    const validationResult = validateRow(row, existingNamesSet);

    if (typeof validationResult === 'string') {
      // Validation failed - skip row, log error (Req 3.4)
      report.failedRows.push({
        row: rowNumber,
        reason: validationResult,
      });
      continue;
    }

    // Add to existing names set to detect duplicates within the batch
    existingNamesSet.add(validationResult.name.toLowerCase());

    // Create guest with QR code generation (Req 3.3)
    const result = await guestService.addGuest(eventId, tenantId, {
      name: validationResult.name,
      group: validationResult.group,
      type: GuestType.INVITED,
      phone: validationResult.phone ?? '',
      plus_one_count: validationResult.plus_one_count,
    });

    if (isGuestError(result)) {
      report.failedRows.push({
        row: rowNumber,
        reason: result.message,
      });
    } else {
      report.successCount++;
    }
  }

  return report;
}

// --- Exported constants for testing ---

export const IMPORT_CONSTANTS = {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  ALL_COLUMNS,
  VALID_GROUPS,
  MAX_CSV_ROWS,
} as const;
