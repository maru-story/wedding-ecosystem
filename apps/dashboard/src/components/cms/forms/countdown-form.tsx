'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EventData {
  event_date?: string | null;
}

interface CountdownFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function CountdownForm({ content, onChange, event }: CountdownFormProps) {
  const targetDate = (content.target_date as string) || '';
  const calendarLink = (content.calendar_link as string) || '';

  const handleSyncDate = () => {
    if (!event?.event_date) return;
    // Format event_date as datetime-local: YYYY-MM-DDT00:00
    const dateOnly = new Date(event.event_date).toISOString().split('T')[0];
    onChange({ ...content, target_date: `${dateOnly}T00:00` });
  };

  return (
    <div className="space-y-4">
      {/* Sync from event settings */}
      {event?.event_date && (
        <div className="flex items-start justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sinkronkan dari Pengaturan Acara</p>
            <p className="text-xs mt-0.5">
              Isi otomatis tanggal countdown dari tanggal acara yang sudah diatur.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleSyncDate}
            className="ml-3 shrink-0 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Terapkan
          </Button>
        </div>
      )}

      <div>
        <label htmlFor="countdown-date" className="block text-sm font-medium text-gray-700">
          Tanggal Acara
        </label>
        <input
          id="countdown-date"
          type="datetime-local"
          value={targetDate}
          onChange={(e) => onChange({ ...content, target_date: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-xs text-gray-500">
          Countdown akan menghitung mundur ke tanggal dan waktu ini.
        </p>
      </div>

      <div>
        <label htmlFor="countdown-calendar" className="block text-sm font-medium text-gray-700">
          Link Kalender (opsional)
        </label>
        <input
          id="countdown-calendar"
          type="url"
          value={calendarLink}
          onChange={(e) => onChange({ ...content, calendar_link: e.target.value })}
          placeholder="https://calendar.google.com/..."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-xs text-gray-500">
          Link Google Calendar atau file .ics untuk tombol &quot;Tambah ke Kalender&quot;.
        </p>
      </div>
    </div>
  );
}
