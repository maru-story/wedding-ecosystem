'use client';

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MessagesFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

export function MessagesForm({ content, onChange }: MessagesFormProps) {
  const isEnabled = (content.is_enabled as boolean) ?? true;
  const placeholderText = (content.placeholder_text as string) || '';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
        Section ini menampilkan form ucapan dari tamu dan daftar ucapan yang sudah masuk.
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="space-y-0.5">
          <Label className="text-sm font-semibold text-foreground">Aktifkan Form Ucapan</Label>
          <p className="text-xs text-muted-foreground">Tamu dapat mengirim ucapan melalui undangan</p>
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
        />
        <p className="text-xs text-muted-foreground">
          Teks ini akan muncul sebagai placeholder di form ucapan tamu.
        </p>
      </div>
    </div>
  );
}
