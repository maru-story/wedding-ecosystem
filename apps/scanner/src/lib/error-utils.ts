/**
 * Safely extract human-readable error messages from backend API response payloads.
 * Supports:
 * - BE structured format: { success: false, error: { message: "...", code: "..." } }
 * - Direct message format: { message: "..." }
 * - Error instances: Error("...")
 * - String errors
 */
export function parseApiErrorMessage(
  data: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.'
): string {
  if (!data) return fallback;

  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (data instanceof Error) {
    return data.message || fallback;
  }

  if (typeof data === 'object') {
    const errObj = data as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    return errObj.error?.message || errObj.message || fallback;
  }

  return fallback;
}
