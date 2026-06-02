'use client';

import { useCallback } from 'react';
import { SectionList } from '@/components/cms/section-list';
import type { InvitationSection } from '@/lib/cms';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import {
  useEvent,
  useCmsSections,
  useToggleCmsSectionActive,
  useReorderCmsSection,
} from '@/hooks/queries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function CMSPage() {
  const { data: event, isLoading: eventLoading } = useEvent();
  const { data: sections, isLoading: sectionsLoading } = useCmsSections(event?.id);
  const toggleActiveMutation = useToggleCmsSectionActive();
  const reorderMutation = useReorderCmsSection();

  const handleReorder = useCallback(
    async (sectionId: string, position: number) => {
      if (!event?.id) return;
      try {
        await reorderMutation.mutateAsync({
          eventId: event.id,
          sectionId,
          position,
        });
        toast.success('Urutan section berhasil diperbarui');
      } catch (err: any) {
        toast.error(err.data?.error?.message || 'Gagal mengubah urutan section');
        throw err;
      }
    },
    [event?.id, reorderMutation]
  );

  const handleToggleActive = useCallback(
    async (sectionId: string, isActive: boolean) => {
      if (!event?.id) return;
      try {
        await toggleActiveMutation.mutateAsync({
          eventId: event.id,
          sectionId,
          isActive,
        });
        toast.success(isActive ? 'Section diaktifkan' : 'Section dinonaktifkan');
      } catch (err: any) {
        toast.error(err.data?.error?.message || 'Gagal mengubah status aktif section');
      }
    },
    [event?.id, toggleActiveMutation]
  );

  if (eventLoading || sectionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground font-medium">Memuat editor...</p>
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

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Editor Undangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola konten dan urutan section undangan digital Anda
          </p>
        </div>
        <Link
          href="/cms/preview"
          className={buttonVariants({ variant: 'default', className: 'gap-2' })}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Preview
        </Link>
      </div>

      {/* Info */}
      <div className="mb-4 rounded-lg border border-info/20 bg-info/10 p-3 text-sm text-info">
        <strong>Tips:</strong> Seret section untuk mengubah urutan. Klik toggle untuk
        mengaktifkan/menonaktifkan section. Klik nama section untuk mengedit konten.
      </div>

      {/* Section List */}
      <SectionList
        sections={sections || []}
        onReorder={handleReorder}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}
