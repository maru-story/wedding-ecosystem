'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';

interface EventData {
  id?: string;
}

interface ClosingFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function ClosingForm({ content, onChange, event }: ClosingFormProps) {
  // Backward compat: read old 'image' key, prefer new 'photo_url'
  const photoUrl = (content.photo_url as string) || (content.image as string) || '';

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'closing');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="border-primary/20 bg-primary/5 text-foreground rounded-lg border p-3 text-sm">
        Foto ditampilkan di dalam frame pada halaman penutup undangan. Jika tidak diupload, foto
        default akan digunakan.
      </div>

      <MediaUpload
        mediaType="image"
        currentUrl={photoUrl}
        onUpload={async (file) => {
          const url = await handleUpload(file);
          onChange({ ...content, photo_url: url });
          return url;
        }}
        onRemove={() => onChange({ ...content, photo_url: '' })}
        label="Closing Photo"
      />
    </div>
  );
}
