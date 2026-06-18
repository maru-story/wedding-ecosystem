'use client';

import { useState, useRef, useCallback } from 'react';
import { MediaUpload } from '../media-upload';
import { uploadMedia, validateMediaFile } from '@/lib/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_MAX_GALLERY_PHOTOS } from '@/lib/constants';

interface EventData {
  id?: string;
  event_config?: {
    max_guests?: number;
    max_scanner_devices?: number;
    max_gallery_photos?: number;
  } | null;
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
  const maxPhotos = event?.event_config?.max_gallery_photos ?? DEFAULT_MAX_GALLERY_PHOTOS;
  const remaining = maxPhotos - photos.length;

  const [batchUploading, setBatchUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const batchInputRef = useRef<HTMLInputElement>(null);

  const addPhoto = () => {
    if (photos.length >= maxPhotos) {
      toast.error(`Maksimal ${maxPhotos} foto per galeri`);
      return;
    }
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

  const handleSingleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'gallery');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  // --- Batch multi-file upload ---
  const handleBatchSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      // Check limit
      if (photos.length + fileArray.length > maxPhotos) {
        toast.error(
          `Tidak bisa menambahkan ${fileArray.length} foto. Sisa kuota: ${remaining} (maks ${maxPhotos})`
        );
        if (batchInputRef.current) batchInputRef.current.value = '';
        return;
      }

      // Validate all files first
      const validFiles: File[] = [];
      for (const file of fileArray) {
        const err = validateMediaFile(file, 'image');
        if (err) {
          toast.error(`${file.name}: ${err.message}`);
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) {
        if (batchInputRef.current) batchInputRef.current.value = '';
        return;
      }

      // Upload all valid files
      setBatchUploading(true);
      setUploadProgress({ current: 0, total: validFiles.length });

      const newPhotos: Photo[] = [];
      let startOrder = photos.length + 1;

      for (let i = 0; i < validFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: validFiles.length });
        try {
          let url: string;
          if (event?.id) {
            const res = await uploadMedia(event.id, validFiles[i], 'gallery');
            url = res.url;
          } else {
            url = URL.createObjectURL(validFiles[i]);
          }
          newPhotos.push({ url, caption: '', order: startOrder + i });
        } catch {
          toast.error(`Gagal upload: ${validFiles[i].name}`);
        }
      }

      if (newPhotos.length > 0) {
        onChange({
          ...content,
          photos: [...photos, ...newPhotos],
        });
        toast.success(`${newPhotos.length} foto berhasil diupload`);
      }

      setBatchUploading(false);
      setUploadProgress(null);
      if (batchInputRef.current) batchInputRef.current.value = '';
    },
    [photos, maxPhotos, remaining, event, content, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="space-y-1.5">
        <Label htmlFor="gallery-title">Section Title</Label>
        <Input
          id="gallery-title"
          type="text"
          value={(content.title as string) || ''}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder="Portrait of Us"
          className="bg-card border-border/60"
        />
      </div>

      {/* Batch Upload Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Upload foto prewedding ({photos.length}/{maxPhotos})
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPhoto}
            disabled={photos.length >= maxPhotos}
            className="gap-1.5"
          >
            <ImagePlus className="h-4 w-4" />
            Tambah Manual
          </Button>
        </div>

        {/* Multi-file drop zone */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            batchUploading || photos.length >= maxPhotos
              ? 'pointer-events-none border-border/30 bg-muted/5 opacity-60'
              : 'border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-muted/20'
          }`}
          onClick={() => !batchUploading && batchInputRef.current?.click()}
        >
          {batchUploading ? (
            <>
              <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
              <p className="text-foreground text-sm font-medium">
                Mengupload {uploadProgress?.current}/{uploadProgress?.total} foto...
              </p>
            </>
          ) : (
            <>
              <Upload className="text-muted-foreground/60 mb-2 h-8 w-8" />
              <p className="text-foreground text-sm font-medium">
                Klik untuk upload beberapa foto sekaligus
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Format: JPEG, PNG, WebP, SVG. Maks 5MB per file. Sisa kuota: {remaining} foto.
              </p>
            </>
          )}
        </div>

        <input
          ref={batchInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          multiple
          onChange={handleBatchSelect}
          className="hidden"
          aria-label="Upload beberapa foto galeri sekaligus"
        />
      </div>

      {/* Photo Grid */}
      {photos.length === 0 && (
        <div className="border-border/60 bg-card rounded-lg border-2 border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Belum ada foto. Upload foto di atas atau tambah manual.
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
                const url = await handleSingleUpload(file);
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
