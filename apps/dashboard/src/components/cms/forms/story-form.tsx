'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface EventData {
  id?: string;
}

interface StoryFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

interface Chapter {
  title: string;
  description: string;
  image: string;
  date: string;
}

export function StoryForm({ content, onChange, event }: StoryFormProps) {
  const chapters = (content.chapters as Chapter[]) || [];

  const addChapter = () => {
    onChange({
      ...content,
      chapters: [...chapters, { title: '', description: '', image: '', date: '' }],
    });
  };

  const updateChapter = (index: number, field: keyof Chapter, value: string) => {
    const updated = [...chapters];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...content, chapters: updated });
  };

  const removeChapter = (index: number) => {
    const updated = chapters.filter((_, i) => i !== index);
    onChange({ ...content, chapters: updated });
  };

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'story');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Tambahkan chapter untuk menceritakan perjalanan cinta Anda.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addChapter} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Chapter
        </Button>
      </div>

      {chapters.length === 0 && (
        <div className="border-border/60 bg-card rounded-lg border-2 border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Belum ada chapter. Klik tombol di atas untuk menambahkan.
          </p>
        </div>
      )}

      {chapters.map((chapter, index) => (
        <div
          key={index}
          className="border-border/40 bg-card space-y-4 rounded-xl border p-4 shadow-sm"
        >
          <div className="border-border/40 flex items-center justify-between border-b pb-2">
            <h4 className="text-foreground text-sm font-semibold">Chapter {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => removeChapter(index)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Hapus
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`title-${index}`}>Judul</Label>
            <Input
              id={`title-${index}`}
              type="text"
              value={chapter.title}
              onChange={(e) => updateChapter(index, 'title', e.target.value)}
              placeholder="Contoh: Pertama Bertemu"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`date-${index}`}>Tanggal</Label>
            <Input
              id={`date-${index}`}
              type="date"
              value={chapter.date}
              onChange={(e) => updateChapter(index, 'date', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`desc-${index}`}>Deskripsi</Label>
            <Textarea
              id={`desc-${index}`}
              value={chapter.description}
              onChange={(e) => updateChapter(index, 'description', e.target.value)}
              placeholder="Ceritakan momen ini..."
              rows={3}
            />
          </div>

          <MediaUpload
            mediaType="image"
            currentUrl={chapter.image}
            onUpload={async (file) => {
              const url = await handleUpload(file);
              updateChapter(index, 'image', url);
              return url;
            }}
            onRemove={() => updateChapter(index, 'image', '')}
            label="Foto"
          />
        </div>
      ))}
    </div>
  );
}
