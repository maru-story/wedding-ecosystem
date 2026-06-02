'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EventData {
  id?: string;
}

interface VideoFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function VideoForm({ content, onChange, event }: VideoFormProps) {
  const videoUrl = (content.video_url as string) || '';
  const thumbnailUrl = (content.thumbnail_url as string) || '';
  const videoType = (content.type as string) || 'youtube';

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'video');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipe Video</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="video-type"
              value="youtube"
              checked={videoType === 'youtube'}
              onChange={() => onChange({ ...content, type: 'youtube' })}
              className="h-4 w-4 border-border text-primary focus:ring-ring focus:ring-offset-background"
            />
            <span className="text-sm text-foreground">YouTube</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="video-type"
              value="upload"
              checked={videoType === 'upload'}
              onChange={() => onChange({ ...content, type: 'upload' })}
              className="h-4 w-4 border-border text-primary focus:ring-ring focus:ring-offset-background"
            />
            <span className="text-sm text-foreground">Upload</span>
          </label>
        </div>
      </div>

      {videoType === 'youtube' ? (
        <div className="space-y-1.5">
          <Label htmlFor="video-url">URL YouTube</Label>
          <Input
            id="video-url"
            type="url"
            value={videoUrl}
            onChange={(e) => onChange({ ...content, video_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">
            Paste link YouTube video prewedding atau cinematic Anda.
          </p>
        </div>
      ) : (
        <MediaUpload
          mediaType="video"
          currentUrl={videoUrl}
          onUpload={async (file) => {
            const url = await handleUpload(file);
            onChange({ ...content, video_url: url });
            return url;
          }}
          onRemove={() => onChange({ ...content, video_url: '' })}
          label="Upload Video"
        />
      )}

      <MediaUpload
        mediaType="image"
        currentUrl={thumbnailUrl}
        onUpload={async (file) => {
          const url = await handleUpload(file);
          onChange({ ...content, thumbnail_url: url });
          return url;
        }}
        onRemove={() => onChange({ ...content, thumbnail_url: '' })}
        label="Thumbnail (opsional)"
      />
    </div>
  );
}
