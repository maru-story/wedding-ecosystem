'use client';

import { use, useState, useEffect, useRef } from 'react';
import { SectionEditorForm } from '@/components/cms/section-editor-form';
import { SECTION_TYPE_LABELS } from '@/lib/cms';
import Link from 'next/link';
import { useEvent, useCmsSection, useUpdateCmsSectionContent } from '@/hooks/queries';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SectionEditPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = use(params);

  const { data: event, isLoading: eventLoading } = useEvent();
  const {
    data: section,
    isLoading: sectionLoading,
    error: fetchError,
  } = useCmsSection(event?.id, sectionId);
  const updateContentMutation = useUpdateCmsSectionContent();

  const [saving, setSaving] = useState(false);
  const [previewContent, setPreviewContent] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize preview content when section loaded
  useEffect(() => {
    if (section?.content) {
      setPreviewContent(section.content);
    }
  }, [section?.content]);

  const invitationOrigin = process.env.NEXT_PUBLIC_INVITATION_URL || 'http://localhost:3001';

  // Send updates to preview iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'CMS_PREVIEW_UPDATE',
          section_type: section?.section_type,
          content: previewContent,
        },
        invitationOrigin
      );
    }
  }, [previewContent, section?.section_type, invitationOrigin]);

  const handleIframeLoad = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'CMS_PREVIEW_UPDATE',
          section_type: section?.section_type,
          content: previewContent,
        },
        invitationOrigin
      );
    }
  };

  // Construct the preview URL for the invitation iframe
  const getPreviewUrl = () => {
    if (!event?.slug || !section) return '';
    const baseUrl = process.env.NEXT_PUBLIC_INVITATION_URL || 'http://localhost:3001';
    return `${baseUrl}/${event.slug}?to=preview&single=true&focus=${section.section_type}`;
  };

  const previewUrl = getPreviewUrl();

  const handleSave = async (content: Record<string, unknown>) => {
    if (!event?.id || !sectionId) return;

    setSaving(true);
    try {
      await updateContentMutation.mutateAsync({
        eventId: event.id,
        sectionId,
        content,
      });
      toast.success('Perubahan berhasil disimpan');

      // Purge invitation cache after save
      try {
        await fetch(`${process.env.NEXT_PUBLIC_INVITATION_URL}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventSlug: event.slug,
            secret: process.env.NEXT_PUBLIC_REVALIDATION_SECRET,
          }),
        });
      } catch (e) {
        // Non-blocking — don't fail save if revalidation fails
        console.warn('Revalidation failed:', e);
      }
    } catch (err: any) {
      toast.error(err.data?.error?.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  if (eventLoading || sectionLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-3 text-sm">Memuat section...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !section) {
    return (
      <div className="mx-auto max-w-3xl py-8 text-center">
        <h2 className="text-destructive text-lg font-semibold">Gagal memuat section</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Section tidak ditemukan atau Anda tidak memiliki akses.
        </p>
        <Link href="/cms" className="text-primary mt-4 inline-block text-sm underline">
          Kembali ke daftar section
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/cms"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm transition-colors"
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
          Kembali ke daftar section
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold">
            {SECTION_TYPE_LABELS[section.section_type]}
          </h1>
          <p className="text-muted-foreground text-sm">
            Section #{section.sort_order} •{' '}
            {section.is_active ? (
              <span className="text-success font-medium">Aktif</span>
            ) : (
              <span className="text-muted-foreground">Nonaktif</span>
            )}
          </p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden mb-6 border border-border/40 p-1 bg-muted/40 rounded-lg">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'edit'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📝 Edit Konten
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'preview'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📱 Pratinjau
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Section Editor Form */}
        <div
          className={`lg:col-span-3 lg:sticky lg:top-6 border-border/40 bg-card rounded-xl border p-6 shadow-sm ${
            activeTab === 'edit' ? 'block' : 'hidden lg:block'
          }`}
        >
          <SectionEditorForm
            sectionType={section.section_type}
            content={section.content}
            onSave={handleSave}
            saving={saving}
            event={event}
            onChange={setPreviewContent}
          />
        </div>

        {/* Live Preview Panel */}
        <div
          className={`lg:col-span-2 lg:sticky lg:top-6 flex flex-col items-center ${
            activeTab === 'preview' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="w-full max-w-[360px] flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Pratinjau Langsung
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Tampilan Mobile
            </span>
          </div>

          {/* Device Simulator Frame */}
          <div className="relative w-[360px] h-[640px] rounded-[36px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col">
            {/* Camera notch / speaker mock */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-neutral-900 rounded-full z-30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-neutral-800 mr-2" />
              <div className="w-10 h-1 bg-neutral-800 rounded-full" />
            </div>

            {/* Simulated Iframe container */}
            <div className="relative w-full flex-1 bg-white overflow-hidden rounded-[26px]">
              {previewUrl ? (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  onLoad={handleIframeLoad}
                  title="Invitation Preview"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground text-sm">
                  Menyiapkan pratinjau...
                </div>
              )}
              {/* Overlay to block iframe scrolling/clicks (live view only) */}
              <div className="absolute inset-0 z-20 pointer-events-none border-[3px] border-neutral-950/20 rounded-[26px]" />
              <div
                className={`absolute inset-0 z-10 bg-transparent ${
                  section.section_type === 'messages'
                    ? 'pointer-events-auto cursor-not-allowed'
                    : 'pointer-events-none'
                }`}
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3 px-4 leading-normal">
            {['cover', 'story', 'verse', 'bride_groom', 'bride', 'groom'].includes(
              section.section_type
            )
              ? 'Ketik teks di sebelah kiri untuk melihat perubahan pratinjau secara instan.'
              : 'Pratinjau langsung untuk section ini sedang dalam pengembangan.'}
          </p>

          <div className="mt-4 p-3.5 bg-muted/40 rounded-xl border border-border/40 max-w-[360px] text-left">
            <p className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              💡 Informasi Responsivitas Layar
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Tampilan undangan menggunakan tata letak responsif (*fluid layout*). Hasil akhir pada
              ponsel tamu Anda dapat sedikit bervariasi bergantung pada rasio aspek layar, jenis
              perangkat, ukuran font sistem, atau browser yang digunakan. Simulator di atas
              menggambarkan tampilan standar pada layar mobile umumnya (rasio 9:16).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
