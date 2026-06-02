'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EventData {
  event_date?: string | null;
  akad_start?: string | null;
  akad_end?: string | null;
  resepsi_start?: string | null;
  resepsi_end?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  venue_maps_url?: string | null;
}

interface AkadResepsiFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

interface EventTime {
  date: string;
  time_start: string;
  time_end: string;
}

export function AkadResepsiForm({ content, onChange, event }: AkadResepsiFormProps) {
  const akad = (content.akad as EventTime) || { date: '', time_start: '', time_end: '' };
  const resepsi = (content.resepsi as EventTime) || { date: '', time_start: '', time_end: '' };
  const venue = (content.venue as string) || '';
  const mapsUrl = (content.maps_url as string) || '';

  const updateEvent = (type: 'akad' | 'resepsi', field: keyof EventTime, value: string) => {
    const current = type === 'akad' ? akad : resepsi;
    onChange({
      ...content,
      [type]: { ...current, [field]: value },
    });
  };

  const handleSyncFromSettings = () => {
    if (!event) return;
    const eventDate = event.event_date
      ? new Date(event.event_date).toISOString().split('T')[0]
      : '';

    onChange({
      ...content,
      akad: {
        date: eventDate,
        time_start: event.akad_start || akad.time_start,
        time_end: event.akad_end || akad.time_end,
      },
      resepsi: {
        date: eventDate,
        time_start: event.resepsi_start || resepsi.time_start,
        time_end: event.resepsi_end || resepsi.time_end,
      },
      venue: event.venue_name || venue,
      maps_url: event.venue_maps_url || mapsUrl,
    });
  };

  const renderEventForm = (type: 'akad' | 'resepsi', label: string) => {
    const evt = type === 'akad' ? akad : resepsi;

    return (
      <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-800">{label}</h3>

        <div>
          <label htmlFor={`${type}-date`} className="block text-sm font-medium text-gray-700">
            Tanggal
          </label>
          <input
            id={`${type}-date`}
            type="date"
            value={evt.date}
            onChange={(e) => updateEvent(type, 'date', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${type}-start`} className="block text-sm font-medium text-gray-700">
              Jam Mulai
            </label>
            <input
              id={`${type}-start`}
              type="time"
              value={evt.time_start}
              onChange={(e) => updateEvent(type, 'time_start', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor={`${type}-end`} className="block text-sm font-medium text-gray-700">
              Jam Selesai
            </label>
            <input
              id={`${type}-end`}
              type="time"
              value={evt.time_end}
              onChange={(e) => updateEvent(type, 'time_end', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sync from event settings */}
      {event && (
        <div className="flex items-start justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sinkronkan dari Pengaturan Acara</p>
            <p className="text-xs mt-0.5">
              Isi otomatis tanggal, waktu, dan lokasi dari data pengaturan acara Anda.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleSyncFromSettings}
            className="ml-3 shrink-0 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Terapkan
          </Button>
        </div>
      )}

      {renderEventForm('akad', 'Akad Nikah')}
      {renderEventForm('resepsi', 'Resepsi')}

      <div>
        <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
          Nama Venue
        </label>
        <input
          id="venue"
          type="text"
          value={venue}
          onChange={(e) => onChange({ ...content, venue: e.target.value })}
          placeholder="Contoh: Hotel Grand Ballroom"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label htmlFor="maps-url" className="block text-sm font-medium text-gray-700">
          Link Google Maps
        </label>
        <input
          id="maps-url"
          type="url"
          value={mapsUrl}
          onChange={(e) => onChange({ ...content, maps_url: e.target.value })}
          placeholder="https://maps.google.com/..."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-xs text-gray-500">
          Link ini akan ditampilkan sebagai tombol navigasi di undangan.
        </p>
      </div>
    </div>
  );
}
