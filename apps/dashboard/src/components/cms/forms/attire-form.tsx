'use client';

import { useState } from 'react';
import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EventData {
  id?: string;
}

interface AttireFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function AttireForm({ content, onChange, event }: AttireFormProps) {
  const description = (content.description as string) || '';
  const outfitImage = (content.outfit_image as string) || '';
  const colorPalette = (content.color_palette as string[]) || [];
  const [newColor, setNewColor] = useState('#');

  const addColor = () => {
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(newColor)) {
      onChange({ ...content, color_palette: [...colorPalette, newColor] });
      setNewColor('#');
    }
  };

  const removeColor = (index: number) => {
    const updated = colorPalette.filter((_, i) => i !== index);
    onChange({ ...content, color_palette: updated });
  };

  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'attire');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="attire-desc">Deskripsi Dress Code</Label>
        <Textarea
          id="attire-desc"
          value={description}
          onChange={(e) => onChange({ ...content, description: e.target.value })}
          placeholder="Contoh: Kami mengundang para tamu untuk mengenakan pakaian formal dengan nuansa warna pastel..."
          rows={3}
        />
      </div>

      <MediaUpload
        mediaType="image"
        currentUrl={outfitImage}
        onUpload={async (file) => {
          const url = await handleUpload(file);
          onChange({ ...content, outfit_image: url });
          return url;
        }}
        onRemove={() => onChange({ ...content, outfit_image: '' })}
        label="Referensi Outfit (opsional)"
      />

      <div className="space-y-2">
        <Label>Color Palette</Label>
        <div className="mb-2 flex flex-wrap gap-2">
          {colorPalette.map((color, index) => (
            <div
              key={index}
              className="border-border bg-card flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-sm"
            >
              <div
                className="border-border h-4 w-4 rounded-full border"
                style={{ backgroundColor: color }}
              />
              <span className="text-foreground text-xs font-medium">{color}</span>
              <button
                type="button"
                onClick={() => removeColor(index)}
                className="text-muted-foreground hover:text-destructive ml-1 text-sm leading-none transition-colors"
                aria-label={`Hapus warna ${color}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            placeholder="#RRGGBB"
            className="w-32"
          />
          <Button type="button" variant="outline" size="sm" onClick={addColor}>
            Tambah
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Tambahkan warna dalam format hex (#RRGGBB) untuk panduan dress code tamu.
        </p>
      </div>
    </div>
  );
}
