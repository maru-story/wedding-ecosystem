'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EventData {
  id?: string;
  bride_name?: string | null;
  groom_name?: string | null;
}

interface BrideGroomFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function BrideGroomForm({ content, onChange, event }: BrideGroomFormProps) {
  const brideName = (content.bride_name as string) || '';
  const groomName = (content.groom_name as string) || '';
  const backgroundImage = (content.background_image as string) || '';

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
      bride_name: event.bride_name || '',
      groom_name: event.groom_name || '',
    });
  };

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'bride-groom');
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
              Isi otomatis nama mempelai pria dan wanita dari data pengaturan acara Anda.
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
        <h3 className="text-sm font-semibold text-foreground">Pengaturan Intro Pengantin</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bride-name">Nama Mempelai Wanita</Label>
            <Input
              id="bride-name"
              type="text"
              value={brideName}
              onChange={(e) => updateField('bride_name', e.target.value)}
              placeholder="Gina"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="groom-name">Nama Mempelai Pria</Label>
            <Input
              id="groom-name"
              type="text"
              value={groomName}
              onChange={(e) => updateField('groom_name', e.target.value)}
              placeholder="Panji"
            />
          </div>
        </div>

        <MediaUpload
          mediaType="image"
          currentUrl={backgroundImage}
          onUpload={async (file) => {
            const url = await handleUpload(file);
            updateField('background_image', url);
            return url;
          }}
          onRemove={() => updateField('background_image', '')}
          label="Background Image (Latar Belakang)"
        />
      </div>
    </div>
  );
}
