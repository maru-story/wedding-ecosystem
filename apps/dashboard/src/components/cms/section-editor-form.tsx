'use client';

import { useState } from 'react';
import type { SectionType } from '@/lib/cms';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { CoverForm } from './forms/cover-form';
import { BrideGroomForm } from './forms/bride-groom-form';
import { BrideForm } from './forms/bride-form';
import { GroomForm } from './forms/groom-form';
import { StoryForm } from './forms/story-form';
import { VerseForm } from './forms/verse-form';
import { CountdownForm } from './forms/countdown-form';
import { AkadResepsiForm } from './forms/akad-resepsi-form';
import { RsvpForm } from './forms/rsvp-form';
import { GalleryForm } from './forms/gallery-form';
import { VideoForm } from './forms/video-form';
import { GiftForm } from './forms/gift-form';
import { MessagesForm } from './forms/messages-form';
import { ClosingForm } from './forms/closing-form';
import { MusicForm } from './forms/music-form';

interface EventData {
  id?: string;
  bride_name?: string | null;
  groom_name?: string | null;
  event_date?: string | null;
  akad_start?: string | null;
  akad_end?: string | null;
  resepsi_start?: string | null;
  resepsi_end?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  venue_maps_url?: string | null;
}

interface SectionEditorFormProps {
  sectionType: SectionType;
  content: Record<string, unknown>;
  onSave: (content: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  event?: EventData | null;
  onChange?: (content: Record<string, unknown>) => void;
}

export function SectionEditorForm({
  sectionType,
  content,
  onSave,
  saving,
  event,
  onChange,
}: SectionEditorFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(content);

  const handleChange = (newData: Record<string, unknown>) => {
    setFormData(newData);
    onChange?.(newData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Strip preview-only fields that should not persist to the database
    const { mock_messages, ...persistData } = formData as Record<string, unknown> & {
      mock_messages?: unknown;
    };
    await onSave(persistData);
  };

  const renderForm = () => {
    const props = { content: formData, onChange: handleChange };

    switch (sectionType) {
      case 'cover':
        return <CoverForm {...props} event={event} />;
      case 'bride_groom':
        return <BrideGroomForm {...props} event={event} />;
      case 'bride':
        return <BrideForm {...props} event={event} />;
      case 'groom':
        return <GroomForm {...props} event={event} />;
      case 'story':
        return <StoryForm {...props} event={event} />;
      case 'verse':
        return <VerseForm {...props} event={event} />;
      case 'countdown':
        return <CountdownForm {...props} event={event} />;
      case 'akad_resepsi':
        return <AkadResepsiForm {...props} event={event} />;
      case 'rsvp':
        return <RsvpForm {...props} />;
      case 'gallery':
        return <GalleryForm {...props} event={event} />;
      case 'video':
        return <VideoForm {...props} event={event} />;
      case 'gift':
        return <GiftForm {...props} />;
      case 'messages':
        return <MessagesForm {...props} />;
      case 'closing':
        return <ClosingForm {...props} event={event} />;
      case 'music':
        return <MusicForm {...props} event={event} />;
      default:
        return (
          <p className="text-sm text-gray-500">
            Form editor belum tersedia untuk tipe section ini.
          </p>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderForm()}

      {/* Save button */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        <Button type="submit" disabled={saving} className="gap-2 font-medium">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Simpan Perubahan'
          )}
        </Button>
      </div>
    </form>
  );
}
