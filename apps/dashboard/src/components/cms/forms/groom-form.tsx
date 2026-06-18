'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EventData {
  id?: string;
  groom_name?: string | null;
}

interface GroomFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function GroomForm({ content, onChange, event }: GroomFormProps) {
  const name = (content.name as string) || '';
  const parent_info = (content.parent_info as string) || '';
  const photo = (content.photo as string) || '';
  const instagram = (content.instagram as string) || '';

  const updateField = (field: string, value: string) => {
    onChange({
      ...content,
      [field]: value,
    });
  };

  const handleSyncFromSettings = () => {
    if (!event) return;
    onChange({
      ...content,
      name: event.groom_name || '',
    });
  };

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'groom');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Sync from event settings */}
      {event && (
        <div className="border-primary/20 bg-primary/5 flex items-start justify-between rounded-lg border p-3">
          <div className="text-muted-foreground text-sm">
            <p className="text-foreground font-medium">Sinkronkan dari Pengaturan Acara</p>
            <p className="mt-0.5 text-xs">
              Isi otomatis nama mempelai pria dari data pengaturan acara Anda.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleSyncFromSettings}
            className="ml-3 shrink-0 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Terapkan
          </Button>
        </div>
      )}
      <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">Detail Mempelai Pria</h3>

        <div className="space-y-1.5">
          <Label htmlFor="groom-name">Nama Lengkap</Label>
          <Input
            id="groom-name"
            type="text"
            value={name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Contoh: Panji Baskara"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="groom-parent">Info Orang Tua</Label>
          <Input
            id="groom-parent"
            type="text"
            value={parent_info}
            onChange={(e) => updateField('parent_info', e.target.value)}
            placeholder="Contoh: Putra dari Bapak ... & Ibu ..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="groom-instagram">Instagram</Label>
          <Input
            id="groom-instagram"
            type="text"
            value={instagram}
            onChange={(e) => updateField('instagram', e.target.value)}
            placeholder="@username"
          />
        </div>

        <MediaUpload
          mediaType="image"
          currentUrl={photo}
          onUpload={async (file) => {
            const url = await handleUpload(file);
            updateField('photo', url);
            return url;
          }}
          onRemove={() => updateField('photo', '')}
          label="Foto Mempelai Pria"
        />
      </div>
    </div>
  );
}
