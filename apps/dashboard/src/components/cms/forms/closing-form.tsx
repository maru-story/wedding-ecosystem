'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EventData {
  id?: string;
}

interface ClosingFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function ClosingForm({ content, onChange, event }: ClosingFormProps) {
  const text = (content.text as string) || '';
  const image = (content.image as string) || '';
  const thankYouMessage = (content.thank_you_message as string) || '';

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'closing');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="closing-text">Teks Penutup</Label>
        <Textarea
          id="closing-text"
          value={text}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          placeholder="Contoh: Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir..."
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="closing-thanks">Ucapan Terima Kasih</Label>
        <Textarea
          id="closing-thanks"
          value={thankYouMessage}
          onChange={(e) => onChange({ ...content, thank_you_message: e.target.value })}
          placeholder="Contoh: Terima kasih atas doa dan restu yang diberikan."
          rows={2}
        />
      </div>

      <MediaUpload
        mediaType="image"
        currentUrl={image}
        onUpload={async (file) => {
          const url = await handleUpload(file);
          onChange({ ...content, image: url });
          return url;
        }}
        onRemove={() => onChange({ ...content, image: '' })}
        label="Foto Penutup (opsional)"
      />
    </div>
  );
}
