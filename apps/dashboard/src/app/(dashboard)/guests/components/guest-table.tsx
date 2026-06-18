'use client';

import { useState } from 'react';
import { GuestGroup } from '@wedding/shared';
import type { GuestListItem } from '../page';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit2, QrCode, Trash2 } from 'lucide-react';
import { useDeleteGuest, useBulkDeleteGuests } from '@/hooks/queries';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';

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
  onPerPageChange?: (perPage: number) => void;
  onEdit: (guest: GuestListItem) => void;
  onShowQr: (guest: GuestListItem) => void;
  // Selection props from useTableState hook
  selectedIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onClearSelection: () => void;
}

/** Color classes for preset groups. Custom groups fall back to neutral. */
const GROUP_COLORS: Record<string, string> = {
  [GuestGroup.FAMILY]:    'bg-primary/15 text-foreground border-transparent hover:bg-primary/20',
  [GuestGroup.FRIEND]:    'bg-accent/40 text-foreground border-transparent hover:bg-accent/50',
  [GuestGroup.COLLEAGUE]: 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80',
  [GuestGroup.VIP]:       'bg-copper/15 text-copper border-transparent font-semibold hover:bg-copper/20',
};

const CUSTOM_GROUP_COLOR = 'bg-muted/60 text-muted-foreground border-transparent hover:bg-muted';

function getGroupBadge(group: string): { label: string; className: string } {
  return {
    label: group,
    className: GROUP_COLORS[group] ?? CUSTOM_GROUP_COLOR,
  };
}

function getRsvpLabel(status: string | null): { label: string; className: string } {
  switch (status) {
    case 'akad':
      return {
        label: 'Hadir (Akad)',
        className: 'bg-success/15 text-success border-transparent hover:bg-success/20',
      };
    case 'resepsi':
      return {
        label: 'Hadir (Resepsi)',
        className: 'bg-success/15 text-success border-transparent hover:bg-success/20',
      };
    case 'both':
      return {
        label: 'Hadir (Keduanya)',
        className: 'bg-success/15 text-success border-transparent hover:bg-success/20',
      };
    case 'decline':
      return {
        label: 'Menolak',
        className: 'bg-destructive/10 text-destructive border-transparent hover:bg-destructive/15',
      };
    default:
      return {
        label: 'Belum RSVP',
        className: 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80',
      };
  }
}

export function GuestTable({
  guests,
  pagination,
  isLoading,
  onPageChange,
  onPerPageChange,
  onEdit,
  onShowQr,
  selectedIds,
  allSelected,
  someSelected,
  onSelectAll,
  onSelectOne,
  onClearSelection,
}: GuestTableProps) {
  const deleteGuest = useDeleteGuest();
  const bulkDeleteGuests = useBulkDeleteGuests();
  const [pendingDeleteGuest, setPendingDeleteGuest] = useState<GuestListItem | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  async function handleConfirmDelete() {
    if (!pendingDeleteGuest) return;
    const { id, name } = pendingDeleteGuest;
    try {
      await deleteGuest.mutateAsync(id);
      toast.success(`Tamu "${name}" berhasil dihapus`);
    } catch (err: any) {
      console.error('Delete guest error:', err);
      toast.error(
        err instanceof Error ? err.message : `Gagal menghapus tamu "${name}". Silakan coba lagi.`
      );
    } finally {
      setPendingDeleteGuest(null);
    }
  }

  async function handleConfirmBulkDelete() {
    if (selectedIds.length === 0) return;
    try {
      const result = await bulkDeleteGuests.mutateAsync(selectedIds);
      toast.success(`${result.deletedCount} tamu berhasil dihapus`);
      onClearSelection();
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Gagal menghapus beberapa tamu. Silakan coba lagi.'
      );
    } finally {
      setShowBulkDeleteDialog(false);
    }
  }

  return (
    <>
      <DataTable
        isLoading={isLoading}
        loadingText="Memuat daftar tamu..."
        isEmpty={guests.length === 0}
        emptyTitle="Belum ada tamu terdaftar"
        emptyDescription="Tambahkan tamu baru atau import dari file CSV"
        header={
          <>
            <TableHead className="w-12 px-4 py-3">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                aria-label="Pilih semua tamu"
              />
            </TableHead>
            <TableHead className="px-4 py-3">Nama</TableHead>
            <TableHead className="px-4 py-3">Grup</TableHead>
            <TableHead className="px-4 py-3">RSVP</TableHead>
            <TableHead className="px-4 py-3">Check-in</TableHead>
            <TableHead className="px-4 py-3">Plus One</TableHead>
            <TableHead className="px-4 py-3 text-right">Aksi</TableHead>
          </>
        }
        pagination={pagination}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        selectedCount={selectedIds.length}
        bulkActionsLabel={`${selectedIds.length} tamu terpilih`}
        bulkActions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteDialog(true)}
            disabled={bulkDeleteGuests.isPending}
            className="h-8 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Hapus Terpilih
          </Button>
        }
        paginationText={(p) => (
          <>
            Menampilkan{' '}
            <span className="text-foreground font-medium">{(p.page - 1) * p.per_page + 1}</span>–
            <span className="text-foreground font-medium">
              {Math.min(p.page * p.per_page, p.total)}
            </span>{' '}
            dari <span className="text-foreground font-medium">{p.total}</span> tamu
          </>
        )}
      >
        {guests.map((guest) => {
          const rsvp = getRsvpLabel(guest.rsvp_status);
          return (
            <TableRow key={guest.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="px-4 py-3">
                <Checkbox
                  checked={selectedIds.includes(guest.id)}
                  onCheckedChange={(checked) => onSelectOne(guest.id, !!checked)}
                  aria-label={`Pilih ${guest.name}`}
                />
              </TableCell>
              <TableCell className="px-4 py-3">
                <div>
                  <p className="text-foreground font-medium">{guest.name}</p>
                  {guest.phone && <p className="text-muted-foreground text-xs">{guest.phone}</p>}
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant="outline" className={getGroupBadge(guest.group).className}>
                  {getGroupBadge(guest.group).label}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant="outline" className={rsvp.className}>
                  {rsvp.label}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3">
                {guest.check_in_status ? (
                  <span className="text-success inline-flex items-center gap-1 text-xs font-semibold">
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
                  <span className="text-muted-foreground/60 text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="px-4 py-3">
                <span className="text-muted-foreground text-sm">
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
                    className="hover:bg-accent text-muted-foreground hover:text-foreground h-8 w-8"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(guest)}
                    title="Edit tamu"
                    aria-label={`Edit ${guest.name}`}
                    className="hover:bg-accent text-muted-foreground hover:text-foreground h-8 w-8"
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
                    className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive h-8 w-8 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!pendingDeleteGuest}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteGuest(null);
        }}
      >
        <DialogContent className="bg-card border-border/40 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground text-xl">Hapus Tamu</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus tamu{' '}
              <span className="text-foreground font-semibold">"{pendingDeleteGuest?.name}"</span>?
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={(open) => {
          if (!open) setShowBulkDeleteDialog(false);
        }}
      >
        <DialogContent className="bg-card border-border/40 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground text-xl">
              Hapus Beberapa Tamu
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus{' '}
              <span className="text-foreground font-semibold">{selectedIds.length} tamu</span>{' '}
              terpilih? Tindakan ini akan menghapus semua data terkait tamu-tamu tersebut dan tidak
              dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={bulkDeleteGuests.isPending}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBulkDelete}
              disabled={bulkDeleteGuests.isPending}
            >
              {bulkDeleteGuests.isPending ? 'Menghapus...' : 'Hapus Terpilih'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
