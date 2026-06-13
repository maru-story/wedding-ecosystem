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
          <div className="from-primary/10 flex flex-col items-center justify-center bg-gradient-to-b to-transparent py-16 text-center">
            <p className="text-muted-foreground text-sm tracking-widest uppercase">
              {title || 'The Wedding of'}
            </p>
            <h2 className="font-heading text-foreground mt-2 text-3xl font-bold">
              {subtitle || 'Nama Mempelai'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">Kepada Yth. Nama Tamu</p>
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
              <div className="bg-muted mx-auto h-24 w-24 rounded-full" />
              <p className="font-heading mt-3 text-lg font-semibold">
                {bride?.name || 'Mempelai Wanita'}
              </p>
              <p className="text-muted-foreground text-xs">
                {bride?.parent_info || 'Putri dari ...'}
              </p>
            </div>
            <div>
              <div className="bg-muted mx-auto h-24 w-24 rounded-full" />
              <p className="font-heading mt-3 text-lg font-semibold">
                {groom?.name || 'Mempelai Pria'}
              </p>
              <p className="text-muted-foreground text-xs">
                {groom?.parent_info || 'Putra dari ...'}
              </p>
            </div>
          </div>
        );
      }
      case 'verse': {
        const { text, source } = section.content as { text?: string; source?: string };
        return (
          <div className="py-8 text-center italic">
            <p className="text-foreground text-sm leading-relaxed">
              &ldquo;{text || 'Ayat atau doa...'}&rdquo;
            </p>
            <p className="text-muted-foreground mt-2 text-xs not-italic">— {source || 'Sumber'}</p>
          </div>
        );
      }
      default: {
        return (
          <div className="py-8 text-center">
            <span className="text-2xl">{SECTION_TYPE_ICONS[section.section_type]}</span>
            <p className="text-muted-foreground mt-2 text-sm">
              {SECTION_TYPE_LABELS[section.section_type]}
            </p>
          </div>
        );
      }
    }
  };

  return <div className="border-border/40 border-b last:border-b-0">{renderContent()}</div>;
}

export default function PreviewPage() {
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');
  const { data: event, isLoading: eventLoading } = useEvent();
  const { data: sections, isLoading: sectionsLoading } = useCmsSections(event?.id);

  if (eventLoading || sectionsLoading) {
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

  const activeSections = (sections || []).filter((s) => s.is_active);

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
        <div
          className={`border-border/40 bg-card overflow-hidden rounded-2xl border-2 shadow-lg transition-all ${
            deviceView === 'mobile' ? 'w-[375px]' : 'w-full max-w-[768px]'
          }`}
        >
          {deviceView === 'mobile' && (
            <div className="flex items-center justify-center bg-neutral-900 py-2 dark:bg-neutral-950">
              <div className="bg-muted h-4 w-24 rounded-full" />
            </div>
          )}
          <div className="max-h-[600px] overflow-y-auto">
            {activeSections.length > 0 ? (
              activeSections.map((section) => <PreviewSection key={section.id} section={section} />)
            ) : (
              <div className="text-muted-foreground py-12 text-center text-sm">
                Belum ada section yang aktif
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
