// API client for dashboard application

import {
  STORAGE_KEY_ACCESS_TOKEN,
  STORAGE_KEY_REFRESH_TOKEN,
  STORAGE_KEY_TOKEN_EXPIRY,
  TOKEN_EXPIRY_BUFFER_SECONDS,
  TOKEN_REFRESH_INTERVAL_MS,
} from '@/lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

/**
 * Base fetch wrapper with auth token injection
 */
export async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth) {
    // Attempt token refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry original request with new token
      requestHeaders['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, await parseResponsePayload(retryResponse));
      }
      return retryResponse.json();
    } else {
      // Refresh failed, clear tokens and redirect to login
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, { message: 'Sesi telah berakhir. Silakan login ulang.' });
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseResponsePayload(response));
  }

  return response.json();
}

/**
 * Fetch wrapper returning the raw Response (for blobs/text download) with auth token injection
 */
export async function apiFetchRaw(endpoint: string, options: ApiOptions = {}): Promise<Response> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      requestHeaders['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, await parseResponsePayload(retryResponse));
      }
      return retryResponse;
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, { message: 'Sesi telah berakhir. Silakan login ulang.' });
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseResponsePayload(response));
  }

  return response;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  code?: string;

  constructor(status: number, data: unknown) {
    const errorObj = (data as { error?: { message?: string; code?: string }; message?: string })?.error;
    const extractedMessage =
      errorObj?.message ||
      (typeof (data as { message?: string })?.message === 'string' ? (data as { message: string }).message : null) ||
      `API Error: ${status}`;

    super(extractedMessage);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = errorObj?.code;
  }
}

/**
 * Universal error message extractor for dashboard.
 * Prioritizes ApiError parsed message, generic Error.message, or string error,
 * falling back to a localized default message.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = 'Terjadi kesalahan sistem. Silakan coba lagi.'
): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim().length > 0) {
    return err;
  }
  return fallback;
}

// --- Token Management ---

const ACCESS_TOKEN_KEY = STORAGE_KEY_ACCESS_TOKEN;
const REFRESH_TOKEN_KEY = STORAGE_KEY_REFRESH_TOKEN;
const TOKEN_EXPIRY_KEY = STORAGE_KEY_TOKEN_EXPIRY;

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // Store expiry time (current time + expires_in seconds - buffer for early refresh)
  const expiryTime = Date.now() + (expiresIn - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function isTokenExpiringSoon(): boolean {
  if (typeof window === 'undefined') return false;
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= parseInt(expiry, 10);
}

/**
 * Refresh the access token using the stored refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    setTokens(data.access_token, data.refresh_token, data.expires_in);
    return true;
  } catch {
    return false;
  }
}

// --- Auto-refresh timer ---

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start auto-refresh timer that checks token expiry every 30 seconds
 */
export function startAutoRefresh(): void {
  stopAutoRefresh();
  refreshTimer = setInterval(async () => {
    if (isTokenExpiringSoon() && getRefreshToken()) {
      await refreshAccessToken();
    }
  }, TOKEN_REFRESH_INTERVAL_MS);
}

export function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
