'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEvent } from '@/hooks/queries';
import { Loader2 } from 'lucide-react';

export default function PreviewPage() {
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');
  const { data: event, isLoading: eventLoading } = useEvent();

  // Construct the invitation preview URL
  const getPreviewUrl = () => {
    if (!event?.slug) return '';
    const baseUrl = process.env.NEXT_PUBLIC_INVITATION_URL || 'http://localhost:3001';
    return `${baseUrl}/${event.slug}?to=preview`;
  };

  if (eventLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">Memuat preview...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-4 text-center">
        <div>
          <p className="text-destructive font-semibold">Gagal memuat detail acara</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Event tidak ditemukan untuk akun ini.
          </p>
        </div>
      </div>
    );
  }

  const previewUrl = getPreviewUrl();

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/cms"
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke editor
          </Link>
          <h1 className="font-heading text-2xl font-bold">Preview Undangan</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tampilan undangan sesuai konfigurasi section aktif
          </p>
        </div>

        {/* Device toggle */}
        <div className="border-border/40 bg-card flex rounded-lg border p-1">
          <button
            onClick={() => setDeviceView('mobile')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              deviceView === 'mobile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Tampilan mobile"
          >
            📱 Mobile
          </button>
          <button
            onClick={() => setDeviceView('desktop')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              deviceView === 'desktop'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Tampilan desktop"
          >
            🖥️ Desktop
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex justify-center">
        {deviceView === 'mobile' ? (
          /* Phone simulator frame — same pattern as edit page */
          <div className="relative h-[700px] w-[360px] overflow-hidden rounded-[36px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
            {/* Camera notch */}
            <div className="absolute top-2 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center">
              <div className="flex h-5 w-28 items-center justify-center rounded-full bg-neutral-900">
                <div className="mr-2 h-2 w-2 rounded-full bg-neutral-800" />
                <div className="h-1 w-10 rounded-full bg-neutral-800" />
              </div>
            </div>

            {/* Iframe */}
            <div className="relative h-full w-full overflow-hidden rounded-[26px] bg-white">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="h-full w-full border-0"
                  title="Invitation Preview"
                />
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-sm">
                  Menyiapkan pratinjau...
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Desktop frame */
          <div className="border-border/40 w-full max-w-[768px] overflow-hidden rounded-xl border-2 shadow-lg">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-800">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                {previewUrl || 'loading...'}
              </div>
            </div>

            {/* Iframe */}
            <div className="h-[600px] bg-white">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="h-full w-full border-0"
                  title="Invitation Preview (Desktop)"
                />
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-sm">
                  Menyiapkan pratinjau...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
