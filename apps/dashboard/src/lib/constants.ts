// =============================================================================
// Dashboard Global Constants
// =============================================================================
// Centralized configuration values used across the dashboard application.
// Change values here instead of hunting for hardcoded numbers in pages.
// =============================================================================

// --- Event Capacity Defaults ---
// These are fallback values when the server-side EventConfig is not available
// (e.g., events created before the quota feature was added).

/** Default maximum number of guests per event */
export const DEFAULT_MAX_GUESTS = 2000;

/** Default maximum number of scanner devices per event */
export const DEFAULT_MAX_SCANNER_DEVICES = 2;

// --- Admin Quota Form Limits ---
// Min/max constraints for the admin quota management form inputs.

/** Minimum allowed value for max_guests (admin form) */
export const QUOTA_MAX_GUESTS_MIN = 1;

/** Maximum allowed value for max_guests (admin form) */
export const QUOTA_MAX_GUESTS_MAX = 100_000;

/** Minimum allowed value for max_scanner_devices (admin form) */
export const QUOTA_MAX_SCANNER_MIN = 1;

/** Maximum allowed value for max_scanner_devices (admin form) */
export const QUOTA_MAX_SCANNER_MAX = 10;

// --- CSV Import ---

/** Maximum number of data rows allowed per CSV import file */
export const CSV_MAX_ROWS = 2000;

/** Maximum file size for CSV import (in bytes) — 5 MB */
export const CSV_MAX_FILE_SIZE = 5 * 1024 * 1024;

// --- Pagination ---

/** Default page size for guest listing */
export const GUESTS_PER_PAGE = 20;

/** Default page size for admin tables (tenants, users, audit logs) */
export const ADMIN_PER_PAGE = 10;

/** Page size limit when fetching data to populate dropdown filter options */
export const FILTER_OPTIONS_LIMIT = 100;

// --- Polling & Timers ---

/** Dashboard stats polling interval (ms) — how often stats auto-refresh */
export const STATS_REFETCH_INTERVAL_MS = 30_000;

/** Token auto-refresh check interval (ms) */
export const TOKEN_REFRESH_INTERVAL_MS = 30_000;

/** Token expiry buffer (seconds) — refresh this many seconds before actual expiry */
export const TOKEN_EXPIRY_BUFFER_SECONDS = 60;

/** Clipboard copy feedback duration (ms) — how long "Tersalin!" badge stays visible */
export const COPY_FEEDBACK_DURATION_MS = 2000;

// --- Local Storage Keys ---

export const STORAGE_KEY_ACCESS_TOKEN = 'wedding_access_token'; // nosecret
export const STORAGE_KEY_REFRESH_TOKEN = 'wedding_refresh_token'; // nosecret
export const STORAGE_KEY_TOKEN_EXPIRY = 'wedding_token_expiry';
export const STORAGE_KEY_USER = 'wedding_user';
