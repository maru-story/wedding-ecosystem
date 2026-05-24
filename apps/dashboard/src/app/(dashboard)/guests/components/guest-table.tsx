'use client';

import { useState } from 'react';
import { GuestGroup } from '@wedding/shared';
import type { GuestListItem } from '../page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit2, QrCode, Trash2 } from 'lucide-react';
import { useDeleteGuest } from '@/hooks/queries';
import { toast } from 'sonner';

interface GuestTableProps {
  guests: GuestListItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onEdit: (guest: GuestListItem) => void;
  onShowQr: (guest: GuestListItem) => void;
  onRefresh: () => void;
}

const GROUP_LABELS: Record<GuestGroup, string> = {
  [GuestGroup.FAMILY]: 'Keluarga',
  [GuestGroup.FRIEND]: 'Teman',
  [GuestGroup.COLLEAGUE]: 'Rekan Kerja',
  [GuestGroup.VIP]: 'VIP',
};

const GROUP_COLORS: Record<GuestGroup, string> = {
  [GuestGroup.FAMILY]: 'bg-primary/15 text-foreground border-transparent hover:bg-primary/20',
  [GuestGroup.FRIEND]: 'bg-accent/40 text-foreground border-transparent hover:bg-accent/50',
  [GuestGroup.COLLEAGUE]: 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80',
  [GuestGroup.VIP]: 'bg-copper/15 text-copper border-transparent font-semibold hover:bg-copper/20',
};

function getRsvpLabel(status: string | null): { label: string; className: string } {
  switch (status) {
    case 'akad':
      return { label: 'Hadir (Akad)', className: 'bg-success/15 text-success border-transparent hover:bg-success/20' };
    case 'resepsi':
      return { label: 'Hadir (Resepsi)', className: 'bg-success/15 text-success border-transparent hover:bg-success/20' };
    case 'both':
      return { label: 'Hadir (Keduanya)', className: 'bg-success/15 text-success border-transparent hover:bg-success/20' };
    case 'decline':
      return { label: 'Menolak', className: 'bg-destructive/10 text-destructive border-transparent hover:bg-destructive/15' };
    default:
      return { label: 'Belum RSVP', className: 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80' };
  }
}

export function GuestTable({
  guests,
  pagination,
  isLoading,
  onPageChange,
  onEdit,
  onShowQr,
}: GuestTableProps) {
  const deleteGuest = useDeleteGuest();
  const [pendingDeleteGuest, setPendingDeleteGuest] = useState<GuestListItem | null>(null);

  async function handleConfirmDelete() {
    if (!pendingDeleteGuest) return;
    const { id, name } = pendingDeleteGuest;
    try {
      await deleteGuest.mutateAsync(id);
      toast.success(`Tamu "${name}" berhasil dihapus`);
    } catch {
      toast.error(`Gagal menghapus tamu "${name}". Silakan coba lagi.`);
    } finally {
      setPendingDeleteGuest(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">Memuat daftar tamu...</p>
        </div>
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card p-12 text-center shadow-sm">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="mt-4 text-foreground font-medium">Belum ada tamu terdaftar</p>
        <p className="mt-1 text-sm text-muted-foreground">Tambahkan tamu baru atau import dari file CSV</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-4 py-3">Nama</TableHead>
                <TableHead className="px-4 py-3">Grup</TableHead>
                <TableHead className="px-4 py-3">RSVP</TableHead>
                <TableHead className="px-4 py-3">Check-in</TableHead>
                <TableHead className="px-4 py-3">Plus One</TableHead>
                <TableHead className="px-4 py-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((guest) => {
                const rsvp = getRsvpLabel(guest.rsvp_status);
                return (
                  <TableRow key={guest.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{guest.name}</p>
                        {guest.phone && (
                          <p className="text-xs text-muted-foreground">{guest.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className={GROUP_COLORS[guest.group]}>
                        {GROUP_LABELS[guest.group]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className={rsvp.className}>
                        {rsvp.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {guest.check_in_status ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Hadir
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {guest.plus_one_count > 0 ? `+${guest.plus_one_count}` : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onShowQr(guest)}
                          title="Lihat QR Code"
                          aria-label={`Lihat QR Code ${guest.name}`}
                          className="h-8 w-8 hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(guest)}
                          title="Edit tamu"
                          aria-label={`Edit ${guest.name}`}
                          className="h-8 w-8 hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDeleteGuest(guest)}
                          disabled={deleteGuest.isPending}
                          title="Hapus tamu"
                          aria-label={`Hapus ${guest.name}`}
                          className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="mt-4 flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{(pagination.page - 1) * pagination.per_page + 1}</span>–
              <span className="font-medium text-foreground">{Math.min(pagination.page * pagination.per_page, pagination.total)}</span> dari{' '}
              <span className="font-medium text-foreground">{pagination.total}</span> tamu
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Halaman sebelumnya"
                className="h-8 hover:bg-accent border-border/60 hover:text-foreground"
              >
                ← Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                aria-label="Halaman berikutnya"
                className="h-8 hover:bg-accent border-border/60 hover:text-foreground"
              >
                Berikutnya →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!pendingDeleteGuest}
        onOpenChange={(open) => { if (!open) setPendingDeleteGuest(null); }}
      >
        <DialogContent className="sm:max-w-sm bg-card border-border/40">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-foreground">
              Hapus Tamu
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus tamu{' '}
              <span className="font-semibold text-foreground">"{pendingDeleteGuest?.name}"</span>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPendingDeleteGuest(null)}
              disabled={deleteGuest.isPending}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteGuest.isPending}
            >
              {deleteGuest.isPending ? 'Menghapus...' : 'Hapus Tamu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
