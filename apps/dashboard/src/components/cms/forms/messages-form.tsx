'use client';

import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

import ciyoSvg from '../assets/message-form-emoji/cats/ciyo.svg';
import gumihoSvg from '../assets/message-form-emoji/cats/gumiho.svg';
import kumaSvg from '../assets/message-form-emoji/cats/kuma.svg';
import kyoSvg from '../assets/message-form-emoji/cats/kyo.svg';
import spikeSvg from '../assets/message-form-emoji/cats/spike.svg';

const CAT_AVATARS = [
  { src: ciyoSvg, name: 'Ciyo' },
  { src: gumihoSvg, name: 'Gumiho' },
  { src: kumaSvg, name: 'Kuma' },
  { src: kyoSvg, name: 'Kyo' },
  { src: spikeSvg, name: 'Spike' },
];

const DEFAULT_MOCK_MESSAGES = [
  { name: 'John', message: 'Congratulations! Wishing you a lifetime of happiness' },
  { name: 'Sarah', message: 'So happy for you both!' },
];

interface MockMessage {
  name: string;
  message: string;
}

interface MessagesFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

export function MessagesForm({ content, onChange }: MessagesFormProps) {
  const isEnabled = (content.is_enabled as boolean) ?? true;
  const placeholderText = (content.placeholder_text as string) || '';
  const avatarSet = (content.avatar_set as string) || 'cats';
  const mockMessages = (content.mock_messages as MockMessage[]) || DEFAULT_MOCK_MESSAGES;

  const updateMockMessage = (index: number, field: keyof MockMessage, value: string) => {
    const updated = [...mockMessages];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...content, mock_messages: updated });
  };

  const addMockMessage = () => {
    if (mockMessages.length >= 5) return;
    onChange({ ...content, mock_messages: [...mockMessages, { name: '', message: '' }] });
  };

  const removeMockMessage = (index: number) => {
    const updated = mockMessages.filter((_, i) => i !== index);
    onChange({ ...content, mock_messages: updated });
  };

  return (
    <div className="space-y-4">
      <div className="border-primary/20 bg-primary/5 text-foreground rounded-lg border p-3 text-sm">
        Section ini menampilkan form ucapan dari tamu dan daftar ucapan yang sudah masuk.
      </div>

      <div className="border-border/40 bg-card flex items-center justify-between rounded-xl border p-4 shadow-sm">
        <div className="space-y-0.5">
          <Label className="text-foreground text-sm font-semibold">Aktifkan Form Ucapan</Label>
          <p className="text-muted-foreground text-xs">
            Tamu dapat mengirim ucapan melalui undangan
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onChange({ ...content, is_enabled: checked })}
          aria-label="Aktifkan Form Ucapan"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="messages-placeholder">Placeholder Text</Label>
        <Input
          id="messages-placeholder"
          type="text"
          value={placeholderText}
          onChange={(e) => onChange({ ...content, placeholder_text: e.target.value })}
          placeholder="Contoh: Tulis ucapan untuk pengantin..."
          className="bg-card border-border/60"
        />
        <p className="text-muted-foreground text-xs">
          Teks ini akan muncul sebagai placeholder di form ucapan tamu.
        </p>
      </div>

      {/* Avatar Set */}
      <div className="space-y-3">
        <Label>Message Avatars</Label>

        <div className="space-y-3">
          {/* Cat Avatars option */}
          <label
            className={`border-border/40 flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
              avatarSet === 'cats' ? 'border-primary/60 bg-primary/5' : 'bg-card hover:bg-muted/20'
            }`}
          >
            <input
              type="radio"
              name="avatar-set"
              value="cats"
              checked={avatarSet === 'cats'}
              onChange={() => onChange({ ...content, avatar_set: 'cats' })}
              className="border-border text-primary focus:ring-ring focus:ring-offset-background h-4 w-4"
            />
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-foreground text-sm font-medium">Cat Avatars</span>
              <div className="flex gap-2">
                {CAT_AVATARS.map((cat) => (
                  <div
                    key={cat.name}
                    className="border-border/30 bg-muted/20 h-9 w-9 overflow-hidden rounded-full border"
                    title={cat.name}
                  >
                    <Image
                      src={cat.src}
                      alt={cat.name}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </label>

          {/* No Avatars option */}
          <label
            className={`border-border/40 flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
              avatarSet === 'none' ? 'border-primary/60 bg-primary/5' : 'bg-card hover:bg-muted/20'
            }`}
          >
            <input
              type="radio"
              name="avatar-set"
              value="none"
              checked={avatarSet === 'none'}
              onChange={() => onChange({ ...content, avatar_set: 'none' })}
              className="border-border text-primary focus:ring-ring focus:ring-offset-background h-4 w-4"
            />
            <span className="text-foreground text-sm font-medium">No Avatars</span>
          </label>
        </div>

        <p className="text-muted-foreground text-xs">
          Avatar akan ditampilkan di samping setiap ucapan tamu pada halaman undangan.
        </p>
      </div>

      {/* Preview Messages (not saved to DB) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Preview Messages</Label>
            <p className="text-muted-foreground text-xs">
              Contoh ucapan untuk live preview. Tidak disimpan ke database.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMockMessage}
            disabled={mockMessages.length >= 5}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </div>

        {mockMessages.map((msg, index) => (
          <div
            key={index}
            className="border-border/40 bg-card flex items-start gap-3 rounded-xl border p-3"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Input
                type="text"
                value={msg.name}
                onChange={(e) => updateMockMessage(index, 'name', e.target.value)}
                placeholder="Nama pengirim"
                className="bg-card border-border/60 h-8 text-sm"
              />
              <Input
                type="text"
                value={msg.message}
                onChange={(e) => updateMockMessage(index, 'message', e.target.value)}
                placeholder="Isi ucapan..."
                className="bg-card border-border/60 h-8 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeMockMessage(index)}
              className="text-muted-foreground hover:text-destructive mt-1 h-7 w-7 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
