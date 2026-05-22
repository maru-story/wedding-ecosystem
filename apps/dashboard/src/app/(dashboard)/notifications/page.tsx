'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { DeliveryStatus } from '@wedding/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Send,
  AlertCircle,
  X,
  MessageSquare,
  Mail,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// --- Types ---

interface NotificationGuest {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  delivery_status: DeliveryStatus;
  invitation_url: string | null;
}

type NotificationChannel = 'whatsapp' | 'email';

interface SendResult {
  guest_id: string;
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  results: SendResult[];
}

interface FailureNotification {
  id: string;
  guestName: string;
  channel: NotificationChannel;
  error: string;
  timestamp: Date;
}

// --- Constants ---

const MAX_BATCH_SIZE = 500;
const ITEMS_PER_PAGE = 50;

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.NOT_SENT]: 'Belum Dikirim',
  [DeliveryStatus.SENT]: 'Terkirim',
  [DeliveryStatus.FAILED]: 'Gagal',
};

const DELIVERY_STATUS_STYLES: Record<DeliveryStatus, string> = {
  [DeliveryStatus.NOT_SENT]: 'bg-muted text-muted-foreground border-border/50',
  [DeliveryStatus.SENT]: 'bg-success/10 text-success border-success/30 font-medium',
  [DeliveryStatus.FAILED]: 'bg-destructive/10 text-destructive border-destructive/25 font-medium',
};

// --- Helper Functions ---

function canSendToGuest(guest: NotificationGuest): boolean {
  return !!(guest.phone || guest.email);
}

function getAvailableChannels(guest: NotificationGuest): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  if (guest.phone) channels.push('whatsapp');
  if (guest.email) channels.push('email');
  return channels;
}

// --- Component ---

export default function NotificationsPage() {
  const [guests, setGuests] = useState<NotificationGuest[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [bulkChannel, setBulkChannel] = useState<NotificationChannel>('whatsapp');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendingGuestId, setSendingGuestId] = useState<string | null>(null);
  const [failures, setFailures] = useState<FailureNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // --- Data Fetching ---

  const loadGuests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ guests: NotificationGuest[] }>(
        '/guests?include=delivery_status'
      );
      setGuests(data.guests);
    } catch (error) {
      if (error instanceof ApiError) {
        addFailure(
          'Sistem',
          'email',
          `Gagal memuat data tamu: ${(error.data as { message?: string })?.message || 'Unknown error'}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  // --- Filtering & Pagination ---

  const filteredGuests = guests?.filter((guest) => {
    const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || guest.delivery_status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const totalPages = Math.ceil(filteredGuests.length / ITEMS_PER_PAGE);
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // --- Selection ---

  const toggleSelectGuest = (guestId: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const sendableGuests = paginatedGuests.filter(canSendToGuest);
    const allSelected = sendableGuests.every((g) => selectedGuestIds.has(g.id));

    if (allSelected) {
      setSelectedGuestIds((prev) => {
        const next = new Set(prev);
        sendableGuests.forEach((g) => next.delete(g.id));
        return next;
      });
    } else {
      setSelectedGuestIds((prev) => {
        const next = new Set(prev);
        sendableGuests.forEach((g) => next.add(g.id));
        return next;
      });
    }
  };

  // --- Sending ---

  const addFailure = (guestName: string, channel: NotificationChannel, error: string) => {
    setFailures((prev) => [
      { id: `${Date.now()}-${Math.random()}`, guestName, channel, error, timestamp: new Date() },
      ...prev,
    ]);
  };

  const dismissFailure = (id: string) => {
    setFailures((prev) => prev.filter((f) => f.id !== id));
  };

  const sendIndividual = async (guest: NotificationGuest, channel: NotificationChannel) => {
    setSendingGuestId(guest.id);
    try {
      const result = await apiFetch<SendResult>('/notifications/send', {
        method: 'POST',
        body: { guest_id: guest.id, channel },
      });

      if (result.success) {
        setGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? { ...g, delivery_status: DeliveryStatus.SENT } : g))
        );
      } else {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guest.id ? { ...g, delivery_status: DeliveryStatus.FAILED } : g
          )
        );
        addFailure(guest.name, channel, result.error || 'Pengiriman gagal');
      }
    } catch (error) {
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? { ...g, delivery_status: DeliveryStatus.FAILED } : g))
      );
      const errorMessage =
        error instanceof ApiError
          ? (error.data as { message?: string })?.message || 'Terjadi kesalahan'
          : 'Terjadi kesalahan jaringan';
      addFailure(guest.name, channel, errorMessage);
    } finally {
      setSendingGuestId(null);
    }
  };

  const sendBulk = async () => {
    if (selectedGuestIds.size === 0) return;
    if (selectedGuestIds.size > MAX_BATCH_SIZE) {
      addFailure('Bulk', bulkChannel, `Maksimal ${MAX_BATCH_SIZE} tamu per batch pengiriman`);
      return;
    }

    setIsSending(true);
    try {
      const result = await apiFetch<BulkSendResult>('/notifications/send-bulk', {
        method: 'POST',
        body: { guest_ids: Array.from(selectedGuestIds), channel: bulkChannel },
      });

      setGuests((prev) =>
        prev.map((g) => {
          const sendResult = result.results.find((r) => r.guest_id === g.id);
          if (sendResult) {
            return {
              ...g,
              delivery_status: sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
            };
          }
          return g;
        })
      );

      result.results
        .filter((r) => !r.success)
        .forEach((r) => {
          const guest = guests.find((g) => g.id === r.guest_id);
          if (guest) addFailure(guest.name, r.channel, r.error || 'Pengiriman gagal');
        });

      setSelectedGuestIds(new Set());
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? (error.data as { message?: string })?.message || 'Terjadi kesalahan'
          : 'Terjadi kesalahan jaringan';
      addFailure('Bulk Send', bulkChannel, errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // --- Render ---

  const sendableSelectedCount = Array.from(selectedGuestIds).filter((id) => {
    const guest = guests.find((g) => g.id === id);
    return guest && canSendToGuest(guest);
  }).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Kirim Undangan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kirim undangan digital ke tamu melalui WhatsApp atau Email
        </p>
      </div>

      {/* Failure Notifications */}
      {failures.length > 0 && (
        <div className="space-y-2" role="alert" aria-label="Notifikasi kegagalan pengiriman">
          {failures.slice(0, 5).map((failure) => (
            <div
              key={failure.id}
              className="flex items-start justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-3"
            >
              <div className="flex gap-2.5">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Gagal mengirim ke {failure.guestName} (
                    {failure.channel === 'whatsapp' ? 'WhatsApp' : 'Email'})
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5">{failure.error}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dismissFailure(failure.id)}
                className="shrink-0 h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Send Controls */}
      {selectedGuestIds.size > 0 && (
        <Card className="border-ring/20 bg-accent/20 shadow-sm animate-in fade-in-50 slide-in-from-top-1">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <span className="text-sm font-medium text-foreground">
              {selectedGuestIds.size} tamu dipilih
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Kirim via:
              </span>
              <Select
                value={bulkChannel}
                onValueChange={(val) => setBulkChannel(val as NotificationChannel)}
              >
                <SelectTrigger className="w-[130px] bg-card border-border/65">
                  <SelectValue placeholder="WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={sendBulk}
              disabled={isSending || sendableSelectedCount === 0}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium ml-auto"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Kirim ke {sendableSelectedCount} Tamu
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedGuestIds(new Set())}
              className="text-muted-foreground hover:bg-accent/40"
            >
              Batal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters and Table Card */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardContent className="p-0">
          {/* Filter Bar */}
          <div className="p-4 border-b border-border/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama tamu..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 bg-background border-border/60 focus-visible:ring-ring"
                aria-label="Cari tamu"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground shrink-0">Status:</span>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val as DeliveryStatus | 'all');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] bg-background border-border/60">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value={DeliveryStatus.NOT_SENT}>Belum Dikirim</SelectItem>
                  <SelectItem value={DeliveryStatus.SENT}>Terkirim</SelectItem>
                  <SelectItem value={DeliveryStatus.FAILED}>Gagal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guest Table */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Memuat data tamu...</p>
            </div>
          ) : paginatedGuests.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada tamu ditemukan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[50px] pl-4">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        paginatedGuests.filter(canSendToGuest).length > 0 &&
                        paginatedGuests
                          .filter(canSendToGuest)
                          .every((g) => selectedGuestIds.has(g.id))
                      }
                      className="h-4 w-4 rounded border-gray-300 accent-ring cursor-pointer"
                      aria-label="Pilih semua tamu"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">Kontak</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGuests.map((guest) => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
                    isSelected={selectedGuestIds.has(guest.id)}
                    isSending={sendingGuestId === guest.id}
                    onToggleSelect={() => toggleSelectGuest(guest.id)}
                    onSend={sendIndividual}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–
            <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredGuests.length)}</span> dari{' '}
            <span className="font-medium text-foreground">{filteredGuests.length}</span> tamu
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-border/60 h-9"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-border/60 h-9"
            >
              Selanjutnya <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Guest Row Component ---

interface GuestRowProps {
  guest: NotificationGuest;
  isSelected: boolean;
  isSending: boolean;
  onToggleSelect: () => void;
  onSend: (guest: NotificationGuest, channel: NotificationChannel) => void;
}

function GuestRow({ guest, isSelected, isSending, onToggleSelect, onSend }: GuestRowProps) {
  const canSend = canSendToGuest(guest);
  const availableChannels = getAvailableChannels(guest);

  return (
    <TableRow className={isSelected ? 'bg-accent/15 hover:bg-accent/20' : 'hover:bg-muted/20'}>
      <TableCell className="pl-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          disabled={!canSend}
          className="h-4 w-4 rounded border-gray-300 disabled:opacity-50 accent-ring cursor-pointer"
          aria-label={`Pilih ${guest.name}`}
        />
      </TableCell>
      <TableCell className="font-semibold text-foreground">{guest.name}</TableCell>
      <TableCell>
        {canSend ? (
          <div className="space-y-0.5">
            {guest.phone && <p className="text-xs text-muted-foreground font-sans">{guest.phone}</p>}
            {guest.email && <p className="text-xs text-muted-foreground font-sans">{guest.email}</p>}
          </div>
        ) : (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Data kontak harus dilengkapi
          </p>
        )}
      </TableCell>
      <TableCell>
        <Badge
          className={`${DELIVERY_STATUS_STYLES[guest.delivery_status]} rounded-full px-2.5 py-0.5 text-xs font-semibold`}
          variant="outline"
        >
          {DELIVERY_STATUS_LABELS[guest.delivery_status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right pr-4">
        {canSend ? (
          <div className="flex items-center justify-end gap-2">
            {availableChannels.includes('whatsapp') && (
              <Button
                size="sm"
                onClick={() => onSend(guest, 'whatsapp')}
                disabled={isSending}
                className="bg-[#25D366] hover:bg-[#25D366]/90 text-white font-semibold h-8 px-3"
                aria-label={`Kirim ke ${guest.name} via WhatsApp`}
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> WA
                  </>
                )}
              </Button>
            )}
            {availableChannels.includes('email') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSend(guest, 'email')}
                disabled={isSending}
                className="border-border/60 hover:bg-muted h-8 px-3 text-muted-foreground hover:text-foreground"
                aria-label={`Kirim ke ${guest.name} via Email`}
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground pr-2">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
