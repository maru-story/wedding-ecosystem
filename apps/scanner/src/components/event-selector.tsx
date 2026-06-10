/**
 * Event selector screen for Scanner PWA.
 * Shows after login — user picks which event to scan for.
 * Also handles device registration.
 * UI labels in Bahasa Indonesia.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchEvents, registerDevice, storeEventId, type EventInfo, AuthError } from '@/lib/auth';
import { useAuth } from './auth-provider';

interface EventSelectorProps {
  onEventSelected: (eventId: string) => void;
  initialEventId?: string | null;
}

export function EventSelector({ onEventSelected, initialEventId }: EventSelectorProps) {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInProgressRef = useRef(false);

  const loadEvents = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      if (err instanceof AuthError && err.code === 'AUTH_EXPIRED') {
        logout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar event.');
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [logout]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSelectEvent = async (eventId: string) => {
    setIsRegistering(true);
    setError(null);

    try {
      // Generate a device name based on user and timestamp
      const deviceName = `${user?.name || 'Scanner'} - ${new Date().toLocaleDateString('id-ID')}`;
      await registerDevice(eventId, deviceName);
      storeEventId(eventId);
      onEventSelected(eventId);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'AUTH_EXPIRED') {
          logout();
          return;
        }
        setError(err.message);
      } else {
        setError('Gagal mendaftarkan device. Coba lagi.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Format date to Indonesian format
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-emerald-600" />
          <p className="text-sm text-gray-500">Memuat daftar event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Pilih Event</h1>
          <p className="text-sm text-gray-500">Halo, {user?.name || 'Scanner Operator'}</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          Keluar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-danger/20 bg-danger/10 mb-4 rounded-lg border px-4 py-3">
          <p className="text-danger text-sm">{error}</p>
          <button
            onClick={loadEvents}
            className="text-danger mt-2 text-xs font-medium hover:underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Registering overlay */}
      {isRegistering && (
        <div className="border-sage/20 bg-sage/10 mb-4 flex items-center gap-2 rounded-lg border px-4 py-3">
          <div className="border-sage/40 border-t-sage h-4 w-4 animate-spin rounded-full border-2" />
          <p className="text-sage text-sm">Mendaftarkan device...</p>
        </div>
      )}

      {/* Event list */}
      {events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="bg-sage/10 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
            <svg
              className="text-charcoal/40 h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-charcoal/60 text-sm">Belum ada event yang tersedia.</p>
          <p className="text-charcoal/40 mt-1 text-xs">Hubungi admin untuk menambahkan event.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events
            .filter((event) => event.status === 'published')
            .map((event) => (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(event.id)}
                disabled={isRegistering}
                className="border-border/40 bg-card hover:border-sage focus:ring-sage/20 w-full rounded-xl border p-4 text-left transition-all hover:shadow-sm focus:ring-2 focus:outline-none disabled:opacity-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-charcoal font-semibold">
                      {event.bride_name} & {event.groom_name}
                    </h3>
                    <p className="text-charcoal/60 mt-1 text-sm">{formatDate(event.event_date)}</p>
                    <p className="text-charcoal/40 mt-0.5 text-xs">{event.venue_name}</p>

                    {/* Event Stats Badges */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="bg-cream text-charcoal/70 border-border/20 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                        👥 {event._count?.guests || 0} Tamu
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                          (event.scanner_devices?.length || 0) >= 2
                            ? 'bg-danger/10 text-danger border-danger/20'
                            : 'bg-sage/10 text-sage border-sage/20'
                        }`}
                      >
                        📷 Scanner: {event.scanner_devices?.length || 0}/2
                      </span>
                    </div>
                  </div>
                  <div className="bg-sage/10 ml-3 flex h-8 w-8 items-center justify-center rounded-full">
                    <svg
                      className="text-sage h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}

          {/* Show draft events as disabled */}
          {events
            .filter((event) => event.status !== 'published')
            .map((event) => (
              <div
                key={event.id}
                className="border-border/20 bg-cream/40 w-full rounded-xl border p-4 opacity-60"
              >
                <h3 className="text-charcoal/60 font-semibold">
                  {event.bride_name} & {event.groom_name}
                </h3>
                <p className="text-charcoal/40 mt-1 text-sm">{formatDate(event.event_date)}</p>
                <span className="bg-charcoal/10 text-charcoal/60 mt-2 inline-block rounded-full px-2 py-0.5 text-xs">
                  {event.status === 'draft' ? 'Draft' : 'Selesai'}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
