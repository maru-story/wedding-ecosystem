'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EventData {
  id?: string;
  bride_name?: string | null;
  groom_name?: string | null;
}

interface CoverFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function CoverForm({ content, onChange, event }: CoverFormProps) {
  const title = (content.title as string) || '';
  const subtitle = (content.subtitle as string) || '';
  const backgroundImage = (content.background_image as string) || '';
  const openingText = (content.opening_text as string) || '';

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'cover');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  const hasCoupleName = event?.groom_name && event?.bride_name;

  return (
    <div className="space-y-4">
      {/* Info mempelai dari pengaturan acara */}
      {hasCoupleName && (
        <div className="border-border/40 bg-muted/40 rounded-lg border px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium">
            Nama mempelai dari Pengaturan Acara:
          </p>
          <p className="text-foreground mt-0.5 text-sm font-semibold">
            {event.groom_name} & {event.bride_name}
          </p>
          <p className="text-muted-foreground/80 mt-1 text-xs">
            Gunakan nama ini sebagai referensi untuk mengisi subtitle di bawah.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cover-title">Judul</Label>
        <Input
          id="cover-title"
          type="text"
          value={title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Contoh: The Wedding of"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cover-subtitle">Subtitle</Label>
        <Input
          id="cover-subtitle"
          type="text"
          value={subtitle}
          onChange={(e) => onChange({ ...content, subtitle: e.target.value })}
          placeholder={
            hasCoupleName ? `${event.groom_name} & ${event.bride_name}` : 'Contoh: Romeo & Juliet'
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cover-opening">Teks Tombol Buka</Label>
        <Input
          id="cover-opening"
          type="text"
          value={openingText}
          onChange={(e) => onChange({ ...content, opening_text: e.target.value })}
          placeholder="Contoh: Buka Undangan"
        />
      </div>

      <MediaUpload
        mediaType="image"
        currentUrl={backgroundImage}
        onUpload={async (file) => {
          const url = await handleUpload(file);
          onChange({ ...content, background_image: url });
          return url;
        }}
        onRemove={() => onChange({ ...content, background_image: '' })}
        label="Background Image"
      />
    </div>
  );
}
