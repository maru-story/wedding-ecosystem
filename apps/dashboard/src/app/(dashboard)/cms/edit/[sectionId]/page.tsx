'use client';

import { use, useState } from 'react';
import { SectionEditorForm } from '@/components/cms/section-editor-form';
import { SECTION_TYPE_LABELS } from '@/lib/cms';
import Link from 'next/link';
import {
  useEvent,
  useCmsSection,
  useUpdateCmsSectionContent,
} from '@/hooks/queries';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SectionEditPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = use(params);

  const { data: event, isLoading: eventLoading } = useEvent();
  const { data: section, isLoading: sectionLoading, error: fetchError } = useCmsSection(
    event?.id,
    sectionId
  );
  const updateContentMutation = useUpdateCmsSectionContent();

  const [saving, setSaving] = useState(false);

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
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Memuat section...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !section) {
    return (
      <div className="mx-auto max-w-3xl py-8 text-center">
        <h2 className="text-lg font-semibold text-destructive">Gagal memuat section</h2>
        <p className="text-sm text-muted-foreground mt-1">Section tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Link href="/cms" className="mt-4 inline-block text-sm text-primary underline">
          Kembali ke daftar section
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/cms"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <p className="text-sm text-muted-foreground">
            Section #{section.sort_order} •{' '}
            {section.is_active ? (
              <span className="text-success font-medium">Aktif</span>
            ) : (
              <span className="text-muted-foreground">Nonaktif</span>
            )}
          </p>
        </div>
      </div>

      {/* Section Editor Form */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <SectionEditorForm
          sectionType={section.section_type}
          content={section.content}
          onSave={handleSave}
          saving={saving}
          event={event}
        />
      </div>
    </div>
  );
}
