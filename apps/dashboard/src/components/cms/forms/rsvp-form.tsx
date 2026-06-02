'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

interface RsvpFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

export function RsvpForm({ content, onChange }: RsvpFormProps) {
  const maxPlusOne = (content.max_plus_one as number) ?? 1;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
        Section RSVP akan menampilkan form konfirmasi kehadiran dengan pilihan: Akad, Resepsi, Keduanya, atau Menolak.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rsvp-max-plus-one">Maksimal Tamu Tambahan (Plus One)</Label>
        <Input
          id="rsvp-max-plus-one"
          type="number"
          min={0}
          max={10}
          value={maxPlusOne}
          onChange={(e) => onChange({ ...content, max_plus_one: parseInt(e.target.value) || 0 })}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Jumlah tamu tambahan yang diizinkan per undangan. Tamu dapat membawa maksimal {maxPlusOne} orang tambahan.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Pilihan Kehadiran</Label>
        <div className="space-y-2">
          {[
            { value: 'akad', label: 'Akad Nikah' },
            { value: 'resepsi', label: 'Resepsi' },
            { value: 'both', label: 'Keduanya' },
            { value: 'decline', label: 'Menolak' },
          ].map((option) => (
            <div key={option.value} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <Check className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground">{option.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Pilihan kehadiran ini otomatis tersedia di form RSVP undangan.
        </p>
      </div>
    </div>
  );
}
