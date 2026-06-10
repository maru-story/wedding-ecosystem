'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface EventData {
  id?: string;
}

interface GalleryFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

interface Photo {
  url: string;
  caption: string;
  order: number;
}

export function GalleryForm({ content, onChange, event }: GalleryFormProps) {
  const photos = (content.photos as Photo[]) || [];

  const addPhoto = () => {
    const newOrder = photos.length + 1;
    onChange({
      ...content,
      photos: [...photos, { url: '', caption: '', order: newOrder }],
    });
  };

  const updatePhoto = (index: number, field: keyof Photo, value: string | number) => {
    const updated = [...photos];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...content, photos: updated });
  };

  const removePhoto = (index: number) => {
    const updated = photos
      .filter((_, i) => i !== index)
      .map((photo, i) => ({ ...photo, order: i + 1 }));
    onChange({ ...content, photos: updated });
  };

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'gallery');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Upload foto prewedding untuk galeri undangan.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addPhoto} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Foto
        </Button>
      </div>

      {photos.length === 0 && (
        <div className="border-border/60 bg-card rounded-lg border-2 border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Belum ada foto. Klik tombol di atas untuk menambahkan.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="border-border/40 bg-card space-y-3 rounded-xl border p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold">
                Foto #{photo.order}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => removePhoto(index)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Hapus
              </Button>
            </div>

            <MediaUpload
              mediaType="image"
              currentUrl={photo.url}
              onUpload={async (file) => {
                const url = await handleUpload(file);
                updatePhoto(index, 'url', url);
                return url;
              }}
              onRemove={() => updatePhoto(index, 'url', '')}
            />

            <div className="space-y-1">
              <Input
                type="text"
                value={photo.caption}
                onChange={(e) => updatePhoto(index, 'caption', e.target.value)}
                placeholder="Caption (opsional)"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
