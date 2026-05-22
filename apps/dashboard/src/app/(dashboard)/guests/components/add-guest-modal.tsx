'use client';

import { useState } from 'react';
import { GuestGroup } from '@wedding/shared';
import { ApiError } from '@/lib/api';
import type { GuestListItem } from '../page';
import { useCreateGuest, useUpdateGuest } from '@/hooks/queries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddGuestModalProps {
  guest: GuestListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const GROUP_OPTIONS: { value: GuestGroup; label: string }[] = [
  { value: GuestGroup.FAMILY, label: 'Keluarga' },
  { value: GuestGroup.FRIEND, label: 'Teman' },
  { value: GuestGroup.COLLEAGUE, label: 'Rekan Kerja' },
  { value: GuestGroup.VIP, label: 'VIP' },
];

export function AddGuestModal({ guest, onClose, onSaved }: AddGuestModalProps) {
  const isEditing = !!guest;

  const [name, setName] = useState(guest?.name || '');
  const [group, setGroup] = useState<GuestGroup>(guest?.group || GuestGroup.FAMILY);
  const [phone, setPhone] = useState(guest?.phone || '');
  const [email, setEmail] = useState(guest?.email || '');
  const [plusOneCount, setPlusOneCount] = useState(guest?.plus_one_count ?? 0);
  const [error, setError] = useState('');

  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const isSubmitting = createGuest.isPending || updateGuest.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      name: name.trim(),
      group,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      plus_one_count: plusOneCount,
    };

    try {
      if (isEditing) {
        await updateGuest.mutateAsync({ id: guest.id, payload });
      } else {
        await createGuest.mutateAsync(payload);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        setError(data.message || 'Gagal menyimpan data tamu');
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/40">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-wide text-foreground">
            {isEditing ? 'Edit Tamu' : 'Tambah Tamu Baru'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="guest-name" className="text-foreground">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guest-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap tamu"
              required
              className="bg-card border-border/60 hover:bg-muted/10 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guest-group" className="text-foreground">
              Grup <span className="text-destructive">*</span>
            </Label>
            <Select
              value={group}
              onValueChange={(val) => setGroup(val as GuestGroup)}
            >
              <SelectTrigger className="w-full bg-card border-border/60 hover:bg-muted/10 transition-colors">
                <SelectValue placeholder="Pilih Grup" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guest-phone" className="text-foreground">Nomor Telepon</Label>
            <Input
              id="guest-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+62812345678"
              className="bg-card border-border/60 hover:bg-muted/10 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guest-email" className="text-foreground">Email</Label>
            <Input
              id="guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tamu@email.com"
              className="bg-card border-border/60 hover:bg-muted/10 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guest-plus-one" className="text-foreground">
              Jumlah Tamu Tambahan (Plus One)
            </Label>
            <Input
              id="guest-plus-one"
              type="number"
              min={0}
              max={10}
              value={plusOneCount}
              onChange={(e) => setPlusOneCount(parseInt(e.target.value, 10) || 0)}
              className="bg-card border-border/60 hover:bg-muted/10 transition-colors"
            />
            <p className="text-[11px] text-muted-foreground">
              Jumlah orang tambahan yang boleh dibawa tamu (0–10)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium"
            >
              {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Tamu'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
