'use client';

import { useState } from 'react';
import { useEvent, useAdminWishes, useToggleWishVisibility, useDeleteWish } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/motion-wrapper';
import { MessageSquare, Download, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useTableState } from '@/hooks/use-table-state';
import { DataTable } from '@/components/ui/data-table';

interface WishItem {
  id: string;
  sender_name: string;
  message_text: string;
  is_visible: boolean;
  created_at: string;
  guest?: {
    id: string;
    name: string;
  } | null;
}

interface PaginatedWishes {
  data: WishItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export default function WishesPage() {
  const { data: eventData, isLoading: isEventLoading } = useEvent();
  const eventId = eventData?.id;

  const tableState = useTableState<WishItem>({
    initialPerPage: 20,
  });

  const {
    data: wishesData,
    isLoading: isWishesLoading,
    refetch,
    isFetching: isWishesFetching,
  } = useAdminWishes({
    eventId,
    page: tableState.page,
    perPage: tableState.perPage,
  });

  const toggleMutation = useToggleWishVisibility();
  const deleteMutation = useDeleteWish();

  const [isExporting, setIsExporting] = useState(false);
  const [pendingDeleteWish, setPendingDeleteWish] = useState<WishItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleVisibility = async (wish: WishItem) => {
    setTogglingId(wish.id);
    try {
      await toggleMutation.mutateAsync({ id: wish.id, isVisible: !wish.is_visible });
      toast.success(!wish.is_visible ? 'Ucapan ditampilkan di undangan' : 'Ucapan disembunyikan');
    } catch {
      toast.error('Gagal mengubah status visibilitas ucapan');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteWish) return;
    try {
      await deleteMutation.mutateAsync(pendingDeleteWish.id);
      toast.success('Ucapan berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus ucapan');
    } finally {
      setPendingDeleteWish(null);
    }
  };

  const handleExportCSV = async () => {
    if (!eventData?.id) return;
    setIsExporting(true);
    try {
      let allWishes: WishItem[] = [];
      let currentPage = 1;
      let totalPages = 1;

      // Loop page by page with max allowed per_page (100) to bypass max constraint
      do {
        const res = await apiFetch<PaginatedWishes>(
          `/messages/${eventData.id}/admin?page=${currentPage}&per_page=100`
        );
        const wishesList = res.data || [];
        allWishes = [...allWishes, ...wishesList];
        totalPages = res.pagination?.total_pages || 1;
        currentPage++;
      } while (currentPage <= totalPages);

      if (allWishes.length === 0) {
        toast.info('Belum ada ucapan untuk diexport');
        setIsExporting(false);
        return;
      }

      // Build CSV content
      const headers = [
        'Nama Pengirim',
        'Tamu Terdaftar',
        'Ucapan & Doa',
        'Tanggal Kirim',
        'Status Tampil',
      ];
      const rows = allWishes.map((w) => [
        `"${w.sender_name.replace(/"/g, '""')}"`,
        `"${(w.guest?.name || '').replace(/"/g, '""')}"`,
        `"${w.message_text.replace(/"/g, '""')}"`,
        new Date(w.created_at).toLocaleString('id-ID'),
        w.is_visible ? 'Tampil' : 'Disembunyikan',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daftar_Ucapan_${eventData.slug}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Daftar ucapan berhasil diexport ke CSV');
    } catch {
      toast.error('Gagal mengexport ucapan');
    } finally {
      setIsExporting(false);
    }
  };

  if (isEventLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-3 text-sm font-medium">Memuat ucapan...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-4 text-center">
        <div>
          <p className="text-destructive font-semibold">Gagal memuat detail acara</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Event tidak ditemukan untuk akun ini.
          </p>
        </div>
      </div>
    );
  }

  const wishes = wishesData?.data || [];
  const pagination = wishesData?.pagination || {
    page: 1,
    per_page: tableState.perPage,
    total: 0,
    total_pages: 1,
  };

  return (
    <FadeIn>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Ucapan Tamu</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kelola pesan ucapan dan doa yang dikirim oleh tamu undangan pernikahan Anda
            </p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isWishesLoading || isWishesFetching}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isWishesFetching ? 'animate-spin' : ''}`} />
              Perbarui
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Wishes Table */}
        <DataTable
          isLoading={isWishesLoading && wishes.length === 0}
          loadingText="Memuat ucapan..."
          isEmpty={wishes.length === 0}
          emptyTitle="Belum ada ucapan"
          emptyDescription="Belum ada ucapan dari tamu untuk acara ini."
          emptyIcon={<MessageSquare className="text-muted-foreground/60 mx-auto h-12 w-12" />}
          header={
            <>
              <TableHead className="w-[150px]">Pengirim</TableHead>
              <TableHead className="w-[150px]">Tamu Terdaftar</TableHead>
              <TableHead>Ucapan & Doa</TableHead>
              <TableHead className="w-[180px]">Tanggal Kirim</TableHead>
              <TableHead className="w-[120px] text-center">Tampilkan</TableHead>
              <TableHead className="w-[80px] text-right">Aksi</TableHead>
            </>
          }
          pagination={pagination}
          onPageChange={tableState.setPage}
          onPerPageChange={tableState.setPerPage}
          paginationText={(p) => (
            <>
              Menampilkan{' '}
              <span className="text-foreground font-medium">{(p.page - 1) * p.per_page + 1}</span>–
              <span className="text-foreground font-medium">
                {Math.min(p.page * p.per_page, p.total)}
              </span>{' '}
              dari <span className="text-foreground font-medium">{p.total}</span> ucapan
            </>
          )}
        >
          {wishes.map((w: WishItem) => (
            <TableRow key={w.id} className="hover:bg-muted/30 transition-colors">
              <TableCell
                className="text-foreground max-w-[150px] truncate font-semibold"
                title={w.sender_name}
              >
                {w.sender_name}
              </TableCell>
              <TableCell className="max-w-[150px] truncate" title={w.guest?.name || '-'}>
                {w.guest ? (
                  <span className="text-foreground font-medium">{w.guest.name}</span>
                ) : (
                  <span className="text-muted-foreground text-xs italic">Bukan tamu terdaftar</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-md break-words">
                {w.message_text}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {new Date(w.created_at).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </TableCell>
              <TableCell>
                <div className="flex justify-center">
                  <Switch
                    checked={w.is_visible}
                    disabled={togglingId === w.id}
                    onCheckedChange={() => handleToggleVisibility(w)}
                  />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPendingDeleteWish(w)}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-colors"
                  title="Hapus Ucapan"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!pendingDeleteWish}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteWish(null);
        }}
      >
        <DialogContent className="bg-card border-border/40 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground text-xl">Hapus Ucapan</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus ucapan dari{' '}
              <span className="text-foreground font-semibold">
                "{pendingDeleteWish?.sender_name}"
              </span>
              ?{' '}
              {pendingDeleteWish?.message_text && (
                <span className="mt-1 block truncate text-xs italic">
                  "{pendingDeleteWish.message_text.slice(0, 80)}
                  {pendingDeleteWish.message_text.length > 80 ? '...' : ''}"
                </span>
              )}
              <span className="mt-2 block">Tindakan ini tidak dapat dibatalkan.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPendingDeleteWish(null)}
              disabled={deleteMutation.isPending}
              className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus Ucapan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
