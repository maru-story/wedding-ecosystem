'use client';

import { useState, useEffect } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { PlanType } from '@wedding/shared';
import {
  DEFAULT_MAX_GUESTS,
  DEFAULT_MAX_SCANNER_DEVICES,
  DEFAULT_MAX_GALLERY_PHOTOS,
  QUOTA_MAX_GUESTS_MIN,
  QUOTA_MAX_GUESTS_MAX,
  QUOTA_MAX_SCANNER_MIN,
  QUOTA_MAX_SCANNER_MAX,
  QUOTA_MAX_GALLERY_PHOTOS_MIN,
  QUOTA_MAX_GALLERY_PHOTOS_MAX,
  ADMIN_PER_PAGE,
} from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useTableState } from '@/hooks/use-table-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  Lock,
  Mail,
  User,
  KeyRound,
  Sparkles,
  SlidersHorizontal,
  MapPin,
  Eye,
  Building,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_type: PlanType;
  is_active: boolean;
  created_at: string;
  client_username?: string | null;
  client_email?: string | null;
  client_name?: string | null;
}

interface PaginatedTenants {
  data: Tenant[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

import {
  useAdminTenants,
  useCreateTenant,
  useToggleTenantStatus,
  useDeleteTenant,
} from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TenantTable } from './components/tenant-table';
import { TenantFilters } from './components/tenant-filters';

export default function AdminTenantsPage() {
  const tableState = useTableState<Tenant>({
    initialPerPage: ADMIN_PER_PAGE,
  });
  const [planFilter, setPlanFilter] = useState<PlanType | 'ALL'>('ALL');

  // Fetch tenants via TanStack Query
  const { data, isLoading, error, refetch, isFetching } = useAdminTenants({
    page: tableState.page,
    perPage: tableState.perPage,
    planType: planFilter,
  });

  const tenants: Tenant[] = data?.data || [];
  const pagination = data?.pagination || {
    page: 1,
    per_page: tableState.perPage,
    total: 0,
    total_pages: 0,
  };

  // Mutations
  const toggleTenantStatusMutation = useToggleTenantStatus();
  const createTenantMutation = useCreateTenant();
  const deleteTenantMutation = useDeleteTenant();

  // Delete State
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  // Dialog / Modal Add Tenant
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    plan_type: PlanType.BASIC,
    client_name: '',
    client_email: '',
    client_username: '',
    client_password: '',
  });

  // Dialog / Modal Manage Quota
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantEvents, setTenantEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSavingQuota, setIsSavingQuota] = useState(false);
  const [quotaInputs, setQuotaInputs] = useState<
    Record<string, { max_guests: number; max_scanner_devices: number; max_gallery_photos: number }>
  >({});

  useEffect(() => {
    const initialInputs: Record<
      string,
      { max_guests: number; max_scanner_devices: number; max_gallery_photos: number }
    > = {};
    tenantEvents.forEach((event) => {
      initialInputs[event.id] = {
        max_guests: event.event_config?.max_guests ?? DEFAULT_MAX_GUESTS,
        max_scanner_devices: event.event_config?.max_scanner_devices ?? DEFAULT_MAX_SCANNER_DEVICES,
        max_gallery_photos: event.event_config?.max_gallery_photos ?? DEFAULT_MAX_GALLERY_PHOTOS,
      };
    });
    setQuotaInputs(initialInputs);
  }, [tenantEvents]);

  const handleOpenQuotaModal = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsQuotaModalOpen(true);
    setIsLoadingEvents(true);
    try {
      const response = await apiFetch<{ success: boolean; data: any[] }>(
        `/admin/tenants/${tenant.id}/events`
      );
      setTenantEvents(response.data || []);
    } catch (err) {
      toast.error('Gagal mengambil daftar event tenant');
      setIsQuotaModalOpen(false);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // State for Tenant Details Sheet
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [detailEvents, setDetailEvents] = useState<any[]>([]);
  const [isLoadingDetailEvents, setIsLoadingDetailEvents] = useState(false);

  const handleOpenTenantDetail = async (tenant: Tenant) => {
    setDetailTenant(tenant);
    setIsDetailOpen(true);
    setIsLoadingDetailEvents(true);
    try {
      const response = await apiFetch<{ success: boolean; data: any[] }>(
        `/admin/tenants/${tenant.id}/events`
      );
      setDetailEvents(response.data || []);
    } catch (err) {
      toast.error('Gagal mengambil daftar event detail tenant');
      setIsDetailOpen(false);
    } finally {
      setIsLoadingDetailEvents(false);
    }
  };

  const handleQuotaInputChange = (
    eventId: string,
    field: 'max_guests' | 'max_scanner_devices' | 'max_gallery_photos',
    value: number
  ) => {
    setQuotaInputs((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value,
      },
    }));
  };

  const handleSaveQuota = async () => {
    setIsSavingQuota(true);
    try {
      await Promise.all(
        tenantEvents.map((event) =>
          apiFetch(`/admin/events/${event.id}/config`, {
            method: 'PATCH',
            body: {
              max_guests: quotaInputs[event.id]?.max_guests,
              max_scanner_devices: quotaInputs[event.id]?.max_scanner_devices,
              max_gallery_photos: quotaInputs[event.id]?.max_gallery_photos,
            },
          })
        )
      );
      toast.success('Kuota tenant berhasil diperbarui');
      setIsQuotaModalOpen(false);
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        const errorData = err.data as { error?: { message?: string } };
        toast.error(errorData.error?.message || 'Gagal menyimpan perubahan kuota');
      } else {
        toast.error('Gagal menyimpan perubahan kuota');
      }
    } finally {
      setIsSavingQuota(false);
    }
  };

  // Handle status toggle
  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    toggleTenantStatusMutation.mutate(
      { tenantId, isActive: !currentStatus },
      {
        onSuccess: (response) => {
          if (response.success) {
            toast.success(`Status keaktifan tenant berhasil diperbarui`);
          }
        },
        onError: () => {
          toast.error('Gagal memperbarui status tenant');
        },
      }
    );
  };

  // Auto-slugify tenant name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    setNewTenant((prev) => ({ ...prev, name, slug }));
  };

  // Generate random strong password
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewTenant((prev) => ({ ...prev, client_password: pass }));
  };

  // Handle create tenant
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTenant.client_email.trim() && !newTenant.client_username.trim()) {
      toast.error('Salah satu dari Email atau Username harus diisi.');
      return;
    }

    createTenantMutation.mutate(newTenant, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(`Tenant ${response.data.name} berhasil dibuat!`);
          setIsAddOpen(false);
          setNewTenant({
            name: '',
            slug: '',
            plan_type: PlanType.BASIC,
            client_name: '',
            client_email: '',
            client_username: '',
            client_password: '',
          });
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const errData = err.data as { error?: { message?: string } };
          toast.error(errData.error?.message || 'Gagal membuat tenant');
        } else {
          toast.error('Gagal terhubung ke server');
        }
      },
    });
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    deleteTenantMutation.mutate(tenantToDelete.id, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(`Tenant ${tenantToDelete.name} berhasil dihapus`);
          setTenantToDelete(null);
        }
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const errData = err.data as { error?: { message?: string } };
          toast.error(errData.error?.message || 'Gagal menghapus tenant');
        } else {
          toast.error('Gagal terhubung ke server');
        }
      },
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format error message
  let errorMessage = '';
  if (error) {
    if (error instanceof ApiError) {
      const errData = error.data as { error?: { message?: string } };
      errorMessage = errData.error?.message || 'Gagal memuat daftar tenant';
    } else {
      errorMessage = 'Terjadi kesalahan koneksi ke server';
    }
  }

  // Filter clientside search
  const filteredTenants = tenants.filter(
    (t: Tenant) =>
      t.name.toLowerCase().includes(tableState.debouncedSearchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(tableState.debouncedSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-foreground text-3xl font-bold tracking-tight">
            Manajemen Tenant
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Daftar dan kelola semua penyewa/tenant pada platform digital secara terpusat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`text-muted-foreground h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Perbarui
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Tambah Tenant
          </Button>
        </div>
      </div>

      {/* Tenant Filters */}
      <TenantFilters
        searchQuery={tableState.searchQuery}
        onSearchChange={tableState.setSearchQuery}
        planFilter={planFilter}
        onPlanChange={(val) => {
          setPlanFilter(val);
          tableState.resetPage();
        }}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="border-destructive/20 bg-destructive/10 text-destructive flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button onClick={() => refetch()} size="sm" variant="destructive">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Tenant Table */}
      <TenantTable
        tenants={filteredTenants}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={tableState.setPage}
        onPerPageChange={tableState.setPerPage}
        onToggleStatus={handleToggleStatus}
        onOpenDetail={handleOpenTenantDetail}
        onOpenQuota={handleOpenQuotaModal}
        onDelete={(tenant) => setTenantToDelete(tenant)}
      />

      {/* Tenant Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-border/40 border-b pb-4">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
              <Building className="text-primary h-5 w-5" />
              Detail Tenant
            </SheetTitle>
            <SheetDescription>
              Informasi lengkap dan daftar event yang dikelola oleh tenant ini.
            </SheetDescription>
          </SheetHeader>

          {detailTenant && (
            <div className="mt-6 space-y-6">
              {/* Tenant General Info */}
              <div className="bg-muted/30 border-border/40 space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Nama Tenant:</span>
                  <span className="text-foreground font-bold">{detailTenant.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Slug Url:</span>
                  <span className="text-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                    /{detailTenant.slug}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Paket Langganan:</span>
                  <span>
                    {detailTenant.plan_type === PlanType.ENTERPRISE ? (
                      <Badge className="border border-purple-100 bg-purple-50 font-medium text-purple-700 shadow-none hover:bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400">
                        Enterprise
                      </Badge>
                    ) : detailTenant.plan_type === PlanType.PREMIUM ? (
                      <Badge className="border border-indigo-100 bg-indigo-50 font-medium text-indigo-700 shadow-none hover:bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400">
                        Premium
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-border/50 hover:bg-muted border font-medium shadow-none">
                        Basic
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Status Akun:</span>
                  <span
                    className={`font-semibold ${detailTenant.is_active ? 'text-success' : 'text-muted-foreground'}`}
                  >
                    {detailTenant.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Terdaftar Sejak:</span>
                  <span className="text-muted-foreground">
                    {formatDate(detailTenant.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40 mt-2">
                  <span className="text-muted-foreground font-medium">Nama Client:</span>
                  <span className="text-foreground font-semibold">
                    {detailTenant.client_name || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Username Client:</span>
                  <span className="text-foreground font-mono text-xs">
                    {detailTenant.client_username || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Email Client:</span>
                  <span className="text-foreground font-semibold">
                    {detailTenant.client_email || '-'}
                  </span>
                </div>
              </div>

              {/* Events Managed */}
              <div className="space-y-4">
                <h3 className="text-foreground text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                  <Calendar className="text-primary h-4 w-4" />
                  Daftar Event Pernikahan ({detailEvents.length})
                </h3>

                {isLoadingDetailEvents ? (
                  <div className="space-y-3 py-4">
                    <div className="bg-muted border-border/40 h-20 animate-pulse rounded-xl border" />
                    <div className="bg-muted border-border/40 h-20 animate-pulse rounded-xl border" />
                  </div>
                ) : detailEvents.length === 0 ? (
                  <div className="border-border/60 rounded-xl border border-dashed py-8 text-center">
                    <Calendar className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-xs">
                      Belum ada event pernikahan yang dibuat
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detailEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="border-border/40 bg-card space-y-3 rounded-xl border p-4 transition-all hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-foreground text-sm font-bold">
                            {event.groom_name} & {event.bride_name}
                          </h4>
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] capitalize shadow-none"
                          >
                            {event.status}
                          </Badge>
                        </div>

                        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatDate(event.event_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 shrink-0" />
                            <span>{event._count?.guests ?? 0} Tamu Terdaftar</span>
                          </div>
                        </div>

                        <div className="text-muted-foreground border-border/30 flex items-start gap-1 border-t pt-1 text-xs">
                          <MapPin className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-1">
                            {event.venue_name} ({event.venue_address})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Tenant Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="border-border/40 bg-card max-w-xl rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleCreateTenant}>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-foreground flex items-center gap-2 text-2xl font-bold">
                <Sparkles className="text-primary h-6 w-6 animate-pulse" />
                Tambah Tenant Baru
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Isi detail tenant baru dan buat akun pengelola utamanya secara otomatis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Tenant Section */}
              <div className="bg-muted/30 border-border/40 space-y-4 rounded-xl border p-4">
                <h3 className="text-foreground border-border/40 flex items-center gap-2 border-b pb-2 text-sm font-bold">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Detail Tenant
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5 sm:col-span-1">
                    <Label
                      htmlFor="tenant_name"
                      className="text-muted-foreground text-xs font-bold"
                    >
                      Nama Tenant
                    </Label>
                    <Input
                      id="tenant_name"
                      placeholder="Nama mempelai / acara"
                      value={newTenant.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 rounded-lg transition-colors"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5 sm:col-span-1">
                    <Label
                      htmlFor="tenant_slug"
                      className="text-muted-foreground text-xs font-bold"
                    >
                      Slug URL
                    </Label>
                    <div className="relative">
                      <span className="text-muted-foreground/60 absolute top-2.5 left-3 text-sm font-medium">
                        /
                      </span>
                      <Input
                        id="tenant_slug"
                        placeholder="slug-url"
                        value={newTenant.slug}
                        onChange={(e) =>
                          setNewTenant((prev) => ({ ...prev, slug: e.target.value }))
                        }
                        required
                        className="border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 rounded-lg pl-6 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plan_type" className="text-muted-foreground text-xs font-bold">
                    Tipe Paket
                  </Label>
                  <Select
                    value={newTenant.plan_type}
                    onValueChange={(val) =>
                      setNewTenant((prev) => ({ ...prev, plan_type: val as PlanType }))
                    }
                  >
                    <SelectTrigger id="plan_type" className="border-border/60 rounded-lg">
                      <SelectValue placeholder="Pilih paket" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PlanType.BASIC}>Basic (Maks 100 Tamu)</SelectItem>
                      <SelectItem value={PlanType.PREMIUM}>Premium (Maks 500 Tamu)</SelectItem>
                      <SelectItem value={PlanType.ENTERPRISE}>Enterprise (Kustom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin Client User Section */}
              <div className="bg-muted/30 border-border/40 space-y-4 rounded-xl border p-4">
                <h3 className="text-foreground border-border/40 flex items-center gap-2 border-b pb-2 text-sm font-bold">
                  <User className="h-4 w-4 text-emerald-500" />
                  Detail Akun Client (Pengelola)
                </h3>

                <div className="space-y-1.5">
                  <Label htmlFor="client_name" className="text-muted-foreground text-xs font-bold">
                    Nama Lengkap Client
                  </Label>
                  <div className="relative">
                    <User className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                    <Input
                      id="client_name"
                      placeholder="Nama lengkap pengelola"
                      value={newTenant.client_name}
                      onChange={(e) =>
                        setNewTenant((prev) => ({ ...prev, client_name: e.target.value }))
                      }
                      required
                      className="border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 rounded-lg pl-9 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5 sm:col-span-1">
                    <Label
                      htmlFor="client_username"
                      className="text-muted-foreground text-xs font-bold"
                    >
                      Username (Opsional)
                    </Label>
                    <div className="relative">
                      <User className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        id="client_username"
                        placeholder="contoh: budi_s"
                        value={newTenant.client_username}
                        onChange={(e) =>
                          setNewTenant((prev) => ({ ...prev, client_username: e.target.value }))
                        }
                        className="border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 rounded-lg pl-9 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1.5 sm:col-span-1">
                    <Label
                      htmlFor="client_email"
                      className="text-muted-foreground text-xs font-bold"
                    >
                      Email (Opsional)
                    </Label>
                    <div className="relative">
                      <Mail className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        id="client_email"
                        type="email"
                        placeholder="client@mail.com"
                        value={newTenant.client_email}
                        onChange={(e) =>
                          setNewTenant((prev) => ({ ...prev, client_email: e.target.value }))
                        }
                        className="border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 rounded-lg pl-9 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="client_password"
                      className="text-muted-foreground text-xs font-bold"
                    >
                      Password Akun
                    </Label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                        <Input
                          id="client_password"
                          type="text"
                          placeholder="Password minimal 8 karakter"
                          value={newTenant.client_password}
                          onChange={(e) =>
                            setNewTenant((prev) => ({ ...prev, client_password: e.target.value }))
                          }
                          required
                          className="border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 rounded-lg pl-9 transition-colors"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={generatePassword}
                        variant="outline"
                        title="Generate Password Acak"
                        className="border-border hover:bg-muted flex shrink-0 items-center justify-center rounded-lg px-3"
                      >
                        <KeyRound className="text-muted-foreground h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-border/40 mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createTenantMutation.isPending}
                className="flex items-center justify-center gap-1.5"
              >
                {createTenantMutation.isPending ? 'Menyimpan...' : 'Simpan Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Quota Dialog */}
      <Dialog open={isQuotaModalOpen} onOpenChange={setIsQuotaModalOpen}>
        <DialogContent className="border-border/40 bg-card max-w-md rounded-2xl p-6 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-foreground animate-in fade-in flex items-center gap-2 text-xl font-bold duration-200">
              <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
              Kelola Kuota Event
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atur batas maksimal tamu, scanner, dan foto galeri untuk tenant{' '}
              <strong>{selectedTenant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {isLoadingEvents ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-8">
              <RefreshCw className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Mengambil daftar event...</p>
            </div>
          ) : tenantEvents.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              Tenant ini belum memiliki event aktif.
            </div>
          ) : (
            <div className="max-h-[300px] space-y-4 overflow-y-auto pr-1">
              {tenantEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-muted/30 border-border/40 space-y-3 rounded-xl border p-4"
                >
                  <div className="border-border/40 border-b pb-1.5">
                    <h4 className="text-foreground text-sm font-bold">
                      {event.bride_name} & {event.groom_name}
                    </h4>
                    <p className="text-muted-foreground text-xs">Slug: /{event.slug}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label
                        htmlFor={`max_guests_${event.id}`}
                        className="text-muted-foreground text-xs font-bold"
                      >
                        Maksimal Jumlah Tamu (max_guests)
                      </Label>
                      <Input
                        id={`max_guests_${event.id}`}
                        type="number"
                        min={QUOTA_MAX_GUESTS_MIN}
                        max={QUOTA_MAX_GUESTS_MAX}
                        value={quotaInputs[event.id]?.max_guests ?? DEFAULT_MAX_GUESTS}
                        onChange={(e) =>
                          handleQuotaInputChange(
                            event.id,
                            'max_guests',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        required
                        className="border-border/60 bg-card focus-visible:ring-primary/20 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label
                        htmlFor={`max_scanner_${event.id}`}
                        className="text-muted-foreground text-xs font-bold"
                      >
                        Maksimal Perangkat Scanner (max_scanner_devices)
                      </Label>
                      <Input
                        id={`max_scanner_${event.id}`}
                        type="number"
                        min={QUOTA_MAX_SCANNER_MIN}
                        max={QUOTA_MAX_SCANNER_MAX}
                        value={
                          quotaInputs[event.id]?.max_scanner_devices ?? DEFAULT_MAX_SCANNER_DEVICES
                        }
                        onChange={(e) =>
                          handleQuotaInputChange(
                            event.id,
                            'max_scanner_devices',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        required
                        className="border-border/60 bg-card focus-visible:ring-primary/20 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label
                        htmlFor={`max_gallery_${event.id}`}
                        className="text-muted-foreground text-xs font-bold"
                      >
                        Maksimal Foto Galeri (max_gallery_photos)
                      </Label>
                      <Input
                        id={`max_gallery_${event.id}`}
                        type="number"
                        min={QUOTA_MAX_GALLERY_PHOTOS_MIN}
                        max={QUOTA_MAX_GALLERY_PHOTOS_MAX}
                        value={
                          quotaInputs[event.id]?.max_gallery_photos ?? DEFAULT_MAX_GALLERY_PHOTOS
                        }
                        onChange={(e) =>
                          handleQuotaInputChange(
                            event.id,
                            'max_gallery_photos',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        required
                        className="border-border/60 bg-card focus-visible:ring-primary/20 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="border-border/40 mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuotaModalOpen(false)}
              disabled={isSavingQuota}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveQuota}
              disabled={isSavingQuota || isLoadingEvents || tenantEvents.length === 0}
              className="flex items-center justify-center gap-1.5"
            >
              {isSavingQuota ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Confirmation Dialog */}
      <Dialog open={!!tenantToDelete} onOpenChange={(open) => !open && setTenantToDelete(null)}>
        <DialogContent className="border-border/40 bg-card max-w-md rounded-2xl p-6 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-destructive animate-in fade-in flex items-center gap-2 text-xl font-bold duration-200">
              <Trash2 className="h-5 w-5" />
              Hapus Tenant
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus tenant <strong>{tenantToDelete?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan. Semua data terkait (pengguna, event, tamu, RSVP,
              check-in) akan dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="border-border/40 mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTenantToDelete(null)}
              disabled={deleteTenantMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteTenant}
              disabled={deleteTenantMutation.isPending}
              className="flex items-center justify-center gap-1.5"
            >
              {deleteTenantMutation.isPending ? 'Menghapus...' : 'Hapus Permanen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
