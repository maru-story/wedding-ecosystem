'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RsvpFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

export function RsvpForm({ content, onChange }: RsvpFormProps) {
  const introText = (content.intro_text as string) ?? 'Please let us know if you will be\njoining us by filling out the form below:';

  return (
    <div className="space-y-4">
      <div className="border-primary/20 bg-primary/5 text-foreground rounded-lg border p-3 text-sm">
        Section RSVP akan menampilkan form konfirmasi kehadiran dengan pilihan: Akad, Resepsi,
        Keduanya, atau Menolak.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rsvp-intro-text">Teks Pengantar (Intro Text)</Label>
        <Textarea
          id="rsvp-intro-text"
          value={introText}
          onChange={(e) => onChange({ ...content, intro_text: e.target.value })}
          className="w-full min-h-[80px]"
          placeholder="Masukkan teks pengantar di sini..."
        />
        <p className="text-muted-foreground text-xs">
          Teks yang ditampilkan di bawah judul RSVP untuk mengarahkan tamu mengisi konfirmasi.
        </p>
      </div>
    </div>
  );
}
