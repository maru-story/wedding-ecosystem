'use client';

import { useState } from 'react';
import { SECTION_TYPE_LABELS, SECTION_TYPE_ICONS } from '@/lib/cms';
import type { InvitationSection } from '@/lib/cms';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEvent, useCmsSections } from '@/hooks/queries';
import { Loader2 } from 'lucide-react';


function PreviewSection({ section }: { section: InvitationSection }) {
  const renderContent = () => {
    switch (section.section_type) {
      case 'cover': {
        const { title, subtitle, opening_text } = section.content as {
          title?: string;
          subtitle?: string;
          opening_text?: string;
        };
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-gradient-to-b from-primary/10 to-transparent">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              {title || 'The Wedding of'}
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold text-foreground">
              {subtitle || 'Nama Mempelai'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Kepada Yth. Nama Tamu</p>
            <Button className="mt-6 rounded-full" size="default">
              {opening_text || 'Buka Undangan'}
            </Button>
          </div>
        );
      }
      case 'bride_groom': {
        const { bride, groom } = section.content as {
          bride?: { name?: string; parent_info?: string };
          groom?: { name?: string; parent_info?: string };
        };
        return (
          <div className="grid grid-cols-2 gap-6 py-8 text-center">
            <div>
              <div className="mx-auto h-24 w-24 rounded-full bg-muted" />
              <p className="mt-3 font-heading text-lg font-semibold">
                {bride?.name || 'Mempelai Wanita'}
              </p>
              <p className="text-xs text-muted-foreground">{bride?.parent_info || 'Putri dari ...'}</p>
            </div>
            <div>
              <div className="mx-auto h-24 w-24 rounded-full bg-muted" />
              <p className="mt-3 font-heading text-lg font-semibold">
                {groom?.name || 'Mempelai Pria'}
              </p>
              <p className="text-xs text-muted-foreground">{groom?.parent_info || 'Putra dari ...'}</p>
            </div>
          </div>
        );
      }
      case 'verse': {
        const { text, source } = section.content as { text?: string; source?: string };
        return (
          <div className="py-8 text-center italic">
            <p className="text-sm text-foreground leading-relaxed">
              &ldquo;{text || 'Ayat atau doa...'}&rdquo;
            </p>
            <p className="mt-2 text-xs text-muted-foreground not-italic">— {source || 'Sumber'}</p>
          </div>
        );
      }
      default: {
        return (
          <div className="py-8 text-center">
            <span className="text-2xl">{SECTION_TYPE_ICONS[section.section_type]}</span>
            <p className="mt-2 text-sm text-muted-foreground">
              {SECTION_TYPE_LABELS[section.section_type]}
            </p>
          </div>
        );
      }
    }
  };

  return <div className="border-b border-border/40 last:border-b-0">{renderContent()}</div>;
}

export default function PreviewPage() {
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');
  const { data: event, isLoading: eventLoading } = useEvent();
  const { data: sections, isLoading: sectionsLoading } = useCmsSections(event?.id);

  if (eventLoading || sectionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground font-medium">Memuat preview...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center p-4">
        <div>
          <p className="text-destructive font-semibold">Gagal memuat detail acara</p>
          <p className="text-sm text-muted-foreground mt-1">Event tidak ditemukan untuk akun ini.</p>
        </div>
      </div>
    );
  }

  const activeSections = (sections || []).filter((s) => s.is_active);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/cms"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <p className="mt-1 text-sm text-muted-foreground">
            Tampilan undangan sesuai konfigurasi section aktif
          </p>
        </div>

        {/* Device toggle */}
        <div className="flex rounded-lg border border-border/40 bg-card p-1">
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
        <div
          className={`overflow-hidden rounded-2xl border-2 border-border/40 bg-card shadow-lg transition-all ${
            deviceView === 'mobile' ? 'w-[375px]' : 'w-full max-w-[768px]'
          }`}
        >
          {deviceView === 'mobile' && (
            <div className="flex items-center justify-center bg-neutral-900 dark:bg-neutral-950 py-2">
              <div className="h-4 w-24 rounded-full bg-muted" />
            </div>
          )}
          <div className="max-h-[600px] overflow-y-auto">
            {activeSections.length > 0 ? (
              activeSections.map((section) => (
                <PreviewSection key={section.id} section={section} />
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Belum ada section yang aktif
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
