'use client';

import { useState, useRef, useCallback } from 'react';
import { validateMediaFile } from '@/lib/cms';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, FileImage, Music } from 'lucide-react';

interface MediaUploadProps {
  mediaType: 'image' | 'video' | 'audio';
  currentUrl?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => void;
  label?: string;
}

export function MediaUpload({
  mediaType,
  currentUrl,
  onUpload,
  onRemove,
  label,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFormats =
    mediaType === 'image'
      ? 'image/jpeg,image/png,image/webp'
      : mediaType === 'video'
      ? 'video/mp4'
      : 'audio/mpeg,audio/mp3';

  const formatHint =
    mediaType === 'image'
      ? 'Format: JPEG, PNG, WebP. Maks 5MB.'
      : mediaType === 'video'
      ? 'Format: MP4. Maks 50MB.'
      : 'Format: MP3. Maks 10MB.';

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      // Validate file
      const validationError = validateMediaFile(file, mediaType);
      if (validationError) {
        setError(validationError.message);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Show preview for images
      if (mediaType === 'image') {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For video and audio, we don't necessarily show a local preview before upload
        // but we'll update it once uploaded
      }

      // Upload
      setUploading(true);
      try {
        const url = await onUpload(file);
        setPreview(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload gagal. Silakan coba lagi.');
        setPreview(currentUrl || null);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [mediaType, onUpload, currentUrl]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    onRemove?.();
  }, [onRemove]);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      {/* Preview area */}
      {preview && (
        <div className="relative rounded-lg border border-border/60 overflow-hidden bg-muted/20">
          {mediaType === 'image' ? (
            <img
              src={preview}
              alt="Preview"
              className="h-48 w-full object-cover"
            />
          ) : mediaType === 'video' ? (
            <video
              src={preview}
              className="h-48 w-full object-cover"
              controls
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-24 p-4">
              <Music className="h-8 w-8 text-primary mb-2" />
              <audio src={preview} controls className="w-full h-8" />
            </div>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-full p-0 h-7 w-7 shadow-md"
              aria-label="Hapus media"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Upload area */}
      {!preview && (
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
            error ? 'border-destructive/40 bg-destructive/5' : 'border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-muted/20'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">
            {mediaType === 'image' ? 'Upload foto' : mediaType === 'video' ? 'Upload video' : 'Upload musik (MP3)'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{formatHint}</p>
        </div>
      )}

      {/* File input and button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptFormats}
          onChange={handleFileSelect}
          className="hidden"
          aria-label={`Pilih file ${mediaType === 'image' ? 'gambar' : mediaType === 'video' ? 'video' : 'musik'}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Mengupload...
            </>
          ) : (
            <>
              {mediaType === 'audio' ? <Music className="h-4 w-4 text-muted-foreground" /> : <FileImage className="h-4 w-4 text-muted-foreground" />}
              {preview ? 'Ganti File' : 'Pilih File'}
            </>
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
