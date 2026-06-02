'use client';

import { useState, useEffect } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { PlanType } from '@wedding/shared';
import {
  DEFAULT_MAX_GUESTS,
  DEFAULT_MAX_SCANNER_DEVICES,
  QUOTA_MAX_GUESTS_MIN,
  QUOTA_MAX_GUESTS_MAX,
  QUOTA_MAX_SCANNER_MIN,
  QUOTA_MAX_SCANNER_MAX,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_type: PlanType;
  is_active: boolean;
  created_at: string;
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

import { useAdminTenants, useCreateTenant, useToggleTenantStatus } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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

  // Dialog / Modal Add Tenant
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    plan_type: PlanType.BASIC,
    client_name: '',
    client_email: '',
    client_password: '',
  });

  // Dialog / Modal Manage Quota
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantEvents, setTenantEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isSavingQuota, setIsSavingQuota] = useState(false);
  const [quotaInputs, setQuotaInputs] = useState<Record<string, { max_guests: number; max_scanner_devices: number }>>({});

  useEffect(() => {
    const initialInputs: Record<string, { max_guests: number; max_scanner_devices: number }> = {};
    tenantEvents.forEach((event) => {
      initialInputs[event.id] = {
        max_guests: event.event_config?.max_guests ?? DEFAULT_MAX_GUESTS,
        max_scanner_devices: event.event_config?.max_scanner_devices ?? DEFAULT_MAX_SCANNER_DEVICES,
      };
    });
    setQuotaInputs(initialInputs);
  }, [tenantEvents]);

  const handleOpenQuotaModal = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsQuotaModalOpen(true);
    setIsLoadingEvents(true);
    try {
      const response = await apiFetch<{ success: boolean; data: any[] }>(`/admin/tenants/${tenant.id}/events`);
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
      const response = await apiFetch<{ success: boolean; data: any[] }>(`/admin/tenants/${tenant.id}/events`);
      setDetailEvents(response.data || []);
    } catch (err) {
      toast.error('Gagal mengambil daftar event detail tenant');
      setIsDetailOpen(false);
    } finally {
      setIsLoadingDetailEvents(false);
    }
  };

  const handleQuotaInputChange = (eventId: string, field: 'max_guests' | 'max_scanner_devices', value: number) => {
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
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Manajemen Tenant
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Tenant
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau slug tenant..."
            value={tableState.searchQuery}
            onChange={(e) => tableState.setSearchQuery(e.target.value)}
            className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Paket:</span>
          <Select 
            value={planFilter} 
            onValueChange={(val) => {
              setPlanFilter(val as PlanType | 'ALL');
              tableState.resetPage();
            }}
          >
            <SelectTrigger className="w-[180px] rounded-lg border-border/60">
              <SelectValue placeholder="Semua Paket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Paket</SelectItem>
              <SelectItem value={PlanType.BASIC}>Basic</SelectItem>
              <SelectItem value={PlanType.PREMIUM}>Premium</SelectItem>
              <SelectItem value={PlanType.ENTERPRISE}>Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          role="alert"
        >
          <span>{errorMessage}</span>
          <Button onClick={() => refetch()} size="sm" variant="destructive">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Tenant Table using DataTable */}
      <DataTable
        isLoading={isLoading}
        loadingText="Memuat data tenant..."
        isEmpty={filteredTenants.length === 0}
        emptyTitle="Tidak ada tenant ditemukan"
        emptyDescription="Coba sesuaikan kata kunci pencarian atau filter tipe paket Anda."
        emptyIcon={<Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />}
        header={
          <>
            <TableHead className="py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Nama Tenant
            </TableHead>
            <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Slug
            </TableHead>
            <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tipe Paket
            </TableHead>
            <TableHead className="py-4 px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Tanggal Dibuat
            </TableHead>
            <TableHead className="py-4 px-6 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
              Status Aktif
            </TableHead>
          </>
        }
        pagination={pagination}
        onPageChange={tableState.setPage}
        onPerPageChange={tableState.setPerPage}
        paginationText={(p) => (
          <>
            Menampilkan <span className="font-medium text-foreground">{(p.page - 1) * p.per_page + 1}</span>–
            <span className="font-medium text-foreground">{Math.min(p.page * p.per_page, p.total)}</span> dari{' '}
            <span className="font-medium text-foreground">{p.total}</span> tenant
          </>
        )}
      >
        {filteredTenants.map((tenant) => (
          <TableRow 
            key={tenant.id} 
            className="border-b border-border/40 hover:bg-muted/20 cursor-pointer"
            onClick={() => handleOpenTenantDetail(tenant)}
          >
            <TableCell className="py-4 px-6 font-medium text-foreground">
              {tenant.name}
            </TableCell>
            <TableCell className="py-4 px-3 text-muted-foreground text-sm">
              /{tenant.slug}
            </TableCell>
            <TableCell className="py-4 px-3">
              {tenant.plan_type === PlanType.ENTERPRISE ? (
                <Badge className="bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50 font-medium hover:opacity-90 shadow-none">
                  Enterprise
                </Badge>
              ) : tenant.plan_type === PlanType.PREMIUM ? (
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 font-medium hover:opacity-90 shadow-none">
                  Premium
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground border-border/50 font-medium hover:bg-muted shadow-none">
                  Basic
                </Badge>
              )}
            </TableCell>
            <TableCell className="py-4 px-3 text-muted-foreground text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatDate(tenant.created_at)}</span>
              </div>
            </TableCell>
            <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-3">
                <span className={`text-xs font-semibold ${tenant.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                  {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <Switch
                  checked={tenant.is_active}
                  onCheckedChange={() => handleToggleStatus(tenant.id, tenant.is_active)}
                  aria-label="Toggle status keaktifan tenant"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenTenantDetail(tenant)}
                  title="Lihat Detail"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenQuotaModal(tenant)}
                  title="Kelola Kuota"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      {/* Tenant Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader className="pb-4 border-b border-border/40">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Detail Tenant
            </SheetTitle>
            <SheetDescription>
              Informasi lengkap dan daftar event yang dikelola oleh tenant ini.
            </SheetDescription>
          </SheetHeader>

          {detailTenant && (
            <div className="mt-6 space-y-6">
              {/* Tenant General Info */}
              <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Nama Tenant:</span>
                  <span className="font-bold text-foreground">{detailTenant.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Slug Url:</span>
                  <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">
                    /{detailTenant.slug}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Paket Langganan:</span>
                  <span>
                    {detailTenant.plan_type === PlanType.ENTERPRISE ? (
                      <Badge className="bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50 font-medium shadow-none border hover:bg-purple-50">Enterprise</Badge>
                    ) : detailTenant.plan_type === PlanType.PREMIUM ? (
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 font-medium shadow-none border hover:bg-indigo-50">Premium</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-border/50 font-medium shadow-none border hover:bg-muted">Basic</Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Status Akun:</span>
                  <span className={`font-semibold ${detailTenant.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                    {detailTenant.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Terdaftar Sejak:</span>
                  <span className="text-muted-foreground">{formatDate(detailTenant.created_at)}</span>
                </div>
              </div>

              {/* Events Managed */}
              <div className="space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  Daftar Event Pernikahan ({detailEvents.length})
                </h3>

                {isLoadingDetailEvents ? (
                  <div className="space-y-3 py-4">
                    <div className="h-20 animate-pulse bg-muted rounded-xl border border-border/40" />
                    <div className="h-20 animate-pulse bg-muted rounded-xl border border-border/40" />
                  </div>
                ) : detailEvents.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border/60 rounded-xl">
                    <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Belum ada event pernikahan yang dibuat</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detailEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="p-4 border border-border/40 rounded-xl bg-card hover:shadow-sm transition-all space-y-3"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-sm text-foreground">
                            {event.groom_name} & {event.bride_name}
                          </h4>
                          <Badge variant="outline" className="capitalize text-[10px] py-0 px-1.5 shadow-none">
                            {event.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatDate(event.event_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 shrink-0" />
                            <span>{event._count?.guests ?? 0} Tamu Terdaftar</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1 text-xs text-muted-foreground pt-1 border-t border-border/30">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{event.venue_name} ({event.venue_address})</span>
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
        <DialogContent className="max-w-xl rounded-2xl p-6 border-border/40 bg-card shadow-xl">
          <form onSubmit={handleCreateTenant}>
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                Tambah Tenant Baru
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Isi detail tenant baru dan buat akun pengelola utamanya secara otomatis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Tenant Section */}
              <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Detail Tenant
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="tenant_name" className="text-xs font-bold text-muted-foreground">
                      Nama Tenant
                    </Label>
                    <Input
                      id="tenant_name"
                      placeholder="Nama mempelai / acara"
                      value={newTenant.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="tenant_slug" className="text-xs font-bold text-muted-foreground">
                      Slug URL
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-muted-foreground/60 font-medium">/</span>
                      <Input
                        id="tenant_slug"
                        placeholder="slug-url"
                        value={newTenant.slug}
                        onChange={(e) => setNewTenant((prev) => ({ ...prev, slug: e.target.value }))}
                        required
                        className="pl-6 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plan_type" className="text-xs font-bold text-muted-foreground">
                    Tipe Paket
                  </Label>
                  <Select
                    value={newTenant.plan_type}
                    onValueChange={(val) => setNewTenant((prev) => ({ ...prev, plan_type: val as PlanType }))}
                  >
                    <SelectTrigger id="plan_type" className="rounded-lg border-border/60">
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
              <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <User className="h-4 w-4 text-emerald-500" />
                  Detail Akun Client (Pengelola)
                </h3>

                <div className="space-y-1.5">
                  <Label htmlFor="client_name" className="text-xs font-bold text-muted-foreground">
                    Nama Lengkap Client
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="client_name"
                      placeholder="Nama lengkap pengelola"
                      value={newTenant.client_name}
                      onChange={(e) => setNewTenant((prev) => ({ ...prev, client_name: e.target.value }))}
                      required
                      className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="client_email" className="text-xs font-bold text-muted-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="client_email"
                        type="email"
                        placeholder="client@mail.com"
                        value={newTenant.client_email}
                        onChange={(e) => setNewTenant((prev) => ({ ...prev, client_email: e.target.value }))}
                        required
                        className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="client_password" className="text-xs font-bold text-muted-foreground">
                      Password Akun
                    </Label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="client_password"
                          type="text"
                          placeholder="Password minimal 8 karakter"
                          value={newTenant.client_password}
                          onChange={(e) => setNewTenant((prev) => ({ ...prev, client_password: e.target.value }))}
                          required
                          className="pl-9 rounded-lg border-border/60 focus-visible:ring-primary/20 bg-card hover:bg-muted/10 transition-colors"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={generatePassword}
                        variant="outline"
                        title="Generate Password Acak"
                        className="px-3 border-border rounded-lg shrink-0 flex items-center justify-center hover:bg-muted"
                      >
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
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
        <DialogContent className="max-w-md rounded-2xl p-6 border-border/40 bg-card shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground animate-in fade-in duration-200">
              <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
              Kelola Kuota Tamu & Perangkat
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atur batas maksimal tamu dan scanner untuk tenant <strong>{selectedTenant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {isLoadingEvents ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Mengambil daftar event...</p>
            </div>
          ) : tenantEvents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Tenant ini belum memiliki event aktif.
            </div>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {tenantEvents.map((event) => (
                <div key={event.id} className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-3">
                  <div className="border-b border-border/40 pb-1.5">
                    <h4 className="text-sm font-bold text-foreground">
                      {event.bride_name} & {event.groom_name}
                    </h4>
                    <p className="text-xs text-muted-foreground">Slug: /{event.slug}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`max_guests_${event.id}`} className="text-xs font-bold text-muted-foreground">
                        Maksimal Jumlah Tamu (max_guests)
                      </Label>
                      <Input
                        id={`max_guests_${event.id}`}
                        type="number"
                        min={QUOTA_MAX_GUESTS_MIN}
                        max={QUOTA_MAX_GUESTS_MAX}
                        value={quotaInputs[event.id]?.max_guests ?? DEFAULT_MAX_GUESTS}
                        onChange={(e) => handleQuotaInputChange(event.id, 'max_guests', parseInt(e.target.value, 10) || 0)}
                        required
                        className="rounded-lg border-border/60 bg-card focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`max_scanner_${event.id}`} className="text-xs font-bold text-muted-foreground">
                        Maksimal Perangkat Scanner (max_scanner_devices)
                      </Label>
                      <Input
                        id={`max_scanner_${event.id}`}
                        type="number"
                        min={QUOTA_MAX_SCANNER_MIN}
                        max={QUOTA_MAX_SCANNER_MAX}
                        value={quotaInputs[event.id]?.max_scanner_devices ?? DEFAULT_MAX_SCANNER_DEVICES}
                        onChange={(e) => handleQuotaInputChange(event.id, 'max_scanner_devices', parseInt(e.target.value, 10) || 0)}
                        required
                        className="rounded-lg border-border/60 bg-card focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 border-t border-border/40 pt-4">
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
    </div>
  );
}
