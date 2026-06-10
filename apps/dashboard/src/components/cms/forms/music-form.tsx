'use client';

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';

interface EventData {
  id?: string;
}

interface MusicFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function MusicForm({ content, onChange, event }: MusicFormProps) {
  const audioUrl = (content.audio_url as string) || '';
  const autoplay = (content.autoplay as boolean) ?? false;
  const title = (content.title as string) || '';

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'music');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="border-primary/20 bg-primary/5 text-foreground rounded-lg border p-3 text-sm">
        Background music akan diputar saat tamu membuka undangan. Tamu dapat mengontrol play/pause.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="music-title">Judul Lagu</Label>
        <Input
          id="music-title"
          type="text"
          value={title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Contoh: Perfect - Ed Sheeran"
        />
      </div>

      <MediaUpload
        mediaType="audio"
        currentUrl={audioUrl}
        onUpload={async (file) => {
          const url = await handleUpload(file);
          onChange({ ...content, audio_url: url });
          return url;
        }}
        onRemove={() => onChange({ ...content, audio_url: '' })}
        label="File Musik (MP3)"
      />

      <div className="border-border/40 bg-card flex items-center justify-between rounded-xl border p-4 shadow-sm">
        <div className="space-y-0.5">
          <Label className="text-foreground text-sm font-semibold">Autoplay</Label>
          <p className="text-muted-foreground text-xs">Putar musik otomatis saat undangan dibuka</p>
        </div>
        <Switch
          checked={autoplay}
          onCheckedChange={(checked) => onChange({ ...content, autoplay: checked })}
          aria-label="Autoplay"
        />
      </div>
    </div>
  );
}
