'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EventData {
  id?: string;
}

interface VerseFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function VerseForm({ content, onChange, event }: VerseFormProps) {
  const text = (content.text as string) || '';
  const source = (content.source as string) || '';
  const backgroundImage = (content.background_image as string) || '';

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'verse');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="verse-text">Teks Ayat / Doa</Label>
        <Textarea
          id="verse-text"
          value={text}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          placeholder="Masukkan ayat atau doa..."
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="verse-source">Sumber</Label>
        <Input
          id="verse-source"
          type="text"
          value={source}
          onChange={(e) => onChange({ ...content, source: e.target.value })}
          placeholder="Contoh: QS. Ar-Rum: 21"
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
        label="Background Image (opsional)"
      />
    </div>
  );
}
