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
  const title = (content.title as string) || '';
  // Backward compat: read old 'type' key, prefer new 'video_type'
  const videoType = (content.video_type as string) || (content.type as string) || 'youtube';
  // Backward compat: old schema stored youtube URL in 'video_url' when type was 'youtube'
  const youtubeUrl =
    (content.youtube_url as string) ||
    (videoType === 'youtube' ? (content.video_url as string) || '' : '');
  const videoUrl = videoType === 'upload' ? (content.video_url as string) || '' : '';
  // Backward compat: read old 'thumbnail_url' key, prefer new 'photo_url'
  const photoUrl = (content.photo_url as string) || (content.thumbnail_url as string) || '';

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'video');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="space-y-1.5">
        <Label htmlFor="video-title">Section Title</Label>
        <Input
          id="video-title"
          type="text"
          value={title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          placeholder='Catch a glimpse before the "I do"'
          className="bg-card border-border/60"
        />
      </div>

      {/* Video Source */}
      <div className="space-y-2">
        <Label>Video Source</Label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="video-type"
              value="youtube"
              checked={videoType === 'youtube'}
              onChange={() => onChange({ ...content, video_type: 'youtube', video_url: '' })}
              className="border-border text-primary focus:ring-ring focus:ring-offset-background h-4 w-4"
            />
            <span className="text-foreground text-sm">YouTube</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="video-type"
              value="upload"
              checked={videoType === 'upload'}
              onChange={() => onChange({ ...content, video_type: 'upload', youtube_url: '' })}
              className="border-border text-primary focus:ring-ring focus:ring-offset-background h-4 w-4"
            />
            <span className="text-foreground text-sm">Upload</span>
          </label>
        </div>
      </div>

      {/* YouTube URL */}
      {videoType === 'youtube' && (
        <div className="space-y-1.5">
          <Label htmlFor="youtube-url">YouTube URL</Label>
          <Input
            id="youtube-url"
            type="url"
            value={youtubeUrl}
            onChange={(e) => onChange({ ...content, youtube_url: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className="bg-card border-border/60"
          />
          <p className="text-muted-foreground text-xs">
            Mendukung format: watch URL, short URL (youtu.be), atau embed URL.
          </p>
        </div>
      )}

      {/* Video Upload */}
      {videoType === 'upload' && (
        <MediaUpload
          mediaType="video"
          currentUrl={videoUrl}
          onUpload={async (file) => {
            const url = await handleUpload(file);
            onChange({ ...content, video_url: url });
            return url;
          }}
          onRemove={() => onChange({ ...content, video_url: '' })}
          label="Video File"
        />
      )}

      {/* Photo Below Video */}
      <MediaUpload
        mediaType="image"
        currentUrl={photoUrl}
        onUpload={async (file) => {
          const url = await handleUpload(file);
          onChange({ ...content, photo_url: url });
          return url;
        }}
        onRemove={() => onChange({ ...content, photo_url: '' })}
        label="Photo Below Video (opsional)"
      />
    </div>
  );
}
