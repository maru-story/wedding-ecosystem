'use client';

import { useState, useEffect } from 'react';
import { ApiError } from '@/lib/api';
import { DeliveryStatus } from '@wedding/shared';
import {
  useGuestsWithDeliveryStatus,
  useSendInvitation,
  useInvitationTemplate,
  useUpdateInvitationTemplate,
  useUpdateGuest,
} from '@/hooks/queries';
import { FadeIn } from '@/components/ui/motion-wrapper';
import { CustomTabs } from '@/components/ui/custom-tabs';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import { useTableState } from '@/hooks/use-table-state';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Search,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Save,
  PlusCircle,
  HelpCircle,
  Pencil,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { GUESTS_PER_PAGE } from '@/lib/constants';

// --- Types ---

interface InvitationGuest {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  delivery_status: DeliveryStatus;
  invitation_url: string | null;
}

// --- Constants ---

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.NOT_SENT]: 'Belum Dikirim',
  [DeliveryStatus.SENT]: 'Terkirim',
  [DeliveryStatus.FAILED]: 'Gagal',
};

const DELIVERY_STATUS_STYLES: Record<DeliveryStatus, string> = {
  [DeliveryStatus.NOT_SENT]: 'bg-muted text-muted-foreground border-border/50',
  [DeliveryStatus.SENT]: 'bg-success/15 text-success border-success/30 font-medium',
  [DeliveryStatus.FAILED]: 'bg-destructive/15 text-destructive border-destructive/25 font-medium',
};

// --- Component ---

export default function SendInvitationPage() {
  const tableState = useTableState<InvitationGuest>({
    initialPerPage: GUESTS_PER_PAGE,
  });

  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('list');
  const [templateText, setTemplateText] = useState('');
  const [editingPhoneGuestId, setEditingPhoneGuestId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState('');

  // --- Data Fetching via TanStack Query ---
  const {
    data: guestsData,
    isLoading: isGuestsLoading,
    error: guestsError,
    refetch: refetchGuests,
    isFetching: isGuestsFetching,
  } = useGuestsWithDeliveryStatus({
    page: tableState.page,
    perPage: tableState.perPage,
    q: tableState.debouncedSearchQuery || undefined,
  });

  const { data: templateData, isLoading: isTemplateLoading } = useInvitationTemplate();

  // --- Mutations ---
  const sendInvitationMutation = useSendInvitation();
  const updateTemplateMutation = useUpdateInvitationTemplate();
  const updateGuestMutation = useUpdateGuest();

  const guests: InvitationGuest[] = guestsData?.data || [];
  const pagination = guestsData?.pagination || {
    page: 1,
    per_page: tableState.perPage,
    total: 0,
    total_pages: 0,
  };

  // Sync template from backend
  useEffect(() => {
    if (templateData?.data?.template) {
      setTemplateText(templateData.data.template);
    }
  }, [templateData]);

  // Error notifications
  useEffect(() => {
    if (guestsError) {
      const msg =
        guestsError instanceof ApiError
          ? (guestsError.data as { message?: string })?.message || 'Unknown error'
          : 'Terjadi kesalahan jaringan';
      toast.error(`Gagal memuat data tamu: ${msg}`);
    }
  }, [guestsError]);

  // --- Filtering & Pagination ---
  const filteredGuests = guests.filter((guest) => {
    const matchesStatus = statusFilter === 'all' || guest.delivery_status === statusFilter;
    return matchesStatus;
  });

  // --- Send WhatsApp Redirect Flow ---
  const handleSendWhatsApp = async (guest: InvitationGuest) => {
    sendInvitationMutation.mutate(
      { guest_id: guest.id, channel: 'whatsapp' },
      {
        onSuccess: (res) => {
          if (res.data?.whatsapp_url) {
            toast.success(`Undangan untuk ${guest.name} siap dikirim`);
            // Open WhatsApp Web in new tab
            window.open(res.data.whatsapp_url, '_blank');
          } else {
            toast.error('Gagal menyiapkan URL WhatsApp');
          }
        },
        onError: (err) => {
          const errorMessage =
            err instanceof ApiError
              ? (err.data as { message?: string })?.message || 'Terjadi kesalahan'
              : 'Terjadi kesalahan jaringan';
          toast.error(`Gagal: ${errorMessage}`);
        },
      }
    );
  };

  // --- Save Template Flow ---
  const handleSaveTemplate = () => {
    if (!templateText.trim()) {
      toast.error('Template tidak boleh kosong');
      return;
    }
    updateTemplateMutation.mutate(
      { template: templateText },
      {
        onSuccess: () => {
          toast.success('Template pesan berhasil diperbarui');
        },
        onError: (err) => {
          const errorMessage =
            err instanceof ApiError
              ? (err.data as { message?: string })?.message || 'Terjadi kesalahan'
              : 'Gagal memperbarui template';
          toast.error(errorMessage);
        },
      }
    );
  };

  // --- Helper to Insert Variables at cursor ---
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + variable + text.substring(end);
    setTemplateText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  };

  // --- Save phone number inline ---
  const handleSavePhone = (guestId: string) => {
    const trimmedPhone = editingPhoneValue.trim();
    if (trimmedPhone && !/^[1-9][0-9]{7,11}$/.test(trimmedPhone)) {
      toast.error(
        'Format nomor telepon tidak valid. Silakan isi nomor tanpa angka 0 di depan (contoh: 8xxxxxxxxxx).'
      );
      return;
    }

    const finalPhone = trimmedPhone ? `+62${trimmedPhone}` : null;

    updateGuestMutation.mutate(
      {
        id: guestId,
        payload: {
          phone: finalPhone,
        },
      },
      {
        onSuccess: () => {
          toast.success('Nomor telepon berhasil diperbarui');
          setEditingPhoneGuestId(null);
        },
        onError: (err) => {
          const errorMessage =
            err instanceof ApiError
              ? (err.data as { message?: string })?.message || 'Gagal menyimpan nomor telepon'
              : 'Terjadi kesalahan jaringan';
          toast.error(errorMessage);
        },
      }
    );
  };

  return (
    <FadeIn>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold">Kirim Undangan</h1>
          <p className="mt-1 text-sm text-gray-600">
            Kelola template pesan dan kirimkan undangan digital personal via WhatsApp.
          </p>
        </div>

        {/* Custom Tabs Navigation Component */}
        <CustomTabs
          tabs={[
            { value: 'list', label: 'Daftar Pengiriman' },
            { value: 'template', label: 'Template Pesan' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-6"
        />

        {activeTab === 'list' && (
          <>
            {/* Filters (Placed outside/above Card to match Daftar Tamu layout) */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search Input */}
              <div className="relative w-full max-w-sm sm:w-[240px]">
                <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Cari nama tamu..."
                  value={tableState.searchQuery}
                  onChange={(e) => {
                    tableState.setSearchQuery(e.target.value);
                  }}
                  className="bg-card border-border/60 focus-visible:ring-ring pl-9 focus-visible:ring-offset-0"
                  aria-label="Cari tamu"
                />
              </div>

              {/* Status Select */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">Status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val as DeliveryStatus | 'all');
                    tableState.resetPage();
                  }}
                >
                  <SelectTrigger className="bg-card border-border/60 hover:bg-muted/30 w-[160px]">
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchGuests()}
                disabled={isGuestsLoading || isGuestsFetching}
                className="border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground h-9 flex items-center gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${isGuestsFetching ? 'animate-spin' : ''}`} />
                Perbarui
              </Button>

              {(tableState.searchQuery || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    tableState.setSearchQuery('');
                    setStatusFilter('all');
                    tableState.resetPage();
                  }}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 text-sm"
                >
                  Reset Filter
                </Button>
              )}
            </div>

            {/* Guest Table using DataTable */}
            <DataTable
              isLoading={isGuestsLoading}
              loadingText="Memuat data tamu..."
              isEmpty={filteredGuests.length === 0}
              emptyTitle="Tidak ada tamu ditemukan"
              emptyDescription="Silakan cari dengan kata kunci lain atau ubah filter status"
              emptyIcon={<HelpCircle className="text-muted-foreground/50 mx-auto mb-3 h-10 w-10" />}
              header={
                <>
                  <TableHead className="px-4 py-3">Nama</TableHead>
                  <TableHead className="px-4 py-3">Kontak WhatsApp</TableHead>
                  <TableHead className="px-4 py-3">Status Kirim</TableHead>
                  <TableHead className="px-4 py-3 text-right">Aksi</TableHead>
                </>
              }
              pagination={pagination}
              onPageChange={tableState.setPage}
              onPerPageChange={tableState.setPerPage}
              paginationText={(p) => (
                <>
                  Menampilkan{' '}
                  <span className="text-foreground font-medium">
                    {(p.page - 1) * p.per_page + 1}
                  </span>
                  –
                  <span className="text-foreground font-medium">
                    {Math.min(p.page * p.per_page, p.total)}
                  </span>{' '}
                  dari <span className="text-foreground font-medium">{p.total}</span> tamu
                </>
              )}
            >
              {filteredGuests.map((guest) => {
                const hasPhone = !!guest.phone;
                const isSendingThis =
                  sendInvitationMutation.isPending &&
                  sendInvitationMutation.variables?.guest_id === guest.id;

                return (
                  <TableRow key={guest.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-foreground px-4 py-3 font-medium">
                      {guest.name}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {editingPhoneGuestId === guest.id ? (
                        <div className="flex max-w-[220px] items-center gap-1.5">
                          <div className="border-border/60 bg-background focus-within:ring-ring focus-within:border-ring flex h-8 w-full items-center rounded-md border pl-2 transition-colors focus-within:ring-1">
                            <span className="text-muted-foreground pr-0.5 text-xs font-semibold select-none">
                              +62
                            </span>
                            <input
                              type="text"
                              value={editingPhoneValue}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.startsWith('0')) {
                                  val = val.slice(1);
                                } else if (val.startsWith('62')) {
                                  val = val.slice(2);
                                }
                                setEditingPhoneValue(val);
                              }}
                              placeholder="8xxxxxxx"
                              className="h-full w-full border-0 bg-transparent p-0 px-1 text-xs focus:ring-0 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSavePhone(guest.id);
                                } else if (e.key === 'Escape') {
                                  setEditingPhoneGuestId(null);
                                }
                              }}
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSavePhone(guest.id)}
                            disabled={updateGuestMutation.isPending}
                            className="text-success hover:text-success/80 hover:bg-success/10 h-8 w-8 shrink-0"
                            aria-label="Simpan nomor telepon"
                          >
                            {updateGuestMutation.isPending &&
                            updateGuestMutation.variables?.id === guest.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingPhoneGuestId(null)}
                            disabled={updateGuestMutation.isPending}
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 w-8 shrink-0"
                            aria-label="Batal edit"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="group flex min-h-[32px] items-center gap-2">
                          {hasPhone ? (
                            <span className="text-muted-foreground font-sans text-sm">
                              {guest.phone}
                            </span>
                          ) : (
                            <span className="flex w-fit items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950/20">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              No. telepon kosong
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPhoneGuestId(guest.id);
                              const suffix = guest.phone?.startsWith('+62')
                                ? guest.phone.slice(3)
                                : guest.phone || '';
                              setEditingPhoneValue(suffix);
                            }}
                            className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                            aria-label="Edit nomor telepon"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        className={`${DELIVERY_STATUS_STYLES[guest.delivery_status]} rounded-full border px-2.5 py-0.5 text-xs font-semibold`}
                        variant="outline"
                      >
                        {DELIVERY_STATUS_LABELS[guest.delivery_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {hasPhone ? (
                        <Button
                          size="sm"
                          onClick={() => handleSendWhatsApp(guest)}
                          disabled={sendInvitationMutation.isPending}
                          className="h-8 rounded-md bg-[#25D366] px-3 font-semibold text-white shadow-sm transition-all hover:bg-[#22c35e] active:scale-[0.98]"
                          aria-label={`Kirim ke ${guest.name} via WhatsApp`}
                        >
                          {isSendingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Kirim WA
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground pr-2 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </DataTable>
          </>
        )}

        {/* Tab 2: Template Pesan */}
        {activeTab === 'template' && (
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Template Undangan WhatsApp</CardTitle>
              <CardDescription>
                Tulis pesan undangan default yang akan dikirimkan ke tamu Anda. Format pesan ini
                mendukung gaya teks WhatsApp (contoh: *tebal*, _miring_).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTemplateLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-primary h-7 w-7 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Click-to-insert Dynamic Variables */}
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Variabel Dinamis (Klik untuk memasukkan)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable('{nama_tamu}')}
                        className="border-primary/40 hover:border-primary hover:bg-primary/5 text-primary h-7 rounded-full border-dashed px-3 text-xs"
                      >
                        <PlusCircle className="mr-1.5 h-3 w-3" /> Nama Tamu (`{'{nama_tamu}'}`)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable('{link_undangan}')}
                        className="border-primary/40 hover:border-primary hover:bg-primary/5 text-primary h-7 rounded-full border-dashed px-3 text-xs"
                      >
                        <PlusCircle className="mr-1.5 h-3 w-3" /> Link Undangan (`
                        {'{link_undangan}'}`)
                      </Button>
                    </div>
                  </div>

                  {/* Textarea Editor */}
                  <div className="space-y-1">
                    <Textarea
                      id="template-editor"
                      value={templateText}
                      onChange={(e) => setTemplateText(e.target.value)}
                      placeholder="Tulis pesan undangan Anda di sini..."
                      className="bg-background border-border/60 focus-visible:ring-ring min-h-[220px] resize-y p-4 font-sans text-sm leading-relaxed"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      onClick={handleSaveTemplate}
                      disabled={updateTemplateMutation.isPending}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 font-semibold"
                    >
                      {updateTemplateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Simpan Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}
