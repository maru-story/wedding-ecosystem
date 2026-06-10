/**
 * Manual check-in component with search and Go-Show registration.
 * Provides search bar with partial name match (min 3 chars, max 10 results).
 * Shows check-in button for unchecked guests, "Sudah Check-in" for checked guests.
 * Shows "Tambah sebagai Go-Show" when no results found.
 * Displays GREEN confirmation for 3 seconds on success.
 * Preserves form data on server error.
 * UI labels in Bahasa Indonesia.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePWA } from '@/components/pwa-provider';
import { searchCachedGuests, type CachedGuest } from '@/lib/indexed-db';
import { enqueueCheckIn } from '@/lib/offline-queue';
import { SuccessOverlay } from './success-overlay';
import { GoShowForm } from './go-show-form';

type ViewState = 'search' | 'go-show' | 'success';

interface ManualCheckInProps {
  /** Event ID for scoping search and check-in */
  eventId: string;
}

export function ManualCheckIn({ eventId }: ManualCheckInProps) {
  const { isOnline, apiBaseUrl, authToken } = usePWA();

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CachedGuest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Check-in state
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Go-Show state
  const [goShowError, setGoShowError] = useState<string | null>(null);
  const [isGoShowLoading, setIsGoShowLoading] = useState(false);

  // View state
  const [viewState, setViewState] = useState<ViewState>('search');
  const [successGuestName, setSuccessGuestName] = useState('');

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /**
   * Search guests with debounce (300ms).
   * When online: search via API. When offline: search local IndexedDB cache.
   */
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setResults([]);
        setHasSearched(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setCheckInError(null);

      try {
        if (isOnline) {
          // Online: search via API
          const response = await fetch(
            `${apiBaseUrl}/checkin/search?q=${encodeURIComponent(searchQuery)}&event_id=${eventId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const guests: CachedGuest[] = (data.data || [])
              .slice(0, 10)
              .map((g: Record<string, unknown>) => ({
                id: g.id as string,
                name: g.name as string,
                qrPayload: (g.qr_payload as string) || (g.qrPayload as string) || '',
                group: (g.group as string) || '',
                checkedIn: (g.is_checked_in as boolean) || (g.checkedIn as boolean) || false,
                checkedInAt: (g.checked_in_at as string) || (g.checkedInAt as string) || undefined,
                eventId: (g.event_id as string) || (g.eventId as string) || eventId,
              }));
            setResults(guests);
          } else {
            // Fallback to local search on API error
            const localResults = await searchCachedGuests(searchQuery, eventId);
            setResults(localResults);
          }
        } else {
          // Offline: search local IndexedDB cache
          const localResults = await searchCachedGuests(searchQuery, eventId);
          setResults(localResults);
        }
      } catch {
        // Fallback to local search on network error
        try {
          const localResults = await searchCachedGuests(searchQuery, eventId);
          setResults(localResults);
        } catch {
          setResults([]);
        }
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    },
    [isOnline, apiBaseUrl, authToken, eventId]
  );

  /**
   * Handle search input change with debounce.
   */
  const handleSearchChange = (value: string) => {
    setQuery(value);
    setCheckInError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  /**
   * Perform check-in for a guest.
   * When online: POST to API. When offline: queue locally.
   */
  const handleCheckIn = async (guest: CachedGuest) => {
    setCheckingInId(guest.id);
    setCheckInError(null);

    try {
      if (isOnline) {
        // Online: POST to API
        const response = await fetch(`${apiBaseUrl}/checkin/manual`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            guest_id: guest.id,
            event_id: eventId,
          }),
        });

        if (response.ok) {
          // Update local state to reflect check-in
          setResults((prev) =>
            prev.map((g) =>
              g.id === guest.id
                ? { ...g, checkedIn: true, checkedInAt: new Date().toISOString() }
                : g
            )
          );
          showSuccess(guest.name);
        } else {
          const errorData = await response.json().catch(() => null);
          setCheckInError(errorData?.message || 'Gagal melakukan check-in. Silakan coba lagi.');
        }
      } else {
        // Offline: queue the check-in locally
        await enqueueCheckIn({
          guestId: guest.id,
          qrPayload: guest.qrPayload,
          method: 'manual',
          eventId,
          guestName: guest.name,
        });

        // Update local results to reflect check-in
        setResults((prev) =>
          prev.map((g) =>
            g.id === guest.id ? { ...g, checkedIn: true, checkedInAt: new Date().toISOString() } : g
          )
        );
        showSuccess(guest.name);
      }
    } catch {
      setCheckInError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setCheckingInId(null);
    }
  };

  /**
   * Handle Go-Show registration.
   * When online: POST to API. When offline: queue locally with generated ID.
   */
  const handleGoShowSubmit = async (nama: string) => {
    setIsGoShowLoading(true);
    setGoShowError(null);

    try {
      if (isOnline) {
        // Online: POST to API
        const response = await fetch(`${apiBaseUrl}/checkin/go-show`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name: nama,
            event_id: eventId,
          }),
        });

        if (response.ok) {
          showSuccess(nama);
        } else {
          const errorData = await response.json().catch(() => null);
          setGoShowError(errorData?.message || 'Gagal mendaftarkan tamu. Silakan coba lagi.');
        }
      } else {
        // Offline: queue the Go-Show locally
        const tempGuestId = `go-show-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await enqueueCheckIn({
          guestId: tempGuestId,
          qrPayload: '',
          method: 'go_show',
          eventId,
          guestName: nama,
        });
        showSuccess(nama);
      }
    } catch {
      setGoShowError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsGoShowLoading(false);
    }
  };

  /**
   * Show success overlay and reset state after dismiss.
   */
  const showSuccess = (guestName: string) => {
    setSuccessGuestName(guestName);
    setViewState('success');
  };

  const handleSuccessDismiss = useCallback(() => {
    setViewState('search');
    setSuccessGuestName('');
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setGoShowError(null);
  }, []);

  // Show success overlay
  if (viewState === 'success') {
    return <SuccessOverlay guestName={successGuestName} onDismiss={handleSuccessDismiss} />;
  }

  // Show Go-Show form
  if (viewState === 'go-show') {
    return (
      <div className="p-4">
        <GoShowForm
          onSubmit={handleGoShowSubmit}
          onCancel={() => {
            setViewState('search');
            setGoShowError(null);
          }}
          isLoading={isGoShowLoading}
          error={goShowError}
          initialName={query}
        />
      </div>
    );
  }

  // Main search view
  return (
    <div className="flex flex-col p-4">
      {/* Header */}
      <h2 className="font-heading text-charcoal text-lg font-bold">Check-in Manual</h2>
      <p className="text-charcoal/60 mt-1 text-sm">Cari nama tamu untuk check-in manual</p>

      {/* Search bar */}
      <div className="relative mt-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Ketik minimal 3 huruf untuk mencari..."
          className="border-border/60 text-charcoal placeholder-charcoal/40 focus:border-sage focus:ring-sage/20 block w-full rounded-xl border bg-white py-3.5 pr-4 pl-11 text-base transition-colors focus:ring-2 focus:outline-none"
          aria-label="Cari nama tamu"
          autoComplete="off"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            <LoadingSpinner />
          </div>
        )}
      </div>

      {/* Minimum chars hint */}
      {query.length > 0 && query.length < 3 && (
        <p className="text-charcoal/40 mt-2 text-sm">
          Ketik {3 - query.length} huruf lagi untuk mencari
        </p>
      )}

      {/* Error message */}
      {checkInError && (
        <div
          className="bg-danger/10 border-danger/20 text-danger mt-3 rounded-lg border p-3 text-sm"
          role="alert"
        >
          {checkInError}
        </div>
      )}

      {/* Search results */}
      {hasSearched && results.length > 0 && (
        <div className="mt-4 space-y-2" role="list" aria-label="Hasil pencarian tamu">
          {results.map((guest) => (
            <GuestResultItem
              key={guest.id}
              guest={guest}
              isCheckingIn={checkingInId === guest.id}
              onCheckIn={() => handleCheckIn(guest)}
            />
          ))}
        </div>
      )}

      {/* No results — show Go-Show option */}
      {hasSearched && results.length === 0 && query.length >= 3 && !isSearching && (
        <div className="mt-6 text-center">
          <p className="text-charcoal/60 text-sm">
            Tidak ditemukan tamu dengan nama &ldquo;{query}&rdquo;
          </p>
          <button
            onClick={() => setViewState('go-show')}
            className="bg-sage hover:bg-sage/90 focus:ring-sage/20 mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors focus:ring-2 focus:outline-none"
          >
            <PlusIcon />
            Tambah sebagai Go-Show
          </button>
        </div>
      )}
    </div>
  );
}

// ============ Sub-components ============

interface GuestResultItemProps {
  guest: CachedGuest;
  isCheckingIn: boolean;
  onCheckIn: () => void;
}

function GuestResultItem({ guest, isCheckingIn, onCheckIn }: GuestResultItemProps) {
  const groupLabel = getGroupLabel(guest.group);

  return (
    <div
      className="border-border/40 bg-card flex items-center justify-between rounded-xl border p-4 shadow-sm"
      role="listitem"
    >
      <div className="min-w-0 flex-1">
        <p className="text-charcoal truncate text-base font-medium">{guest.name}</p>
        {groupLabel && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getGroupBadgeClass(guest.group)}`}
          >
            {groupLabel}
          </span>
        )}
      </div>

      <div className="ml-3 flex-shrink-0">
        {guest.checkedIn ? (
          <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium">
            <CheckIcon />
            Sudah Check-in
          </span>
        ) : (
          <button
            onClick={onCheckIn}
            disabled={isCheckingIn}
            className="bg-sage hover:bg-sage/90 focus:ring-sage/20 inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors focus:ring-2 focus:outline-none disabled:opacity-50"
            aria-label={`Check-in ${guest.name}`}
          >
            {isCheckingIn ? 'Proses...' : 'Check-in'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============ Helper functions ============

function getGroupLabel(group: string): string {
  switch (group) {
    case 'family':
      return 'Keluarga';
    case 'friend':
      return 'Teman';
    case 'colleague':
      return 'Rekan Kerja';
    case 'vip':
      return 'VIP';
    default:
      return group || '';
  }
}

function getGroupBadgeClass(group: string): string {
  switch (group) {
    case 'family':
      return 'bg-sage/15 text-charcoal';
    case 'friend':
      return 'bg-blush/40 text-charcoal';
    case 'colleague':
      return 'bg-muted text-charcoal/60';
    case 'vip':
      return 'bg-copper/15 text-copper font-semibold';
    default:
      return 'bg-muted text-charcoal/60';
  }
}

// ============ Icons ============

function SearchIcon() {
  return (
    <svg
      className="text-charcoal/40 h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="text-success h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="text-sage h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
