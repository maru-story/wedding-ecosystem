import { ErrorCode } from '@wedding/shared';

// --- Constants ---

/** Allowed MIME types for image uploads (Req 5.4, 13.8) */
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Allowed MIME types for video uploads (Req 5.4, 13.8) */
export const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm'] as const;

/** Allowed MIME types for audio uploads */
export const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/mp3'] as const;

/** All allowed MIME types */
export const ALLOWED_MIMES = [
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_VIDEO_MIMES,
  ...ALLOWED_AUDIO_MIMES,
] as const;

/** File extension to MIME type mapping */
export const EXTENSION_MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', // Some browsers report audio/mp3, some audio/mpeg, map both
};

/** Max file sizes in bytes (Req 5.4, 13.8) */
export const MAX_FILE_SIZES = {
  /** Photos: max 5MB */
  IMAGE: 5 * 1024 * 1024,
  /** Video: max 50MB */
  VIDEO: 50 * 1024 * 1024,
  /** Audio: max 10MB */
  AUDIO: 10 * 1024 * 1024,
  /** General/other: max 10MB */
  GENERAL: 10 * 1024 * 1024,
} as const;

/** Human-readable size labels for error messages */
export const SIZE_LABELS = {
  IMAGE: '5MB',
  VIDEO: '50MB',
  AUDIO: '10MB',
  GENERAL: '10MB',
} as const;

// --- Types ---

export type AllowedMimeType = (typeof ALLOWED_MIMES)[number];

export type MediaCategory = 'image' | 'video' | 'audio';

/** Input file metadata for validation */
export interface FileInput {
  /** Original filename */
  originalname: string;
  /** MIME type reported by the client */
  mimetype: string;
  /** File size in bytes */
  size: number;
  /** File buffer for virus scanning */
  buffer: Buffer;
}

/** Result of a successful upload */
export interface UploadResult {
  /** URL of the uploaded file in cloud storage */
  url: string;
  /** Original filename */
  originalname: string;
  /** Validated MIME type */
  mimetype: string;
  /** File size in bytes */
  size: number;
  /** Media category (image or video) */
  category: MediaCategory;
}

/** Error result from upload validation or processing */
export interface MediaUploadError {
  code: ErrorCode;
  message: string;
}

/** Virus scan result */
export interface VirusScanResult {
  /** Whether the file is clean (no malware detected) */
  clean: boolean;
  /** Name of detected malware, if any */
  malwareName?: string;
}

// --- Virus Scanner Interface (Strategy Pattern) ---

/**
 * Pluggable virus scanner interface.
 * Implementations can be swapped for different providers (ClamAV, VirusTotal, etc.)
 */
export interface VirusScanner {
  /**
   * Scan a file buffer for malware.
   * @param buffer - File content to scan
   * @param filename - Original filename for context
   * @returns Scan result indicating if file is clean
   */
  scan(buffer: Buffer, filename: string): Promise<VirusScanResult>;
}

// --- No-op Virus Scanner (Default) ---

/**
 * No-op virus scanner that always reports files as clean.
 * Used as default when no real scanner is configured.
 * Can be replaced with ClamAV, VirusTotal, or other providers.
 */
export class NoOpVirusScanner implements VirusScanner {
  async scan(_buffer: Buffer, _filename: string): Promise<VirusScanResult> {
    return { clean: true };
  }
}

// --- Cloud Storage Interface ---

/**
 * Pluggable cloud storage interface for file uploads.
 * Implementations can target S3, GCS, or local filesystem.
 */
export interface CloudStorage {
  /**
   * Upload a file to cloud storage.
   * @param buffer - File content
   * @param key - Storage key/path for the file
   * @param mimetype - MIME type of the file
   * @returns Public URL of the uploaded file
   */
  upload(buffer: Buffer, key: string, mimetype: string): Promise<string>;
}

// --- Media Upload Service ---

export class MediaUploadService {
  private readonly virusScanner: VirusScanner;
  private readonly cloudStorage: CloudStorage;

  constructor(config: { virusScanner?: VirusScanner; cloudStorage: CloudStorage }) {
    this.virusScanner = config.virusScanner ?? new NoOpVirusScanner();
    this.cloudStorage = config.cloudStorage;
  }

  /**
   * Upload a media file with full validation (Req 5.4, 5.5, 13.8, 13.9)
   *
   * Validation order:
   * 1. File format validation (MIME type + extension)
   * 2. File size validation (category-specific limits)
   * 3. Virus scan
   * 4. Upload to cloud storage
   */
  async uploadFile(
    file: FileInput,
    tenantSlug: string,
    eventSlug: string,
    section: string = 'media'
  ): Promise<UploadResult | MediaUploadError> {
    // Step 1: Validate file format (Req 13.8)
    const formatValidation = this.validateFormat(file);
    if (formatValidation) {
      return formatValidation;
    }

    // Step 2: Determine category and validate size (Req 5.4, 13.8)
    const category = this.getMediaCategory(file.mimetype);
    const sizeValidation = this.validateSize(file, category);
    if (sizeValidation) {
      return sizeValidation;
    }

    // Step 3: Virus scan (Req 13.8)
    const scanResult = await this.virusScanner.scan(file.buffer, file.originalname);
    if (!scanResult.clean) {
      return {
        code: ErrorCode.MALWARE_DETECTED,
        message: scanResult.malwareName
          ? `File terdeteksi mengandung malware: ${scanResult.malwareName}`
          : 'File terdeteksi mengandung malware',
      };
    }

    // Step 4: Upload to cloud storage
    const storageKey = this.generateStorageKey(tenantSlug, eventSlug, file.originalname, section);
    try {
      const url = await this.cloudStorage.upload(file.buffer, storageKey, file.mimetype);
      return {
        url,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        category,
      };
    } catch {
      return {
        code: ErrorCode.UPLOAD_FAILED,
        message: 'Gagal mengunggah file. Silakan coba lagi.',
      };
    }
  }

  /**
   * Validate file format against allowed MIME types (Req 13.8, 13.9)
   * Returns error if invalid, null if valid.
   */
  validateFormat(file: FileInput): MediaUploadError | null {
    const allowedMimes: readonly string[] = ALLOWED_MIMES;

    if (!allowedMimes.includes(file.mimetype) && !(file.mimetype === 'audio/mp3')) {
      return {
        code: ErrorCode.INVALID_FILE_FORMAT,
        message: `Format file tidak didukung: ${file.mimetype}. Format yang didukung: JPEG, PNG, WebP (gambar), MP4, WebM (video), dan MP3 (audio).`,
      };
    }

    // Also validate extension matches MIME type to prevent spoofing
    const extension = this.getFileExtension(file.originalname);
    const expectedMime = EXTENSION_MIME_MAP[extension];

    if (
      !expectedMime ||
      (expectedMime !== file.mimetype &&
        !(
          extension === '.mp3' &&
          (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3')
        ))
    ) {
      return {
        code: ErrorCode.INVALID_FILE_FORMAT,
        message: `Ekstensi file tidak sesuai dengan tipe file. Format yang didukung: JPEG, PNG, WebP (gambar), MP4, WebM (video), dan MP3 (audio).`,
      };
    }

    return null;
  }

  /**
   * Validate file size against category-specific limits (Req 5.4, 13.8, 13.9)
   * Returns error if too large, null if valid.
   */
  validateSize(file: FileInput, category: MediaCategory): MediaUploadError | null {
    let maxSize: number;
    let sizeLabel: string;

    switch (category) {
      case 'image':
        maxSize = MAX_FILE_SIZES.IMAGE;
        sizeLabel = SIZE_LABELS.IMAGE;
        break;
      case 'video':
        maxSize = MAX_FILE_SIZES.VIDEO;
        sizeLabel = SIZE_LABELS.VIDEO;
        break;
      case 'audio':
        maxSize = MAX_FILE_SIZES.AUDIO;
        sizeLabel = SIZE_LABELS.AUDIO;
        break;
    }

    if (file.size > maxSize) {
      return {
        code: ErrorCode.FILE_TOO_LARGE,
        message: `Ukuran file melebihi batas maksimum ${sizeLabel}. Ukuran file: ${this.formatFileSize(file.size)}.`,
      };
    }

    return null;
  }

  /**
   * Determine media category from MIME type.
   */
  getMediaCategory(mimetype: string): MediaCategory {
    const imageMimes: readonly string[] = ALLOWED_IMAGE_MIMES;
    const audioMimes: readonly string[] = ALLOWED_AUDIO_MIMES;
    if (imageMimes.includes(mimetype)) {
      return 'image';
    }
    if (audioMimes.includes(mimetype) || mimetype === 'audio/mp3') {
      return 'audio';
    }
    return 'video';
  }

  /**
   * Generate a unique storage key for the uploaded file.
   * Format: {tenantSlug}/{eventSlug}/cms/{section}/{timestamp}-{filename}
   */
  generateStorageKey(
    tenantSlug: string,
    eventSlug: string,
    filename: string,
    section: string = 'media'
  ): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${tenantSlug}/${eventSlug}/cms/${section}/${timestamp}-${sanitizedFilename}`;
  }

  /**
   * Extract file extension from filename (lowercase, with dot).
   */
  getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.slice(lastDot).toLowerCase();
  }

  /**
   * Format file size in human-readable format.
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

// --- Type guard ---

/**
 * Type guard to check if a result is a MediaUploadError
 */
export function isMediaUploadError(
  result: UploadResult | MediaUploadError
): result is MediaUploadError {
  return 'code' in result && 'message' in result && !('url' in result);
}
