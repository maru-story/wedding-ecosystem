'use client';

import { MediaUpload } from '../media-upload';
import { uploadMedia } from '@/lib/cms';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface EventData {
  id?: string;
}

interface StoryFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  event?: EventData | null;
}

export function StoryForm({ content, onChange, event }: StoryFormProps) {
  const handleUpload = async (file: File): Promise<string> => {
    if (event?.id) {
      const res = await uploadMedia(event.id, file, 'story');
      return res.url;
    }
    return URL.createObjectURL(file);
  };

  const updateField = (field: string, value: any) => {
    onChange({
      ...content,
      [field]: value,
    });
  };

  const phases = (content.phases as Array<{ title: string; date: string; story: string }>) || [
    {
      title: (content.phase_1_title as string) || '',
      date: (content.phase_1_date as string) || '',
      story: (content.phase_1_story as string) || '',
    },
    {
      title: (content.phase_2_title as string) || '',
      date: (content.phase_2_date as string) || '',
      story: (content.phase_2_story as string) || '',
    },
    {
      title: (content.phase_3_title as string) || '',
      date: (content.phase_3_date as string) || '',
      story: (content.phase_3_story as string) || '',
    },
  ];

  const updatePhases = (newPhases: Array<{ title: string; date: string; story: string }>) => {
    const updatedContent: Record<string, any> = {
      ...content,
      phases: newPhases,
    };

    // Populate individual fields for backward compatibility
    for (let i = 0; i < 5; i++) {
      const index = i + 1;
      if (i < newPhases.length) {
        updatedContent[`phase_${index}_title`] = newPhases[i].title;
        updatedContent[`phase_${index}_date`] = newPhases[i].date;
        updatedContent[`phase_${index}_story`] = newPhases[i].story;
      } else {
        delete updatedContent[`phase_${index}_title`];
        delete updatedContent[`phase_${index}_date`];
        delete updatedContent[`phase_${index}_story`];
      }
    }

    onChange(updatedContent);
  };

  const handleAddPhase = () => {
    if (phases.length < 5) {
      const newPhases = [...phases, { title: '', date: '', story: '' }];
      updatePhases(newPhases);
    }
  };

  const handleRemovePhase = (index: number) => {
    if (phases.length > 1) {
      const newPhases = phases.filter((_, i) => i !== index);
      updatePhases(newPhases);
    }
  };

  const handlePhaseChange = (index: number, field: 'title' | 'date' | 'story', value: string) => {
    const newPhases = phases.map((phase, i) => {
      if (i === index) {
        return { ...phase, [field]: value };
      }
      return phase;
    });
    updatePhases(newPhases);
  };

  return (
    <Tabs defaultValue="media" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="media">Aset Media</TabsTrigger>
        <TabsTrigger value="text">Pembuka & Penutup</TabsTrigger>
        <TabsTrigger value="timeline">Cerita Timeline</TabsTrigger>
      </TabsList>

      {/* Tab 1: Media */}
      <TabsContent value="media" className="space-y-4">
        <MediaUpload
          mediaType="image"
          currentUrl={(content.background_image as string) || ''}
          onUpload={async (file) => {
            const url = await handleUpload(file);
            updateField('background_image', url);
            return url;
          }}
          onRemove={() => updateField('background_image', '')}
          label="Background Image (Latar Belakang)"
        />

        <MediaUpload
          mediaType="image"
          currentUrl={(content.bottom_image as string) || ''}
          onUpload={async (file) => {
            const url = await handleUpload(file);
            updateField('bottom_image', url);
            return url;
          }}
          onRemove={() => updateField('bottom_image', '')}
          label="Foto Pasangan / Karakter (Bagian Bawah)"
        />
      </TabsContent>

      {/* Tab 2: Opening & Closing */}
      <TabsContent value="text" className="space-y-6">
        <div className="space-y-4 border-b border-border/40 pb-5">
          <h4 className="text-sm font-semibold text-foreground">Halaman Pembuka (Slide 1)</h4>
          
          <div className="space-y-1.5">
            <Label htmlFor="intro_title">Judul Pembuka</Label>
            <Input
              id="intro_title"
              type="text"
              value={(content.intro_title as string) || ''}
              onChange={(e) => updateField('intro_title', e.target.value)}
              placeholder="Contoh: From cubicles to forever"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="intro_subtitle">Subtitle Pembuka</Label>
            <Input
              id="intro_subtitle"
              type="text"
              value={(content.intro_subtitle as string) || ''}
              onChange={(e) => updateField('intro_subtitle', e.target.value)}
              placeholder="Contoh: a love that surprised us both"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Halaman Penutup (Slide 5)</h4>
          
          <div className="space-y-1.5">
            <Label htmlFor="outro_title">Judul Penutup</Label>
            <Textarea
              id="outro_title"
              value={(content.outro_title as string) || ''}
              onChange={(e) => updateField('outro_title', e.target.value)}
              placeholder="Contoh: and so, on July 11 2026 we're making it official"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outro_subtitle">Subtitle Penutup</Label>
            <Input
              id="outro_subtitle"
              type="text"
              value={(content.outro_subtitle as string) || ''}
              onChange={(e) => updateField('outro_subtitle', e.target.value)}
              placeholder="Contoh: We'd love for you to be there when we do."
            />
          </div>
        </div>
      </TabsContent>

      {/* Tab 3: Timeline */}
      <TabsContent value="timeline" className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Timeline Cerita</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atur urutan perjalanan cinta Anda (minimal 1 fase, maksimal 5 fase).
            </p>
          </div>
          {phases.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPhase}
              className="flex items-center gap-1.5 text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Fase
            </Button>
          )}
        </div>

        {phases.map((phase, i) => (
          <div key={i} className="space-y-4 border-b border-border/40 pb-6 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#7098BC] flex items-center gap-1.5">
                <span>📍</span> Fase Ke-{i + 1} (Slide {i + 2})
              </h4>
              {phases.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePhase(i)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Hapus Fase"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`phase_${i}_title`}>Judul</Label>
                <Input
                  id={`phase_${i}_title`}
                  type="text"
                  value={phase.title}
                  onChange={(e) => handlePhaseChange(i, 'title', e.target.value)}
                  placeholder="Contoh: Coworkers"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`phase_${i}_date`}>Tahun / Tanggal</Label>
                <Input
                  id={`phase_${i}_date`}
                  type="text"
                  value={phase.date}
                  onChange={(e) => handlePhaseChange(i, 'date', e.target.value)}
                  placeholder="Contoh: 2022"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`phase_${i}_story`}>Cerita</Label>
              <Textarea
                id={`phase_${i}_story`}
                value={phase.story}
                onChange={(e) => handlePhaseChange(i, 'story', e.target.value)}
                placeholder="Ceritakan awal mula momen ini..."
                rows={3}
              />
            </div>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
