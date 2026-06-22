'use client';

import { useState, useRef, useEffect } from 'react';
import { GuestGroup } from '@wedding/shared';
import { ApiError } from '@/lib/api';
import type { GuestListItem } from '../page';
import { useCreateGuest, useUpdateGuest, useGuestGroups } from '@/hooks/queries';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Plus } from 'lucide-react';

/** Default preset groups always available in the dropdown. */
const DEFAULT_GROUPS: string[] = [];

interface AddGuestModalProps {
  guest: GuestListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Merge unique groups: presets first, then additional custom ones. */
function mergeGroups(apiGroups: string[] = []): string[] {
  const seen = new Set<string>(DEFAULT_GROUPS);
  const merged = [...DEFAULT_GROUPS];
  for (const g of apiGroups) {
    if (!seen.has(g)) {
      seen.add(g);
      merged.push(g);
    }
  }
  return merged;
}

/** Inline Creatable Group Select — no external deps, matches design system. */
function CreatableGroupSelect({
  value,
  onChange,
  groups,
}: {
  value: string;
  onChange: (val: string) => void;
  groups: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmed = search.trim();
  const filtered = groups.filter((g) => g.toLowerCase().includes(trimmed.toLowerCase()));
  const exactMatch = groups.some((g) => g.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch;

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        id="guest-group"
        onClick={() => {
          setOpen((prev) => !prev);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="border-border/60 bg-card hover:bg-muted/10 flex h-9 w-full items-center justify-between rounded-lg border px-3 text-sm transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || 'Pilih atau buat grup...'}
        </span>
        <ChevronDown className="text-muted-foreground h-4 w-4 flex-shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="bg-card border-border/40 absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border shadow-lg">
          {/* Search Input */}
          <div className="border-border/30 border-b p-2">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari atau buat grup baru..."
              className="bg-muted/20 border-border/40 h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (showCreate) select(trimmed);
                  else if (filtered.length > 0) select(filtered[0]);
                }
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearch('');
                }
              }}
            />
          </div>

          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
            {filtered.map((g) => (
              <li
                key={g}
                role="option"
                aria-selected={value === g}
                onClick={() => select(g)}
                className="hover:bg-accent/30 flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors"
              >
                <Check
                  className={`h-3.5 w-3.5 flex-shrink-0 ${value === g ? 'opacity-100 text-primary' : 'opacity-0'}`}
                />
                {g}
              </li>
            ))}

            {/* Create new group option */}
            {showCreate && (
              <li
                role="option"
                aria-selected={false}
                onClick={() => select(trimmed)}
                className="text-primary hover:bg-primary/10 flex cursor-pointer items-center gap-2 border-t border-dashed px-3 py-2 text-sm font-medium transition-colors"
              >
                <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                Buat grup: &ldquo;{trimmed}&rdquo;
              </li>
            )}

            {filtered.length === 0 && !showCreate && (
              <li className="text-muted-foreground px-3 py-4 text-center text-sm">
                Tidak ada grup ditemukan
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AddGuestModal({ guest, onClose, onSaved }: AddGuestModalProps) {
  const isEditing = !!guest;

  const [name, setName] = useState(guest?.name || '');
  const [group, setGroup] = useState<string>(guest?.group || '');
  const [phone, setPhone] = useState(() => {
    if (guest?.phone?.startsWith('+62')) {
      return guest.phone.slice(3);
    }
    return guest?.phone || '';
  });
  const [plusOneCount, setPlusOneCount] = useState(guest?.plus_one_count ?? 0);
  const [error, setError] = useState('');

  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const { data: apiGroups } = useGuestGroups();
  const isSubmitting = createGuest.isPending || updateGuest.isPending;

  const allGroups = mergeGroups(apiGroups);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      name: name.trim(),
      group,
      phone: phone.trim() ? `+62${phone.trim()}` : undefined,
      plus_one_count: plusOneCount,
    };

    try {
      if (isEditing) {
        await updateGuest.mutateAsync({ id: guest.id, payload });
        toast.success(`Data tamu "${name.trim()}" berhasil diperbarui`);
      } else {
        await createGuest.mutateAsync(payload);
        toast.success(`Tamu "${name.trim()}" berhasil ditambahkan`);
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
    <ResponsiveDialog
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title={isEditing ? 'Edit Tamu' : 'Tambah Tamu Baru'}
      description={
        isEditing
          ? 'Edit informasi tamu yang sudah terdaftar.'
          : 'Tambahkan tamu baru ke dalam daftar undangan.'
      }
      className="sm:max-w-md"
    >
      {error && (
        <div
          className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm mb-4"
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
          <CreatableGroupSelect value={group} onChange={setGroup} groups={allGroups} />
          {group && !DEFAULT_GROUPS.includes(group) && (
            <p className="text-muted-foreground text-[11px]">
              Grup kustom &ldquo;{group}&rdquo; akan dibuat untuk event ini.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="guest-phone" className="text-foreground">
            Nomor Telepon
          </Label>
          <div className="border-border/60 bg-card focus-within:ring-ring focus-within:border-ring flex items-center rounded-lg border pl-3 transition-colors focus-within:ring-1">
            <span className="text-muted-foreground pr-1 text-sm font-semibold select-none">
              +62
            </span>
            <Input
              id="guest-phone"
              type="text"
              value={phone}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.startsWith('0')) {
                  val = val.slice(1);
                } else if (val.startsWith('62')) {
                  val = val.slice(2);
                }
                setPhone(val);
              }}
              placeholder="8xxxxxxxxxx"
              className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
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
          <p className="text-muted-foreground text-[11px]">
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
            disabled={isSubmitting || !name.trim() || !group.trim()}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium"
          >
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Tamu'}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
